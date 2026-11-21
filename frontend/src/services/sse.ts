import { API_BASE, api, getAuthToken, isMockMode } from './api';
import type {
  SseAgentStepData,
  SseTimetableUpdatedData,
  ApiDecision,
  ApiNudge,
} from '../types/api';

export interface SseHandlers {
  onAgentStep?: (data: SseAgentStepData) => void;
  onTimetableUpdated?: (data: SseTimetableUpdatedData) => void;
  onDecisionUpdated?: (data: ApiDecision) => void;
  onNudgeCreated?: (data: ApiNudge) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

export function subscribeToSse(userId: string, handlers: SseHandlers): () => void {
  if (isMockMode) {
    // In mock mode, don't open real network connection
    return () => {};
  }

  let closed = false;
  let es: EventSource | null = null;

  async function initStream() {
    let url = `${API_BASE}/stream`;
    const token = getAuthToken();
    if (token) {
      try {
        const ticketRes = await api.getStreamTicket();
        if (ticketRes?.ticket) {
          url = `${API_BASE}/stream?ticket=${encodeURIComponent(ticketRes.ticket)}`;
        }
      } catch (err) {
        console.warn('Failed to obtain stream ticket, falling back to query/cookie:', err);
        if (userId) {
          url = `${API_BASE}/stream?user_id=${encodeURIComponent(userId)}`;
        }
      }
    } else if (userId) {
      url = `${API_BASE}/stream?user_id=${encodeURIComponent(userId)}`;
    }

    if (closed) return;

    es = new EventSource(url, { withCredentials: true });

    if (handlers.onOpen) {
      es.onopen = () => handlers.onOpen?.();
    }

    if (handlers.onError) {
      es.onerror = (e) => handlers.onError?.(e);
    }

    es.addEventListener('agent_step', (event: MessageEvent) => {
      try {
        const data: SseAgentStepData = JSON.parse(event.data);
        handlers.onAgentStep?.(data);
      } catch (e) {
        console.error('Failed to parse agent_step event:', e);
      }
    });

    es.addEventListener('timetable_updated', (event: MessageEvent) => {
      try {
        const data: SseTimetableUpdatedData = JSON.parse(event.data);
        handlers.onTimetableUpdated?.(data);
      } catch (e) {
        console.error('Failed to parse timetable_updated event:', e);
      }
    });

    es.addEventListener('decision_updated', (event: MessageEvent) => {
      try {
        const data: ApiDecision = JSON.parse(event.data);
        handlers.onDecisionUpdated?.(data);
      } catch (e) {
        console.error('Failed to parse decision_updated event:', e);
      }
    });

    es.addEventListener('nudge_created', (event: MessageEvent) => {
      try {
        const data: ApiNudge = JSON.parse(event.data);
        handlers.onNudgeCreated?.(data);
      } catch (e) {
        console.error('Failed to parse nudge_created event:', e);
      }
    });
  }

  void initStream();

  return () => {
    closed = true;
    if (es) {
      es.close();
    }
  };
}
