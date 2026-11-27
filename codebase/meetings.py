"""Team meetings: a signed-in student schedules one for their team; every teammate sees it and gets a push.

Free-time suggestions use only REQUIRED schedule as busy time:
    class sessions of every class in the team (LEC, LAB, online, opening, hackathon)
    the team's mentor duty (Phoenix, with mentor changes; cancelled slots are free again)
    the team's other meetings
Optional items (Phoenix workshops / office hours) never block a slot; suggestions that overlap one say so.
Deadlines are moments, not blocks, so they never count. Times are Vietnam local (+07:00), like every schedule item.
"""
import re
import secrets
from datetime import datetime, timedelta

import notify
from auth import VN, AuthError, audit
from duties import list_duties

DAY_START, DAY_END = "08:00", "22:00"   # suggestions stay inside these hours
STEP = timedelta(minutes=30)
MAX_LENGTH = timedelta(hours=4)
LINK_RE = re.compile(r"^https?://\S{3,500}$")


def _dt(s):
    """'2026-11-28T20:00' or '2026-11-28T20:00:00+07:00' -> aware datetime in VN time."""
    d = datetime.fromisoformat(s[:16])
    return d.replace(tzinfo=VN)


def _iso(d):
    return d.strftime("%Y-%m-%dT%H:%M:00+07:00")


def _team_of(con, student_id):
    row = con.execute("SELECT team FROM students WHERE id=?", (student_id,)).fetchone()
    if not row or not row["team"]:
        raise AuthError("Bạn chưa có nhóm. Nhập số nhóm trong Cài đặt trước khi đặt lịch họp.", 400)
    return row["team"]


def busy(con, team, day_from, day_to):
    """(required, optional): lists of {start, end, what} for the team between two dates (inclusive)."""
    members = con.execute("SELECT id, class FROM students WHERE team=?", (team,)).fetchall()
    classes = sorted({m["class"] for m in members if m["class"]})
    req, opt = [], []
    if classes:
        q = "SELECT class, name, date, start, \"end\" FROM sessions WHERE class IN (%s) AND date BETWEEN ? AND ?"
        for s in con.execute(q % ",".join("?" * len(classes)), (*classes, day_from, day_to)):
            req.append({"start": _dt("%sT%s" % (s["date"], s["start"])), "end": _dt("%sT%s" % (s["date"], s["end"])),
                        "what": "%s · %s" % (s["name"], s["class"])})
    for d in list_duties(con, {"role": "mentor", "teams": [team]}, day_from, day_to):
        if not d["cancelled"]:
            req.append({"start": _dt(d["start"]), "end": _dt(d["end"]), "what": "Mentor duty " + team})
    for m in con.execute("SELECT title, start, \"end\" FROM team_meetings WHERE team=? AND cancelled=0 "
                         "AND substr(start,1,10) BETWEEN ? AND ?", (team, day_from, day_to)):
        req.append({"start": _dt(m["start"]), "end": _dt(m["end"]), "what": m["title"] or "Họp nhóm"})
    ids = [m["id"] for m in members]
    if ids:
        q = ("SELECT uid, min(title) title, min(start) start, min(\"end\") \"end\" FROM phoenix_events "
             "WHERE category='event' AND student_id IN (%s) AND substr(start,1,10) BETWEEN ? AND ? GROUP BY uid")
        for e in con.execute(q % ",".join("?" * len(ids)), (*ids, day_from, day_to)):
            opt.append({"start": _dt(e["start"]), "end": _dt(e["end"]), "what": e["title"]})
    return req, opt


def _round_up(d):
    """Next :00 or :30 at or after d."""
    extra = (-d.minute) % 30
    return (d + timedelta(minutes=extra)).replace(second=0, microsecond=0)


def _overlaps(items, a, b):
    return [i for i in items if i["start"] < b and i["end"] > a]


def suggest(con, student_id, duration_min=60, days=7, now=None, limit=8):
    """Free slots for the whole team in the next `days` days, earliest first, at most two per day."""
    team = _team_of(con, student_id)
    now = now or datetime.now(VN)
    length = timedelta(minutes=max(15, min(int(duration_min), 240)))
    first = now.date()
    last = first + timedelta(days=days - 1)
    req, opt = busy(con, team, first.isoformat(), last.isoformat())
    earliest = _round_up(now + timedelta(minutes=30))
    out, per_day = [], {}
    for k in range(days):
        day = (first + timedelta(days=k)).isoformat()
        t, end_of_day = _dt(day + "T" + DAY_START), _dt(day + "T" + DAY_END)
        while t + length <= end_of_day:
            if t >= earliest and per_day.get(day, 0) < 2 and not _overlaps(req, t, t + length):
                clash = _overlaps(opt, t, t + length)
                out.append({"start": _iso(t), "end": _iso(t + length),
                            "optional_overlaps": [c["what"] for c in clash]})
                per_day[day] = per_day.get(day, 0) + 1
                nxt = min((i for i in req if t + length <= i["start"] < end_of_day), key=lambda i: i["start"],
                          default=None)  # skip to the free block after the next busy item
                t = _round_up(nxt["end"]) if nxt else end_of_day
                continue
            t += STEP
    members = con.execute("SELECT count(*) n FROM students WHERE team=?", (team,)).fetchone()["n"]
    return {"team": team, "members": members, "duration_min": int(length.total_seconds() // 60),
            "suggestions": out[:limit]}


def create(con, student_id, start, end, link, passcode="", title="", note="", force=False, now=None):
    """Schedule a meeting. A time that clashes with required schedule needs force=True (the UI asks first)."""
    team = _team_of(con, student_id)
    now = now or datetime.now(VN)
    try:
        a, b = _dt(start), _dt(end)
    except (ValueError, TypeError):
        raise AuthError("Thời gian phải có dạng YYYY-MM-DDTHH:MM.")
    if b <= a:
        raise AuthError("Giờ kết thúc phải sau giờ bắt đầu.")
    if b - a > MAX_LENGTH:
        raise AuthError("Một buổi họp nhóm không quá 4 giờ.")
    if a < now - timedelta(minutes=5):
        raise AuthError("Không đặt lịch họp trong quá khứ.")
    link = (link or "").strip()
    if not LINK_RE.match(link):
        raise AuthError("Link họp phải bắt đầu bằng https:// (Google Meet, Zoom, Teams…).")
    passcode, title, note = (passcode or "").strip()[:64], (title or "").strip()[:80], (note or "").strip()[:300]
    req, _ = busy(con, team, a.date().isoformat(), b.date().isoformat())
    clash = _overlaps(req, a, b)
    if clash and not force:
        raise AuthError("Trùng lịch bắt buộc của nhóm: " + "; ".join(
            "%s %s–%s" % (c["what"], c["start"].strftime("%H:%M"), c["end"].strftime("%H:%M")) for c in clash), 409)
    mid = "meet-" + secrets.token_hex(6)
    with con:
        con.execute("INSERT INTO team_meetings VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                    (mid, team, title or "Họp nhóm", _iso(a), _iso(b), link, passcode, note, student_id,
                     now.isoformat(timespec="seconds"), 0))
    audit(con, None, "create_meeting", {"id": mid, "team": team, "by": student_id})
    _notify_team(con, team, student_id, "%s: %s" % (team, title or "Họp nhóm"),
                 "%s. Mở app để xem link tham gia." % _when(a, b))
    return {"id": mid, "team": team, "start": _iso(a), "end": _iso(b), "clashes": [c["what"] for c in clash]}


def cancel(con, student_id, meeting_id):
    m = con.execute("SELECT * FROM team_meetings WHERE id=?", (meeting_id,)).fetchone()
    if not m or m["cancelled"]:
        raise AuthError("Không tìm thấy buổi họp.", 404)
    if m["created_by"] != student_id:
        raise AuthError("Chỉ người đặt lịch mới huỷ được buổi họp này.", 403)
    with con:
        con.execute("UPDATE team_meetings SET cancelled=1 WHERE id=?", (meeting_id,))
    audit(con, None, "cancel_meeting", {"id": meeting_id, "by": student_id})
    _notify_team(con, m["team"], student_id, "%s: đã huỷ họp" % m["team"],
                 "%s (%s) đã huỷ." % (m["title"] or "Họp nhóm", _when(_dt(m["start"]), _dt(m["end"]))))


def _when(a, b):
    dow = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"][a.weekday()]
    return "%s %s %s–%s" % (dow, a.strftime("%d/%m"), a.strftime("%H:%M"), b.strftime("%H:%M"))


def _notify_team(con, team, organizer, title, body):
    for r in con.execute("SELECT id FROM students WHERE team=? AND id<>?", (team, organizer)).fetchall():
        try:
            notify.send(con, r["id"], title, body, tag="meeting")
        except Exception:  # noqa: BLE001 — a failed push must not undo the meeting
            pass
