import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Role,
  ViewTab,
  ReasoningLog,
  RelocationDiff,
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
} from '../types/tars';
import { api, isMockMode } from '../services/api';
import { subscribeToSse } from '../services/sse';

import demoUsersJson from '../mock/demo_users.json';
import timetableJson from '../mock/timetable_CSE-A.json';
import nudgesJson from '../mock/nudges.json';
import eventsJson from '../mock/events.json';
import statsJson from '../mock/stats.json';
import decisionsJson from '../mock/decisions.json';
import attendanceJson from '../mock/attendance_CSE-A.json';

interface TarsContextType {
  isMockMode: boolean;
  currentUser: ApiUser;
  demoUsers: ApiUser[];
  switchUser: (userId: string) => Promise<void>;
  login: (loginId: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  role: Role;
  currentView: ViewTab;
  setCurrentView: (view: ViewTab) => void;
  unreadNudgesCount: number;

  // Timetable & Schedule
  slots: ApiSlot[];
  selectedSection: string;
  setSelectedSection: (sec: string) => void;
  facultyList: ApiFaculty[];
  roomList: ApiRoom[];

  // Attendance
  attendanceList: ApiAttendanceItem[];

  // Nudges
  nudges: ApiNudge[];
  selectedNudgeId: number | null;
  setSelectedNudgeId: (id: number | null) => void;
  handleNudgeRead: (id: number) => Promise<void>;
  handleNudgeSnooze: (id: number, minutes: number) => Promise<void>;
  handleNudgeBlock: (id: number) => Promise<void>;

  // Events
  events: ApiEvent[];
  handleEventRsvp: (id: number) => Promise<void>;

  // Admin & Incident
  incidentText: string;
  setIncidentText: (text: string) => void;
  reasoningLogs: ReasoningLog[];
  isReplanRunning: boolean;
  relocationDiff: RelocationDiff;
  triggerTarsReplan: (customIncident?: ApiIncidentRequest | string) => Promise<ApiIncidentAccepted | void>;
  decisions: ApiDecision[];
  handleApproveDecision: (id: number) => Promise<void>;
  handleRejectDecision: (id: number) => Promise<void>;
  stats: ApiStats;
  autoReplansCount: number;

  // Local interactive simulation actions (unsupported by backend)
  ticketRaised: boolean;
  setTicketRaised: (val: boolean) => void;
  facultyNudgeTriggered: boolean;
  nudgeAllFaculty: () => void;
  studySlotLocked: boolean;
  setStudySlotLocked: (val: boolean) => void;

  refreshData: () => Promise<void>;
}

const defaultDemoUsers: ApiUser[] = demoUsersJson as ApiUser[];
const defaultSlots: ApiSlot[] = timetableJson as ApiSlot[];
const defaultNudges: ApiNudge[] = nudgesJson as ApiNudge[];
const defaultEvents: ApiEvent[] = eventsJson as ApiEvent[];
const defaultStats: ApiStats = statsJson as ApiStats;
const defaultDecisions: ApiDecision[] = decisionsJson as ApiDecision[];
const defaultAttendance: ApiAttendanceItem[] = attendanceJson as ApiAttendanceItem[];

const defaultFacultyList: ApiFaculty[] = [
  { faculty_id: 'F01', name: 'Dr. Ananya Rao', subjects: ['DS', 'DSL'], max_load: 18, load: 14 },
  { faculty_id: 'F02', name: 'Prof. Kiran Kumar', subjects: ['OOP'], max_load: 18, load: 12 },
  { faculty_id: 'F03', name: 'Dr. Meera Iyer', subjects: ['MATH'], max_load: 18, load: 15 },
  { faculty_id: 'F04', name: 'Prof. Rahul Nair', subjects: ['SE'], max_load: 18, load: 10 },
  { faculty_id: 'F05', name: 'Dr. Sneha Patil', subjects: ['DLD'], max_load: 18, load: 14 },
  { faculty_id: 'F06', name: 'Prof. Arjun Shetty', subjects: ['COA'], max_load: 18, load: 12 },
  { faculty_id: 'F07', name: 'Dr. Farah Khan', subjects: ['CN'], max_load: 18, load: 10 },
  { faculty_id: 'F08', name: 'Prof. Vikram Joshi', subjects: ['DS', 'MATH'], max_load: 18, load: 5 },
];

const defaultRoomList: ApiRoom[] = [
  { id: 'R101', name: 'Room 101 (LH)', kind: 'classroom', capacity: 60, free: false },
  { id: 'R102', name: 'Room 102 (projector locked)', kind: 'classroom', capacity: 60, free: false },
  { id: 'R104', name: 'Room 104 (spare)', kind: 'classroom', capacity: 60, free: true },
  { id: 'LAB1', name: 'Tech Lab 1', kind: 'lab', capacity: 40, free: true },
  { id: 'AUDI', name: 'Main Auditorium', kind: 'hall', capacity: 250, free: true },
];

const initialDiff: RelocationDiff = {
  original: {
    time: '09:55 – 10:50 AM',
    statusBadge: 'CANCELLED',
    course: 'Data Structures (CSE-A)',
    faculty: 'Dr. Ananya Rao (Absent)',
    room: 'R101',
  },
  optimized: {
    time: '09:55 – 10:50 AM',
    statusBadge: 'REPLANNED',
    routedBadge: 'TARS ROUTED',
    course: 'Data Structures (CSE-A)',
    faculty: 'Prof. Vikram Joshi (Sub, load 5)',
    room: 'R101 Confirmed',
  },
};

const initialLogs: ReasoningLog[] = [
  {
    id: 'log-1',
    timestamp: '10:42:01.110',
    tag: 'SIGNAL',
    phase: 'signal',
    step: 'perceive',
    message: 'Dr. Ananya Rao absent MON: 2 slots affected (CSE-A P1 DSL, P2 DS)',
  },
  {
    id: 'log-2',
    timestamp: '10:42:02.430',
    tag: 'GRAPH',
    phase: 'evaluate',
    step: 'tool_call',
    message: 'get_attendance(CSE-A, DS) -> 71% (Critical: < 75%)',
  },
  {
    id: 'log-3',
    timestamp: '10:42:03.015',
    tag: 'HEURISTIC',
    phase: 'match',
    step: 'tool_call',
    message: 'find_substitute(DS, MON P2) -> Prof. Vikram Joshi (load 5, lowest in CSE)',
  },
  {
    id: 'log-4',
    timestamp: '10:42:03.680',
    tag: 'CONSTRAINT',
    phase: 'constraints',
    step: 'reason',
    message: 'Constraints OK: slot 23 CSE-A DS attendance 71% < 75%: cancel blocked, F08 can teach DS',
  },
  {
    id: 'log-5',
    timestamp: '10:42:04.220',
    tag: 'CONFLICT',
    phase: 'resolve',
    step: 'tool_call',
    message: 'validate_clash(1 change(s)) -> OK, no section/faculty/room clash detected',
  },
  {
    id: 'log-6',
    timestamp: '10:42:04.810',
    tag: 'DISPATCH',
    phase: 'dispatch',
    step: 'act',
    message: 'Committed change: Data Structures on MON at 09:55 reassigned to Prof. Vikram Joshi',
  },
  {
    id: 'log-7',
    timestamp: '10:42:05.105',
    tag: 'ESCALATION',
    phase: 'dispatch',
    step: 'done',
    message: 'Status: pending_ack. Auto-escalation watchdog armed: Escalates to HOD in 2 min (demo mode)',
  },
  {
    id: 'log-8',
    timestamp: '10:42:06.000',
    tag: 'IDLE',
    message: '[AUTONOMOUS AGENT IDLE - LISTENING ON WEBHOOKS...]',
  },
];

const TarsContext = createContext<TarsContextType | undefined>(undefined);

export const TarsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ApiUser>(defaultDemoUsers[0]); // Shreyansh S001
  const [demoUsers, setDemoUsers] = useState<ApiUser[]>(defaultDemoUsers);
  const [currentView, setCurrentView] = useState<ViewTab>('today');
  const [selectedSection, setSelectedSection] = useState<string>('CSE-A');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isMockMode);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Timetable & Resources
  const [slots, setSlots] = useState<ApiSlot[]>(defaultSlots);
  const [facultyList, setFacultyList] = useState<ApiFaculty[]>(defaultFacultyList);
  const [roomList, setRoomList] = useState<ApiRoom[]>(defaultRoomList);
  const [attendanceList, setAttendanceList] = useState<ApiAttendanceItem[]>(defaultAttendance);

  // Nudges & Events
  const [nudges, setNudges] = useState<ApiNudge[]>(defaultNudges);
  const [selectedNudgeId, setSelectedNudgeId] = useState<number | null>(nudges[0]?.id || 1);
  const [events, setEvents] = useState<ApiEvent[]>(defaultEvents);

  // Admin & Incident
  const [incidentText, setIncidentText] = useState('Dr. Ananya Rao absent MON (P1-P2) due to fever');
  const [reasoningLogs, setReasoningLogs] = useState<ReasoningLog[]>(initialLogs);
  const [isReplanRunning, setIsReplanRunning] = useState(false);
  const [relocationDiff, setRelocationDiff] = useState<RelocationDiff>(initialDiff);
  const [decisions, setDecisions] = useState<ApiDecision[]>(defaultDecisions);
  const [stats, setStats] = useState<ApiStats>(defaultStats);
  const [autoReplansCount, setAutoReplansCount] = useState<number>(38);

  // Local simulations for unsupported actions
  const [ticketRaised, setTicketRaised] = useState(false);
  const [facultyNudgeTriggered, setFacultyNudgeTriggered] = useState(false);
  const [studySlotLocked, setStudySlotLocked] = useState(false);

  const role: Role = (currentUser.role as Role) || 'student';

  const unreadNudgesCount = useMemo(() => {
    return nudges.filter((n) => !n.read && !n.blocked).length;
  }, [nudges]);

  // Session verification on mount in API mode
  useEffect(() => {
    if (isMockMode) return;

    api.getMe()
      .then((user) => {
        setCurrentUser(user);
        setIsAuthenticated(true);
        if (user.role === 'hod') setCurrentView('admin');
        else setCurrentView('today');
      })
      .catch(() => {
        setIsAuthenticated(false);
        setShowLoginModal(true);
      });
  }, []);

  const handleSetCurrentView = (view: ViewTab) => {
    if (view === 'admin' && currentUser.role === 'student') {
      console.warn('Access denied: Admin Console requires HOD or Staff role.');
      return;
    }
    setCurrentView(view);
  };

  // Data fetching in API mode
  const refreshData = useCallback(async () => {
    if (isMockMode) return;
    try {
      const sec = currentUser.section || selectedSection || 'CSE-A';
      const [demoUsersRes, todayRes, timetableRes, nudgesRes, eventsRes, attendanceRes, facultyRes, roomsRes] =
        await Promise.all([
          api.getDemoUsers().catch(() => defaultDemoUsers),
          api.getToday(currentUser.user_id).catch(() => null),
          api.getTimetable(sec, currentUser.user_id).catch(() => []),
          api.getNudges(currentUser.user_id).catch(() => []),
          api.getEvents(sec, currentUser.user_id).catch(() => []),
          api.getAttendance(sec, currentUser.user_id).catch(() => []),
          api.getFaculty(currentUser.user_id).catch(() => []),
          api.getRooms('MON', 1, currentUser.user_id).catch(() => []),
        ]);

      if (demoUsersRes.length) setDemoUsers(demoUsersRes);
      if (todayRes?.slots) setSlots(todayRes.slots);
      else if (timetableRes.length) setSlots(timetableRes);
      if (nudgesRes) setNudges(nudgesRes);
      if (eventsRes) setEvents(eventsRes);
      if (attendanceRes) setAttendanceList(attendanceRes);
      if (facultyRes) setFacultyList(facultyRes);
      if (roomsRes && roomsRes.length) setRoomList(roomsRes);

      if (currentUser.role === 'hod') {
        const [statsRes, decisionsRes] = await Promise.all([
          api.getStats(currentUser.user_id).catch(() => defaultStats),
          api.getDecisions(currentUser.user_id).catch(() => []),
        ]);
        if (statsRes) setStats(statsRes);
        if (decisionsRes) setDecisions(decisionsRes);
      }
    } catch (e) {
      console.warn('API refresh encountered error:', e);
    }
  }, [currentUser, selectedSection]);

  // Subscribe to SSE updates in API mode
  useEffect(() => {
    if (isMockMode) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData();

    const unsubscribe = subscribeToSse(currentUser.user_id, {
      onAgentStep: (stepData) => {
        const tagMap: Record<string, ReasoningLog['tag']> = {
          signal: 'SIGNAL',
          evaluate: 'GRAPH',
          match: 'HEURISTIC',
          constraints: 'CONSTRAINT',
          resolve: 'CONFLICT',
          dispatch: 'DISPATCH',
          escalate: 'ESCALATION',
        };
        const logItem: ReasoningLog = {
          id: `step-${Date.now()}-${Math.random()}`,
          timestamp: stepData.ts.slice(11) || new Date().toISOString().slice(11, 19),
          tag: tagMap[stepData.phase] || 'SIGNAL',
          phase: stepData.phase,
          step: stepData.step,
          message: stepData.text,
        };
        setReasoningLogs((prev) => [...prev, logItem]);
        if (stepData.step === 'done') {
          setIsReplanRunning(false);
          setAutoReplansCount((c) => c + 1);
        }
      },
      onTimetableUpdated: () => {
        refreshData();
      },
      onDecisionUpdated: (dec) => {
        setDecisions((prev) => [dec, ...prev.filter((d) => d.id !== dec.id)]);
      },
      onNudgeCreated: (newNudge) => {
        setNudges((prev) => [newNudge, ...prev.filter((n) => n.id !== newNudge.id)]);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser.user_id, refreshData]);

  // Production Sign In
  const login = async (loginId: string, password?: string) => {
    if (isMockMode) {
      const upper = loginId.trim().toUpperCase();
      const found = demoUsers.find(
        (u) => (u.usn && u.usn.toUpperCase() === upper) || u.user_id.toUpperCase() === upper
      );
      if (!found) throw new Error('No user found with that USN or Staff ID in demo directory');
      setCurrentUser(found);
      setIsAuthenticated(true);
      setShowLoginModal(false);
      if (found.role === 'hod') setCurrentView('admin');
      else setCurrentView('today');
      return;
    }

    // Authenticate with credentials against backend
    await api.login(loginId, password);
    // Never trust client data: derive active user & role directly from verified session via GET /api/me
    const verifiedUser = await api.getMe();
    setCurrentUser(verifiedUser);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    if (verifiedUser.role === 'hod') setCurrentView('admin');
    else setCurrentView('today');
    await refreshData();
  };

  // Production Sign Out
  const logout = async () => {
    if (!isMockMode) {
      try {
        await api.logout();
      } catch (e) {
        console.warn('Logout API call failed:', e);
      }
    }
    setIsAuthenticated(false);
    setShowLoginModal(true);
  };

  // Demo Role / User Switcher (Mock Mode only)
  const switchUser = async (userId: string) => {
    if (!isMockMode) {
      console.warn('Direct user switching is disabled in API Mode. Changing accounts requires signing out and entering verified credentials.');
      return;
    }

    const found = demoUsers.find((u) => u.user_id === userId);
    if (!found) return;

    setCurrentUser(found);
    if (found.role === 'hod') {
      setCurrentView('admin');
    } else {
      setCurrentView('today');
    }
  };

  // Nudge Actions
  const handleNudgeRead = async (id: number) => {
    if (!isMockMode) {
      try {
        await api.readNudge(id, currentUser.user_id);
      } catch (err) {
        console.error(err);
      }
    }
    setNudges((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleNudgeSnooze = async (id: number, minutes: number) => {
    if (!isMockMode) {
      try {
        await api.snoozeNudge(id, minutes, currentUser.user_id);
      } catch (err) {
        console.error(err);
      }
    }
    const until = new Date(Date.now() + minutes * 60000).toISOString();
    setNudges((prev) => prev.map((n) => (n.id === id ? { ...n, snoozed_until: until } : n)));
  };

  const handleNudgeBlock = async (id: number) => {
    if (!isMockMode) {
      try {
        await api.blockNudge(id, currentUser.user_id);
        setStats((s: ApiStats) => ({ ...s, nudges_acted: s.nudges_acted + 1 }));
      } catch (err) {
        console.error(err);
      }
    } else {
      setStats((s: ApiStats) => ({ ...s, nudges_acted: s.nudges_acted + 1 }));
    }
    setStudySlotLocked(true);
    setNudges((prev) => prev.map((n) => (n.id === id ? { ...n, blocked: true } : n)));
  };

  // Event RSVP
  const handleEventRsvp = async (id: number) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const nextRsvp = !ev.rsvp;

    if (!isMockMode) {
      try {
        if (nextRsvp) {
          await api.rsvpEvent(id, currentUser.user_id);
        } else {
          await api.cancelRsvpEvent(id, currentUser.user_id);
        }
      } catch (err) {
        console.error(err);
      }
    }

    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              rsvp: nextRsvp,
              rsvp_count: nextRsvp ? e.rsvp_count + 1 : Math.max(0, e.rsvp_count - 1),
            }
          : e,
      ),
    );
  };

  // Incident & Replan
  const triggerTarsReplan = async (
    customIncident?: ApiIncidentRequest | string,
  ): Promise<ApiIncidentAccepted | void> => {
    let incidentReq: ApiIncidentRequest;
    if (typeof customIncident === 'object' && customIncident !== null) {
      incidentReq = customIncident;
      if (incidentReq.note) {
        setIncidentText(incidentReq.note);
      }
    } else {
      const textToRun = typeof customIncident === 'string' ? customIncident : incidentText;
      incidentReq = {
        type: 'absence',
        faculty_id: 'F01',
        day: 'MON',
        periods: [1, 2],
        note: textToRun,
      };
    }

    setIsReplanRunning(true);
    setReasoningLogs([]);

    if (!isMockMode) {
      try {
        const res = await api.reportIncident(incidentReq, currentUser.user_id);
        // Live streaming will come via SSE agent_step listener!
        return res;
      } catch (err) {
        console.error('Incident report error:', err);
        setIsReplanRunning(false);
        throw err;
      }
    }

    // Mock mode step-by-step log animation
    const textToRun =
      incidentReq.note ||
      (incidentReq.type === 'absence'
        ? `Faculty ${incidentReq.faculty_id} absent ${incidentReq.day} (periods ${incidentReq.periods.join(', ')})`
        : `Room ${incidentReq.room_id} unavailable ${incidentReq.day} (periods ${incidentReq.periods.join(', ')})`);

    const steps: { tag: ReasoningLog['tag']; phase: string; step: string; message: string; delay: number }[] = [
      {
        tag: 'SIGNAL',
        phase: 'signal',
        step: 'perceive',
        message: `Ingested incident trigger: "${textToRun}". Webhook priority high.`,
        delay: 200,
      },
      {
        tag: 'GRAPH',
        phase: 'evaluate',
        step: 'tool_call',
        message: 'get_attendance(CSE-A, DS) -> 71% (Critical: < 75%)',
        delay: 800,
      },
      {
        tag: 'HEURISTIC',
        phase: 'match',
        step: 'tool_call',
        message: 'find_substitute(DS, MON P2) -> Prof. Vikram Joshi (load 5, lowest in CSE)',
        delay: 1400,
      },
      {
        tag: 'CONSTRAINT',
        phase: 'constraints',
        step: 'reason',
        message: 'Constraints OK: slot 23 CSE-A DS attendance 71% < 75%: cancel blocked, F08 can teach DS',
        delay: 2000,
      },
      {
        tag: 'CONFLICT',
        phase: 'resolve',
        step: 'tool_call',
        message: 'validate_clash(1 change(s)) -> OK, no section/faculty/room clash detected',
        delay: 2600,
      },
      {
        tag: 'DISPATCH',
        phase: 'dispatch',
        step: 'act',
        message: 'Committed change: Data Structures on MON at 09:55 reassigned to Prof. Vikram Joshi',
        delay: 3200,
      },
      {
        tag: 'ESCALATION',
        phase: 'dispatch',
        step: 'done',
        message: 'Status: pending_ack. Auto-escalation watchdog armed: Escalates to HOD in 2 min (demo mode)',
        delay: 3800,
      },
      {
        tag: 'IDLE',
        phase: 'idle',
        step: 'idle',
        message: '[AUTONOMOUS AGENT IDLE - LISTENING ON WEBHOOKS...]',
        delay: 4200,
      },
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        setReasoningLogs((prev) => [
          ...prev,
          {
            id: `log-${Date.now()}-${index}`,
            timestamp: timeStr,
            tag: step.tag,
            phase: step.phase,
            step: step.step,
            message: step.message,
          },
        ]);

        if (index === steps.length - 1) {
          setIsReplanRunning(false);
          setAutoReplansCount((c) => c + 1);
          setRelocationDiff({
            original: {
              time: '09:55 – 10:50 AM',
              statusBadge: 'CANCELLED',
              course: 'Data Structures (CSE-A)',
              faculty: 'Dr. Ananya Rao (Absent)',
              room: 'R101',
            },
            optimized: {
              time: '09:55 – 10:50 AM',
              statusBadge: 'REPLANNED',
              routedBadge: 'TARS ROUTED',
              course: 'Data Structures (CSE-A)',
              faculty: 'Prof. Vikram Joshi (Sub, load 5)',
              room: 'R101 Confirmed',
            },
          });
          // Update slot
          setSlots((prev) =>
            prev.map((s) =>
              s.id === 23
                ? {
                    ...s,
                    status: 'replanned',
                    faculty_id: 'F08',
                    faculty_name: 'Prof. Vikram Joshi',
                  }
                : s,
            ),
          );
        }
      }, step.delay);
    });

    return {
      incident_id: Math.floor(Math.random() * 800) + 100,
      decision_id: Math.floor(Math.random() * 800) + 100,
      status: 'agent_running' as const,
    };
  };

  // Decisions Approval / Rejection
  const handleApproveDecision = async (id: number) => {
    if (!isMockMode) {
      try {
        await api.approveDecision(id, currentUser.user_id);
      } catch (err) {
        console.error(err);
      }
    }
    setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'committed' } : d)));
  };

  const handleRejectDecision = async (id: number) => {
    if (!isMockMode) {
      try {
        await api.rejectDecision(id, currentUser.user_id);
      } catch (err) {
        console.error(err);
      }
    }
    setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d)));
  };

  // Local simulation handlers
  const nudgeAllFaculty = () => {
    setFacultyNudgeTriggered(true);
    setStats((s: ApiStats) => ({ ...s, nudges_acted: s.nudges_acted + 5 }));
  };

  return (
    <TarsContext.Provider
      value={{
        isMockMode,
        currentUser,
        demoUsers,
        switchUser,
        login,
        logout,
        isAuthenticated,
        showLoginModal,
        setShowLoginModal,
        role,
        currentView,
        setCurrentView: handleSetCurrentView,
        unreadNudgesCount,
        slots,
        selectedSection,
        setSelectedSection,
        facultyList,
        roomList,
        attendanceList,
        nudges,
        selectedNudgeId,
        setSelectedNudgeId,
        handleNudgeRead,
        handleNudgeSnooze,
        handleNudgeBlock,
        events,
        handleEventRsvp,
        incidentText,
        setIncidentText,
        reasoningLogs,
        isReplanRunning,
        relocationDiff,
        triggerTarsReplan,
        decisions,
        handleApproveDecision,
        handleRejectDecision,
        stats,
        autoReplansCount,
        ticketRaised,
        setTicketRaised,
        facultyNudgeTriggered,
        nudgeAllFaculty,
        studySlotLocked,
        setStudySlotLocked,
        refreshData,
      }}
    >
      {children}
    </TarsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTars = () => {
  const context = useContext(TarsContext);
  if (!context) {
    throw new Error('useTars must be used within a TarsProvider');
  }
  return context;
};
