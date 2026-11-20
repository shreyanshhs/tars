"""Pydantic models. Names and fields are the API contract (docs/API_CONTRACT.md v0.2.1); do not rename."""
from typing import Literal, Optional

from pydantic import BaseModel

Day = Literal["MON", "TUE", "WED", "THU", "FRI"]
Role = Literal["student", "faculty", "hod"]


class LoginRequest(BaseModel):
    login_id: str


class User(BaseModel):
    user_id: str
    usn: Optional[str] = None
    name: str
    role: Role
    section: Optional[str] = None


class Slot(BaseModel):
    id: int
    day: Day
    period: int
    start: str
    end: str
    section: str
    subject_code: str
    subject_name: str
    faculty_id: str
    faculty_name: str
    room_id: str
    status: Literal["scheduled", "replanned", "cancelled"]


class Decision(BaseModel):
    id: int
    created_at: str
    trigger: Literal["absence", "room_unavailable", "manual", "event_clash"]
    summary: str
    reasoning: Optional[str] = None
    affected_slot_ids: list[int]
    status: Literal["proposed", "committed", "pending_ack", "acknowledged", "escalated", "rejected"]


class Nudge(BaseModel):
    id: int
    user_id: str
    kind: Literal["replan", "deadline", "free_slot", "event"]
    title: str
    body: Optional[str] = None
    created_at: str
    read: bool


class Event(BaseModel):
    id: int
    title: str
    org: Optional[str] = None
    venue: Optional[str] = None
    day: Day
    start: str
    end: str
    clashes_with: list[int]


class Room(BaseModel):
    id: str
    name: str
    kind: Literal["classroom", "lab", "hall"]
    capacity: int
    free: bool


class AttendanceItem(BaseModel):
    subject_code: str
    percent: float


class Today(BaseModel):
    day: Day
    slots: list[Slot]
    nudges: list[Nudge]


class Stats(BaseModel):
    classes_lost: int
    rescued: int
    nudges_acted: int
    avg_response_s: float


class IncidentRequest(BaseModel):
    type: Literal["absence", "room_unavailable"]
    faculty_id: Optional[str] = None
    room_id: Optional[str] = None
    day: Day
    periods: list[int]
    note: Optional[str] = None


class IncidentAccepted(BaseModel):
    incident_id: int
    decision_id: int
    status: Literal["agent_running"]


class ErrorResponse(BaseModel):
    error: str
    detail: str
