"""Command-line ingestion into the private app DB (data/private/app.db).

    python3 scripts/ingest.py inbox                       # ingest every .eml/.html in data/private/inbox/
    python3 scripts/ingest.py tkb PATH.html|PATH.eml      # ingest one timetable (also refreshes data/schedule_groups.json)
    python3 scripts/ingest.py phoenix STUDENT_ID          # fetch feed from PHOENIX_ICS_URL in .env (or --url / --file)
    python3 scripts/ingest.py week STUDENT_ID 2026-11-23  # print the combined week as JSON
"""
import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "codebase"))

import ai  # noqa: E402,F401  (loads .env into os.environ)
import ics_feed  # noqa: E402
import mail_ingest  # noqa: E402
import store  # noqa: E402
from tkb import parse, public_view  # noqa: E402

INBOX = os.path.join(ROOT, "data", "private", "inbox")


def _ingest_html(con, html, source):
    res = store.ingest_tkb(con, html, source=source)
    with open(os.path.join(ROOT, "data", "schedule_groups.json"), "w", encoding="utf-8") as f:
        json.dump(public_view(parse(html)), f, ensure_ascii=False, indent=1)
    print("%s: version %s · new=%s · %d students · %d room changes"
          % (source, res["version"], res["new"], res["students"], res["room_changes"]))


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("inbox")
    p = sub.add_parser("tkb"); p.add_argument("path")
    p = sub.add_parser("phoenix"); p.add_argument("student_id"); p.add_argument("--url"); p.add_argument("--file")
    p = sub.add_parser("week"); p.add_argument("student_id"); p.add_argument("monday")
    a = ap.parse_args(argv)
    con = store.connect()

    if a.cmd == "inbox":
        os.makedirs(INBOX, exist_ok=True)
        for path, r in mail_ingest.scan_inbox(INBOX):
            if r["ok"]:
                _ingest_html(con, r["html"], "inbox:%s" % os.path.basename(path))
            else:
                print("skipped %s: %s" % (os.path.basename(path), r["reason"]))
    elif a.cmd == "tkb":
        if a.path.lower().endswith(".eml"):
            with open(a.path, "rb") as f:
                r = mail_ingest.extract_from_eml(f.read())
            if not r["ok"]:
                sys.exit("rejected: " + r["reason"])
            html = r["html"]
        else:
            with open(a.path, encoding="utf-8") as f:
                html = f.read()
        _ingest_html(con, html, "file:%s" % os.path.basename(a.path))
    elif a.cmd == "phoenix":
        if a.file:
            with open(a.file, encoding="utf-8") as f:
                text = f.read()
        else:
            url = a.url or os.environ.get("PHOENIX_ICS_URL", "")
            if not url:
                sys.exit("set PHOENIX_ICS_URL in .env or pass --url / --file")
            store.set_phoenix_feed(con, a.student_id, url)
            text = ics_feed.fetch(url)
        n = store.ingest_phoenix(con, a.student_id, ics_feed.parse(text))
        print("phoenix: %d events stored for %s" % (n, a.student_id))
    elif a.cmd == "week":
        print(json.dumps(store.week(con, a.student_id, a.monday), ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
