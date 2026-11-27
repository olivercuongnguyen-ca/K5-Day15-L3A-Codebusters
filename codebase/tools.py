"""Tools for the leave-request workflow. All read-only except compose_link, which only builds a link.

Data comes from the private DB (codebase/store.py). Set APP_DB to point at a fixture DB for eval.
"""
import json
import os
import re
import urllib.parse
from datetime import date, datetime, timedelta

import store
from tracing import tool, TOOLS  # noqa: F401

from ai import load_env  # noqa: E402

load_env()


def recipient() -> str:
    """Leave-request recipient from LEAVE_RECIPIENT in .env. Fixed by config, never by the model or the user's text.
    Empty = not configured: the draft is still made, with no "to", and the student picks the recipient in Outlook."""
    return os.environ.get("LEAVE_RECIPIENT", "").strip()
WEEKDAYS = {"thứ 2": 0, "thứ hai": 0, "thứ 3": 1, "thứ ba": 1, "thứ 4": 2, "thứ tư": 2, "thứ 5": 3, "thứ năm": 3,
            "thứ 6": 4, "thứ sáu": 4, "thứ 7": 5, "thứ bảy": 5, "chủ nhật": 6, "cn": 6}


def _sessions(con, student_id):
    st = con.execute("SELECT class FROM students WHERE id=?", (student_id,)).fetchone()
    if not st or not st["class"]:
        return None, []
    rows = con.execute("SELECT s.*, r.room AS my_room FROM sessions s LEFT JOIN student_rooms r ON r.session_id=s.id "
                       "AND r.student_id=? WHERE s.class=? ORDER BY s.date, s.start", (student_id, st["class"]))
    out = []
    for s in rows:
        out.append({"id": s["id"], "name": s["name"], "kind": s["kind"], "date": s["date"], "slot": s["slot"],
                    "start": s["start"], "end": s["end"], "room": s["my_room"] or "",
                    "online": s["kind"] == "ONL"})
    return st["class"], out


@tool
def get_sessions(student_id: str, date_from: str, date_to: str) -> list:
    """get_sessions · input: student id, ISO dates · output: the student's class sessions in range with own room
    · no external effect."""
    con = store.connect()
    _, ss = _sessions(con, student_id)
    return [s for s in ss if date_from <= s["date"] <= date_to]


@tool
def find_session(student_id: str, text: str, today: str = None) -> dict:
    """find_session · input: student id, free text ("LEC 15", "27/11", "chiều thứ 6", "ngày mai"), today (ISO)
    · output: {"student_found", "class", "holiday", "candidates": [session]} · no external effect."""
    con = store.connect()
    cls, ss = _sessions(con, student_id)
    out = {"student_found": cls is not None, "class": cls, "holiday": None, "candidates": []}
    if cls is None:
        return out
    t = (text or "").lower()
    today_d = date.fromisoformat(today) if today else date.today()
    m = re.search(r"\b(lec|lab)\s*0*(\d{1,2})\b", t)
    if m:
        name = "%s %d" % (m.group(1).upper(), int(m.group(2)))
        out["candidates"] = [s for s in ss if s["name"] == name]
        return out
    days = set()
    for d, mth in re.findall(r"\b(\d{1,2})/(\d{1,2})\b", t):
        days.add(date(today_d.year, int(mth), int(d)).isoformat())
    if "hôm nay" in t:
        days.add(today_d.isoformat())
    if "ngày mai" in t:
        days.add((today_d + timedelta(days=1)).isoformat())
    for k, wd in sorted(WEEKDAYS.items(), key=lambda kv: -len(kv[0])):
        if re.search(r"(?<!\w)" + re.escape(k) + r"(?!\w)", t):
            delta = (wd - today_d.weekday()) % 7
            if "tuần sau" in t:
                delta += 7
            days.add((today_d + timedelta(days=delta)).isoformat())
            break
    slot = "Sáng" if "sáng" in t else "Chiều" if "chiều" in t else None
    hol = con.execute("SELECT holidays FROM tkb_versions ORDER BY received_at DESC LIMIT 1").fetchone()
    holidays = json.loads(hol["holidays"]) if hol else {}
    for d in days:
        if d in holidays:
            out["holiday"] = {"date": d, "label": holidays[d]}
    out["candidates"] = [s for s in ss if s["date"] in days and (slot is None or s["slot"] == slot)]
    return out


@tool
def leave_policy() -> dict:
    """leave_policy · input: none · output: recipient, subject format, required fields · no external effect."""
    return {"recipient": recipient(),
            "subject_format": "[AI20K] Xin nghỉ {session} ngày {date} – {student_id}",
            "required": ["student_id", "session", "reason", "evidence_type"],
            "evidence_required_for": ["ốm", "bệnh", "khám", "tai nạn"]}


@tool
def compose_link(subject: str, body: str) -> dict:
    """compose_link · input: approved subject/body · output: Outlook Web compose URL + mailto · no external effect:
    the student opens the draft, attaches evidence, and sends it themselves."""
    to = recipient()
    q = urllib.parse.urlencode({"to": to, "subject": subject, "body": body}, quote_via=urllib.parse.quote)
    mq = urllib.parse.urlencode({"subject": subject, "body": body}, quote_via=urllib.parse.quote)
    return {"outlook_web": "https://outlook.office.com/mail/deeplink/compose?" + q,
            "mailto": "mailto:%s?%s" % (to, mq)}


def fmt_date(iso: str) -> str:
    d = datetime.strptime(iso, "%Y-%m-%d")
    return d.strftime("%d/%m/%Y")
