"""Parse the weekly "Thời khóa biểu AI20K" HTML (Outlook attachment from the program admin).

The HTML embeds one <script> with JS constants:
    GROUPS  {class: {label, level, items: [{d, slot, kind, name, rooms, time}]}}   official class schedule, no personal data
    STU     {student_id: [class, room_for_item_0, room_for_item_1, ...]}            PERSONAL DATA
    WHO     {student_id: [abbrev_name, ""]}                                         PERSONAL DATA
    NH      {student_id: fnv1a(folded full name)}                                   PERSONAL DATA (unused here)
    HOLI    {date: label}
Rooms ending in "*" are backup rooms. Times are Vietnam local time (UTC+7).

One file covers every student, so the app ingests it ONCE per version and stores per-student rows in its own
database (data/private/app.db). The source HTML is never committed.
"""
import hashlib
import json
import re


class TkbFormatError(ValueError):
    """The attachment does not look like the AI20K timetable (format changed, or wrong file)."""


def _script(html: str) -> str:
    scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.S)
    if not scripts:
        raise TkbFormatError("no <script> block found")
    return max(scripts, key=len)


def _const(script: str, name: str):
    m = re.search(r"const " + name + r"=(\{.*?\});\n", script, re.S)
    if not m:
        raise TkbFormatError("constant %s not found — the HTML format may have changed" % name)
    return json.loads(m.group(1))


def _holidays(script: str) -> dict:
    m = re.search(r"const HOLI=(\{.*?\});", script, re.S)
    return dict(re.findall(r"'(\d{4}-\d{2}-\d{2})'\s*:\s*'([^']*)'", m.group(1))) if m else {}


def room(code: str):
    """'H203*' -> {'code': 'H203', 'building': 'H', 'backup': True}; '' -> None."""
    if not code:
        return None
    backup = code.endswith("*")
    code = code.rstrip("*")
    return {"code": code, "building": code[:1], "backup": backup}


def parse(html: str) -> dict:
    """Return {"hash", "holidays", "groups": {class: {"level", "sessions": [...]}}, "students": {id: {...}}}.

    "groups" is safe to share (class level). "students" is personal data: store it only in the private DB.
    """
    script = _script(html)
    groups = _const(script, "GROUPS")
    stu = _const(script, "STU")
    try:
        who = _const(script, "WHO")
    except TkbFormatError:
        who = {}
    out = {
        "hash": hashlib.sha256(html.encode("utf-8")).hexdigest()[:16],
        "holidays": _holidays(script),
        "groups": {},
        "students": {},
    }
    for key, g in groups.items():
        sessions = []
        for i, it in enumerate(g["items"]):
            sessions.append({
                "id": "%s-%02d" % (key, i),
                "index": i,
                "date": it["d"],
                "slot": it["slot"],      # Sáng / Chiều
                "kind": it["kind"],      # LEC / LAB / ONL / KG / HACK
                "name": it["name"],
                "start": it["time"][0],
                "end": it["time"][1],
                "rooms": [room(r) for r in it["rooms"]],
            })
        out["groups"][key] = {"level": g.get("level", ""), "sessions": sessions}
    for sid, row in stu.items():
        cls = row[0]
        if cls not in out["groups"]:
            continue
        rooms = {}
        for s in out["groups"][cls]["sessions"]:
            r = row[s["index"] + 1] if s["index"] + 1 < len(row) else ""
            if r:
                rooms[s["id"]] = r.rstrip("*")
        out["students"][sid] = {"class": cls, "short_name": (who.get(sid) or [""])[0], "rooms": rooms}
    return out


def public_view(parsed: dict) -> dict:
    """Class-level part only (no student rows) — the only form allowed in the git repo."""
    return {"source": "Thoi_khoa_bieu_AI20K (weekly email)", "holidays": parsed["holidays"], "groups": parsed["groups"]}
