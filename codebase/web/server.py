"""Codebusters web app — FastAPI. Run: .venv/bin/python -m uvicorn codebase.web.server:app --port 8000
(or `python3 run.py`, which starts it).

Routes
    GET  /                          single-page UI (static/index.html)
    GET  /api/week?student_id&monday  combined week (timetable + Phoenix) with clashes
    POST /api/phoenix               {student_id, url} -> fetch + store feed (URL is a secret: never returned)
    POST /api/ingest                multipart file (.html or .eml) -> ingest timetable version
    GET  /api/setup/status          {timetable, received_at, students} — the start screen offers an upload when empty
    POST /api/leave                 leave request -> agent.answer (AI) -> draft + Outlook link
"""
import json
import os
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

from fastapi import FastAPI, File, HTTPException, Request, UploadFile  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, Response  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel  # noqa: E402

import ics_feed  # noqa: E402
import mail_ingest  # noqa: E402
import store  # noqa: E402
import notify  # noqa: E402
import summary  # noqa: E402
import tracing  # noqa: E402
from agent import answer  # noqa: E402
from tkb import TkbFormatError  # noqa: E402

app = FastAPI(title="Codebusters — Lịch AI20K")
app.mount("/static", StaticFiles(directory=os.path.join(HERE, "static")), name="static")
app.mount("/assets", StaticFiles(directory=os.path.join(ROOT, "assets")), name="assets")


def _monday(d: date) -> str:
    return (d - timedelta(days=d.weekday())).isoformat()


STATIC = os.path.join(HERE, "static")


@app.on_event("startup")
def _start():
    notify.public_key()
    if os.environ.get("NOTIFY_LOOP", "1") == "1":
        notify.start_loop()


@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC, "index.html"))


@app.get("/sw.js")
def sw():
    return FileResponse(os.path.join(STATIC, "sw.js"), media_type="text/javascript",
                        headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"})


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(os.path.join(STATIC, "manifest.webmanifest"), media_type="application/manifest+json")


@app.get("/api/buildings")
def buildings():
    with open(os.path.join(ROOT, "data", "campus_buildings.json"), encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/week")
def week(student_id: str, monday: str = None):
    con = store.connect()
    w = store.week(con, student_id.strip().upper(), monday or _monday(date.today()))
    if not w["found"]:
        raise HTTPException(404, "Không tìm thấy mã học viên trong thời khoá biểu hiện tại.")
    st = con.execute("SELECT phoenix_url IS NOT NULL AS linked, phoenix_synced_at FROM students WHERE id=?",
                     (student_id.strip().upper(),)).fetchone()
    w["phoenix_linked"] = bool(st["linked"])
    w["phoenix_synced_at"] = st["phoenix_synced_at"]
    ver = con.execute("SELECT hash, received_at, source FROM tkb_versions ORDER BY received_at DESC LIMIT 1").fetchone()
    w["tkb_version"] = dict(ver) if ver else None
    w["room_changes"] = [dict(r) for r in con.execute(
        "SELECT c.session_id, c.old_room, c.new_room, s.name, s.date FROM room_changes c JOIN sessions s "
        "ON s.id=c.session_id WHERE c.student_id=? AND c.version=?", (student_id.strip().upper(),
                                                                    ver["hash"] if ver else ""))]
    return w


class PhoenixIn(BaseModel):
    student_id: str
    url: str


@app.post("/api/phoenix")
def phoenix(body: PhoenixIn):
    con = store.connect()
    sid = body.student_id.strip().upper()
    try:
        events = ics_feed.parse(ics_feed.fetch(body.url.strip()))
    except ValueError:
        raise HTTPException(400, "Link không đúng dạng link lịch Phoenix (…/api/events/feed/….ics).")
    except Exception:
        raise HTTPException(502, "Không tải được lịch Phoenix. Kiểm tra lại link hoặc thử lại sau.")
    store.set_phoenix_feed(con, sid, body.url.strip())
    n = store.ingest_phoenix(con, sid, events)
    return {"events": n}


@app.post("/api/ingest")
async def ingest(file: UploadFile = File(...)):
    raw = await file.read()
    name = file.filename or ""
    if name.lower().endswith(".eml"):
        r = mail_ingest.extract_from_eml(raw)
        if not r["ok"]:
            raise HTTPException(400, "Email bị từ chối: %s" % r["reason"])
        html = r["html"]
    elif mail_ingest.NAME_RE.match(name):
        html = raw.decode("utf-8")
    else:
        raise HTTPException(400, "Chỉ nhận file Thoi_khoa_bieu*.html hoặc email .eml chứa file đó.")
    con = store.connect()
    try:
        res = store.ingest_tkb(con, html, source="upload:%s" % name)
    except TkbFormatError as e:
        raise HTTPException(400, "File không đúng định dạng thời khoá biểu: %s" % e)
    if res["new"] and res["room_changes"]:
        notify.notify_room_changes(con, res["version"])
    return res


@app.get("/api/setup/status")
def setup_status():
    """Whether a timetable has been loaded. A fresh install has none, so the start screen shows an upload card."""
    con = store.connect()
    ver = con.execute("SELECT received_at FROM tkb_versions ORDER BY received_at DESC LIMIT 1").fetchone()
    return {"timetable": ver is not None, "received_at": ver["received_at"] if ver else None,
            "students": con.execute("SELECT count(*) n FROM students").fetchone()["n"]}


class LeaveIn(BaseModel):
    student_id: str
    session: str
    reason: str
    evidence_type: str = ""


@app.post("/api/leave")
def leave(body: LeaveIn):
    tracing.begin("app")
    try:
        out = json.loads(answer(json.dumps({"student_id": body.student_id.strip().upper(), "session": body.session,
                                            "reason": body.reason, "evidence_type": body.evidence_type,
                                            "today": date.today().isoformat()}, ensure_ascii=False))["output"])
    except Exception as e:
        tracing.end()
        return JSONResponse({"status": "error", "question": "Không gọi được AI: %s" % type(e).__name__}, status_code=502)
    s, _ = tracing.end()
    out["usage"] = {"model": ", ".join(s["models"]), "tokens_in": s["tokens_in"], "tokens_out": s["tokens_out"]}
    return out


def _sid(student_id):
    sid = student_id.strip().upper()
    if not store.connect().execute("SELECT 1 FROM students WHERE id=?", (sid,)).fetchone():
        raise HTTPException(404, "Không tìm thấy mã học viên.")
    return sid


# ---- Push notifications ----
@app.get("/api/push/key")
def push_key():
    return {"key": notify.public_key()}


class SubIn(BaseModel):
    student_id: str
    sub: dict


@app.post("/api/push/subscribe")
def push_subscribe(body: SubIn):
    notify.subscribe(store.connect(), _sid(body.student_id), body.sub)
    return {"ok": True}


class SidIn(BaseModel):
    student_id: str


@app.post("/api/push/test")
def push_test(body: SidIn):
    n = notify.send(store.connect(), _sid(body.student_id), "Thông báo đã bật",
                    "Bạn sẽ được nhắc trước hạn nộp, trước giờ học và khi phòng học thay đổi.", tag="test")
    return {"sent": n}


# ---- Sync to Google Calendar / Outlook ----
@app.get("/api/calendar-links")
def calendar_links(student_id: str, request: Request):
    tok = store.token_for(store.connect(), _sid(student_id), "cal")
    https = str(request.base_url).rstrip("/") + "/cal/%s.ics" % tok
    webcal = https.replace("https://", "webcal://").replace("http://", "webcal://")
    q = urllib.parse.quote
    return {"ics": https, "webcal": webcal,
            "google": "https://calendar.google.com/calendar/r?cid=" + q(webcal, safe=""),
            "outlook": "https://outlook.office.com/calendar/0/addfromweb?url=%s&name=%s" % (q(https, safe=""), q("Lịch AI20K"))}


@app.get("/cal/{token}.ics")
def cal(token: str):
    con = store.connect()
    sid = store.student_for_token(con, token, "cal")
    if not sid:
        raise HTTPException(404)
    return Response(store.export_ics(con, sid), media_type="text/calendar; charset=utf-8")


# ---- Share with team (read-only, no Phoenix links) ----
@app.get("/api/share")
def share(student_id: str, request: Request):
    tok = store.token_for(store.connect(), _sid(student_id), "share")
    return {"url": str(request.base_url).rstrip("/") + "/#share-" + tok}


@app.get("/api/shared/{token}")
def shared(token: str, monday: str = None):
    con = store.connect()
    sid = store.student_for_token(con, token, "share")
    if not sid:
        raise HTTPException(404, "Link chia sẻ không còn hiệu lực.")
    w = store.week(con, sid, monday or _monday(date.today()))
    for i in w["items"]:
        i.pop("url", None)
        if i.get("location"):
            i["location"] = "online"
    w.update(student_id=None, owner=con.execute("SELECT short_name FROM students WHERE id=?", (sid,)).fetchone()["short_name"],
             phoenix_linked=True, phoenix_synced_at=None, tkb_version=None, room_changes=[], readonly=True)
    return w


# ---- AI summary "tuần này mình còn cần làm gì" (only from now on) ----
_SUMMARY_CACHE = {}


@app.get("/api/summary")
def week_summary(student_id: str, monday: str = None):
    con = store.connect()
    sid = _sid(student_id)
    w = summary.remaining(store.week(con, sid, monday or _monday(date.today())),
                          datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%dT%H:%M"))
    key = (sid, w["days"][0], json.dumps([(i["id"], i["start"], i.get("my_room")) for i in w["items"]]))
    if key not in _SUMMARY_CACHE:
        tracing.begin("summary")
        try:
            _SUMMARY_CACHE[key] = summary.summarize(w)
        finally:
            tracing.end()
    return _SUMMARY_CACHE[key]
