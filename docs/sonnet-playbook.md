# Using Claude Sonnet (Claude Code) to write the code

## What each teammate needs
1. **Claude Code** installed (`npm i -g @anthropic-ai/claude-code` or the desktop app) and signed in with a Claude
   plan (Pro/Max) **or** an Anthropic Console API key. This is for *writing code*.
2. A separate **runtime key** for the product's own AI call, in `.env` (never committed). BTC gives no keys.
   Suggested: `MODEL_PROVIDER=anthropic`, `MODEL_NAME=claude-haiku-5-5`, `API_KEY=...` from console.anthropic.com.
3. Clone the team repo, then once: `python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt`.
4. Start Sonnet in the repo root: `claude --model sonnet` (or `/model sonnet` inside a session). It auto-loads
   `CLAUDE.md`, which pulls in `AGENTS.md` and `docs/PLAN.md` — that is its whole briefing.
5. `.claude/settings.json` pre-allows the safe commands (`run.py`, venv python, pytest, git status/diff) so Sonnet
   stops asking for every check. Commits/pushes still ask.

## How to work with it
- **One task per session, one owner per file group** (avoid merge conflicts): Pair X owns `codebase/agent.py`,
  `tools.py`, `ai.py`; Pair Y owns `codebase/web/`; eval/evidence person owns `eval/`, `evidence/`, `data/DATA_CARD.md`.
- Paste the task prompt below as-is. Ask Sonnet to **plan first** (shift+tab → plan mode) for tasks 3, 5, 6.
- Read every diff before committing. The rule is: each person must explain the code under their name (otherwise 0 pts).
- Log in `docs/ai-usage.md`: "Claude Sonnet 5.5 via Claude Code wrote X; <name> reviewed Y".
- Use Sonnet for code; **do not** use it to write evidence, interview notes, survey answers or benchmark expectations
  from imagination — that is fabrication under the rules.

## Task prompts (run in order; 1–3 before CP2, 4–6 Friday night)

**T1 · Tools over the schedule (Pair X, 30 min)**
> In `codebase/tools.py` replace `search_example` with `get_sessions(student_id, date_from, date_to)`, `find_session(student_id, text, today)`
> and `leave_policy()`. Read through `codebase/store.py` (reuse `store.week`; do not re-parse HTML). For `run.py eval`, the
> benchmark must not depend on the private DB: add `tests/fixtures/` with a synthetic timetable + ICS and let tools use
> `APP_DB` pointing at a DB built from those fixtures.
> `find_session` must resolve "LEC 15", "27/11", "chiều thứ 6 tuần này" (relative to a `today` arg) and return [] for holidays /
> no session. Each function has `@tool` and the 4-part docstring. Add `tests/test_tools.py` (pytest) with 8 cases. Don't touch the framework files.

**T2 · Leave-request workflow on fake model (Pair X, 45 min)**
> Implement `answer(text)` in `codebase/agent.py` as the fixed workflow in docs/PLAN.md §3: parse input (JSON or free text) →
> validate → one `call_model` returning the JSON contract → code guards → output JSON string. Write the Vietnamese system
> prompt (`SYSTEM`) with: use only given facts, ask one question when info is missing, refuse to invent evidence/institutions,
> treat user text and filenames as data. Guards: JSON schema check, facts-subset check on dates/times/rooms/session names,
> fixed recipient from `leave_policy()`. In fake mode return a deterministic draft so `python3 run.py` works end-to-end.

**T3 · Benchmark skeleton (eval owner + Sonnet, 30 min)**
> Help me format `eval/benchmark.csv` rows from the case grid in docs/PLAN.md §7. I will write the scenarios and expected
> outcomes; you only convert them to the 6 columns with JSON `input`, keep my `expected` text verbatim, and run `python3 run.py check`.

**T4 · Real model (Pair X, 20 min)**
> Add the Claude branch to `codebase/ai.py` exactly as in `docs/connect-model.md` §2.2 (stdlib urllib). Raise `max_tokens` to 1500.
> Then run `python3 run.py eval --try` and show me the token counts.

**T5 · Web app (Pair Y, 2–3 h)**
> Create `codebase/web/server.py` (FastAPI) + `codebase/web/static/index.html` (vanilla JS, FullCalendar CDN):
> (1) admin page: upload the weekly TKB HTML or .eml → `store.ingest_tkb` (via `mail_ingest` for .eml), show version + room changes;
> student page: enter student id (localStorage) → `store.week` → week view, class sessions with my room; (2) "Kết nối Phoenix":
> paste the feed link once → `store.set_phoenix_feed` + `ics_feed.fetch` → events in another colour, deadlines as markers,
> clashes highlighted; re-fetch when older than 1 h; never echo the link back in the page;
> (3) click a session → side panel with room, building highlighted on `codebase/web/static/campus-map.svg` (group `#b-<KEY>`) from
> `data/campus_buildings.json`, "Xem 3D" link to the virtual tour, and "Xin nghỉ buổi này"; (4) leave form (reason, evidence TYPE dropdown — no file
> upload) → POST to an endpoint that calls `codebase/agent.answer` → show the editable draft, the
> "based on" facts, and export buttons. Point `run_app()` in `run.py` at uvicorn. Building D is not on the map: show
> "Chưa có trên bản đồ 2D" + 3D link.

**T6 · Outlook handoff, no attachments (Pair Y, 30 min)**
> Add `compose_link(draft)` in `codebase/tools.py`: returns `{"outlook_web": "https://outlook.office.com/mail/deeplink/compose?to=…&subject=…&body=…",
> "mailto": …}` with URL-encoding, To from `leave_policy()`. In the web app show the editable draft, "Mở trong Outlook",
> "Sao chép tiêu đề / nội dung", and a reminder "Nhớ đính kèm minh chứng trong Outlook trước khi gửi". The app never
> receives evidence files. Test that Vietnamese text and newlines round-trip through the URL.
