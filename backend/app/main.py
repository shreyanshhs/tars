"""TARS backend: read-only API (contract v0.2.1). Agent, incidents, approvals and SSE come later."""
import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from sse_starlette.sse import EventSourceResponse

from . import actions, agent, bus, tools
from . import stream as sse
from .db import DAYS, fetch_slots, get_db, use_db
from .models import (AttendanceItem, Day, Decision, ErrorResponse, Event, IncidentAccepted,
                     IncidentRequest, LoginRequest, Nudge, Room, Slot, Stats, Today, User)
from .validator import ClashError

load_dotenv(Path(__file__).resolve().parents[2] / ".env")  # repo-root .env; fine if missing

app = FastAPI(title="TARS API", version="0.2.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- errors: always {"error", "detail"} ----------
ERROR_CODES = {401: "unauthorized", 403: "forbidden", 404: "not_found", 409: "clash", 422: "validation"}


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict):  # raise HTTPException(409, {"error": "invalid_state", "detail": ...})
        content = exc.detail
    else:
        content = {"error": ERROR_CODES.get(exc.status_code, "error"), "detail": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=content, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    msg = "; ".join(f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in exc.errors())
    return JSONResponse(status_code=422, content={"error": "validation", "detail": msg})


AUTH_ERRORS = {401: {"model": ErrorResponse}}
HOD_ERRORS = {401: {"model": ErrorResponse}, 403: {"model": ErrorResponse}}

# ---------- auth ----------
USER_SELECT = "SELECT id AS user_id, usn, name, role, section FROM users"


def current_user(x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
                 con: sqlite3.Connection = Depends(get_db)) -> User:
    if not x_user_id:
        raise HTTPException(401, "Missing X-User-Id header")
    row = con.execute(f"{USER_SELECT} WHERE id = ?", (x_user_id.strip(),)).fetchone()
    if row is None:
        raise HTTPException(401, "Unknown user id")
    return User(**dict(row))


def require_roles(*roles: str):
    def dep(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, f"Requires role: {' or '.join(roles)}")
        return user
    return dep


require_hod = require_roles("hod")
require_staff = require_roles("faculty", "hod")  # for mutations (incidents etc.), used later


def resolve_section(section: Optional[str], user: User) -> str:
    sec = section or user.section
    if not sec:
        raise HTTPException(422, "section query param is required for faculty/HOD")
    return sec


api = APIRouter(prefix="/api")


@api.post("/auth/login", response_model=User, responses={404: {"model": ErrorResponse}}, tags=["auth"])
def login(body: LoginRequest, con: sqlite3.Connection = Depends(get_db)):
    lid = body.login_id.strip().upper()
    row = con.execute(f"{USER_SELECT} WHERE UPPER(usn) = ? OR UPPER(id) = ?", (lid, lid)).fetchone()
    if row is None:
        raise HTTPException(404, "No user with that USN / staff ID")
    return dict(row)


@api.get("/auth/demo-users", response_model=list[User], tags=["auth"])
def demo_users(con: sqlite3.Connection = Depends(get_db)):
    sql = f"{USER_SELECT} ORDER BY CASE role WHEN 'student' THEN 1 WHEN 'hod' THEN 2 ELSE 3 END, id"
    return [dict(r) for r in con.execute(sql)]


@api.get("/me", response_model=User, responses=AUTH_ERRORS, tags=["auth"])
def me(user: User = Depends(current_user)):
    return user


# ---------- schedule ----------
@api.get("/timetable", response_model=list[Slot], responses=AUTH_ERRORS, tags=["schedule"])
def timetable(section: Optional[str] = None, user: User = Depends(current_user),
              con: sqlite3.Connection = Depends(get_db)):
    return fetch_slots(con, "s.section = ?", (resolve_section(section, user),))


@api.get("/timetable/faculty/{faculty_id}", response_model=list[Slot],
         responses={**AUTH_ERRORS, 404: {"model": ErrorResponse}}, tags=["schedule"])
def faculty_timetable(faculty_id: str, _: User = Depends(current_user),
                      con: sqlite3.Connection = Depends(get_db)):
    if con.execute("SELECT 1 FROM faculty WHERE id = ?", (faculty_id,)).fetchone() is None:
        raise HTTPException(404, f"No faculty with id {faculty_id}")
    return fetch_slots(con, "s.faculty_id = ?", (faculty_id,))


@api.get("/rooms", response_model=list[Room], responses=AUTH_ERRORS, tags=["schedule"])
def rooms(day: Day, period: int = Query(ge=1, le=6), _: User = Depends(current_user),
          con: sqlite3.Connection = Depends(get_db)):
    sql = """SELECT r.id, r.name, r.kind, r.capacity,
                    NOT EXISTS (SELECT 1 FROM slots s WHERE s.room_id = r.id AND s.day = ?
                                AND s.period = ? AND s.status != 'cancelled') AS free
             FROM rooms r ORDER BY r.id"""
    return [{**dict(r), "free": bool(r["free"])} for r in con.execute(sql, (day, period))]


def today_day() -> str:
    pinned = os.environ.get("DEMO_DAY", "").strip().upper()
    if pinned in DAYS:
        return pinned
    wd = datetime.now().weekday()
    return DAYS[wd] if wd < 5 else "MON"


def user_nudges(con: sqlite3.Connection, user_id: str) -> list[dict]:
    rows = con.execute("SELECT id, user_id, kind, title, body, created_at, read FROM nudges "
                       "WHERE user_id = ? ORDER BY created_at DESC, id DESC", (user_id,))
    return [{**dict(r), "read": bool(r["read"])} for r in rows]


@api.get("/today", response_model=Today, responses=AUTH_ERRORS, tags=["schedule"])
def today(user: User = Depends(current_user), con: sqlite3.Connection = Depends(get_db)):
    day = today_day()
    if user.role == "student":
        slots = fetch_slots(con, "s.day = ? AND s.section = ?", (day, user.section))
    elif user.role == "faculty":
        slots = fetch_slots(con, "s.day = ? AND s.faculty_id = ?", (day, user.user_id))
    else:
        slots = fetch_slots(con, "s.day = ?", (day,))
    return {"day": day, "slots": slots, "nudges": user_nudges(con, user.user_id)}


@api.get("/attendance", response_model=list[AttendanceItem], responses=AUTH_ERRORS, tags=["schedule"])
def attendance(section: Optional[str] = None, user: User = Depends(current_user),
               con: sqlite3.Connection = Depends(get_db)):
    rows = con.execute("SELECT subject_code, percent FROM attendance WHERE section = ? ORDER BY rowid",
                       (resolve_section(section, user),))
    return [dict(r) for r in rows]


# ---------- admin ----------
@api.get("/decisions", response_model=list[Decision], responses=HOD_ERRORS, tags=["admin"])
def decisions(_: User = Depends(require_hod), con: sqlite3.Connection = Depends(get_db)):
    rows = con.execute("SELECT id, created_at, trigger, summary, reasoning, affected_slot_ids, status "
                       "FROM decisions ORDER BY created_at DESC, id DESC")
    return [{**dict(r), "affected_slot_ids": json.loads(r["affected_slot_ids"] or "[]")} for r in rows]


@api.get("/stats", response_model=Stats, responses=HOD_ERRORS, tags=["admin"])
def stats(_: User = Depends(require_hod), con: sqlite3.Connection = Depends(get_db)):
    one = lambda sql: con.execute(sql).fetchone()[0]
    return {
        "classes_lost": one("SELECT COUNT(*) FROM slots WHERE status = 'cancelled'"),
        "rescued": one("SELECT COUNT(*) FROM decisions WHERE status IN ('committed','pending_ack','acknowledged')"),
        "nudges_acted": one("SELECT COUNT(*) FROM nudges WHERE read = 1"),
        "avg_response_s": 0,  # filled in once the agent records timings
    }


# ---------- nudges & events ----------
@api.get("/nudges", response_model=list[Nudge], responses=AUTH_ERRORS, tags=["nudges"])
def nudges(user: User = Depends(current_user), con: sqlite3.Connection = Depends(get_db)):
    return user_nudges(con, user.user_id)


@api.get("/events", response_model=list[Event], responses=AUTH_ERRORS, tags=["events"])
def events(section: Optional[str] = None, user: User = Depends(current_user),
           con: sqlite3.Connection = Depends(get_db)):
    sec = section or user.section
    if sec:
        mine = fetch_slots(con, "s.section = ? AND s.status != 'cancelled'", (sec,))
    elif user.role == "faculty":
        mine = fetch_slots(con, "s.faculty_id = ? AND s.status != 'cancelled'", (user.user_id,))
    else:
        mine = []
    out = []
    for e in con.execute("SELECT id, title, org, venue, day, start, end FROM events ORDER BY id"):
        clashes = [s["id"] for s in mine
                   if s["day"] == e["day"] and s["start"] < e["end"] and e["start"] < s["end"]]
        out.append({**dict(e), "clashes_with": clashes})
    return out


# ---------- mutations ----------
STAFF_ERRORS = {**HOD_ERRORS, 422: {"model": ErrorResponse}}
STATE_ERRORS = {**HOD_ERRORS, 404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}}


@api.post("/incidents", status_code=202, response_model=IncidentAccepted, responses=STAFF_ERRORS,
          tags=["admin"])
def create_incident(body: IncidentRequest, bg: BackgroundTasks, user: User = Depends(require_staff),
                    con: sqlite3.Connection = Depends(get_db)):
    if body.type == "absence":
        if not body.faculty_id or con.execute("SELECT 1 FROM faculty WHERE id = ?", (body.faculty_id,)).fetchone() is None:
            raise HTTPException(422, "absence needs a valid faculty_id")
    elif not body.room_id or con.execute("SELECT 1 FROM rooms WHERE id = ?", (body.room_id,)).fetchone() is None:
        raise HTTPException(422, "room_unavailable needs a valid room_id")
    periods = sorted(set(body.periods))
    if not periods or any(p not in range(1, 7) for p in periods):
        raise HTTPException(422, "periods must be a non-empty list of 1..6")
    slots = agent.affected_slots(con, body.type, body.day, periods, body.faculty_id, body.room_id)
    if not slots:
        raise HTTPException(422, "No scheduled classes are affected by this incident")

    with con:
        inc = con.execute("INSERT INTO incidents (type, reported_by, faculty_id, room_id, day, periods, note) "
                          "VALUES (?,?,?,?,?,?,?)",
                          (body.type, user.user_id, body.faculty_id if body.type == "absence" else None,
                           body.room_id if body.type == "room_unavailable" else None,
                           body.day, json.dumps(periods), body.note)).lastrowid
    d = tools.log_decision(body.type, "TARS is working on it…", None, [s["id"] for s in slots],
                           status="proposed", incident_id=inc, con=con)
    bus.publish("decision_updated", d, user_ids=[user.user_id])
    bg.add_task(agent.run_incident, inc, d["id"])
    return {"incident_id": inc, "decision_id": d["id"], "status": "agent_running"}


def _decision_row(con: sqlite3.Connection, decision_id: int) -> sqlite3.Row:
    row = con.execute("SELECT d.*, i.reported_by FROM decisions d LEFT JOIN incidents i ON i.id = d.incident_id "
                      "WHERE d.id = ?", (decision_id,)).fetchone()
    if row is None:
        raise HTTPException(404, f"No decision {decision_id}")
    return row


def _invalid_state(row: sqlite3.Row, action: str):
    raise HTTPException(409, {"error": "invalid_state",
                              "detail": f"Decision {row['id']} is '{row['status']}' and cannot be {action}"})


@api.post("/decisions/{decision_id}/approve", response_model=Decision, responses=STATE_ERRORS, tags=["admin"])
def approve_decision(decision_id: int, _: User = Depends(require_hod), con: sqlite3.Connection = Depends(get_db)):
    """proposed (with pending changes) → apply them → committed; pending_ack / escalated → acknowledged."""
    row = _decision_row(con, decision_id)
    if row["status"] == "proposed" and row["changes"]:
        try:
            actions.apply_changes(con, json.loads(row["changes"]))
        except ClashError as e:
            raise HTTPException(409, {"error": "clash", "detail": str(e)})
        d = tools.update_decision(decision_id, con=con, status="committed", changes=None)
    elif row["status"] in ("pending_ack", "escalated"):
        d = tools.update_decision(decision_id, con=con, status="acknowledged")
    else:
        _invalid_state(row, "approved")
    bus.publish("decision_updated", d, user_ids=[row["reported_by"]])
    return d


@api.post("/decisions/{decision_id}/reject", response_model=Decision, responses=STATE_ERRORS, tags=["admin"])
def reject_decision(decision_id: int, _: User = Depends(require_hod), con: sqlite3.Connection = Depends(get_db)):
    """proposed (with pending changes) or escalated → rejected. Nothing is applied."""
    row = _decision_row(con, decision_id)
    if not ((row["status"] == "proposed" and row["changes"]) or row["status"] == "escalated"):
        _invalid_state(row, "rejected")
    d = tools.update_decision(decision_id, con=con, status="rejected", changes=None)
    bus.publish("decision_updated", d, user_ids=[row["reported_by"]])
    return d


@api.post("/nudges/{nudge_id}/read", response_model=Nudge,
          responses={**AUTH_ERRORS, 404: {"model": ErrorResponse}}, tags=["nudges"])
def read_nudge(nudge_id: int, user: User = Depends(current_user), con: sqlite3.Connection = Depends(get_db)):
    with con:
        n = con.execute("UPDATE nudges SET read = 1 WHERE id = ? AND user_id = ?", (nudge_id, user.user_id)).rowcount
    if not n:
        raise HTTPException(404, f"No nudge {nudge_id} for you")
    r = con.execute("SELECT id, user_id, kind, title, body, created_at, read FROM nudges WHERE id = ?",
                    (nudge_id,)).fetchone()
    return {**dict(r), "read": bool(r["read"])}


# ---------- live updates ----------
@api.get("/stream", response_class=EventSourceResponse, tags=["stream"],
         responses={200: {"content": {"text/event-stream": {}},
                          "description": "SSE: timetable_updated, decision_updated, nudge_created, agent_step, ping"},
                     **AUTH_ERRORS})
async def stream(user_id: Optional[str] = None):
    """EventSource can't send headers, so auth is the `user_id` query param."""
    if not user_id:
        raise HTTPException(401, "Missing user_id query param")
    with use_db() as con:
        row = con.execute(f"{USER_SELECT} WHERE id = ?", (user_id.strip(),)).fetchone()
    if row is None:
        raise HTTPException(401, "Unknown user id")
    return EventSourceResponse(sse.event_stream(User(**dict(row))), ping=sse.PING_SECONDS,
                               ping_message_factory=sse.ping_event)


app.include_router(api)


@app.get("/health", include_in_schema=False)
def health():
    return {"ok": True}
