"""Copy the local SQLite DB (data/private/app.db, or APP_DB) into the Postgres DB at DATABASE_URL (e.g. Neon).

    python scripts/migrate_to_postgres.py            # target must be empty
    python scripts/migrate_to_postgres.py --replace  # wipe the target tables first, then copy

Prints row counts only. DATABASE_URL holds a password and the data holds student IDs, names and Phoenix feed
URLs: nothing of either is printed.
"""
import argparse
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

import store  # noqa: E402

TABLES = ["tkb_versions", "sessions", "students", "student_rooms", "phoenix_events", "room_changes", "tokens",
          "push_subs", "notified"]


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--replace", action="store_true", help="delete existing rows in the target first")
    a = ap.parse_args()

    url = store._env("DATABASE_URL")
    if not url.startswith(("postgres://", "postgresql://")):
        sys.exit("DATABASE_URL (postgresql://…) is not set in the environment or .env")
    src_path = os.environ.get("APP_DB") or store.DB_PATH
    if not os.path.exists(src_path):
        sys.exit("No SQLite DB at %s" % os.path.relpath(src_path, ROOT))

    src = sqlite3.connect(src_path)
    dst = store.PgConnection(url)
    dst.executescript(store.SCHEMA)

    non_empty = [t for t in TABLES if dst.execute("SELECT count(*) AS n FROM %s" % t).fetchone()["n"]]
    if non_empty and not a.replace:
        sys.exit("Target already has rows in: %s. Re-run with --replace to overwrite." % ", ".join(non_empty))

    with dst:
        for t in TABLES:
            if a.replace:
                dst.execute("DELETE FROM %s" % t)
            cur = src.execute("SELECT * FROM %s" % t)
            rows = cur.fetchall()
            if rows:
                marks = ",".join("?" * len(cur.description))
                dst.executemany("INSERT INTO %s VALUES (%s)" % (t, marks), rows)
            print("%-15s %6d rows" % (t, len(rows)))
    dst.close()
    print("Done. The app now uses Postgres whenever DATABASE_URL is set (and APP_DB is not).")


if __name__ == "__main__":
    main()
