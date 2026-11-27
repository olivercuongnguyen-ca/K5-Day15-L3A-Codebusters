"""Mentor-duty schedule: what mentors see and adjust.

Phoenix is read-only for us, so mentor changes are stored in `duty_changes` and layered over the Phoenix feed
(store.apply_duty_changes): a Phoenix duty can be moved or cancelled (row id = its UID), and a mentor can add a slot
(row id = "mduty-…"). A mentor may only touch duties of the teams an admin assigned to them; admins may touch any.
Students of that team get a push notification for every change.
"""
import re
import secrets
from datetime import datetime, timedelta

import notify
from auth import AuthError, VN, audit
from store import team_of

TIME_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}")


def _ts(value: str) -> str:
    """'2026-11-28T20:00' (VN local) -> '2026-11-28T20:00:00+07:00', the format Phoenix items use."""
    if not TIME_RE.match(value or ""):
        raise AuthError("Thời gian phải có dạng YYYY-MM-DDTHH:MM.")
    datetime.strptime(value[:16], "%Y-%m-%dT%H:%M")
    return value[:16] + ":00+07:00"


def _check_times(start, end):
    s, e = _ts(start), _ts(end)
    if e <= s:
        raise AuthError("Giờ kết thúc phải sau giờ bắt đầu.")
    if datetime.fromisoformat(e) - datetime.fromisoformat(s) > timedelta(hours=8):
        raise AuthError("Một ca mentor duty không quá 8 giờ.")
    return s, e


def _can(user, team):
    if user["role"] == "admin":
        return True
    if user["role"] == "mentor" and team in user["teams"]:
        return True
    raise AuthError("Bạn không phụ trách %s." % team, 403)


def _phoenix_duties(con):
    """Distinct Phoenix duties (same UID appears once per student in the team) -> {uid: {team, title, start, end}}."""
    out = {}
    for r in con.execute("SELECT uid, min(title) title, min(start) start, min(\"end\") \"end\" FROM phoenix_events "
                         "WHERE category='mentor_duty' GROUP BY uid"):
        out[r["uid"]] = {"team": team_of(r["title"]), "title": r["title"], "start": r["start"], "end": r["end"]}
    return out


def list_duties(con, user, date_from: str, date_to: str) -> list:
    """Duties of the user's teams (all teams for admin) between two dates, with changes applied and originals kept."""
    teams = None if user["role"] == "admin" else set(user["teams"])
    changes = {r["id"]: r for r in con.execute("SELECT * FROM duty_changes")}
    size = {r["team"]: r["n"] for r in con.execute("SELECT team, count(*) n FROM students WHERE team IS NOT NULL "
                                                   "GROUP BY team")}
    out = []
    for uid, d in _phoenix_duties(con).items():
        if not d["team"] or (teams is not None and d["team"] not in teams):
            continue
        c = changes.get(uid)
        item = {"id": uid, "source": "phoenix", "team": d["team"], "title": d["title"], "start": d["start"],
                "end": d["end"], "cancelled": False, "note": "", "original": None}
        if c:
            item.update(start=c["start"], end=c["end"], cancelled=bool(c["cancelled"]), note=c["note"] or "",
                        original={"start": d["start"], "end": d["end"]})
        out.append(item)
    for c in changes.values():
        if c["source"] == "mentor" and (teams is None or c["team"] in teams):
            out.append({"id": c["id"], "source": "mentor", "team": c["team"], "title": c["team"], "start": c["start"],
                        "end": c["end"], "cancelled": bool(c["cancelled"]), "note": c["note"] or "", "original": None})
    out = [i for i in out if date_from <= i["start"][:10] <= date_to]
    for i in out:
        i["students"] = size.get(i["team"], 0)
    return sorted(out, key=lambda i: (i["start"], i["team"]))


def _notify_team(con, team, title, body):
    for r in con.execute("SELECT id FROM students WHERE team=?", (team,)).fetchall():
        try:
            notify.send(con, r["id"], title, body, tag="duty")
        except Exception:  # noqa: BLE001 — a failed push must not undo the change
            pass


def _when(s, e):
    d = datetime.fromisoformat(s)
    return "%s %s–%s" % (d.strftime("%d/%m"), s[11:16], e[11:16])


def update_duty(con, user, duty_id: str, start=None, end=None, cancelled=None, note=None) -> dict:
    """Move, cancel/restore or annotate a duty (Phoenix UID or a mentor-added slot)."""
    row = con.execute("SELECT * FROM duty_changes WHERE id=?", (duty_id,)).fetchone()
    base = _phoenix_duties(con).get(duty_id)
    if not row and not base:
        raise AuthError("Không tìm thấy ca mentor duty này.", 404)
    team = row["team"] if row else base["team"]
    _can(user, team)
    cur_start = row["start"] if row else base["start"]
    cur_end = row["end"] if row else base["end"]
    s, e = _check_times((start or cur_start)[:16], (end or cur_end)[:16])
    canc = bool(row["cancelled"]) if (cancelled is None and row) else bool(cancelled)
    with con:
        con.execute("INSERT INTO duty_changes VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET "
                    "start=excluded.start, \"end\"=excluded.\"end\", cancelled=excluded.cancelled, "
                    "note=excluded.note, updated_by=excluded.updated_by, updated_at=excluded.updated_at",
                    (duty_id, team, row["source"] if row else "phoenix", s, e, int(canc),
                     (note if note is not None else (row["note"] if row else "")) or "", user["id"],
                     datetime.now(VN).isoformat(timespec="seconds")))
    audit(con, user["id"], "update_duty", {"id": duty_id, "team": team, "start": s, "end": e, "cancelled": canc})
    _notify_team(con, team, "Mentor duty %s %s" % (team, "đã huỷ" if canc else "đã đổi giờ"),
                 ("Ca %s đã huỷ." % _when(cur_start, cur_end)) if canc else
                 ("Lịch mới: %s." % _when(s, e)))
    return {"id": duty_id, "team": team, "start": s, "end": e, "cancelled": canc}


def add_duty(con, user, team: str, start: str, end: str, note: str = "") -> dict:
    team = team_of(team) or ""
    if not team:
        raise AuthError("Tên nhóm phải có dạng 'Nhóm 18'.")
    _can(user, team)
    s, e = _check_times(start, end)
    duty_id = "mduty-" + secrets.token_hex(6)
    with con:
        con.execute("INSERT INTO duty_changes VALUES (?,?,?,?,?,?,?,?,?)",
                    (duty_id, team, "mentor", s, e, 0, note or "", user["id"],
                     datetime.now(VN).isoformat(timespec="seconds")))
    audit(con, user["id"], "add_duty", {"id": duty_id, "team": team, "start": s, "end": e})
    _notify_team(con, team, "Thêm ca mentor duty %s" % team, "Ca mới: %s." % _when(s, e))
    return {"id": duty_id, "team": team, "start": s, "end": e, "cancelled": False}


def reset_duty(con, user, duty_id: str):
    """Undo a mentor change: a Phoenix duty goes back to the Phoenix time; a mentor-added slot is deleted."""
    row = con.execute("SELECT * FROM duty_changes WHERE id=?", (duty_id,)).fetchone()
    if not row:
        raise AuthError("Ca này chưa có thay đổi nào.", 404)
    _can(user, row["team"])
    with con:
        con.execute("DELETE FROM duty_changes WHERE id=?", (duty_id,))
    audit(con, user["id"], "reset_duty", {"id": duty_id, "team": row["team"]})
    _notify_team(con, row["team"], "Mentor duty %s" % row["team"],
                 "Ca %s đã bỏ." % _when(row["start"], row["end"]) if row["source"] == "mentor"
                 else "Ca mentor duty đã trở về giờ gốc trên Phoenix.")
