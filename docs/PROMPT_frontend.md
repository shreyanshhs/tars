WINDOWS PERSON: open the `tars/` folder in Antigravity, start a new agent task (Planning mode), paste this:

---
Plan first, then build the TARS frontend in `/frontend` ONLY. Do not touch `/backend`.
First read `frontend/AGENTS.md` and `docs/API_CONTRACT.md` and follow them. This machine is Windows (PowerShell).

Stack: React + Vite + TypeScript + Tailwind + React Router.

1. Read every `frontend/stitch/*/code.html` and `DESIGN.md`. Turn the DESIGN.md colour/typography tokens into `tailwind.config` theme values. Keep the Stitch look pixel-close.
2. Build a shared layout (sidebar: Today, Nudges, Events, Schedule, Admin Console, Settings) and 5 pages from the 5 Stitch screens.
3. Write `src/api.ts` with one function per endpoint in `docs/API_CONTRACT.md`. While `VITE_USE_MOCK=true`, they return data from `frontend/mock/*.json`. Otherwise they call `http://localhost:8000/api` with header `X-User-Id`.
4. Add a role switcher in the top bar (Student S001 / Faculty F01 / HOD H01) that sets X-User-Id. That's how we demo.
5. Schedule page: weekly grid from `/timetable`. Colour by `status` (scheduled / replanned / cancelled), matching the Stitch legend.
6. Admin page: the "Report disruption" form POSTs `/incidents`. Show a live "TARS thinking" feed from SSE `/stream` `agent_step` events.
7. Subscribe to `/stream` globally. On `timetable_updated`, refetch the timetable.
8. Change the "WhatsApp Webhook" label to "Telegram Bot".
Make no backend assumptions beyond the contract.
---
