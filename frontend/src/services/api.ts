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
  ApiToday,
} from '../types/api';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Mock mode is ENABLED by default unless explicitly disabled with VITE_USE_MOCK=false
 */
export const isMockMode = import.meta.env.VITE_USE_MOCK !== 'false';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

async function request<T>(path: string, options: RequestInit = {}, userId?: string): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  // CSRF protection for cookie-authenticated browser requests
  headers.set('X-Requested-With', 'TARS');
  if (inMemoryToken) {
    headers.set('Authorization', `Bearer ${inMemoryToken}`);
  }
  if (userId) {
    headers.set('X-User-Id', userId);
  }

  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    let errBody: { detail?: string; error?: string } | undefined;
    try {
      errBody = (await response.json()) as { detail?: string; error?: string };
    } catch {
      errBody = { error: 'http_error', detail: response.statusText };
    }
    const message = errBody?.detail || errBody?.error || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: async (loginId: string, password?: string): Promise<ApiUser> => {
    const res = await request<ApiUser | { token?: string; token_type?: string; expires_at?: string; user: ApiUser }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ login_id: loginId, ...(password ? { password } : {}) }),
      },
    );
    if ('user' in res && res.user) {
      if (res.token) {
        setAuthToken(res.token);
      }
      return res.user;
    }
    return res as ApiUser;
  },

  logout: async () => {
    try {
      return await request<{ ok: boolean }>('/auth/logout', {
        method: 'POST',
      });
    } finally {
      setAuthToken(null);
    }
  },

  getStreamTicket: () =>
    request<{ ticket: string; expires_at: string }>('/auth/stream-ticket', {
      method: 'POST',
    }),

  getDemoUsers: () => request<ApiUser[]>('/auth/demo-users'),

  getMe: (userId?: string) => request<ApiUser>('/me', {}, userId),

  // Schedule & Timetable
  getToday: (userId: string) => request<ApiToday>('/today', {}, userId),

  getTimetable: (section?: string, userId?: string) => {
    const query = section ? `?section=${encodeURIComponent(section)}` : '';
    return request<ApiSlot[]>(`/timetable${query}`, {}, userId);
  },

  getFacultyTimetable: (facultyId: string, userId?: string) =>
    request<ApiSlot[]>(`/timetable/faculty/${encodeURIComponent(facultyId)}`, {}, userId),

  getRooms: (day: string, period: number, userId?: string) =>
    request<ApiRoom[]>(`/rooms?day=${encodeURIComponent(day)}&period=${period}`, {}, userId),

  getFaculty: (userId?: string) => request<ApiFaculty[]>('/faculty', {}, userId),

  renameFaculty: (facultyId: string, name: string, userId?: string) =>
    request<ApiFaculty>(
      `/faculty/${encodeURIComponent(facultyId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      },
      userId,
    ),

  getAttendance: (section?: string, userId?: string) => {
    const query = section ? `?section=${encodeURIComponent(section)}` : '';
    return request<ApiAttendanceItem[]>(`/attendance${query}`, {}, userId);
  },

  // Nudges
  getNudges: (userId: string) => request<ApiNudge[]>('/nudges', {}, userId),

  readNudge: (nudgeId: number, userId: string) =>
    request<ApiNudge>(`/nudges/${nudgeId}/read`, { method: 'POST' }, userId),

  snoozeNudge: (nudgeId: number, minutes: number, userId: string) =>
    request<ApiNudge>(
      `/nudges/${nudgeId}/snooze`,
      {
        method: 'POST',
        body: JSON.stringify({ minutes }),
      },
      userId,
    ),

  blockNudge: (nudgeId: number, userId: string) =>
    request<ApiNudge>(`/nudges/${nudgeId}/block`, { method: 'POST' }, userId),

  // Events
  getEvents: (section?: string, userId?: string) => {
    const query = section ? `?section=${encodeURIComponent(section)}` : '';
    return request<ApiEvent[]>(`/events${query}`, {}, userId);
  },

  rsvpEvent: (eventId: number, userId: string) =>
    request<ApiEvent>(`/events/${eventId}/rsvp`, { method: 'POST' }, userId),

  cancelRsvpEvent: (eventId: number, userId: string) =>
    request<ApiEvent>(`/events/${eventId}/rsvp`, { method: 'DELETE' }, userId),

  // Incidents & Decisions
  reportIncident: (incident: ApiIncidentRequest, userId: string) =>
    request<ApiIncidentAccepted>(
      '/incidents',
      {
        method: 'POST',
        body: JSON.stringify(incident),
      },
      userId,
    ),

  getDecisions: (userId: string) => request<ApiDecision[]>('/decisions', {}, userId),

  approveDecision: (decisionId: number, userId: string) =>
    request<ApiDecision>(`/decisions/${decisionId}/approve`, { method: 'POST' }, userId),

  rejectDecision: (decisionId: number, userId: string) =>
    request<ApiDecision>(`/decisions/${decisionId}/reject`, { method: 'POST' }, userId),

  getStats: (userId: string) => request<ApiStats>('/stats', {}, userId),
};
