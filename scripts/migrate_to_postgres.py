"""Copy the local SQLite DB (data/private/app.db, or APP_DB) into the Postgres DB at DATABASE_URL (e.g. Neon).

    python scripts/migrate_to_postgres.py            # target must be empty
    python scripts/migrate_to_postgres.py --replace  # wipe the target tables first, then copy

Prints row counts only. DATABASE_URL holds a password and the data holds student IDs, names and Phoenix feed
URLs: nothing of either is printed.
"""
import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

import store  # noqa: E402

TABLES = ["tkb_versions", "sessions", "students", "student_rooms", "phoenix_events", "room_changes", "tokens",
          "push_subs", "notified", "users", "auth_sessions", "mentor_teams", "duty_changes", "audit_log",
          "student_accounts", "student_sessions", "team_meetings"]


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

    src = store.connect(src_path)  # opens SQLite and adds any columns / tables an older local DB is missing
    dst = store.PgConnection(url)
    dst.executescript(store.SCHEMA_PG)

    non_empty = [t for t in TABLES if dst.execute("SELECT count(*) AS n FROM %s" % t).fetchone()["n"]]
    if non_empty and not a.replace:
        sys.exit("Target already has rows in: %s. Re-run with --replace to overwrite." % ", ".join(non_empty))

    with dst:
        for t in TABLES:
            if a.replace:
                dst.execute("DELETE FROM %s" % t)
            cur = src.execute("SELECT * FROM %s" % t)
            cols = [d[0] for d in cur.description]
            rows = [tuple(r) for r in cur.fetchall()]
            if rows:  # by column name: an older local DB may have its columns in another order
                dst.executemany('INSERT INTO %s (%s) VALUES (%s)' % (t, ",".join('"%s"' % c for c in cols),
                                                                     ",".join("?" * len(cols))), rows)
            print("%-17s %6d rows" % (t, len(rows)))
        # users.id is SERIAL on Postgres: move its counter past the copied ids so new accounts do not collide
        dst.execute("SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT max(id) FROM users), 0) + 1, false)")
    dst.close()
    print("Done. The app now uses Postgres whenever DATABASE_URL is set (and APP_DB is not).")


if __name__ == "__main__":
    main()
