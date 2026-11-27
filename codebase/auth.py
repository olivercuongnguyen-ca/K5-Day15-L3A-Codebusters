"""Staff accounts and sign-in. Only admins and mentors sign in; students have no account and simply use their
student ID (plus an optional team number) — see the /api/student routes in codebase/web/server.py.

    admin    uploads / edits the class timetable, manages mentor and admin accounts, resets passwords.
             The first admin is created from the command line: `python3 scripts/users.py create-admin`.
    mentor   sees and adjusts the mentor-duty schedule of the teams an admin assigned to them.

Passwords: PBKDF2-HMAC-SHA256 (stdlib), random salt. Sessions: random token in an HttpOnly cookie; only its SHA-256
is stored, so a copied database cannot be used to sign in. Repeated wrong passwords lock that username for a while.
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from datetime import datetime, timedelta, timezone

VN = timezone(timedelta(hours=7))
ROLES = ("admin", "mentor")
ITERATIONS = 200_000
SESSION_DAYS = 14
MIN_PASSWORD = 8
MAX_FAILS, FAIL_WINDOW = 5, 15 * 60  # 5 wrong passwords in 15 minutes locks the username for the rest of the window
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,40}$")
_fails = {}


class AuthError(Exception):
    """A sign-in or account problem with a user-facing (Vietnamese) message."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _now():
    return datetime.now(VN)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return "pbkdf2_sha256$%d$%s$%s" % (ITERATIONS, salt.hex(), dk.hex())


def verify_password(password: str, stored: str) -> bool:
    try:
        _, it, salt, want = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), int(it))
        return hmac.compare_digest(dk.hex(), want)
    except (ValueError, AttributeError):
        return False


_DUMMY = hash_password(secrets.token_hex(8))  # equalises timing when the username does not exist


def _check_password_rules(password: str):
    if len(password or "") < MIN_PASSWORD:
        raise AuthError("Mật khẩu cần ít nhất %d ký tự." % MIN_PASSWORD)


def audit(con, user_id, action, detail):
    with con:
        con.execute("INSERT INTO audit_log VALUES (?,?,?,?)", (_now().isoformat(timespec="seconds"), user_id, action,
                                                             json.dumps(detail, ensure_ascii=False)))


def create_user(con, username, role, password, display_name="", must_change=False, by=None) -> int:
    username = (username or "").strip()
    if role not in ROLES:
        raise AuthError("Vai trò không hợp lệ.")
    if not USERNAME_RE.match(username):
        raise AuthError("Tên đăng nhập chỉ gồm chữ, số, dấu . _ - (3–40 ký tự).")
    _check_password_rules(password)
    if con.execute("SELECT 1 FROM users WHERE username=?", (username,)).fetchone():
        raise AuthError("Tên đăng nhập đã tồn tại.", 409)
    with con:
        cur = con.execute("INSERT INTO users (username, role, display_name, student_id, pw_hash, must_change, "
                          "created_at) VALUES (?,?,?,?,?,?,?)",
                          (username, role, display_name or username, None, hash_password(password),
                           int(must_change), _now().isoformat(timespec="seconds")))
    audit(con, by, "create_user", {"username": username, "role": role})
    return cur.lastrowid


def _locked(username):
    now = time.time()
    recent = [t for t in _fails.get(username, []) if now - t < FAIL_WINDOW]
    _fails[username] = recent
    return len(recent) >= MAX_FAILS


def login(con, username: str, password: str) -> str:
    """Return a new session token, or raise AuthError. Same message for unknown user and wrong password."""
    key = (username or "").strip().lower()
    if _locked(key):
        raise AuthError("Nhập sai quá nhiều lần. Thử lại sau 15 phút.", 429)
    u = con.execute("SELECT * FROM users WHERE username=?", ((username or "").strip(),)).fetchone()
    ok = verify_password(password or "", u["pw_hash"] if u else _DUMMY)
    if not u or not ok or u["disabled"]:
        _fails.setdefault(key, []).append(time.time())
        raise AuthError("Sai tên đăng nhập hoặc mật khẩu.", 401)
    _fails.pop(key, None)
    return new_session(con, u["id"])


def _h(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_session(con, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    now = _now()
    with con:
        con.execute("DELETE FROM auth_sessions WHERE expires_at < ?", (now.isoformat(),))
        con.execute("INSERT INTO auth_sessions VALUES (?,?,?,?)", (_h(token), user_id, now.isoformat(),
                                                                  (now + timedelta(days=SESSION_DAYS)).isoformat()))
    return token


def user_for_token(con, token: str):
    """The signed-in user as a dict (with `teams` for mentors), or None."""
    if not token:
        return None
    row = con.execute("SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id "
                      "WHERE s.token_hash=? AND s.expires_at > ? AND u.disabled=0",
                      (_h(token), _now().isoformat())).fetchone()
    if not row:
        return None
    u = {k: row[k] for k in ("id", "username", "role", "display_name", "must_change")}
    u["must_change"] = bool(u["must_change"])
    u["teams"] = [r["team"] for r in con.execute("SELECT team FROM mentor_teams WHERE user_id=? ORDER BY team",
                                                 (row["id"],))] if row["role"] == "mentor" else []
    return u


def logout(con, token: str):
    with con:
        con.execute("DELETE FROM auth_sessions WHERE token_hash=?", (_h(token or ""),))


def change_password(con, user_id: int, old: str, new: str, keep_token: str = None):
    row = con.execute("SELECT pw_hash FROM users WHERE id=?", (user_id,)).fetchone()
    if not row or not verify_password(old or "", row["pw_hash"]):
        raise AuthError("Mật khẩu hiện tại không đúng.", 401)
    _check_password_rules(new)
    with con:
        con.execute("UPDATE users SET pw_hash=?, must_change=0 WHERE id=?", (hash_password(new), user_id))
        con.execute("DELETE FROM auth_sessions WHERE user_id=? AND token_hash<>?", (user_id, _h(keep_token or "")))
    audit(con, user_id, "change_password", {})


def reset_password(con, user_id: int, by: int) -> str:
    """Admin reset: returns a one-time temporary password; the user must change it after signing in."""
    if not con.execute("SELECT 1 FROM users WHERE id=?", (user_id,)).fetchone():
        raise AuthError("Không tìm thấy tài khoản.", 404)
    temp = secrets.token_urlsafe(9)
    with con:
        con.execute("UPDATE users SET pw_hash=?, must_change=1 WHERE id=?", (hash_password(temp), user_id))
        con.execute("DELETE FROM auth_sessions WHERE user_id=?", (user_id,))
    audit(con, by, "reset_password", {"user_id": user_id})
    return temp


def set_disabled(con, user_id: int, disabled: bool, by: int):
    with con:
        con.execute("UPDATE users SET disabled=? WHERE id=?", (int(disabled), user_id))
        if disabled:
            con.execute("DELETE FROM auth_sessions WHERE user_id=?", (user_id,))
    audit(con, by, "disable_user" if disabled else "enable_user", {"user_id": user_id})


def set_mentor_teams(con, user_id: int, teams: list, by: int):
    u = con.execute("SELECT role FROM users WHERE id=?", (user_id,)).fetchone()
    if not u or u["role"] != "mentor":
        raise AuthError("Chỉ gán nhóm cho tài khoản mentor.", 400)
    clean = sorted({"Nhóm %d" % int(re.sub(r"\D", "", str(t))) for t in teams if re.search(r"\d", str(t))})
    with con:
        con.execute("DELETE FROM mentor_teams WHERE user_id=?", (user_id,))
        con.executemany("INSERT INTO mentor_teams VALUES (?,?)", [(user_id, t) for t in clean])
    audit(con, by, "set_mentor_teams", {"user_id": user_id, "teams": clean})
    return clean


def list_users(con, role=None) -> list:
    q = "SELECT id, username, role, display_name, must_change, disabled, created_at FROM users"
    rows = con.execute(q + (" WHERE role=?" if role else "") + " ORDER BY role, username", (role,) if role else ())
    out = []
    for r in rows:
        d = dict(r)
        if d["role"] == "mentor":
            d["teams"] = [t["team"] for t in con.execute("SELECT team FROM mentor_teams WHERE user_id=?", (d["id"],))]
        out.append(d)
    return out
