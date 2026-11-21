import type {
  ApiUser,
  ApiSlot,
  ApiNudge,
  ApiEvent,
  ApiDecision,
  ApiStats,
  ApiFaculty,
  ApiRoom,
  ApiAttendanceItem,
  ApiIncidentRequest,
  ApiIncidentAccepted,
} from './api';

export type Role = 'student' | 'faculty' | 'hod';

export type ViewTab = 'today' | 'nudges' | 'events' | 'schedule' | 'admin';

export type NudgeCategory = 'DEADLINE' | 'ATTENDANCE' | 'PACING' | 'REPLAN' | 'EVENT' | 'FREE_SLOT';

export interface ReasoningLog {
  id: string;
  timestamp: string;
  tag: 'SIGNAL' | 'GRAPH' | 'HEURISTIC' | 'CONSTRAINT' | 'CONFLICT' | 'DISPATCH' | 'ESCALATION' | 'IDLE';
  phase?: string;
  step?: string;
  message: string;
}

export interface RelocationDiff {
  original: {
    time: string;
    statusBadge: string;
    course: string;
    faculty: string;
    room: string;
  };
  optimized: {
    time: string;
    statusBadge: string;
    routedBadge: string;
    course: string;
    faculty: string;
    room: string;
  };
}

export type {
  ApiUser,
  ApiSlot,
  ApiNudge,
  ApiEvent,
  ApiDecision,
  ApiStats,
  ApiFaculty,
  ApiRoom,
  ApiAttendanceItem,
  ApiIncidentRequest,
  ApiIncidentAccepted,
};
