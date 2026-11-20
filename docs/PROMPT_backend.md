MAC PERSON: open Terminal in `tars/`, run `claude`, paste this:

---
Plan first, then build the TARS backend in `/backend` ONLY. Do not touch `/frontend`.
Read `docs/API_CONTRACT.md`, `backend/app/schema.sql` and `backend/app/seed.py` first. The DB is `backend/tars.db`.

Stack: Python 3.11+, FastAPI, sqlite3 (or SQLModel over the existing schema), google-genai (Gemini function calling), APScheduler, python-telegram-bot (polling mode), google-api-python-client (Calendar, service account), sse-starlette.

Build in this order, committing after each:
1. `app/main.py`: all GET endpoints from the contract, RBAC via the `X-User-Id` header (students read-only → 403 on mutations). CORS for localhost:5173.
2. `app/validator.py`: `validate_clash(changes)`, plain Python, checks section/faculty/room clashes. Add pytest tests.
3. `app/tools.py`: get_timetable, find_free_rooms, find_substitute (can teach subject, free that period, lowest load), get_attendance, propose_reschedule, commit_change (calls the validator first), log_decision.
4. `app/agent.py`: Gemini loop Perceive → Reason/tool-call → Act. System prompt enforces: attendance <75% ⇒ never cancel first; always log reasoning. Emit `agent_step` SSE events.
5. `POST /incidents` → runs the agent as a background task.
6. `app/notify.py`: Telegram Accept/Decline to the substitute; APScheduler timeout (ESCALATION_MINUTES) → escalate to the HOD + set decision status `escalated`.
7. `app/calendar.py`: on commit, create an event in GOOGLE_CALENDAR_ID. Make it a no-op if no creds are set, so the demo never crashes.
8. `/stream` SSE + `/stats`.
Keys come from `.env`. Never hardcode secrets. Test with the seeded demo: F01 absent MON.
---
