# TARS — API Contract (v0.2.1)

Shared source of truth for **frontend (Windows, Antigravity)** and **backend (Mac, Claude Code)**.
Base URL: `http://localhost:8000/api`  ·  All bodies JSON  ·  Times are `HH:MM`, days are `MON..FRI`.
Auth (hackathon-simple, no passwords): log in once with `POST /auth/login`, store the returned `user_id`, then send header `X-User-Id: <user_id>` on every request. The backend looks up the role (`student` | `faculty` | `hod`).
**Exception:** `EventSource` can't send custom headers, so `/stream` takes `?user_id=<user_id>` as a query param instead.

---

## Core objects

```jsonc
// Slot  (one cell of the timetable)
{
  "id": 12,
  "day": "MON",
  "period": 3,                 // 1..6
  "start": "11:15", "end": "12:10",
  "section": "CSE-A",
  "subject_code": "DS",
  "subject_name": "Data Structures",
  "faculty_id": "F03", "faculty_name": "Dr. Ananya Rao",
  "room_id": "R102",
  "status": "scheduled"        // scheduled | replanned | cancelled
}

// Decision  (one entry in the audit log)
{
  "id": 7,
  "created_at": "2026-11-25T10:42:00",
  "trigger": "absence",        // absence | room_unavailable | manual | event_clash
  "summary": "Moved CSE-A DS (MON P3) to Dr. Kiran (lowest load, free) in R102",
  "reasoning": "CSE-A attendance in DS is 71% (<75%), so cancel was rejected...",
  "affected_slot_ids": [12],
  "status": "pending_ack"      // proposed | committed | pending_ack | acknowledged | escalated | rejected
}

// Nudge  (card on Today / Nudges screen)
{ "id": 3, "user_id": "S001", "kind": "replan|deadline|free_slot|event",
  "title": "TARS re-planned your day", "body": "...", "created_at": "...", "read": false }

// Event  (events hub)
{ "id": 2, "title": "CyberSec Workshop", "org": "CyberSec Student Chapter",
  "venue": "Main Auditorium", "day": "WED", "start": "14:00", "end": "16:00",
  "clashes_with": [ /* Slot ids for the caller's section */ ] }
```

---

## Endpoints

| Method | Path | Who | Purpose | Screen |
|---|---|---|---|---|
| POST | `/auth/login` | public | Log in with USN (student) or staff ID (faculty/HOD) | login / role picker |
| GET | `/auth/demo-users` | public | List of seeded users for the demo role switcher | login / role picker |
| GET | `/me` | all | Current user + role + section | sidebar |
| GET | `/timetable?section=CSE-A` | all | Week of Slots for a section | Schedule (weekly matrix) |
| GET | `/timetable/faculty/{faculty_id}` | all | Faculty's week | Schedule → Faculty tab |
| GET | `/rooms?day=MON&period=3` | all | Rooms + `free: bool` | Schedule → Rooms tab |
| GET | `/today` | all | Today's Slots for caller + nudges | Today |
| GET | `/attendance?section=CSE-A` | all | `[{subject_code, percent}]` | Today → Attendance Matrix |
| POST | `/incidents` | faculty, hod | Report disruption → starts agent | Admin Console form |
| GET | `/decisions` | hod | Audit log, newest first | Admin → Audit & Logs |
| POST | `/decisions/{id}/approve` | hod | Approve / override a proposal | HOD dashboard |
| POST | `/decisions/{id}/reject` | hod | Reject | HOD dashboard |
| GET | `/nudges` | all | Caller's nudges | Nudges |
| POST | `/nudges/{id}/read` | all | Mark done | Nudges |
| GET | `/events?section=CSE-A` | all | Events + clash info | Events |
| GET | `/stats` | hod | `{classes_lost, rescued, nudges_acted, avg_response_s}` | Admin KPI cards |
| GET | `/stream?user_id=S001` | all | **SSE** live updates (see below) | all (live refresh) |

### POST `/auth/login`
```jsonc
// request: students use USN, staff use staff ID (case-insensitive, spaces trimmed)
{ "login_id": "1AB25CS001" }        // or "F01" / "H01"
// response 200
{ "user_id": "S001",                // ← send this as X-User-Id from now on
  "usn": "1AB25CS001",              // null for faculty/HOD
  "name": "Shreyansh",
  "role": "student",                // student | faculty | hod
  "section": "CSE-A" }              // null for faculty/HOD
// 404 → { "error": "not_found", "detail": "No user with that USN / staff ID" }
```
**USN ↔ user_id mapping:** `users.usn` column (unique, students only). `user_id` is the internal primary key (`S001`, `F01`, `H01`).
The frontend never uses the USN after login; it only uses `user_id`.

| login_id | user_id | role | section |
|---|---|---|---|
| 1AB25CS001 | S001 | student | CSE-A |
| 1AB25CS002 | S002 | student | CSE-B |
| 1AB25CS003 | S003 | student | CSE-C |
| F01 … F08 | F01 … F08 | faculty | – |
| H01 | H01 | hod | – |

`GET /auth/demo-users` returns the same list as `[{user_id, usn, name, role, section}]` so the role switcher can show it.

### GET `/me`
Same shape as the login response.

### Optional `section` query param (v0.2.1)
`/timetable`, `/attendance` and `/events` take `?section=`. If omitted, the caller's own section is used.
If omitted and the caller has no section (faculty/HOD): `/timetable` and `/attendance` → `422`; `/events` computes `clashes_with` against the faculty's own slots (HOD: `[]`).

### GET `/rooms?day=MON&period=3`  (v0.2.1)
```jsonc
// response 200: every room, free = no non-cancelled slot in that room at day+period
[ { "id": "R104", "name": "Room 104 (spare)", "kind": "classroom", "capacity": 60, "free": true } ]
// kind: classroom | lab | hall
```

### GET `/today`  (v0.2.1)
```jsonc
// response 200
{ "day": "MON",              // today's weekday; Sat/Sun → MON. Backend may pin it via DEMO_DAY env.
  "slots": [ /* Slot[] for today: student → own section, faculty → own slots, hod → all */ ],
  "nudges": [ /* Nudge[] for the caller, newest first */ ] }
```

### Error body
All errors use `{ "error": "<code>", "detail": "<text>" }` with codes `unauthorized` (401), `forbidden` (403), `not_found` (404), `validation` (422), `clash` (409), `invalid_state` (409).

### POST `/incidents`
```jsonc
// request
{ "type": "absence",                 // absence | room_unavailable
  "faculty_id": "F03",               // for absence
  "room_id": null,                   // for room_unavailable
  "day": "MON", "periods": [3, 4],
  "note": "Fever, out today" }
// response 202
{ "incident_id": 5, "decision_id": 7, "status": "agent_running" }
```
Errors: `403` if role is student · `422` if the faculty/room is unknown or no scheduled class is affected.
The agent runs in the background, so a clash found while planning can't return `409` here: the agent tries another
option, and if it can't resolve a slot the decision ends `escalated`. Follow progress via `agent_step` / `decision_updated`.

**Decision lifecycle (v0.2.1):** created as `proposed` ("TARS is working on it…") → the agent finishes with:
`pending_ack` (a substitute was assigned; awaiting their acknowledgement) · `committed` (only moves / room changes) ·
`proposed` (a cancellation awaits HOD approval; nothing applied yet) · `escalated` (unresolved slot or Gemini failure).

### POST `/decisions/{id}/approve`  ·  POST `/decisions/{id}/reject`  (hod, v0.2.1)
No body. Response 200: the updated Decision.
- approve: `proposed` with a pending cancellation → applies it → `committed` (409 `clash` if it no longer fits) · `pending_ack` / `escalated` → `acknowledged`.
- reject: `proposed` with a pending cancellation, or `escalated` → `rejected` (nothing applied).
- Any other state → `409 { "error": "invalid_state", "detail": "..." }` (this includes a decision whose agent is still running). Unknown id → 404.

### POST `/nudges/{id}/read`  (v0.2.1)
No body. Response 200: the updated Nudge (`read: true`). Only the nudge's owner; anyone else gets 404.

### GET `/stream?user_id=<user_id>`  (Server-Sent Events)
- **Auth:** `user_id` query param (EventSource can't set headers). Unknown id → `401`.
- **Content-Type:** `text/event-stream`. Server sends `event: ping` with `data: {}` every 15 s as a keep-alive. Ignore it.
- **Reconnect:** the browser's EventSource reconnects automatically. After reconnecting, refetch `/timetable`, `/nudges` and `/decisions` once, because events missed while disconnected are not replayed.
- **Format:** each message is `event: <name>` + `data: <one-line JSON>`.
- **Who receives what:** students only get events for their own section/user. Faculty get events about their own slots. HOD gets everything.

| event | payload | who gets it | frontend action |
|---|---|---|---|
| `timetable_updated` | `{ "section": "CSE-A", "slot_ids": [12, 13] }` | that section + affected faculty + HOD | refetch `/timetable` |
| `decision_updated` | Decision object | HOD + reporting faculty | update the audit log row |
| `nudge_created` | Nudge object | that user | show toast + add to the Nudges list |
| `agent_step` | `{ "decision_id": 7, "step": "perceive" \| "reason" \| "tool_call" \| "act" \| "done" \| "error", "text": "Calling find_substitute(DS, MON P2)", "ts": "2026-11-25T10:42:03" }` | HOD + reporting faculty | append to the "TARS thinking" feed |
| `ping` | `{}` | everyone | ignore |

Example frontend code:
```ts
const es = new EventSource(`${API}/stream?user_id=${userId}`);
es.addEventListener('timetable_updated', e => { const d = JSON.parse(e.data); /* refetch */ });
es.addEventListener('agent_step', e => { /* append to feed */ });
```

---

## Rules both sides rely on
1. **Only faculty/hod can mutate** (RBAC). Students are read-only.
2. **Clash validator is code, not LLM**: no faculty, room or section may hold two slots in the same day+period.
3. If a section's attendance in that subject is **< 75%**, the agent must try substitute → reschedule before cancel.
4. Substitute gets a Telegram message with Accept/Decline. **No reply in 10 min (2 min in demo mode) → escalate to HOD.**
5. Every agent action writes a Decision with `reasoning`.
