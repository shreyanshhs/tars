# Backend (Mac person, Claude Code)
- OS is macOS: use `python3`, `source .venv/bin/activate`. Use pathlib so code also runs on Windows.
- Stack: FastAPI, uvicorn, sqlite3 on `backend/tars.db` (schema in `app/schema.sql`, rebuild with `python3 app/seed.py`), google-genai (Gemini function calling), APScheduler, python-telegram-bot (POLLING, no webhook), google-api-python-client (Calendar via service account), sse-starlette, python-dotenv, pytest.
- Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` from `backend/`.
- Clash validation is plain Python in `app/validator.py`, never the LLM. The DB unique indexes are the last line of defence.
- RBAC: `X-User-Id` header → role from `users` table; students get 403 on any mutation.
- Every agent action writes a row to `decisions` with `reasoning` and emits an `agent_step` SSE event.
- Tests: `pytest` must pass before each merge to main.

## Frontend integration requirements (agreed with frontend, do not break)
Frontend: React + Vite in `tars/frontend/`, dev server http://localhost:5173.
Services: `schedule.ts`, `attendance.ts`, `events.ts`, `nudges.ts`, `admin.ts`, plus `hooks/useStream.ts` (SSE).
1. CORS: allow origin http://localhost:5173 (and http://127.0.0.1:5173), all methods, headers incl. `X-User-Id`.
2. JSON field names EXACTLY as in `docs/API_CONTRACT.md` (v0.2). No renames, no extra wrapping (`{data: ...}`).
3. Every endpoint declares a Pydantic `response_model`; request bodies are Pydantic models too.
4. `/openapi.json` must be accurate. Frontend generates TS types with `npx openapi-typescript`. Give models stable names (Slot, Decision, Nudge, Event, User, LoginRequest, Stats).
5. `/auth/login`, `/auth/demo-users`, `/me`; all other endpoints read `X-User-Id` (missing/unknown → 401, student mutation → 403).
6. `/stream?user_id=`: SSE with events `timetable_updated`, `decision_updated`, `nudge_created`, `agent_step`, `ping` (every 15 s), payloads exactly as in the contract.
Mocks: `python3 app/seed.py` regenerates `docs/mock/*.json` (backend never writes into `frontend/`). OpenAPI snapshot: `docs/openapi.json`.
**Never change an endpoint path or field name without first updating `docs/API_CONTRACT.md` and telling the user so the frontend can be told.**
