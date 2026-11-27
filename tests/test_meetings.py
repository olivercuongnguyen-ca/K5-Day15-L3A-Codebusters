"""Team meetings on SYNTHETIC data: free-time suggestions, sign-in to schedule, teammates see it without signing in."""
import os
import sys
from datetime import datetime

import pytest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(os.path.dirname(HERE), "codebase"), os.path.dirname(HERE), HERE]

from fastapi.testclient import TestClient  # noqa: E402

import auth  # noqa: E402
import ics_feed  # noqa: E402
import meetings  # noqa: E402
import notify  # noqa: E402
import store  # noqa: E402
from test_ingest import ICS, tkb_html  # noqa: E402

PW = "mat-khau-thu-1"
NOW = datetime(2026, 11, 23, 7, 0, tzinfo=meetings.VN)  # Monday: LAB 13 09–13, LEC 14 14–18, duty 10–11


class FixedNow(datetime):
    @classmethod
    def now(cls, tz=None):
        return NOW


@pytest.fixture()
def env(tmp_path, monkeypatch):
    monkeypatch.setattr(store, "DB_PATH", str(tmp_path / "app.db"))
    monkeypatch.setattr(meetings, "datetime", FixedNow)
    sent = []
    monkeypatch.setattr(notify, "send", lambda con, sid, title, body, **kw: sent.append((sid, title, body)) or 1)
    auth._fails.clear()
    con = store.connect()
    store.ingest_tkb(con, tkb_html())
    store.ingest_phoenix(con, "SV0001", ics_feed.parse(ICS))   # SV0001 -> Nhóm 7 from the duty title
    store.set_student_team(con, "SV0002", "7")
    from codebase.web import server
    return con, server.app, sent


def student(app, sid):
    c = TestClient(app)
    assert c.post("/api/student/enter", json={"student_id": sid}).status_code == 200
    return c


def test_suggestions_avoid_required_schedule(env):
    con, app, _ = env
    s = student(app, "SV0001").get("/api/meetings/suggest?duration=60&days=2").json()
    starts = [x["start"][:16] for x in s["suggestions"]]
    # 23/11: free 08:00–09:00 and 13:00–14:00 (LAB 09–13, mentor duty 10–11, LEC 14–18); 24/11 is a holiday
    assert starts[:2] == ["2026-11-23T08:00", "2026-11-23T13:00"]
    assert starts[2] == "2026-11-24T08:00"
    assert s["team"] == "Nhóm 7" and s["members"] == 2


def test_scheduling_needs_a_password_and_teammates_see_it(env):
    con, app, sent = env
    s1 = student(app, "SV0001")
    meet = {"start": "2026-11-23T19:00", "end": "2026-11-23T20:00", "link": "https://meet.google.com/abc-defg-hij",
            "passcode": "4321", "title": "Chốt demo"}
    assert s1.post("/api/meetings", json=meet).status_code == 401          # viewing by ID is not enough
    r = s1.post("/api/student/login", json={"student_id": "sv0001", "password": PW, "create": True})
    assert r.status_code == 200 and r.json()["signed_in"]
    assert s1.post("/api/student/login", json={"student_id": "SV0001", "password": PW, "create": True}).status_code == 409
    assert s1.post("/api/meetings", json=dict(meet, link="meet.google.com/x")).status_code == 400
    r = s1.post("/api/meetings", json=meet)
    assert r.status_code == 200, r.text
    assert [x[0] for x in sent] == ["SV0002"]                               # teammates notified, not the organizer
    s2 = student(app, "SV0002")                                             # teammate: ID only, no password
    items = [i for i in s2.get("/api/week?monday=2026-11-23").json()["items"] if i["kind"] == "team_meeting"]
    assert items and items[0]["url"] == meet["link"] and items[0]["passcode"] == "4321"
    store.set_student_team(con, "SV0002", "9")                              # another team does not see it
    assert not [i for i in s2.get("/api/week?monday=2026-11-23").json()["items"] if i["kind"] == "team_meeting"]


def test_clash_needs_confirmation_and_only_organizer_cancels(env):
    con, app, sent = env
    s1 = student(app, "SV0001")
    s1.post("/api/student/login", json={"student_id": "SV0001", "password": PW, "create": True})
    clash = {"start": "2026-11-23T15:00", "end": "2026-11-23T16:00", "link": "https://zoom.us/j/123"}
    r = s1.post("/api/meetings", json=clash)
    assert r.status_code == 409 and "LEC 14" in r.json()["detail"]
    mid = s1.post("/api/meetings", json=dict(clash, force=True)).json()["id"]
    s2 = student(app, "SV0002")
    s2.post("/api/student/login", json={"student_id": "SV0002", "password": PW, "create": True})
    assert s2.delete("/api/meetings/" + mid).status_code == 403
    assert s1.delete("/api/meetings/" + mid).status_code == 200
    item = [i for i in s2.get("/api/week?monday=2026-11-23").json()["items"] if i["id"] == mid][0]
    assert item["cancelled"]
    # the shared (read-only) link never exposes the meeting link or passcode
    tok = s1.get("/api/share").json()["url"].split("#share-")[1]
    shared = TestClient(app).get("/api/shared/%s?monday=2026-11-23" % tok).json()["items"]
    assert all("passcode" not in i and "url" not in i for i in shared)


def test_student_without_team_cannot_schedule(env):
    con, app, _ = env
    store.set_student_team(con, "SV0002", "")
    s2 = student(app, "SV0002")
    assert s2.get("/api/meetings/suggest").status_code == 400
