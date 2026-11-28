"""Ingestion tests on SYNTHETIC fixtures only (no real student data in the repo)."""
import os
import sys
from email.message import EmailMessage

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "codebase"))

import ics_feed  # noqa: E402
import mail_ingest  # noqa: E402
import store  # noqa: E402


def tkb_html(lab_room="H201"):
    groups = ('{"L3A":{"label":"L3A","level":"L3","items":['
              '{"d":"2026-11-23","slot":"Sáng","kind":"LAB","name":"LAB 13","rooms":["H201","C401"],"time":["09:00","13:00"]},'
              '{"d":"2026-11-23","slot":"Chiều","kind":"LEC","name":"LEC 14","rooms":["H209","H203*"],"time":["14:00","18:00"]}]}}')
    stu = '{"SV0001":["L3A","%s","H209"],"SV0002":["L3A","C401","H203*"]}' % lab_room
    who = '{"SV0001":["N.V.A",""],"SV0002":["T.T.B",""]}'
    return ("<html><body><script>\nconst GROUPS=%s;\nconst STU=%s;\nconst WHO=%s;\n"
            "const HOLI={'2026-11-24':'Nghỉ lễ'};\n</script></body></html>" % (groups, stu, who))


ICS = """BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:duty:1:1:1@phoenix.note.transformerlabs.ai
DTSTART:20261123T030000Z
DTEND:20261123T040000Z
SUMMARY:Nhóm 7
DESCRIPTION:Chủ trì: Mentor\\, A
END:VEVENT
BEGIN:VEVENT
UID:daily:2026-11-23@phoenix.note.transformerlabs.ai
DTSTART:20261123T030000Z
DTEND:20261123T030000Z
SUMMARY:Hạn nộp daily
  standup
END:VEVENT
END:VCALENDAR
"""


def eml(sender, filename="Thoi_khoa_bieu_test.html", html=None):
    m = EmailMessage()
    m["From"], m["To"], m["Subject"] = sender, "student@example.edu", "TKB tuần"
    m.set_content("Gửi các bạn lịch tuần tới.")
    m.add_attachment((html or tkb_html()).encode("utf-8"), maintype="text", subtype="html", filename=filename)
    return m.as_bytes()


def test_ingest_is_idempotent_and_diffs_rooms(tmp_path):
    con = store.connect(str(tmp_path / "t.db"))
    r1 = store.ingest_tkb(con, tkb_html())
    assert r1["new"] and r1["students"] == 2
    assert not store.ingest_tkb(con, tkb_html())["new"]
    r3 = store.ingest_tkb(con, tkb_html(lab_room="E305"))
    assert r3["new"] and r3["room_changes"] == 1


def test_ingest_merges_non_overlapping_weeks(tmp_path):
    con = store.connect(str(tmp_path / "t.db"))
    store.ingest_tkb(con, tkb_html())
    week2_html = tkb_html(lab_room="E305").replace("2026-11-23", "2026-12-01")
    r2 = store.ingest_tkb(con, week2_html)
    assert r2["new"] and r2["room_changes"] == 0
    w1 = store.week(con, "SV0001", "2026-11-23")
    w2 = store.week(con, "SV0001", "2026-11-30")
    assert len(w1["items"]) == 2
    assert len(w2["items"]) == 2
    assert w1["items"][0]["my_room"] == "H201"
    assert w2["items"][0]["my_room"] == "E305"


def test_ingest_merges_phase2_different_class_name(tmp_path):
    con = store.connect(str(tmp_path / "t.db"))
    store.ingest_tkb(con, tkb_html())
    phase2_html = (
        '<html><body><script>\n'
        'const GROUPS={"T3A":{"label":"L3 · Track 3A","level":"AI Apps","items":['
        '{"d":"2026-11-30","slot":"Sáng","kind":"L3","name":"Chuyên sâu 1","rooms":["H210"],"time":["09:00","13:00"]}]}};\n'
        'const STU={"SV0001":["T3A","H210"]};\n'
        'const WHO={"SV0001":["N.V.A",""]};\n'
        'const HOLI={};\n'
        '</script></body></html>'
    )
    r2 = store.ingest_tkb(con, phase2_html)
    assert r2["new"]
    w1 = store.week(con, "SV0001", "2026-11-23")
    w2 = store.week(con, "SV0001", "2026-11-30")
    assert len(w1["items"]) == 2 and w1["items"][0]["my_room"] == "H201"
    assert len(w2["items"]) == 1 and w2["items"][0]["my_room"] == "H210"


def test_ics_parse_times_categories_and_folding():
    ev = ics_feed.parse(ICS)
    duty = [e for e in ev if e["category"] == "mentor_duty"][0]
    assert duty["start"] == "2026-11-23T10:00:00+07:00" and not duty["is_deadline"]
    assert duty["description"] == "Chủ trì: Mentor, A"
    dl = [e for e in ev if e["category"] == "deadline"][0]
    assert dl["is_deadline"] and dl["title"] == "Hạn nộp daily standup"


def test_week_merges_sources_and_finds_clash(tmp_path):
    con = store.connect(str(tmp_path / "t.db"))
    store.ingest_tkb(con, tkb_html())
    store.ingest_phoenix(con, "SV0001", ics_feed.parse(ICS))
    w = store.week(con, "SV0001", "2026-11-23")
    lab = [i for i in w["items"] if i["id"] == "L3A-00"][0]
    assert lab["my_room"] == "H201"
    assert ["L3A-00", "duty:1:1:1@phoenix.note.transformerlabs.ai"] in w["clashes"]
    assert not any("daily" in pair[0] or "daily" in pair[1] for pair in w["clashes"])


def test_eml_sender_and_attachment_checks(monkeypatch):
    monkeypatch.setenv("TKB_ALLOWED_SENDERS", "admin@example.edu")
    assert mail_ingest.extract_from_eml(eml("Admin <admin@example.edu>"))["ok"]
    assert mail_ingest.extract_from_eml(eml("attacker@example.com"))["reason"].startswith("sender not allowed")
    assert not mail_ingest.extract_from_eml(eml("admin@example.edu", filename="other.html"))["ok"]
    monkeypatch.setenv("TKB_ALLOWED_SENDERS", "")
    assert not mail_ingest.extract_from_eml(eml("admin@example.edu"))["ok"]  # nothing configured = trust no one


def test_feed_url_whitelist():
    import pytest
    with pytest.raises(ValueError):
        ics_feed.fetch("https://evil.example.com/feed.ics")
