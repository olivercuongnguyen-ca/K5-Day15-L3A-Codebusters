"""Codebusters web app — FastAPI. Run: .venv/bin/python -m uvicorn codebase.web.server:app --port 8000
(or `python3 run.py`, which starts it). Interactive API docs: /docs.

Roles: only admins and mentors sign in (codebase/auth.py). Students have no account or password: they enter their
student ID (and optionally a team number), which the app keeps in a plain cookie to know whose schedule to show.
    public   GET /, /sw.js, /manifest, /api/buildings, /api/push/key, /cal/{token}.ics, /api/shared/{token}
             GET /api/setup/status · POST /api/setup/timetable (first upload only, while no timetable exists yet)
    student  POST /api/student/login {student_id, password, create?} (a password only to schedule team meetings)
             GET /api/meetings/suggest?duration · POST /api/meetings (signed in) · DELETE /api/meetings/{id} (organizer)
             POST /api/student/password {old, new}
             POST /api/student/enter {student_id, team?, phoenix_url?} · GET /api/student/me · PUT /api/student/team {team}
             POST /api/student/exit · GET /api/week?monday · POST /api/phoenix {url}
             POST /api/leave · POST /api/push/subscribe · POST /api/push/test · GET /api/calendar-links · GET /api/share
    staff    POST /api/auth/login {username, password} · POST /api/auth/logout · GET /api/auth/me
             POST /api/auth/password {old, new}
    admin    POST /api/admin/ingest (timetable .html/.eml) · GET /api/admin/classes
             GET /api/admin/sessions?cls&date_from&date_to · PATCH /api/admin/sessions/{id}
             GET/POST /api/admin/users · POST /api/admin/users/{id}/reset · POST /api/admin/users/{id}/disable
             PUT /api/admin/users/{id}/teams
    mentor   GET /api/mentor/duties?date_from&date_to · POST /api/mentor/duties · PATCH/DELETE /api/mentor/duties/{id}
             (admins may use these too, for every team)
"""
import json
import os
import sys
import urllib.parse
from datetime import date, datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response as FResponse, UploadFile  # noqa: E402
from fastapi.responses import FileResponse, JSONResponse, Response  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel  # noqa: E402

import admin as admin_ops  # noqa: E402
import auth  # noqa: E402
import duties  # noqa: E402
import ics_feed  # noqa: E402
import meetings  # noqa: E402
import mail_ingest  # noqa: E402
import store  # noqa: E402
import notify  # noqa: E402
import tracing  # noqa: E402
from agent import answer  # noqa: E402
from tkb import TkbFormatError  # noqa: E402

app = FastAPI(title="Codebusters — Lịch AI20K")
COOKIE = "ai20k_session"          # staff sign-in session (secret token)
STUDENT_COOKIE = "ai20k_student"   # which student's schedule to show (not a secret, not a login)
STUDENT_AUTH = "ai20k_student_auth"  # a student's sign-in session, needed only to schedule team meetings


@app.exception_handler(auth.AuthError)
def _auth_error(request: Request, exc: auth.AuthError):
    return JSONResponse({"detail": str(exc)}, status_code=exc.status)


def current_user(request: Request):
    return auth.user_for_token(store.connect(), request.cookies.get(COOKIE))


def require(*roles):
    """Dependency: a signed-in user with one of `roles`, who has changed any temporary password."""
    def dep(request: Request):
        u = current_user(request)
        if not u:
            raise HTTPException(401, "Bạn cần đăng nhập.")
        if u["must_change"]:
            raise HTTPException(403, "Bạn cần đổi mật khẩu tạm trước khi tiếp tục.")
        if u["role"] not in roles:
            raise HTTPException(403, "Tài khoản %s không có quyền này." % u["role"])
        return u
    return dep


def student_only(request: Request):
    """The student whose schedule to show: the student-ID cookie (or ?student_id= for API clients)."""
    sid = (request.cookies.get(STUDENT_COOKIE) or request.query_params.get("student_id") or "").strip().upper()
    if not sid:
        raise HTTPException(401, "Nhập mã học viên để xem lịch.")
    if not store.connect().execute("SELECT 1 FROM students WHERE id=?", (sid,)).fetchone():
        raise HTTPException(404, "Không tìm thấy mã học viên trong thời khoá biểu hiện tại.")
    return {"student_id": sid}


admin_only = require("admin")
mentor_or_admin = require("mentor", "admin")
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


# ---- Sign-in ----
class LoginIn(BaseModel):
    username: str
    password: str


class PasswordIn(BaseModel):
    old: str
    new: str


def _set_cookie(resp: FResponse, request: Request, token: str):
    resp.set_cookie(COOKIE, token, max_age=auth.SESSION_DAYS * 86400, httponly=True, samesite="lax",
                    secure=request.url.scheme == "https", path="/")


@app.post("/api/auth/login")
def login(body: LoginIn, request: Request, response: FResponse):
    con = store.connect()
    tok = auth.login(con, body.username, body.password)
    _set_cookie(response, request, tok)
    return auth.user_for_token(con, tok)


@app.post("/api/auth/logout")
def logout(request: Request, response: FResponse):
    auth.logout(store.connect(), request.cookies.get(COOKIE))
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}


@app.get("/api/auth/me")
def me(request: Request):
    u = current_user(request)
    if not u:
        raise HTTPException(401, "Bạn cần đăng nhập.")
    return u


@app.post("/api/auth/password")
def change_password(body: PasswordIn, request: Request):
    u = current_user(request)
    if not u:
        raise HTTPException(401, "Bạn cần đăng nhập.")
    auth.change_password(store.connect(), u["id"], body.old, body.new, keep_token=request.cookies.get(COOKIE))
    return {"ok": True}


# ---- Student: no account, just a student ID and an optional team ----
class StudentIn(BaseModel):
    student_id: str
    team: str = ""
    phoenix_url: str = ""


class TeamIn(BaseModel):
    team: str = ""


def _student_info(con, sid, request: Request = None):
    st = con.execute("SELECT id, class, team, team_source FROM students WHERE id=?", (sid,)).fetchone()
    signed = auth.student_for_token(con, request.cookies.get(STUDENT_AUTH)) if request else None
    return {"student_id": st["id"], "class": st["class"], "team": st["team"],
            "team_set_by": st["team_source"], "has_password": auth.student_has_password(con, sid),
            "signed_in": bool(signed and signed[0] == sid), "must_change": bool(signed and signed[1])}


def student_signed_in(request: Request):
    """A student signed in with their password (only scheduling needs this)."""
    s = auth.student_for_token(store.connect(), request.cookies.get(STUDENT_AUTH))
    if not s:
        raise HTTPException(401, "Đăng nhập bằng mật khẩu để đặt lịch họp nhóm.")
    if s[1]:
        raise HTTPException(403, "Bạn cần đổi mật khẩu tạm trước khi đặt lịch họp.")
    return {"student_id": s[0]}


def _set_team(con, sid, team):
    try:
        store.set_student_team(con, sid, team)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/student/enter")
def student_enter(body: StudentIn, request: Request, response: FResponse):
    con = store.connect()
    sid = body.student_id.strip().upper()
    if not con.execute("SELECT 1 FROM students WHERE id=?", (sid,)).fetchone():
        raise HTTPException(404, "Không tìm thấy mã học viên trong thời khoá biểu hiện tại.")
    if body.phoenix_url.strip():
        _link_phoenix(con, sid, body.phoenix_url)
    if body.team.strip():
        _set_team(con, sid, body.team)
    response.set_cookie(STUDENT_COOKIE, sid, max_age=180 * 86400, httponly=True, samesite="lax",
                        secure=request.url.scheme == "https", path="/")
    return _student_info(con, sid)


@app.get("/api/student/me")
def student_me(request: Request, student=Depends(student_only)):
    return _student_info(store.connect(), student["student_id"], request)


class StudentLoginIn(BaseModel):
    student_id: str
    password: str
    create: bool = False


@app.post("/api/student/login")
def student_login(body: StudentLoginIn, request: Request, response: FResponse):
    """Sign in to schedule meetings. create=True sets the password the first time."""
    con = store.connect()
    sid = body.student_id.strip().upper()
    if body.create:
        auth.student_set_password(con, sid, body.password)
    tok = auth.student_login(con, sid, body.password)
    secure = request.url.scheme == "https"
    response.set_cookie(STUDENT_AUTH, tok, max_age=auth.SESSION_DAYS * 86400, httponly=True, samesite="lax",
                        secure=secure, path="/")
    response.set_cookie(STUDENT_COOKIE, sid, max_age=180 * 86400, httponly=True, samesite="lax", secure=secure,
                        path="/")
    info = _student_info(con, sid)
    s = auth.student_for_token(con, tok)
    info.update(signed_in=True, must_change=bool(s and s[1]))
    return info


@app.post("/api/student/password")
def student_password(body: PasswordIn, request: Request):
    s = auth.student_for_token(store.connect(), request.cookies.get(STUDENT_AUTH))
    if not s:
        raise HTTPException(401, "Bạn cần đăng nhập.")
    auth.student_change_password(store.connect(), s[0], body.old, body.new, keep_token=request.cookies.get(STUDENT_AUTH))
    return {"ok": True}


@app.put("/api/student/team")
def student_team(body: TeamIn, student=Depends(student_only)):
    con = store.connect()
    _set_team(con, student["student_id"], body.team)
    return _student_info(con, student["student_id"])


@app.post("/api/student/exit")
def student_exit(request: Request, response: FResponse):
    auth.student_logout(store.connect(), request.cookies.get(STUDENT_AUTH))
    response.delete_cookie(STUDENT_COOKIE, path="/")
    response.delete_cookie(STUDENT_AUTH, path="/")
    return {"ok": True}


# ---- Team meetings ----
@app.get("/api/meetings/suggest")
def meeting_suggest(duration: int = 60, days: int = 7, student=Depends(student_only)):
    return meetings.suggest(store.connect(), student["student_id"], duration, max(1, min(days, 14)))


class MeetingIn(BaseModel):
    start: str
    end: str
    link: str
    passcode: str = ""
    title: str = ""
    note: str = ""
    force: bool = False


@app.post("/api/meetings")
def meeting_create(body: MeetingIn, student=Depends(student_signed_in)):
    return meetings.create(store.connect(), student["student_id"], **body.model_dump())


@app.delete("/api/meetings/{meeting_id}")
def meeting_cancel(meeting_id: str, student=Depends(student_signed_in)):
    meetings.cancel(store.connect(), student["student_id"], meeting_id)
    return {"ok": True}


@app.post("/api/admin/students/{student_id}/reset")
def admin_reset_student(student_id: str, user=Depends(admin_only)):
    return {"temporary_password": auth.student_reset_password(store.connect(), student_id.strip().upper(), user["id"]),
            "note": "Gửi mật khẩu tạm này cho học viên qua kênh riêng; họ phải đổi trước khi đặt lịch họp."}


# ---- Student: own schedule ----
@app.get("/api/week")
def week(monday: str = None, user=Depends(student_only)):
    con = store.connect()
    student_id = user["student_id"]
    w = store.week(con, student_id, monday or _monday(date.today()))
    if not w["found"]:
        raise HTTPException(404, "Mã học viên của bạn không còn trong thời khoá biểu hiện tại.")
    st = con.execute("SELECT phoenix_url IS NOT NULL AS linked, phoenix_synced_at FROM students WHERE id=?",
                     (student_id,)).fetchone()
    w["phoenix_linked"] = bool(st["linked"])
    w["phoenix_synced_at"] = st["phoenix_synced_at"]
    ver = con.execute("SELECT hash, received_at, source FROM tkb_versions ORDER BY received_at DESC LIMIT 1").fetchone()
    w["tkb_version"] = dict(ver) if ver else None
    w["room_changes"] = [dict(r) for r in con.execute(  # from the latest timetable email + admin edits since then
        "SELECT c.session_id, c.old_room, c.new_room, s.name, s.date FROM room_changes c JOIN sessions s "
        "ON s.id=c.session_id WHERE c.student_id=? AND (c.version=? OR (c.version LIKE 'admin:%' AND "
        "substr(c.version, 7) >= ?))", (student_id, ver["hash"] if ver else "", ver["received_at"] if ver else ""))]
    return w


class PhoenixIn(BaseModel):
    url: str


@app.post("/api/phoenix")
def phoenix(body: PhoenixIn, user=Depends(student_only)):
    return {"events": _link_phoenix(store.connect(), user["student_id"], body.url)}


def _link_phoenix(con, sid, url):
    try:
        events = ics_feed.parse(ics_feed.fetch(url.strip()))
    except ValueError:
        raise HTTPException(400, "Link không đúng dạng link lịch Phoenix (…/api/events/feed/….ics).")
    except Exception:
        raise HTTPException(502, "Không tải được lịch Phoenix. Kiểm tra lại link hoặc thử lại sau.")
    store.set_phoenix_feed(con, sid, url.strip())
    return store.ingest_phoenix(con, sid, events)


async def _ingest_upload(file: UploadFile, user_id):
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
    auth.audit(con, user_id, "ingest_tkb", {"file": name, "version": res["version"], "new": res["new"]})
    if res["new"] and res["room_changes"]:
        notify.notify_room_changes(con, res["version"])
    return res


@app.post("/api/admin/ingest")
async def ingest(file: UploadFile = File(...), user=Depends(admin_only)):
    return await _ingest_upload(file, user["id"])


# ---- First run: an empty database has no students, so nobody could get in to upload anything ----
def _has_timetable(con):
    return con.execute("SELECT 1 FROM tkb_versions LIMIT 1").fetchone() is not None


@app.get("/api/setup/status")
def setup_status():
    """Whether a timetable has been loaded. A fresh install has none, so the start screen shows an upload card."""
    con = store.connect()
    ver = con.execute("SELECT received_at FROM tkb_versions ORDER BY received_at DESC LIMIT 1").fetchone()
    return {"timetable": ver is not None, "received_at": ver["received_at"] if ver else None,
            "students": con.execute("SELECT count(*) n FROM students").fetchone()["n"]}


@app.post("/api/setup/timetable")
async def setup_timetable(file: UploadFile = File(...)):
    """Load the first timetable without signing in. Only while none exists: after that, updates are admin-only,
    so a stranger cannot replace everyone's rooms."""
    if _has_timetable(store.connect()):
        raise HTTPException(403, "Đã có thời khoá biểu. Bản mới do admin cập nhật.")
    return await _ingest_upload(file, None)


class LeaveIn(BaseModel):
    session: str
    reason: str
    evidence_type: str = ""


@app.post("/api/leave")
def leave(body: LeaveIn, user=Depends(student_only)):
    tracing.begin("app")
    try:
        out = json.loads(answer(json.dumps({"student_id": user["student_id"], "session": body.session,
                                            "reason": body.reason, "evidence_type": body.evidence_type,
                                            "today": date.today().isoformat()}, ensure_ascii=False))["output"])
    except Exception as e:
        tracing.end()
        return JSONResponse({"status": "error", "question": "Không gọi được AI: %s" % type(e).__name__}, status_code=502)
    s, _ = tracing.end()
    out["usage"] = {"model": ", ".join(s["models"]), "tokens_in": s["tokens_in"], "tokens_out": s["tokens_out"]}
    return out


# ---- Push notifications ----
@app.get("/api/push/key")
def push_key():
    return {"key": notify.public_key()}


class SubIn(BaseModel):
    sub: dict


@app.post("/api/push/subscribe")
def push_subscribe(body: SubIn, user=Depends(student_only)):
    notify.subscribe(store.connect(), user["student_id"], body.sub)
    return {"ok": True}


@app.post("/api/push/test")
def push_test(user=Depends(student_only)):
    n = notify.send(store.connect(), user["student_id"], "Thông báo đã bật",
                    "Bạn sẽ được nhắc trước hạn nộp, trước giờ học và khi phòng học thay đổi.", tag="test")
    return {"sent": n}


# ---- Sync to Google Calendar / Outlook ----
@app.get("/api/calendar-links")
def calendar_links(request: Request, user=Depends(student_only)):
    tok = store.token_for(store.connect(), user["student_id"], "cal")
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
def share(request: Request, user=Depends(student_only)):
    tok = store.token_for(store.connect(), user["student_id"], "share")
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
        i.pop("passcode", None)
        if i.get("location"):
            i["location"] = "online"
    w.update(student_id=None, owner=con.execute("SELECT short_name FROM students WHERE id=?", (sid,)).fetchone()["short_name"],
             phoenix_linked=True, phoenix_synced_at=None, tkb_version=None, room_changes=[], readonly=True)
    return w


# ---- Admin: timetable and accounts ----
@app.get("/api/admin/classes")
def admin_classes(user=Depends(admin_only)):
    return admin_ops.classes(store.connect())


@app.get("/api/admin/sessions")
def admin_sessions(cls: str, date_from: str = "0000-00-00", date_to: str = "9999-12-31", user=Depends(admin_only)):
    return admin_ops.list_sessions(store.connect(), cls.strip().upper(), date_from, date_to)


class SessionEditIn(BaseModel):
    date: str = None
    start: str = None
    end: str = None
    room_from: str = None
    room_to: str = None
    note: str = ""


@app.patch("/api/admin/sessions/{session_id}")
def admin_edit_session(session_id: str, body: SessionEditIn, user=Depends(admin_only)):
    return admin_ops.update_session(store.connect(), user, session_id, **body.model_dump())


@app.get("/api/admin/users")
def admin_users(role: str = None, user=Depends(admin_only)):
    return auth.list_users(store.connect(), role)


class NewUserIn(BaseModel):
    username: str
    role: str
    password: str
    display_name: str = ""
    teams: list = []


@app.post("/api/admin/users")
def admin_create_user(body: NewUserIn, user=Depends(admin_only)):
    if body.role not in ("admin", "mentor"):
        raise HTTPException(400, "Admin chỉ tạo tài khoản admin hoặc mentor; học viên tự tạo mật khẩu bằng mã học viên.")
    con = store.connect()
    uid = auth.create_user(con, body.username, body.role, body.password, body.display_name, must_change=True,
                           by=user["id"])
    teams = auth.set_mentor_teams(con, uid, body.teams, user["id"]) if body.role == "mentor" else []
    return {"id": uid, "username": body.username, "role": body.role, "teams": teams, "must_change": True}


@app.post("/api/admin/users/{user_id}/reset")
def admin_reset(user_id: int, user=Depends(admin_only)):
    return {"temporary_password": auth.reset_password(store.connect(), user_id, user["id"]),
            "note": "Gửi mật khẩu tạm này cho người dùng qua kênh riêng; họ phải đổi sau khi đăng nhập."}


class DisableIn(BaseModel):
    disabled: bool = True


@app.post("/api/admin/users/{user_id}/disable")
def admin_disable(user_id: int, body: DisableIn, user=Depends(admin_only)):
    if user_id == user["id"]:
        raise HTTPException(400, "Không tự khoá tài khoản của mình.")
    auth.set_disabled(store.connect(), user_id, body.disabled, user["id"])
    return {"ok": True}


class TeamsIn(BaseModel):
    teams: list


@app.put("/api/admin/users/{user_id}/teams")
def admin_teams(user_id: int, body: TeamsIn, user=Depends(admin_only)):
    return {"teams": auth.set_mentor_teams(store.connect(), user_id, body.teams, user["id"])}


# ---- Mentor: mentor-duty schedule ----
@app.get("/api/mentor/duties")
def mentor_duties(date_from: str = None, date_to: str = None, user=Depends(mentor_or_admin)):
    today = date.today()
    return {"teams": user["teams"] if user["role"] == "mentor" else "all",
            "duties": duties.list_duties(store.connect(), user, date_from or _monday(today),
                                         date_to or (today + timedelta(days=28)).isoformat())}


class DutyIn(BaseModel):
    team: str
    start: str
    end: str
    note: str = ""


@app.post("/api/mentor/duties")
def mentor_add(body: DutyIn, user=Depends(mentor_or_admin)):
    return duties.add_duty(store.connect(), user, body.team, body.start, body.end, body.note)


class DutyEditIn(BaseModel):
    start: str = None
    end: str = None
    cancelled: bool = None
    note: str = None


@app.patch("/api/mentor/duties/{duty_id:path}")
def mentor_edit(duty_id: str, body: DutyEditIn, user=Depends(mentor_or_admin)):
    return duties.update_duty(store.connect(), user, duty_id, **body.model_dump())


@app.delete("/api/mentor/duties/{duty_id:path}")
def mentor_reset(duty_id: str, user=Depends(mentor_or_admin)):
    duties.reset_duty(store.connect(), user, duty_id)
    return {"ok": True}
