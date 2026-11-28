"""The app's own database.

Backends
    SQLite (default, stdlib)   data/private/app.db — gitignored, never committed. Used by tests, eval and fake mode.
    Postgres (e.g. Neon)       set DATABASE_URL=postgresql://… in .env (needs `psycopg`). An explicit path or APP_DB
                               always wins, so fixture DBs for eval/tests stay on SQLite.
Callers use one API for both (codebase/db.py): con.execute / executemany / executescript, `with con:` = one
transaction, rows readable by column name. SQL is written once with `?` placeholders and portable syntax.

Tables
    tkb_versions     one row per distinct timetable attachment received (hash, received_at, source)
    sessions         class-level sessions of the CURRENT version
    student_rooms    per-student room for each session of the current version (personal data)
    students         student id, class, short name, Phoenix feed URL (secret)
    phoenix_events   per-student events from the Phoenix feed
    room_changes     diff produced when a new timetable version replaces the old one (drives "phòng đã đổi" notices)
"""
import json
import re
import os
from datetime import datetime, timedelta, timezone

import db
from ai import load_env
from tkb import parse as parse_tkb

load_env()  # DATABASE_URL may live in .env

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
CREATE TABLE IF NOT EXISTS push_prefs (student_id TEXT PRIMARY KEY, class_minutes INT DEFAULT 60,
    remind_duty INT DEFAULT 1, remind_meeting INT DEFAULT 1, remind_deadline INT DEFAULT 1, updated_at TEXT);
CREATE TABLE IF NOT EXISTS notified (key TEXT PRIMARY KEY, at TEXT);
-- Staff accounts (admin, mentor) and sign-in (codebase/auth.py). Students have no account: they use their
-- student ID. Passwords are PBKDF2 hashes; session tokens are stored as SHA-256.
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('admin','mentor')), display_name TEXT, student_id TEXT UNIQUE,
    pw_hash TEXT NOT NULL, must_change INT DEFAULT 0, disabled INT DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id INT NOT NULL, created_at TEXT,
    expires_at TEXT);
CREATE TABLE IF NOT EXISTS mentor_teams (user_id INT NOT NULL, team TEXT NOT NULL, PRIMARY KEY (user_id, team));
-- Mentor duty changes layered over Phoenix (codebase/duties.py): source 'phoenix' = override of a Phoenix duty
-- (id = its UID), source 'mentor' = a slot the mentor added. Phoenix itself is never written to.
CREATE TABLE IF NOT EXISTS duty_changes (id TEXT PRIMARY KEY, team TEXT NOT NULL, source TEXT NOT NULL,
    start TEXT, "end" TEXT, cancelled INT DEFAULT 0, note TEXT, updated_by INT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS audit_log (at TEXT, user_id INT, action TEXT, detail TEXT);
-- Students only need a password to schedule team meetings (viewing stays ID-only). Kept apart from staff accounts.
CREATE TABLE IF NOT EXISTS student_accounts (student_id TEXT PRIMARY KEY, pw_hash TEXT NOT NULL,
    must_change INT DEFAULT 0, created_at TEXT);
CREATE TABLE IF NOT EXISTS student_sessions (token_hash TEXT PRIMARY KEY, student_id TEXT NOT NULL, created_at TEXT,
    expires_at TEXT);
-- Team meetings scheduled by a signed-in student; every teammate sees them without signing in (codebase/meetings.py).
CREATE TABLE IF NOT EXISTS team_meetings (id TEXT PRIMARY KEY, team TEXT NOT NULL, title TEXT, start TEXT,
    "end" TEXT, link TEXT, passcode TEXT, note TEXT, created_by TEXT, created_at TEXT, cancelled INT DEFAULT 0);
"""
# Postgres: same tables; students already has the team columns, users.id is generated, usernames are unique
# ignoring case (queries compare lower(username)).
SCHEMA_PG = (SCHEMA.replace("id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,",
                            "id SERIAL PRIMARY KEY, username TEXT NOT NULL,")
             .replace("phoenix_synced_at TEXT);", "phoenix_synced_at TEXT, team TEXT, team_source TEXT, squad TEXT, mentors TEXT);")
             + "CREATE UNIQUE INDEX IF NOT EXISTS users_username_ci ON users (lower(username));\n"
             # databases created by an older version of this app
             + "ALTER TABLE students ADD COLUMN IF NOT EXISTS team TEXT;\n"
             + "ALTER TABLE students ADD COLUMN IF NOT EXISTS team_source TEXT;\n"
             + "ALTER TABLE students ADD COLUMN IF NOT EXISTS squad TEXT;\n"
             + "ALTER TABLE students ADD COLUMN IF NOT EXISTS mentors TEXT;\n")
TEAM_RE = re.compile(r"Nhóm\s*(\d+)", re.I)


def team_of(title: str):
    """'Nhóm 18 (đổi giờ)' -> 'Nhóm 18'."""
    m = TEAM_RE.search(title or "")
    return "Nhóm %s" % m.group(1) if m else None


def _migrate(con):
    cols = {r["name"] for r in con.execute("PRAGMA table_info(students)")}
    with con:
        if "team" not in cols:
            con.execute("ALTER TABLE students ADD COLUMN team TEXT")
        if "squad" not in cols:  # the 4-person team (meetings); `team` is the mentor group ("Nhóm 18")
            con.execute("ALTER TABLE students ADD COLUMN squad TEXT")
        if "mentors" not in cols:  # JSON list of the nhóm's mentors, from "Chủ trì:" in Phoenix duties
            con.execute("ALTER TABLE students ADD COLUMN mentors TEXT")
        if "team_source" not in cols:  # 'phoenix' = read from the feed ('student' = typed, no longer allowed)
            con.execute("ALTER TABLE students ADD COLUMN team_source TEXT")
            for r in con.execute("SELECT DISTINCT student_id FROM phoenix_events").fetchall():
                _set_team(con, r["student_id"])
    _drop_typed_teams(con)


def _set_team(con, student_id):
    """A student's nhóm (mentor group) from their Phoenix mentor duties ('Nhóm 18' in most titles); students do not
    type it. Nhóm are only assigned after the first week, so this may find nothing."""
    teams = [team_of(r["title"]) for r in con.execute(
        "SELECT title FROM phoenix_events WHERE student_id=? AND category='mentor_duty'", (student_id,))]
    teams = [t for t in teams if t]
    if teams:
        con.execute("UPDATE students SET team=?, team_source='phoenix' WHERE id=?",
                    (max(set(teams), key=teams.count), student_id))


SQUAD_RE = re.compile(r"^[\w .&+-]{2,40}$", re.U)


def squad_key(name) -> str:
    """Team names match ignoring case and extra spaces: "Code  Busters" == "code busters"."""
    return " ".join(str(name or "").split()).lower()


def set_student_squad(con, student_id: str, name) -> str:
    """The student's 4-person team, by name (meetings are per team). Empty clears it. Returns the stored name."""
    clean = " ".join(str(name or "").split())
    if clean and not SQUAD_RE.match(clean):
        raise ValueError("Mã team 2–40 ký tự, gồm chữ, số, khoảng trắng và . & + - _")
    with con:
        con.execute("UPDATE students SET squad=? WHERE id=?", (clean or None, student_id))
    return clean or None


def _drop_typed_teams(con):
    """Nhóm used to be typeable; reset any typed one to what Phoenix says."""
    for r in con.execute("SELECT id FROM students WHERE team_source='student'").fetchall():
        with con:
            con.execute("UPDATE students SET team=NULL, team_source=NULL WHERE id=?", (r["id"],))
            _set_team(con, r["id"])


def _setup_pg(con):
    con.executescript(SCHEMA_PG)
    for r in con.execute("SELECT DISTINCT e.student_id FROM phoenix_events e JOIN students s ON s.id=e.student_id "
                         "WHERE s.team IS NULL AND s.team_source IS NULL").fetchall():
        with con:
            _set_team(con, r["student_id"])
    _drop_typed_teams(con)


def _env(key: str) -> str:
    """One setting from the environment, else from .env (store can be imported before ai.load_env runs)."""
    if key in os.environ:
        return os.environ[key].strip()
    path = os.path.join(ROOT, ".env")
    if os.path.exists(path):
        with open(path, encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if line.startswith(key + "="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def connect(path=None):
    """SQLite unless DATABASE_URL points at Postgres. An explicit path or APP_DB forces SQLite (fixtures)."""
    url = "" if (path or os.environ.get("APP_DB")) else db.database_url()
    if url.startswith(("postgres://", "postgresql://")):
        return db.postgres(url, on_new=_setup_pg)
    con = db.sqlite(path or DB_PATH)
    con.executescript(SCHEMA)
    _migrate(con)
    return con


# ---- Postgres (Neon): the connection class lives in codebase/db.py; these names are kept for scripts and tests ----
PgConnection = db.PgConnection
_pg_sql = db.PgConnection._sql


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
        if i.get("cancelled"):
            continue
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
        con.executemany("INSERT INTO sessions VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                        [(x["id"], cls, x["index"], x["date"], x["slot"], x["kind"], x["name"], x["start"], x["end"],
                          json.dumps(x["rooms"]), version)
                         for cls, g in data["groups"].items() for x in g["sessions"]])
        con.execute("DELETE FROM student_rooms")
        con.executemany("INSERT INTO students (id, class, short_name) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE "
                        "SET class=excluded.class, short_name=excluded.short_name",
                        [(sid, st["class"], st["short_name"]) for sid, st in data["students"].items()])
        rows = [(sid, sess_id, rm) for sid, st in data["students"].items() for sess_id, rm in st["rooms"].items()]
        con.executemany("INSERT INTO student_rooms VALUES (?,?,?)", rows)
        changed = [(version, sid, sess_id, old.get((sid, sess_id)), rm) for sid, sess_id, rm in rows
                   if old and old.get((sid, sess_id)) != rm]
        con.executemany("INSERT INTO room_changes VALUES (?,?,?,?,?)", changed)
        changes = len(changed)
    return {"version": version, "new": True, "students": len(data["students"]), "room_changes": changes}


def set_phoenix_feed(con, student_id: str, url: str):
    with con:
        con.execute("INSERT INTO students (id, phoenix_url) VALUES (?,?) "
                    "ON CONFLICT(id) DO UPDATE SET phoenix_url=excluded.phoenix_url", (student_id, url))


def ingest_phoenix(con, student_id: str, events: list) -> int:
    """Replace a student's Phoenix events with a fresh copy of the feed."""
    with con:
        con.execute("DELETE FROM phoenix_events WHERE student_id=?", (student_id,))
        con.executemany("INSERT INTO phoenix_events VALUES (?,?,?,?,?,?,?,?,?,?)",
                        [(student_id, e["uid"], e["category"], e["label"], e["title"], e["start"], e["end"],
                          int(e["is_deadline"]), e["location"], e["url"]) for e in events])
        con.execute("UPDATE students SET phoenix_synced_at=? WHERE id=?",
                    (datetime.now(VN).isoformat(timespec="seconds"), student_id))
        _set_team(con, student_id)
        _set_mentors(con, student_id, events)
    return len(events)


HOST_RE = re.compile(r"^\s*Chủ trì\s*:\s*(.+?)\s*$", re.I | re.M)


def _set_mentors(con, student_id, events):
    """Mentors of the student's nhóm: the hosts ("Chủ trì: <name>") of its mentor duties, most frequent first."""
    st = con.execute("SELECT team FROM students WHERE id=?", (student_id,)).fetchone()
    names = []
    for e in events:
        if e["category"] == "mentor_duty" and st and st["team"] and team_of(e["title"]) == st["team"]:
            names += [m.group(1) for m in HOST_RE.finditer(e.get("description") or "")]
    ranked = sorted(set(names), key=lambda n: (-names.count(n), n))
    con.execute("UPDATE students SET mentors=? WHERE id=?", (json.dumps(ranked, ensure_ascii=False) if ranked else None,
                                                             student_id))


def student_mentors(st) -> list:
    """The `mentors` column as a list."""
    try:
        return json.loads(st["mentors"] or "[]")
    except (KeyError, IndexError, ValueError):
        return []


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
                         "ORDER BY s.date, s.start, s.id", (student_id, st["class"], days[0], days[-1])):
        items.append({"source": "tkb", "id": s["id"], "kind": s["kind"], "title": s["name"],
                      "start": "%sT%s:00+07:00" % (s["date"], s["start"]),
                      "end": "%sT%s:00+07:00" % (s["date"], s["end"]),
                      "my_room": s["my_room"], "class_rooms": json.loads(s["rooms"])})
    for e in con.execute("SELECT * FROM phoenix_events WHERE student_id=? AND substr(start,1,10) BETWEEN ? AND ? "
                         "ORDER BY start, uid", (student_id, days[0], days[-1])):
        items.append({"source": "phoenix", "id": e["uid"], "kind": e["category"], "title": e["title"],
                      "start": e["start"], "end": e["end"], "is_deadline": bool(e["is_deadline"]),
                      "location": e["location"], "url": e["url"]})
    items = apply_duty_changes(con, st["team"], items, days[0], days[-1])
    items += team_meeting_items(con, squad_key(st["squad"]), days[0], days[-1])
    items.sort(key=lambda x: x["start"])
    return {"student_id": student_id, "found": True, "class": st["class"], "team": st["team"], "days": days,
            "items": items, "clashes": clashes([i for i in items if not i.get("cancelled")])}


def team_meeting_items(con, team, day_from, day_to):
    """Meetings of a 4-person team (`team` = squad_key of the team name) as schedule items.
    Link and passcode are for teammates (the share view strips them)."""
    if not team:
        return []
    return [{"source": "team", "id": m["id"], "kind": "team_meeting", "title": m["title"] or "Họp team",
             "start": m["start"], "end": m["end"], "is_deadline": False, "location": m["link"] or "",
             "url": m["link"] or "", "passcode": m["passcode"] or "", "note": m["note"] or "",
             "organizer": m["created_by"], "cancelled": bool(m["cancelled"])}
            for m in con.execute("SELECT * FROM team_meetings WHERE team=? AND substr(start,1,10) BETWEEN ? AND ? "
                                 "ORDER BY start", (team, day_from, day_to))]


def apply_duty_changes(con, team, items, day_from, day_to):
    """Apply mentor changes: move/cancel Phoenix duties by UID, add slots the mentor created for this team."""
    changes = {r["id"]: r for r in con.execute("SELECT * FROM duty_changes")}
    out = []
    for i in items:
        c = changes.get(i["id"]) if i["source"] == "phoenix" and i["kind"] == "mentor_duty" else None
        if c:
            i = dict(i, start=c["start"], end=c["end"], cancelled=bool(c["cancelled"]), note=c["note"] or "",
                     changed_by_mentor=True)
            if not (day_from <= i["start"][:10] <= day_to):
                continue
        out.append(i)
    if team:
        for c in con.execute("SELECT * FROM duty_changes WHERE source='mentor' AND team=? "
                             "AND substr(start,1,10) BETWEEN ? AND ?", (team, day_from, day_to)):
            out.append({"source": "mentor", "id": c["id"], "kind": "mentor_duty", "title": c["team"],
                        "start": c["start"], "end": c["end"], "is_deadline": False, "location": "", "url": "",
                        "cancelled": bool(c["cancelled"]), "note": c["note"] or "", "changed_by_mentor": True})
    # a Phoenix duty moved INTO this week from another week
    if team:
        here = {i["id"] for i in out}
        for c in changes.values():
            if c["source"] == "phoenix" and c["team"] == team and c["id"] not in here \
                    and day_from <= c["start"][:10] <= day_to:
                out.append({"source": "phoenix", "id": c["id"], "kind": "mentor_duty", "title": c["team"],
                            "start": c["start"], "end": c["end"], "is_deadline": False, "location": "", "url": "",
                            "cancelled": bool(c["cancelled"]), "note": c["note"] or "", "changed_by_mentor": True})
    return out


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
