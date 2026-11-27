"""Postgres backend of store.py. Runs only when TEST_DATABASE_URL is set, inside a throwaway schema, so it never
touches the app's real tables. Synthetic fixtures only."""
import os
import sys
import uuid

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "codebase"))

import ics_feed  # noqa: E402
import notify  # noqa: E402
import store  # noqa: E402
from test_ingest import ICS, tkb_html  # noqa: E402

URL = os.environ.get("TEST_DATABASE_URL", "")


def test_placeholders_are_rewritten():
    assert store._pg_sql("SELECT * FROM t WHERE a=? AND b=?") == "SELECT * FROM t WHERE a=%s AND b=%s"


def test_explicit_path_and_app_db_stay_on_sqlite(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@example.invalid/db")
    assert not isinstance(store.connect(str(tmp_path / "t.db")), store.PgConnection)
    monkeypatch.setenv("APP_DB", str(tmp_path / "u.db"))
    monkeypatch.setattr(store, "DB_PATH", str(tmp_path / "u.db"))
    assert not isinstance(store.connect(), store.PgConnection)


@pytest.fixture
def pg():
    if not URL:
        pytest.skip("TEST_DATABASE_URL not set")
    # Everything runs in one transaction that is always rolled back: the throwaway schema and the SET LOCAL vanish
    # with it. A plain SET would stick to a shared server connection behind Neon's pooler (PgBouncer).
    con = store.PgConnection(URL)
    tx = con._con.transaction(force_rollback=True)
    tx.__enter__()
    con._tx.append(tx)
    schema = "test_" + uuid.uuid4().hex[:10]
    con.execute("CREATE SCHEMA %s" % schema)
    con.execute("SET LOCAL search_path TO %s" % schema)
    con.executescript(store.SCHEMA)
    yield con
    con._tx.pop().__exit__(None, None, None)
    con.close()


def test_pg_ingest_week_and_upserts(pg):
    r1 = store.ingest_tkb(pg, tkb_html())
    assert r1["new"] and r1["students"] == 2
    assert not store.ingest_tkb(pg, tkb_html())["new"]
    assert store.ingest_tkb(pg, tkb_html(lab_room="E305"))["room_changes"] == 1
    store.ingest_phoenix(pg, "SV0001", ics_feed.parse(ICS))
    w = store.week(pg, "SV0001", "2026-11-23")
    assert [i for i in w["items"] if i["id"] == "L3A-00"][0]["my_room"] == "E305"
    assert ["L3A-00", "duty:1:1:1@phoenix.note.transformerlabs.ai"] in w["clashes"]
    assert store.token_for(pg, "SV0001", "cal") == store.token_for(pg, "SV0001", "cal")
    notify.subscribe(pg, "SV0001", {"endpoint": "https://push.example/1"})
    notify.subscribe(pg, "SV0002", {"endpoint": "https://push.example/1"})
    assert pg.execute("SELECT student_id FROM push_subs").fetchone()["student_id"] == "SV0002"
    assert notify._once(pg, "k") and not notify._once(pg, "k")  # duplicate key rolls back cleanly
