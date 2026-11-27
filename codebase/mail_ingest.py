"""Get the weekly timetable out of an email (the trigger for codebase/store.ingest_tkb).

One timetable attachment covers every student, so ingestion is central: one mailbox that receives the program
admin's weekly email is enough for the whole cohort.

Adapters
    eml / inbox folder   (hackathon, real)  an .eml saved from Outlook, or dropped into data/private/inbox/
    upload               (hackathon, real)  admin uploads the .html in the web app
    Microsoft Graph      (production, NOT built)  app registration with Mail.Read on one service mailbox, poll or
                         subscribe to new mail from the admin, download the .html attachment. Needs VinUni IT consent.

Safety: the email is data, not instructions. Only accept mail from allowed_senders() (TKB_ALLOWED_SENDERS in .env) with an .html attachment whose
name starts with "Thoi_khoa_bieu"; anything else is ignored and reported.
"""
import email
import email.policy
import os
import re

from ai import load_env

load_env()


def allowed_senders() -> list:
    """Senders allowed to deliver the timetable, from TKB_ALLOWED_SENDERS in .env (comma-separated).
    Empty = no sender is trusted, so every email is rejected (safe default; no address lives in the code)."""
    return [s.strip().lower() for s in os.environ.get("TKB_ALLOWED_SENDERS", "").split(",") if s.strip()]

NAME_RE = re.compile(r"^Thoi_khoa_bieu.*\.html?$", re.I)


def extract_from_eml(raw: bytes, check_sender: bool = True) -> dict:
    """Return {"ok", "reason", "sender", "subject", "date", "filename", "html"} for a raw RFC 822 message."""
    msg = email.message_from_bytes(raw, policy=email.policy.default)
    sender = email.utils.parseaddr(str(msg.get("From", "")))[1].lower()
    out = {"ok": False, "reason": "", "sender": sender, "subject": str(msg.get("Subject", "")),
           "date": str(msg.get("Date", "")), "filename": None, "html": None}
    if check_sender and sender not in allowed_senders():
        out["reason"] = "sender not allowed: %s" % sender
        return out
    for part in msg.iter_attachments():
        name = part.get_filename() or ""
        if NAME_RE.match(name):
            out.update(ok=True, filename=name, html=part.get_content() if part.get_content_maintype() == "text"
                       else part.get_payload(decode=True).decode("utf-8"))
            return out
    out["reason"] = "no Thoi_khoa_bieu*.html attachment"
    return out


def scan_inbox(folder: str):
    """Yield (path, result) for each .eml / .html file in folder. A bare .html is trusted as an admin upload."""
    for name in sorted(os.listdir(folder)):
        path = os.path.join(folder, name)
        if name.lower().endswith(".eml"):
            with open(path, "rb") as f:
                yield path, extract_from_eml(f.read())
        elif NAME_RE.match(name):
            with open(path, encoding="utf-8") as f:
                yield path, {"ok": True, "reason": "", "sender": "upload", "filename": name, "html": f.read()}
