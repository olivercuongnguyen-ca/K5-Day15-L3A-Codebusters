"""Print the web-push signing key (VAPID) as one line for .env, so every machine sharing the database signs alike.

    python3 scripts/vapid_key.py            # converts data/private/vapid_private.pem (creates one if missing)
    python3 scripts/vapid_key.py --new      # a brand-new key (phones subscribed with the old key must re-subscribe)

Then put in .env:  VAPID_PRIVATE_KEY=<printed value>   — a secret: share it only with the team, never commit it.
"""
import base64
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEY_PATH = os.path.join(ROOT, "data", "private", "vapid_private.pem")


def main():
    from py_vapid import Vapid01
    if "--new" in sys.argv or not os.path.exists(KEY_PATH):
        v = Vapid01()
        v.generate_keys()
    else:
        v = Vapid01.from_file(KEY_PATH)
    raw = v.private_key.private_numbers().private_value.to_bytes(32, "big")
    print(base64.urlsafe_b64encode(raw).rstrip(b"=").decode())


if __name__ == "__main__":
    main()
