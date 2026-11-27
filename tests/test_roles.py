"""Role tests on a temporary database with SYNTHETIC data only.
Students: no account, just a student ID (+ optional team). Admins and mentors: password sign-in."""
import os
import sys

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "codebase"))
sys.path.insert(0, ROOT)
sys.path.insert(0, HERE)
os.environ["NOTIFY_LOOP"] = "0"

from fastapi.testclient import TestClient  # noqa: E402

import auth  # noqa: E402
import ics_feed  # noqa: E402
import store  # noqa: E402
from test_ingest import ICS, tkb_html  # noqa: E402

DUTY = "duty:1:1:1@phoenix.note.transformerlabs.ai"
PW = "mat-khau-thu-1"


@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", str(tmp_path / "app.db"))
    auth._fails.clear()
    con = store.connect()
    store.ingest_tkb(con, tkb_html())
    store.ingest_phoenix(con, "SV0001", ics_feed.parse(ICS))  # SV0001 is in "Nhóm 7"
    auth.create_user(con, "giaovu", "admin", PW)
    from codebase.web import server
    return con, server.app


def student(app, sid, team=""):
    c = TestClient(app)
    r = c.post("/api/student/enter", json={"student_id": sid, "team": team})
    assert r.status_code == 200, r.text
    return c


def client(app, username=None, password=PW):
    c = TestClient(app)
    if username:
        r = c.post("/api/auth/login", json={"username": username, "password": password})
        assert r.status_code == 200, r.text
    return c


def test_passwords_are_hashed_and_checked(env):
    con, _ = env
    stored = con.execute("SELECT pw_hash FROM users WHERE username='giaovu'").fetchone()["pw_hash"]
    assert PW not in stored and stored.startswith("pbkdf2_sha256$")
    assert auth.verify_password(PW, stored) and not auth.verify_password("sai", stored)


def test_student_enters_with_id_only(env):
    con, app = env
    anon = TestClient(app)
    assert anon.get("/api/week?monday=2026-11-23").status_code == 401
    assert anon.post("/api/student/enter", json={"student_id": "SV9999"}).status_code == 404
    s1 = student(app, "sv0001")  # lower-case ID is normalised, no password
    w = s1.get("/api/week?monday=2026-11-23").json()
    assert w["student_id"] == "SV0001" and w["team"] == "Nhóm 7"  # guessed from the Phoenix feed
    assert s1.get("/api/summary?monday=2026-11-23").status_code == 200
    # students cannot reach admin or mentor routes
    assert s1.get("/api/admin/users").status_code == 401
    assert s1.get("/api/mentor/duties").status_code == 401
    s1.post("/api/student/exit")
    assert s1.get("/api/week").status_code == 401


def test_team_is_optional_and_editable(env):
    con, app = env
    s2 = student(app, "SV0002")  # first week: no team yet
    assert s2.get("/api/student/me").json()["team"] is None
    assert s2.put("/api/student/team", json={"team": "abc"}).status_code == 400
    me = s2.put("/api/student/team", json={"team": "9"}).json()
    assert me["team"] == "Nhóm 9" and me["team_set_by"] == "student"
    s1 = student(app, "SV0001", team="Nhóm 12")  # a typed team beats the Phoenix guess and survives a refresh
    store.ingest_phoenix(con, "SV0001", ics_feed.parse(ICS))
    assert s1.get("/api/student/me").json()["team"] == "Nhóm 12"
    assert s1.put("/api/student/team", json={"team": ""}).json()["team"] == "Nhóm 7"  # cleared -> back to guess


def test_login_errors_and_lockout(env):
    _, app = env
    c = TestClient(app)
    for _ in range(auth.MAX_FAILS):
        assert c.post("/api/auth/login", json={"username": "giaovu", "password": "sai"}).status_code == 401
    assert c.post("/api/auth/login", json={"username": "giaovu", "password": PW}).status_code == 429


def test_admin_edits_timetable_and_students_see_it(env):
    con, app = env
    a = client(app, "giaovu")
    sess = a.get("/api/admin/sessions?cls=L3A").json()
    lab = [s for s in sess if s["name"] == "LAB 13"][0]
    assert {r["code"]: r["students"] for r in lab["rooms"]}["H201"] == 1
    r = a.patch("/api/admin/sessions/%s" % lab["id"], json={"room_from": "H201", "room_to": "E305", "start": "09:30"})
    assert r.status_code == 200 and r.json()["students_moved"] == 1 and r.json()["moved"]
    s1 = student(app, "SV0001")
    w = s1.get("/api/week?monday=2026-11-23").json()
    item = [i for i in w["items"] if i["id"] == lab["id"]][0]
    assert item["my_room"] == "E305" and item["start"].startswith("2026-11-23T09:30")
    assert any(c["new_room"] == "E305" for c in w["room_changes"])
    assert a.patch("/api/admin/sessions/%s" % lab["id"], json={"room_from": "Z1", "room_to": "E305"}).status_code == 400
    assert con.execute("SELECT count(*) n FROM audit_log WHERE action='update_session'").fetchone()["n"] == 1


def test_admin_creates_mentor_who_must_change_password(env):
    _, app = env
    a = client(app, "giaovu")
    r = a.post("/api/admin/users", json={"username": "mentor.a", "role": "mentor", "password": "tam-thoi-123",
                                         "teams": ["7"]})
    assert r.status_code == 200 and r.json()["teams"] == ["Nhóm 7"]
    assert a.post("/api/admin/users", json={"username": "x.y", "role": "student", "password": PW}).status_code == 400
    m = client(app, "mentor.a", "tam-thoi-123")
    assert m.get("/api/mentor/duties").status_code == 403  # temporary password must be changed first
    assert m.post("/api/auth/password", json={"old": "tam-thoi-123", "new": PW}).status_code == 200
    assert m.get("/api/mentor/duties?date_from=2026-11-01&date_to=2026-12-31").status_code == 200


def test_mentor_adjusts_only_own_team_and_students_see_it(env):
    con, app = env
    a = client(app, "giaovu")
    for name, team in (("mentor.a", "7"), ("mentor.b", "9")):
        uid = a.post("/api/admin/users", json={"username": name, "role": "mentor", "password": PW,
                                               "teams": [team]}).json()["id"]
        con.execute("UPDATE users SET must_change=0 WHERE id=?", (uid,))
        con.commit()
    ma, mb = client(app, "mentor.a"), client(app, "mentor.b")
    rng = "?date_from=2026-11-01&date_to=2026-12-31"
    assert [d["id"] for d in ma.get("/api/mentor/duties" + rng).json()["duties"]] == [DUTY]
    assert mb.get("/api/mentor/duties" + rng).json()["duties"] == []
    # another team's mentor cannot move it
    assert mb.patch("/api/mentor/duties/" + DUTY, json={"start": "2026-11-23T19:00"}).status_code == 403
    r = ma.patch("/api/mentor/duties/" + DUTY, json={"start": "2026-11-23T19:00", "end": "2026-11-23T21:00"})
    assert r.status_code == 200
    assert ma.post("/api/mentor/duties", json={"team": "Nhóm 7", "start": "2026-11-25T20:00",
                                               "end": "2026-11-25T19:00"}).status_code == 400  # end before start
    new = ma.post("/api/mentor/duties", json={"team": "Nhóm 7", "start": "2026-11-25T20:00", "end": "2026-11-25T22:00",
                                              "note": "Ôn demo"}).json()
    s1 = student(app, "SV0001")
    duty_items = [i for i in s1.get("/api/week?monday=2026-11-23").json()["items"] if i["kind"] == "mentor_duty"]
    by_id = {i["id"]: i for i in duty_items}
    assert by_id[DUTY]["start"] == "2026-11-23T19:00:00+07:00" and by_id[DUTY]["changed_by_mentor"]
    assert by_id[new["id"]]["note"] == "Ôn demo"
    # cancel, then undo back to the Phoenix time
    assert ma.patch("/api/mentor/duties/" + DUTY, json={"cancelled": True}).json()["cancelled"]
    w = s1.get("/api/week?monday=2026-11-23").json()
    assert [i for i in w["items"] if i["id"] == DUTY][0]["cancelled"] and not w["clashes"]
    assert ma.delete("/api/mentor/duties/" + DUTY).status_code == 200
    back = [i for i in s1.get("/api/week?monday=2026-11-23").json()["items"] if i["id"] == DUTY][0]
    assert back["start"] == "2026-11-23T10:00:00+07:00" and not back.get("cancelled")


def test_admin_reset_password_invalidates_sessions(env):
    con, app = env
    a = client(app, "giaovu")
    uid = a.post("/api/admin/users", json={"username": "mentor.a", "role": "mentor", "password": PW,
                                           "teams": ["7"]}).json()["id"]
    con.execute("UPDATE users SET must_change=0 WHERE id=?", (uid,))
    con.commit()
    m = client(app, "mentor.a")
    temp = a.post("/api/admin/users/%d/reset" % uid).json()["temporary_password"]
    assert m.get("/api/mentor/duties").status_code == 401  # old session is gone
    m2 = client(app, "mentor.a", temp)
    assert m2.get("/api/mentor/duties").status_code == 403  # must change the temporary password first


def test_first_timetable_upload_needs_no_sign_in_only_once(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", str(tmp_path / "empty.db"))
    from codebase.web import server
    c = TestClient(server.app)
    assert c.get("/api/setup/status").json()["timetable"] is False
    files = {"file": ("Thoi_khoa_bieu_TEST.html", tkb_html().encode("utf-8"), "text/html")}
    r = c.post("/api/setup/timetable", files=files)
    assert r.status_code == 200 and r.json()["students"] == 2
    assert c.get("/api/setup/status").json()["timetable"] is True
    assert c.post("/api/setup/timetable", files=files).status_code == 403  # later updates: admin only
    assert c.post("/api/admin/ingest", files=files).status_code == 401
