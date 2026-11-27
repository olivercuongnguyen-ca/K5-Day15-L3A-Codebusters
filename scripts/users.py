"""Manage accounts from the command line (the first admin has to be created here).

    python3 scripts/users.py create-admin  --username giaovu --name "Giáo vụ AI20K"
    python3 scripts/users.py create-mentor --username mentor.a --name "Mentor A" --teams 18,19
    python3 scripts/users.py teams  --username mentor.a --teams 18,20
    python3 scripts/users.py reset  --username 2A2026xxxxx        # prints a one-time temporary password
    python3 scripts/users.py list   [--role mentor]

Passwords are typed at a hidden prompt (never pass them as arguments: they would stay in shell history).
Uses the private database at data/private/app.db (or APP_DB).
"""
import argparse
import getpass
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

import auth  # noqa: E402
import store  # noqa: E402


def _password():
    p1 = getpass.getpass("Mật khẩu (≥%d ký tự): " % auth.MIN_PASSWORD)
    if getpass.getpass("Nhập lại: ") != p1:
        sys.exit("Hai lần nhập không khớp.")
    return p1


def _uid(con, username):
    row = con.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
    if not row:
        sys.exit("Không có tài khoản %s." % username)
    return row["id"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["create-admin", "create-mentor", "teams", "reset", "list"])
    ap.add_argument("--username")
    ap.add_argument("--name", default="")
    ap.add_argument("--teams", default="", help="comma-separated team numbers, e.g. 18,19")
    ap.add_argument("--role")
    a = ap.parse_args()
    con = store.connect()
    teams = [t for t in a.teams.split(",") if t.strip()]
    try:
        if a.cmd in ("create-admin", "create-mentor"):
            role = a.cmd.split("-")[1]
            uid = auth.create_user(con, a.username, role, _password(), a.name)
            if role == "mentor":
                print("Nhóm:", ", ".join(auth.set_mentor_teams(con, uid, teams, None)) or "(chưa gán)")
            print("Đã tạo %s %s." % (role, a.username))
        elif a.cmd == "teams":
            print("Nhóm:", ", ".join(auth.set_mentor_teams(con, _uid(con, a.username), teams, None)))
        elif a.cmd == "reset":
            print("Mật khẩu tạm (đổi ngay sau khi đăng nhập):", auth.reset_password(con, _uid(con, a.username), None))
        else:
            for u in auth.list_users(con, a.role):
                print("%-4s %-8s %-20s %-24s %s%s" % (u["id"], u["role"], u["username"], u["display_name"] or "",
                                                     ",".join(u.get("teams", [])), " (khoá)" if u["disabled"] else ""))
    except auth.AuthError as e:
        sys.exit(str(e))


if __name__ == "__main__":
    main()
