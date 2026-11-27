"""Read a student's personal Phoenix calendar feed (the "Nhắc lịch qua Google Calendar" link on
portal-cohort5.edufun.ai/events).

The feed URL contains a per-student secret token: treat it like a password. Store it only in the private DB or
.env, never in git, logs or prompts. The feed content (Zoom passcodes, host names) is private too.

Feed facts observed on 27/11/2026: standard iCalendar, all DTSTART/DTEND in UTC ("...Z"), folded lines,
zero-length events are deadlines, and the UID prefix gives the category.
"""
import re
import urllib.request
from datetime import datetime, timedelta, timezone

VN = timezone(timedelta(hours=7))

# UID prefix -> (category, label shown in the UI)
CATEGORIES = {
    "event": ("event", "Workshop / office hour"),
    "duty": ("mentor_duty", "Mentor duty"),
    "daily": ("deadline", "Hạn daily standup"),
    "weekly": ("deadline", "Hạn mentor duty"),
    "gate": ("deadline", "Hạn gate"),
    "demo_day": ("deadline", "Hạn nộp Demo Day"),
    "topic_lock": ("deadline", "Hạn chốt đề tài"),
}


def fetch(url: str, timeout: int = 20) -> str:
    """Download the feed. Only https URLs on the Phoenix host are accepted (the URL is user-supplied)."""
    if not re.match(r"^https://phoenix\.note\.transformerlabs\.ai/api/events/feed/[A-Za-z0-9_-]+\.ics$", url):
        raise ValueError("not a Phoenix calendar feed URL")
    req = urllib.request.Request(url, headers={"User-Agent": "codebusters-schedule/0.1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")


def _unfold(text: str) -> list:
    lines = []
    for raw in text.replace("\r\n", "\n").split("\n"):
        if raw.startswith((" ", "\t")) and lines:
            lines[-1] += raw[1:]
        elif raw:
            lines.append(raw)
    return lines


def _unescape(v: str) -> str:
    return v.replace("\\n", "\n").replace("\\N", "\n").replace("\\,", ",").replace("\\;", ";").replace("\\\\", "\\")


def _dt(v: str) -> datetime:
    if v.endswith("Z"):
        return datetime.strptime(v, "%Y%m%dT%H%M%SZ").replace(tzinfo=timezone.utc).astimezone(VN)
    if "T" in v:  # floating time: assume Vietnam
        return datetime.strptime(v, "%Y%m%dT%H%M%S").replace(tzinfo=VN)
    return datetime.strptime(v, "%Y%m%d").replace(tzinfo=VN)


def parse(text: str) -> list:
    """Return events sorted by start: {uid, category, label, title, start, end, is_deadline, description, location, url}.
    start/end are ISO strings in Vietnam time (+07:00)."""
    events, cur = [], None
    for line in _unfold(text):
        if line == "BEGIN:VEVENT":
            cur = {}
            continue
        if line == "END:VEVENT":
            if cur is not None and "DTSTART" in cur:
                events.append(cur)
            cur = None
            continue
        if cur is None or ":" not in line:
            continue
        key, value = line.split(":", 1)
        cur[key.split(";", 1)[0]] = value
    out = []
    for e in events:
        uid = e.get("UID", "")
        prefix = re.split(r"[:@]", uid, 1)[0]
        category, label = CATEGORIES.get(prefix, ("other", "Khác"))
        start = _dt(e["DTSTART"])
        end = _dt(e.get("DTEND", e["DTSTART"]))
        out.append({
            "uid": uid,
            "category": category,
            "label": label,
            "title": _unescape(e.get("SUMMARY", "")),
            "start": start.isoformat(),
            "end": end.isoformat(),
            "is_deadline": end <= start,
            "description": _unescape(e.get("DESCRIPTION", "")),
            "location": _unescape(e.get("LOCATION", "")),
            "url": e.get("URL", ""),
        })
    return sorted(out, key=lambda x: x["start"])
