"""Tests never call a real model or start the reminder loop, whatever .env says.

Database: SQLite by default (DATABASE_URL is cleared). To run the same tests on Postgres, set TEST_DATABASE_URL:
they then use a throwaway schema `cb_test`, wiped before every test, so real tables are never touched.
    TEST_DATABASE_URL='postgresql://…' .venv/bin/pytest -q tests
"""
import os
import urllib.parse

import pytest

os.environ["MODEL_PROVIDER"] = "fake"
os.environ["NOTIFY_LOOP"] = "0"
TEST_PG = os.environ.get("TEST_DATABASE_URL", "").strip()
if TEST_PG:
    sep = "&" if "?" in TEST_PG else "?"
    os.environ["DATABASE_URL"] = TEST_PG + sep + "options=" + urllib.parse.quote("-csearch_path=cb_test")
else:
    os.environ["DATABASE_URL"] = ""


@pytest.fixture(autouse=True)
def _fresh_pg_schema():
    if not TEST_PG:
        yield
        return
    import psycopg
    with psycopg.connect(TEST_PG, autocommit=True) as c:
        c.execute("DROP SCHEMA IF EXISTS cb_test CASCADE")
        c.execute("CREATE SCHEMA cb_test")
    import store
    store.connect().executescript(store.SCHEMA_PG)  # existing per-thread connections need the tables too
    yield
