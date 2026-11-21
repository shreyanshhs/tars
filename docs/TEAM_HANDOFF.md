# TARS Team Handoff & Development Guide

Welcome to TARS (Timetable Adaptive Rescheduling System)! This document provides everything your team needs to get up and running, details on what is already built and working, and a clear breakdown of responsibilities.

---

## 1. Repository Structure & Active Branches

Repository: `https://github.com/shreyanshhs/tars.git`

- **`backend` branch**: FastAPI Python backend, SQLite database, Gemini rescheduling agent, Telegram notification bot, and test suite.
- **`frontend` branch**: React 19 + TypeScript + Vite + Tailwind CSS frontend interface.

> [!IMPORTANT]
> **Secrets & Environment Files**: Never commit `.env`, `.env.*`, `.env.txt`, Telegram bot tokens, Google service account keys (`service-account*.json`), or SQLite database files (`*.db`, `*.sqlite3`). These are gitignored.

---

## 2. Setup Instructions

### Backend Setup (`backend` branch)
1. **Python Environment**:
   ```bash
   cd backend
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS / Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Environment Configuration**:
   Copy `.env.example` to `.env` in the repository root:
   ```env
   # Mandatory for local development:
   TARS_DEMO_PASSWORD=YourLocalDemoPassword123!
   TARS_SESSION_SECRET=long-random-string-at-least-32-chars-long
   TARS_DEMO_MODE=1
   
   # External integrations (optional for local mock/unit tests):
   GEMINI_API_KEY=your_gemini_api_key
   TELEGRAM_BOT_TOKEN=your_botfather_token
   ESCALATION_MINUTES=5
   ```
3. **Database Initialization**:
   ```bash
   python app/seed.py
   ```
   *Note: This creates `backend/tars.db`, applies `schema.sql`, populates `seed_data.json`, and sets the PBKDF2-hashed `TARS_DEMO_PASSWORD` for all seeded users.*
4. **Run Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   Health check: `http://localhost:8000/health` (returns `{"ok": true}`).
   OpenAPI documentation: `http://localhost:8000/docs`.
5. **Run Tests**:
   ```bash
   pytest
   ```
   *All 140 automated tests pass without requiring external API keys.*

---

### Frontend Setup (`frontend` branch)
1. **Node Environment**:
   Requires Node.js 18+ (tested on Node 20 & 22).
   ```bash
   cd frontend
   npm install
   ```
2. **Environment Configuration**:
   Create `frontend/.env` (or copy `.env.example`):
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_USE_MOCK=false
   ```
   - `VITE_USE_MOCK=false`: Connects live to the FastAPI backend.
   - `VITE_USE_MOCK=true`: Offline demo simulation using local state fixtures.
3. **Run Dev Server**:
   ```bash
   npm run dev
   ```
   Default URL: `http://localhost:5173` (or automatic fallback port).
4. **Lint and Build**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 3. What Currently Works

### Authentication & RBAC (Contract v0.5)
- **PBKDF2 Password Hashing**: Per-user 16-byte cryptographically secure salts (`pbkdf2_sha256$200000$...`). No plaintext or shared passwords.
- **Signed Session Tokens**: HMAC-SHA256 signed bearer tokens with expiration (`POST /api/auth/login`).
- **Server-Side Role Enforcement**: Role (`student`, `faculty`, `hod`) is derived solely from the cryptographically verified token claims. Students attempting to call HOD/admin endpoints receive `403 Forbidden`.
- **Session Management**: `GET /api/me` restores active sessions. `POST /api/auth/logout` cleanly terminates the session.
- **Frontend Sign-In UI**: Clean sign-in modal with blank credentials by default. Outside Mock Mode, demo autofill chips and quick role-switchers are disabled; changing roles requires authenticating with valid credentials.

### Interactive HOD Admin Console
- **Disruption Reporting Form**: Interactive form at `/admin` allowing HODs to:
  - Select Incident Type: Faculty Absence (`absence`) or Room Unavailable (`room_unavailable`).
  - Choose Faculty or Room dynamically populated from backend directories (`GET /api/faculty`, `GET /api/rooms`).
  - Select Day (`MON`..`FRI`) and multi-select Periods (`1`..`6`).
  - Add optional notes explaining disruption reason.
  - Live preview of affected scope and quick-fill presets for demo scenarios.
  - Clear real-time status banners (accepted/rejected) and direct dispatch to `POST /api/incidents`.

### Live Streaming & Repeatable Demo
- **SSE Stream**: Single-use 60-second tickets (`POST /api/auth/stream-ticket`) authenticated via `GET /api/stream?ticket=...`. Streams real-time events: `agent_step`, `timetable_updated`, `decision_updated`, `nudge_created`, and `demo_reset`.
- **Repeatable Demo Reset**: `POST /api/admin/reset-demo` (HOD only, when `TARS_DEMO_MODE=1`) restores the baseline timetable, purges test decisions and nudges, and cancels pending escalation timers while preserving linked Telegram chats.

### Telegram Substitute Acknowledgement
- Polling bot in `app/notify.py` using `python-telegram-bot`.
- Substitutes receive Telegram notifications with inline **Accept** and **Decline** buttons.
- Escalation timer (`APScheduler`) automatically escalates decisions if substitutes do not respond within `ESCALATION_MINUTES`.

---

## 4. Concrete Work Breakdown for Teammates

### 👤 Friend 1: Telegram & Google Calendar Integration
**Primary Area**: Backend (`backend/app/notify.py`, Google Calendar client)
1. **Google Calendar Sync**:
   - When a timetable decision is committed or acknowledged, push updated class events to Google Calendar.
   - Use Google Calendar API v3 with a service account (`service-account.json`, keep gitignored).
   - Sync events for the affected section and faculty member's calendar.
2. **Telegram Bot Enhancement**:
   - Deepen `/start` onboarding and linking for faculty and HOD (`users.telegram_chat_id`).
   - Add command support for faculty to check their schedule (e.g. `/myclasses`).
   - Deliver instant alerts to the HOD when substitute decline or escalation occurs.
   - Test end-to-end substitute acknowledgement with real mobile Telegram clients.

---

### 👤 Friend 2: Events Hub
**Primary Area**: Frontend & Backend Events Integration (`frontend/src/components/views/EventsView.tsx`, `backend/app/main.py`)
1. **Frontend Events Hub View**:
   - Connect `EventsView.tsx` to `GET /api/events?section={section}`.
   - Render event cards with title, organizing club, venue, day, time range, and RSVP count.
2. **Interactive RSVPs**:
   - Connect the RSVP button to `POST /api/events/{id}/rsvp` and `DELETE /api/events/{id}/rsvp`.
   - Update RSVP counts live in the UI when the user joins or leaves an event.
3. **Clash Detection Warnings**:
   - Leverage `clashes_with: number[]` from the event payload.
   - Display clear visual clash tags if an event overlaps with a scheduled lecture or lab for the student's section.

---

### 👤 Friend 3: Schedule Matrix & Timetable Views
**Primary Area**: Frontend Schedule & Timetable Views (`frontend/src/components/views/ScheduleView.tsx`, `TodayView.tsx`)
1. **Weekly Matrix View**:
   - Connect the main schedule grid to `GET /api/timetable?section={section}`.
   - Support seamless section switching (`CSE-A`, `CSE-B`, `CSE-C`) for faculty/HOD.
   - Render slot status badges (`scheduled`, `replanned`, `cancelled`).
2. **Faculty Timetable Tab**:
   - Populate faculty selector from `GET /api/faculty`.
   - Fetch and display the selected faculty member's weekly schedule via `GET /api/timetable/faculty/{faculty_id}`.
3. **Rooms Availability Tab**:
   - Connect to `GET /api/rooms?day={day}&period={period}`.
   - Display room occupancy matrix with clear `Free` / `Occupied` badges and room capacities.
4. **Today View & Attendance**:
   - Connect `TodayView.tsx` to `GET /api/today` to display current day classes and active nudges.
   - Connect `GET /api/attendance?section={section}` to display student attendance percentages across subjects.

---

## 5. Seed Accounts & Quick Reference

| Role | Login ID | Name | Section | Notes |
|---|---|---|---|---|
| **HOD** | `H01` | Dr. Alan Turing | – | Full administrative access, incident reporting, demo reset |
| **Faculty** | `F01` | Dr. Ada Lovelace | – | Data Structures faculty |
| **Faculty** | `F08` | Dr. Katherine Johnson | – | Primary substitute faculty for demo scenarios |
| **Student** | `1AB25CS001` (or `S001`) | Alex Chen | `CSE-A` | Student access |
| **Student** | `1AB25CS002` (or `S002`) | Bethany Taylor | `CSE-B` | Student access |
| **Student** | `1AB25CS003` (or `S003`) | Chris Evans | `CSE-C` | Student access |

*Password for all accounts during development is configured in your `.env` via `TARS_DEMO_PASSWORD`.*
