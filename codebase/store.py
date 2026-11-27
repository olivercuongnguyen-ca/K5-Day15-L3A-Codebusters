"""The app's own database (SQLite, stdlib). Lives at data/private/app.db — gitignored, never committed.

Tables
    tkb_versions     one row per distinct timetable attachment received (hash, received_at, source)
    sessions         class-level sessions of the CURRENT version
    student_rooms    per-student room for each session of the current version (personal data)
    students         student id, class, short name, Phoenix feed URL (secret)
    phoenix_events   per-student events from the Phoenix feed
    room_changes     diff produced when a new timetable version replaces the old one (drives "phòng đã đổi" notices)
"""
import json
import os
import sqlite3
from datetime import datetime, timedelta, timezone

from tkb import parse as parse_tkb

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("APP_DB") or os.path.join(ROOT, "data", "private", "app.db")
VN = timezone(timedelta(hours=7))

SCHEMA = """
CREATE TABLE IF NOT EXISTS tkb_versions (hash TEXT PRIMARY KEY, received_at TEXT, source TEXT, holidays TEXT);
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, class TEXT, idx INT, date TEXT, slot TEXT, kind TEXT,
    name TEXT, start TEXT, "end" TEXT, rooms TEXT, version TEXT);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, class TEXT, short_name TEXT, phoenix_url TEXT,
    phoenix_synced_at TEXT);
CREATE TABLE IF NOT EXISTS student_rooms (student_id TEXT, session_id TEXT, room TEXT,
    PRIMARY KEY (student_id, session_id));
CREATE TABLE IF NOT EXISTS phoenix_events (student_id TEXT, uid TEXT, category TEXT, label TEXT, title TEXT,
    start TEXT, "end" TEXT, is_deadline INT, location TEXT, url TEXT, PRIMARY KEY (student_id, uid));
CREATE TABLE IF NOT EXISTS room_changes (version TEXT, student_id TEXT, session_id TEXT, old_room TEXT,
    new_room TEXT);
CREATE TABLE IF NOT EXISTS tokens (student_id TEXT, kind TEXT, token TEXT UNIQUE, PRIMARY KEY (student_id, kind));
CREATE TABLE IF NOT EXISTS push_subs (endpoint TEXT PRIMARY KEY, student_id TEXT, sub TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS notified (key TEXT PRIMARY KEY, at TEXT);
"""


def connect(path=None):
    path = path or DB_PATH
    os.makedirs(os.path.dirname(path), exist_ok=True)
    con = sqlite3.connect(path, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def token_for(con, student_id: str, kind: str) -> str:
    """Stable random token per student for the calendar feed ('cal') or the share link ('share')."""
    import secrets
    row = con.execute("SELECT token FROM tokens WHERE student_id=? AND kind=?", (student_id, kind)).fetchone()
    if row:
        return row["token"]
    tok = secrets.token_urlsafe(18)
    with con:
        con.execute("INSERT INTO tokens VALUES (?,?,?)", (student_id, kind, tok))
    return tok


def student_for_token(con, token: str, kind: str):
    row = con.execute("SELECT student_id FROM tokens WHERE token=? AND kind=?", (token, kind)).fetchone()
    return row["student_id"] if row else None


def all_items(con, student_id: str) -> list:
    """Every combined item for a student (all weeks) — used by the calendar export and reminders."""
    st = con.execute("SELECT class FROM students WHERE id=?", (student_id,)).fetchone()
    if not st:
        return []
    first = con.execute("SELECT min(date) d FROM sessions").fetchone()["d"] or "2026-01-01"
    start = datetime.strptime(first, "%Y-%m-%d").date()
    start -= timedelta(days=start.weekday())
    items, seen = [], set()
    for k in range(0, 16):
        w = week(con, student_id, (start + timedelta(days=7 * k)).isoformat())
        for i in w["items"]:
            if i["id"] not in seen:
                seen.add(i["id"])
                items.append(i)
    return items


def export_ics(con, student_id: str, cal_name: str = "Lịch AI20K") -> str:
    """Combined calendar as iCalendar, for subscribing from Google Calendar / Outlook. Phoenix links are left out."""
    def esc(s):
        return (s or "").replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

    def utc(s):
        return datetime.fromisoformat(s).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Codebusters//AI20K//VI", "CALSCALE:GREGORIAN",
           "METHOD:PUBLISH", "X-WR-CALNAME:" + esc(cal_name), "REFRESH-INTERVAL;VALUE=DURATION:PT1H"]
    for i in all_items(con, student_id):
        loc = i.get("my_room") or ("Online" if i["kind"] in ("ONL", "event", "mentor_duty") else "")
        title = i["title"] + (" · " + i["my_room"] if i.get("my_room") else "")
        out += ["BEGIN:VEVENT", "UID:%s@codebusters" % esc(i["id"]), "DTSTAMP:" + now,
                "DTSTART:" + utc(i["start"]), "DTEND:" + utc(i["end"]), "SUMMARY:" + esc(title)]
        if loc:
            out.append("LOCATION:" + esc(loc))
        if i.get("is_deadline"):
            out += ["BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + esc(title), "END:VALARM"]
        out.append("END:VEVENT")
    out.append("END:VCALENDAR")
    return "\r\n".join(out) + "\r\n"


def ingest_tkb(con, html: str, source: str = "upload", received_at: str = None) -> dict:
    """Store a timetable attachment. Idempotent on content hash. Returns {"version", "new", "students", "room_changes"}."""
    data = parse_tkb(html)
    version = data["hash"]
    if con.execute("SELECT 1 FROM tkb_versions WHERE hash=?", (version,)).fetchone():
        return {"version": version, "new": False, "students": len(data["students"]), "room_changes": 0}
    old = {(r["student_id"], r["session_id"]): r["room"] for r in con.execute("SELECT * FROM student_rooms")}
    received_at = received_at or datetime.now(VN).isoformat(timespec="seconds")
    with con:
        con.execute("INSERT INTO tkb_versions VALUES (?,?,?,?)",
                    (version, received_at, source, json.dumps(data["holidays"], ensure_ascii=False)))
        con.execute("DELETE FROM sessions")
        for cls, g in data["groups"].items():
            for s in g["sessions"]:
                con.execute("INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                            (s["id"], cls, s["index"], s["date"], s["slot"], s["kind"], s["name"], s["start"],
                             s["end"], json.dumps(s["rooms"]), version))
        con.execute("DELETE FROM student_rooms")
        changes = 0
        for sid, st in data["students"].items():
            con.execute("INSERT INTO students (id, class, short_name) VALUES (?,?,?) "
                        "ON CONFLICT(id) DO UPDATE SET class=excluded.class, short_name=excluded.short_name",
                        (sid, st["class"], st["short_name"]))
            for sess_id, rm in st["rooms"].items():
                con.execute("INSERT INTO student_rooms VALUES (?,?,?)", (sid, sess_id, rm))
                prev = old.get((sid, sess_id))
                if old and prev != rm:
                    con.execute("INSERT INTO room_changes VALUES (?,?,?,?,?)", (version, sid, sess_id, prev, rm))
                    changes += 1
    return {"version": version, "new": True, "students": len(data["students"]), "room_changes": changes}


def set_phoenix_feed(con, student_id: str, url: str):
    with con:
        con.execute("INSERT INTO students (id, phoenix_url) VALUES (?,?) "
                    "ON CONFLICT(id) DO UPDATE SET phoenix_url=excluded.phoenix_url", (student_id, url))


def ingest_phoenix(con, student_id: str, events: list) -> int:
    """Replace a student's Phoenix events with a fresh copy of the feed."""
    with con:
        con.execute("DELETE FROM phoenix_events WHERE student_id=?", (student_id,))
        for e in events:
            con.execute("INSERT INTO phoenix_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                        (student_id, e["uid"], e["category"], e["label"], e["title"], e["start"], e["end"],
                         int(e["is_deadline"]), e["location"], e["url"]))
        con.execute("UPDATE students SET phoenix_synced_at=? WHERE id=?",
                    (datetime.now(VN).isoformat(timespec="seconds"), student_id))
    return len(events)


def week(con, student_id: str, monday: str) -> dict:
    """Combined schedule for one student, Monday..Sunday. Class sessions carry the student's own room."""
    start = datetime.strptime(monday, "%Y-%m-%d").date()
    days = [(start + timedelta(days=i)).isoformat() for i in range(7)]
    st = con.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone()
    if not st:
        return {"student_id": student_id, "found": False, "items": []}
    items = []
    for s in con.execute("SELECT s.*, r.room AS my_room FROM sessions s LEFT JOIN student_rooms r "
                         "ON r.session_id=s.id AND r.student_id=? WHERE s.class=? AND s.date BETWEEN ? AND ? "
                         "ORDER BY s.date, s.start", (student_id, st["class"], days[0], days[-1])):
        items.append({"source": "tkb", "id": s["id"], "kind": s["kind"], "title": s["name"],
                      "start": "%sT%s:00+07:00" % (s["date"], s["start"]),
                      "end": "%sT%s:00+07:00" % (s["date"], s["end"]),
                      "my_room": s["my_room"], "class_rooms": json.loads(s["rooms"])})
    for e in con.execute("SELECT * FROM phoenix_events WHERE student_id=? AND substr(start,1,10) BETWEEN ? AND ? "
                         "ORDER BY start", (student_id, days[0], days[-1])):
        items.append({"source": "phoenix", "id": e["uid"], "kind": e["category"], "title": e["title"],
                      "start": e["start"], "end": e["end"], "is_deadline": bool(e["is_deadline"]),
                      "location": e["location"], "url": e["url"]})
    items.sort(key=lambda x: x["start"])
    return {"student_id": student_id, "found": True, "class": st["class"], "days": days, "items": items,
            "clashes": clashes(items)}


def clashes(items: list) -> list:
    """Pairs of timed (non-deadline) items that overlap — e.g. a mentor duty during a LAB."""
    timed = [i for i in items if not i.get("is_deadline") and i["end"] > i["start"]]
    out = []
    for a_i, a in enumerate(timed):
        for b in timed[a_i + 1:]:
            if b["start"] >= a["end"]:
                break
            out.append([a["id"], b["id"]])
    return out
