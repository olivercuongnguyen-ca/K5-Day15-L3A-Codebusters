"""Web Push (VAPID) + the reminder loop.

Signing key (VAPID): VAPID_PRIVATE_KEY in .env (base64url raw P-256 key, a secret). Every machine that shares a
database must use the same key, because each phone subscription is bound to the key it subscribed with. Without it the
app falls back to a per-machine key file, data/private/vapid_private.pem (gitignored) — fine for one machine only.
Print the key to put in .env: python3 scripts/vapid_key.py
Loop (every 60 s, started by the web server):
  - deadline reminders 24 h and 1 h before each Phoenix deadline
  - class reminder 60 min before each timetable session, with the student's room
  - hourly re-fetch of linked Phoenix feeds
Room-change pushes are sent right after a new timetable version is ingested (see notify_room_changes).
Each notification is sent at most once (table `notified`).
"""
import base64
import json
import os
import threading
import time
from datetime import datetime, timedelta, timezone

import ics_feed
import store

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_PATH = os.path.join(ROOT, "data", "private", "vapid_private.pem")
CLAIMS = {"sub": "mailto:codebusters@example.com"}
VN = timezone(timedelta(hours=7))


_VAPID = None


def vapid():
    """The signing key: VAPID_PRIVATE_KEY from the environment, else the local key file (created if missing)."""
    global _VAPID
    if _VAPID is None:
        from py_vapid import Vapid01
        raw = (os.environ.get("VAPID_PRIVATE_KEY") or "").strip()
        if raw:
            _VAPID = Vapid01.from_raw(raw.encode())
        else:
            if os.environ.get("DATABASE_URL"):
                print("Cảnh báo: chưa có VAPID_PRIVATE_KEY trong .env nhưng đang dùng DB chung — thông báo đẩy chỉ "
                      "hoạt động với thiết bị đăng ký qua máy này. Xem scripts/vapid_key.py.")
            if not os.path.exists(KEY_PATH):
                v = Vapid01()
                v.generate_keys()
                os.makedirs(os.path.dirname(KEY_PATH), exist_ok=True)
                v.save_key(KEY_PATH)
            _VAPID = Vapid01.from_file(KEY_PATH)
    return _VAPID


def public_key() -> str:
    """Base64url uncompressed P-256 public key for PushManager.subscribe."""
    from cryptography.hazmat.primitives import serialization
    raw = vapid().public_key.public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def subscribe(con, student_id: str, sub: dict):
    with con:
        con.execute("INSERT INTO push_subs VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET "
                    "student_id=excluded.student_id, sub=excluded.sub, created_at=excluded.created_at",
                    (sub["endpoint"], student_id, json.dumps(sub), datetime.now(VN).isoformat(timespec="seconds")))


def send(con, student_id: str, title: str, body: str, url: str = "/", tag: str = None) -> int:
    """Push to every device of a student. Expired subscriptions are removed. Returns devices reached."""
    from pywebpush import WebPushException, webpush
    sent = 0
    for row in con.execute("SELECT endpoint, sub FROM push_subs WHERE student_id=?", (student_id,)).fetchall():
        try:
            webpush(json.loads(row["sub"]), json.dumps({"title": title, "body": body, "url": url, "tag": tag}),
                    vapid_private_key=vapid(), vapid_claims=dict(CLAIMS))
            sent += 1
        except WebPushException as e:
            if e.response is not None and e.response.status_code in (404, 410):
                with con:
                    con.execute("DELETE FROM push_subs WHERE endpoint=?", (row["endpoint"],))
    return sent


def _once(con, key: str) -> bool:
    try:
        with con:
            con.execute("INSERT INTO notified VALUES (?,?)", (key, datetime.now(VN).isoformat(timespec="seconds")))
        return True
    except Exception:
        return False


def notify_room_changes(con, version: str):
    for c in con.execute("SELECT c.*, s.name, s.date, s.start FROM room_changes c JOIN sessions s ON s.id=c.session_id "
                         "WHERE c.version=?", (version,)).fetchall():
        if _once(con, "room:%s:%s:%s" % (version, c["student_id"], c["session_id"])):
            send(con, c["student_id"], "Phòng học đã đổi",
                 "%s ngày %s/%s lúc %s: %s → %s" % (c["name"], c["date"][8:], c["date"][5:7], c["start"],
                                                    c["old_room"] or "—", c["new_room"]), tag="room")


def tick(con, now=None):
    now = now or datetime.now(VN)
    for row in con.execute("SELECT DISTINCT student_id FROM push_subs").fetchall():
        sid = row["student_id"]
        horizon = (now + timedelta(hours=25)).isoformat()
        for i in store.all_items(con, sid):
            start = datetime.fromisoformat(i["start"])
            if not (now < start and i["start"] <= horizon):
                continue
            left = start - now
            if i.get("is_deadline"):
                for label, win in (("24h", timedelta(hours=24)), ("1h", timedelta(hours=1))):
                    if left <= win and _once(con, "dl:%s:%s:%s" % (sid, i["id"], label)):
                        send(con, sid, "Sắp đến hạn: " + i["title"],
                             "Còn %s — hạn lúc %s %s/%s" % ("dưới 1 giờ" if label == "1h" else "dưới 24 giờ",
                                                          i["start"][11:16], i["start"][8:10], i["start"][5:7]),
                             tag="deadline")
            elif i["source"] == "tkb" and left <= timedelta(minutes=60) and _once(con, "cls:%s:%s" % (sid, i["id"])):
                where = "Online" if i["kind"] == "ONL" else ("phòng " + i["my_room"] if i.get("my_room") else "chưa có phòng")
                send(con, sid, "%s lúc %s" % (i["title"], i["start"][11:16]), "Bắt đầu sau ít hơn 1 giờ · " + where,
                     tag="class")


def refresh_feeds(con, max_age=timedelta(hours=1)):
    now = datetime.now(VN)
    for st in con.execute("SELECT id, phoenix_url, phoenix_synced_at FROM students WHERE phoenix_url IS NOT NULL").fetchall():
        if st["phoenix_synced_at"] and now - datetime.fromisoformat(st["phoenix_synced_at"]) < max_age:
            continue
        try:
            store.ingest_phoenix(con, st["id"], ics_feed.parse(ics_feed.fetch(st["phoenix_url"])))
        except Exception:
            pass


def start_loop(interval=60):
    def run():
        con = store.connect()
        while True:
            try:
                refresh_feeds(con)
                tick(con)
            except Exception as e:  # keep the loop alive
                print("[notify] %s: %s" % (type(e).__name__, e))
            time.sleep(interval)
    threading.Thread(target=run, daemon=True, name="notify-loop").start()
