# Backend (Mac person, Claude Code)
- OS is macOS: use `python3`, `source .venv/bin/activate`. Use pathlib so code also runs on Windows.
- Stack: FastAPI, uvicorn, sqlite3 on `backend/tars.db` (schema in `app/schema.sql`, rebuild with `python3 app/seed.py`), google-genai (Gemini function calling), APScheduler, python-telegram-bot (POLLING, no webhook), google-api-python-client (Calendar via service account), sse-starlette, python-dotenv, pytest.
- Run: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` from `backend/`.
- Clash validation is plain Python in `app/validator.py`, never the LLM. The DB unique indexes are the last line of defence.
- Auth (`app/auth.py`, v0.5): `POST /auth/login` {login_id, password} → HMAC-signed token (`TARS_SESSION_SECRET`, expiry). Every endpoint takes identity + role ONLY from the verified `Authorization: Bearer` token; `X-User-Id` is not auth. Passwords: PBKDF2 per-user salt from `TARS_DEMO_PASSWORD` (seed/reset); passwordless only with `TARS_PASSWORDLESS_LOGIN=1`. SSE: single-use 60 s ticket (`POST /auth/stream-ticket`, `/stream?ticket=`). Students get 403 on any mutation.
- Tests: behaviour tests use a TEST-ONLY `dependency_overrides[current_user]` in conftest (X-User-Id → user); `test_auth.py` removes it (`real_auth` fixture). Never add a runtime auth bypass flag.
- Every agent action writes a row to `decisions` with `reasoning` and emits an `agent_step` SSE event.
- Telegram (`app/notify.py`): polling bot started in the FastAPI lifespan; `/start` + login id links `users.telegram_chat_id`. Substitutes get Accept/Decline; APScheduler escalates after `ESCALATION_MINUTES`. No token → logged no-op. Tests blank the token (conftest) and mock the sender; never hit real Telegram in tests.
- Tests: `pytest` must pass before each merge to main.

## Frontend integration requirements (agreed with frontend, do not break)
Frontend: React + Vite in `tars/frontend/`, dev server http://localhost:5173 (Vite may pick another port, e.g. 5176, if 5173 is busy).
Services: `schedule.ts`, `attendance.ts`, `events.ts`, `nudges.ts`, `admin.ts`, plus `hooks/useStream.ts` (SSE).
1. CORS: any port on `http://localhost` / `http://127.0.0.1` is allowed via `allow_origin_regex`; all methods, headers incl. `Authorization`. Other origins go in `CORS_ORIGINS` (comma-separated exact origins in `.env`). Never allow `*`.
2. JSON field names EXACTLY as in `docs/API_CONTRACT.md` (v0.2). No renames, no extra wrapping (`{data: ...}`).
3. Every endpoint declares a Pydantic `response_model`; request bodies are Pydantic models too.
4. `/openapi.json` must be accurate. Frontend generates TS types with `npx openapi-typescript`. Give models stable names (Slot, Decision, Nudge, Event, User, LoginRequest, Stats).
5. `/auth/login` (public, returns token), `/auth/demo-users` (public), `/me`; all other endpoints need `Authorization: Bearer <token>` (missing/invalid/expired → 401, wrong role → 403).
6. `/stream?ticket=` (ticket from `POST /auth/stream-ticket`): SSE with events `timetable_updated`, `decision_updated`, `nudge_created`, `agent_step`, `ping` (every 15 s), payloads exactly as in the contract.
Mocks: `python3 app/seed.py` regenerates `docs/mock/*.json` (backend never writes into `frontend/`). OpenAPI snapshot: `docs/openapi.json`.
**Never change an endpoint path or field name without first updating `docs/API_CONTRACT.md` and telling the user so the frontend can be told.**
