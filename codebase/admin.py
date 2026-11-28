"""Admin: keep the class timetable up to date between official emails.

The weekly timetable email (store.ingest_tkb) stays the source of truth. Admin edits change the stored copy right
away (move a session, swap a room for the students in it), are logged in `audit_log`, recorded in `room_changes`
under version "admin:<time>" so students see the notice, and pushed to affected students. The next timetable
upload replaces them, as the official file should.
"""
import json
import re
from datetime import datetime

import notify
from auth import AuthError, VN, audit

ROOM_RE = re.compile(r"^[A-Z]\d{3}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HM_RE = re.compile(r"^\d{2}:\d{2}$")


def classes(con) -> list:
    return [dict(r) for r in con.execute(
        "SELECT s.class, COALESCE(st.n, 0) AS students "
        "FROM (SELECT DISTINCT class FROM sessions) s "
        "LEFT JOIN (SELECT class, count(*) n FROM students GROUP BY class) st ON st.class=s.class "
        "ORDER BY s.class"
    )]


def list_sessions(con, cls: str, date_from: str = "0000", date_to: str = "9999") -> list:
    out = []
    for s in con.execute("SELECT * FROM sessions WHERE class=? AND date BETWEEN ? AND ? ORDER BY date, start",
                         (cls, date_from, date_to)):
        per_room = {r["room"]: r["n"] for r in con.execute(
            "SELECT room, count(*) n FROM student_rooms WHERE session_id=? GROUP BY room", (s["id"],))}
        out.append({"id": s["id"], "class": s["class"], "date": s["date"], "slot": s["slot"], "kind": s["kind"],
                    "name": s["name"], "start": s["start"], "end": s["end"],
                    "rooms": [dict(r, students=per_room.get(r["code"], 0)) for r in json.loads(s["rooms"])]})
    return out


def update_session(con, user, session_id: str, date=None, start=None, end=None, room_from=None, room_to=None,
                   note: str = "") -> dict:
    """Move a session and/or move the students of one room to another room."""
    s = con.execute("SELECT * FROM sessions WHERE id=?", (session_id,)).fetchone()
    if not s:
        raise AuthError("Không tìm thấy buổi học.", 404)
    date, start, end = date or s["date"], start or s["start"], end or s["end"]
    if not DATE_RE.match(date) or not HM_RE.match(start) or not HM_RE.match(end):
        raise AuthError("Ngày phải dạng YYYY-MM-DD, giờ dạng HH:MM.")
    datetime.strptime(date, "%Y-%m-%d")
    if end <= start:
        raise AuthError("Giờ kết thúc phải sau giờ bắt đầu.")
    moved = (date, start, end) != (s["date"], s["start"], s["end"])
    affected = []
    rooms = json.loads(s["rooms"])
    if room_from or room_to:
        room_from, room_to = (room_from or "").strip().upper(), (room_to or "").strip().upper()
        if not ROOM_RE.match(room_from) or not ROOM_RE.match(room_to):
            raise AuthError("Mã phòng phải dạng H210.")
        affected = [r["student_id"] for r in con.execute(
            "SELECT student_id FROM student_rooms WHERE session_id=? AND room=?", (session_id, room_from))]
        if not affected:
            raise AuthError("Không có học viên nào ở phòng %s trong buổi này." % room_from)
        rooms = [r for r in rooms if r["code"] != room_from]
        if room_to not in {r["code"] for r in rooms}:
            rooms.append({"code": room_to, "building": room_to[0], "backup": False})
    if not moved and not affected:
        raise AuthError("Không có thay đổi nào.")
    version = "admin:" + datetime.now(VN).isoformat(timespec="seconds")
    with con:
        con.execute("UPDATE sessions SET date=?, start=?, \"end\"=?, rooms=? WHERE id=?",
                    (date, start, end, json.dumps(rooms), session_id))
        for sid in affected:
            con.execute("UPDATE student_rooms SET room=? WHERE student_id=? AND session_id=?", (room_to, sid, session_id))
            con.execute("INSERT INTO room_changes VALUES (?,?,?,?,?)", (version, sid, session_id, room_from, room_to))
    audit(con, user["id"], "update_session", {"id": session_id, "date": date, "start": start, "end": end,
                                              "room_from": room_from, "room_to": room_to, "students": len(affected),
                                              "note": note})
    when = "%s/%s %s–%s" % (date[8:10], date[5:7], start, end)
    for sid in affected:
        _push(con, sid, "Phòng học đã đổi", "%s: phòng %s → %s." % (s["name"], room_from, room_to))
    if moved:
        for r in con.execute("SELECT id FROM students WHERE class=?", (s["class"],)).fetchall():
            _push(con, r["id"], "Lịch học đã đổi", "%s chuyển sang %s.%s" % (s["name"], when, (" " + note) if note else ""))
    return {"id": session_id, "date": date, "start": start, "end": end, "moved": moved,
            "room_from": room_from, "room_to": room_to, "students_moved": len(affected)}


def _push(con, sid, title, body):
    try:
        notify.send(con, sid, title, body, tag="tkb")
    except Exception:  # noqa: BLE001 — a failed push must not undo the edit
        pass
