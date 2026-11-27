# CLAUDE.md — Codebusters (AI20K hackathon, Track A)

@AGENTS.md
@docs/PLAN.md

## What you are building
A web app that merges an AI20K student's official weekly timetable with their Phoenix events, shows each session's
room on the campus map, and drafts a leave-request email with AI that the student reviews and sends themselves.
The **graded AI slice** is the leave-request workflow in `codebase/agent.py` (see docs/PLAN.md §1, §3).

## Environment
- Python: use `.venv/bin/python` (3.12). The framework (`run.py`, `eval/`, `cost/`) must keep working on stdlib only.
- Web: FastAPI + uvicorn + vanilla HTML/JS in `codebase/web/` (no build step, no npm). Calendar UI may load
  FullCalendar from a CDN.
- Start web app: `.venv/bin/python -m uvicorn codebase.web.server:app --reload --port 8000` (to be created).
- Model calls go **only** through `codebase/ai.py::call_model` (keeps token tracing). Provider/key in `.env`.
- Data layer (built, tested — reuse, don't rewrite): `codebase/tkb.py` (timetable parser), `codebase/ics_feed.py`
  (Phoenix feed), `codebase/mail_ingest.py` (timetable from .eml/inbox), `codebase/store.py` (SQLite at
  `data/private/app.db`: `ingest_tkb`, `ingest_phoenix`, `week(student_id, monday)` with clashes).
  Shared Postgres (Neon) when `DATABASE_URL` is set in `.env` (`codebase/db.py`: same SQLite-style SQL, `?`
  placeholders, `with con:` transactions); unset = SQLite. Tests use SQLite unless `TEST_DATABASE_URL` is set
  (then a throwaway `cb_test` schema). `DATABASE_URL` holds a password: never print, log or commit it.
  CLI: `python3 scripts/ingest.py inbox|tkb|phoenix|week`. Tests: `.venv/bin/pytest -q tests`.
- Roles (branch backend-roles): `codebase/auth.py` (accounts, PBKDF2 passwords, cookie sessions, lockout),
  `codebase/admin.py` (admin timetable edits), `codebase/duties.py` (mentor duty changes layered over Phoenix).
  Only admins and mentors sign in; students have no account: they enter their student ID (+ optional team, editable
  in settings; a typed team beats the Phoenix guess), kept in a plain cookie. First admin:
  `python3 scripts/users.py create-admin --username <name>`. Route list: top of `codebase/web/server.py`, or `/docs`.
- Team meetings (`codebase/meetings.py`): a student signs in with a password (only for this; tables
  `student_accounts`, `student_sessions`) to schedule; teammates see link + passcode with their ID only and get a push.
  Suggestions = slots with no REQUIRED item for any teammate (class sessions, team mentor duty, other meetings);
  workshops / office hours only flag an overlap.
- Phoenix feed URLs are secrets. Never print, log, commit, or send them to the model.

## Hard rules (in addition to AGENTS.md)
1. `answer(text)` in `codebase/agent.py` is the contract `run.py eval` / `simulate` call. Input may be a JSON string
   (structured leave request) or free text. Return `{"output": <JSON string of the AI output contract>}`.
2. Never edit `run.py`, `codebase/tracing.py`, `eval/run_eval.py`, `cost/simulate.py` except `run_app()` in `run.py`.
3. Never commit `data/private/`, the source schedule HTML, `.env`, uploads. Only `data/schedule_groups.json`
   (class-level, no student data) and synthetic fixtures are committed.
4. Nothing sends email and the app never handles attachments. Handoff = Outlook Web compose link + copy buttons;
   the student attaches evidence in Outlook. Recipient comes from config.
5. Guards are code, not prompt: validate model JSON, check every date/time/room in the draft exists in the facts.
6. User-facing text and email drafts are **Vietnamese**, formal register. Code, comments, identifiers in English.
7. Small, reviewable diffs. After each task run `python3 run.py check` and `python3 run.py` (fake mode must still work).
8. Do not touch `eval/benchmark.csv` expected values to match outputs; do not edit `spec.md` §7 after CP2.
