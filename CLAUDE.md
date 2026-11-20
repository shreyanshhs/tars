# TARS: Agentic Campus Scheduling (Martian 1.0 hackathon, 25–26 Nov 2026)

Two-person team, two machines:
- **Windows + Antigravity** owns `/frontend` (React + Vite + TS + Tailwind). Branch: `frontend`.
- **Mac + Claude Code** owns `/backend` (FastAPI + SQLite + Gemini agent). Branch: `backend`.

## Rules for Claude
- Only edit files inside the folder this person owns (see the CLAUDE.md in that folder). Never edit the other half.
- `docs/API_CONTRACT.md` is the single source of truth. Don't invent endpoints. If a change is needed, propose the edit to the contract and stop.
- Never write secrets into code. Read them from `.env` (gitignored).
- Keep the demo safe: any external service (Gemini, Telegram, Calendar) must fail gracefully, never crash the app.
- Commit small and often with clear messages.

## Demo scenario (seeded)
F01 absent MON → CSE-A DSL (P1) + DS (P2). CSE-A DS attendance 71% (<75%), so no cancel.
Expected: substitute F08 (teaches DS, lowest load). Names live in `backend/app/seed_data.json`; refer to people by id.
