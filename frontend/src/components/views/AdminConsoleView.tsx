import React, { useState, useEffect, useMemo } from 'react';
import { useTars } from '../../context/TarsContext';
import { api } from '../../services/api';
import type { ApiIncidentRequest, ApiIncidentAccepted, ApiFaculty, ApiRoom } from '../../types/api';
import {
  Zap,
  AlertTriangle,
  CheckCircle2,
  Send,
  Wrench,
  Check,
  X,
  UserX,
  DoorClosed,
  Calendar,
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react';

const PERIODS = [
  { num: 1, time: '09:00 - 09:55' },
  { num: 2, time: '09:55 - 10:50' },
  { num: 3, time: '11:05 - 12:00' },
  { num: 4, time: '12:00 - 12:55' },
  { num: 5, time: '13:45 - 14:40' },
  { num: 6, time: '14:40 - 15:35' },
];

const DAYS: { id: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'; label: string; full: string }[] = [
  { id: 'MON', label: 'MON', full: 'Monday' },
  { id: 'TUE', label: 'TUE', full: 'Tuesday' },
  { id: 'WED', label: 'WED', full: 'Wednesday' },
  { id: 'THU', label: 'THU', full: 'Thursday' },
  { id: 'FRI', label: 'FRI', full: 'Friday' },
];

interface PresetItem {
  label: string;
  type: 'absence' | 'room_unavailable';
  facultyId?: string;
  roomId?: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  periods: number[];
  note: string;
}

export const AdminConsoleView: React.FC = () => {
  const {
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
    facultyList,
    roomList,
    slots,
    currentUser,
    isMockMode,
  } = useTars();

  const [blastRadiusModal, setBlastRadiusModal] = useState(false);

  // Form State
  const [incidentType, setIncidentType] = useState<'absence' | 'room_unavailable'>('absence');
  const [facultyId, setFacultyId] = useState<string>('F01');
  const [roomId, setRoomId] = useState<string>('R101');
  const [day, setDay] = useState<'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'>('MON');
  const [periods, setPeriods] = useState<number[]>([1, 2]);
  const [note, setNote] = useState<string>('');

  // Submission feedback states
  const [submitSuccess, setSubmitSuccess] = useState<ApiIncidentAccepted | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback lists if context is loading
  const [extraFaculties, setExtraFaculties] = useState<ApiFaculty[]>([]);
  const [extraRooms, setExtraRooms] = useState<ApiRoom[]>([]);

  useEffect(() => {
    if (!isMockMode && (facultyList.length === 0 || roomList.length === 0)) {
      Promise.all([
        api.getFaculty(currentUser.user_id).catch(() => []),
        api.getRooms('MON', 1, currentUser.user_id).catch(() => []),
      ]).then(([fRes, rRes]) => {
        if (fRes.length > 0) setExtraFaculties(fRes);
        if (rRes.length > 0) setExtraRooms(rRes);
      });
    }
  }, [isMockMode, currentUser.user_id, facultyList.length, roomList.length]);

  const faculties = facultyList.length > 0 ? facultyList : extraFaculties;
  const rooms = roomList.length > 0 ? roomList : extraRooms;

  const activeFacultyId = faculties.some((f) => f.faculty_id === facultyId)
    ? facultyId
    : faculties[0]?.faculty_id || 'F01';

  const activeRoomId = rooms.some((r) => r.id === roomId)
    ? roomId
    : rooms[0]?.id || 'R101';

  // Quick test presets
  const presets: PresetItem[] = [
    {
      label: '+ Dr. Rao Absent (TUE P1, P3)',
      type: 'absence',
      facultyId: 'F01',
      day: 'TUE',
      periods: [1, 3],
      note: 'Dr. Ananya Rao on medical sick leave (fever).',
    },
    {
      label: '+ Room 102 Lockout (MON P1, P2)',
      type: 'room_unavailable',
      roomId: 'R102',
      day: 'MON',
      periods: [1, 2],
      note: 'Room 102 ceiling projector optical handshake failure.',
    },
    {
      label: '+ Prof. Kumar Absent (FRI P5)',
      type: 'absence',
      facultyId: 'F02',
      day: 'FRI',
      periods: [5],
      note: 'Prof. Kiran Kumar attending faculty symposium.',
    },
    {
      label: '+ Test Empty Scope (MON P1)',
      type: 'absence',
      facultyId: 'F01',
      day: 'MON',
      periods: [1],
      note: 'Testing empty class scope (rejection verification).',
    },
  ];

  const handleApplyPreset = (preset: PresetItem) => {
    setIncidentType(preset.type);
    if (preset.facultyId) setFacultyId(preset.facultyId);
    if (preset.roomId) setRoomId(preset.roomId);
    setDay(preset.day);
    setPeriods(preset.periods);
    setNote(preset.note);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleTogglePeriod = (pNum: number) => {
    setSubmitError(null);
    setPeriods((prev) => {
      if (prev.includes(pNum)) {
        return prev.filter((p) => p !== pNum);
      } else {
        return [...prev, pNum].sort((a, b) => a - b);
      }
    });
  };

  const handleSelectAllPeriods = () => {
    setSubmitError(null);
    setPeriods([1, 2, 3, 4, 5, 6]);
  };

  const handleClearPeriods = () => {
    setSubmitError(null);
    setPeriods([]);
  };

  // Inspect matching classes in client timetable preview
  const affectedClassesInScope = useMemo(() => {
    if (!slots || slots.length === 0) return [];
    return slots.filter((s) => {
      if (s.day !== day) return false;
      if (!periods.includes(s.period)) return false;
      if (incidentType === 'absence') {
        return s.faculty_id === activeFacultyId && s.status !== 'cancelled';
      } else {
        return s.room_id === activeRoomId && s.status !== 'cancelled';
      }
    });
  }, [slots, day, periods, incidentType, activeFacultyId, activeRoomId]);

  // Handle Form Submission
  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (periods.length === 0) {
      setSubmitError('Validation Error: Please select at least one affected period (1 to 6).');
      return;
    }

    if (incidentType === 'absence' && !activeFacultyId) {
      setSubmitError('Validation Error: Please select an affected faculty member.');
      return;
    }

    if (incidentType === 'room_unavailable' && !activeRoomId) {
      setSubmitError('Validation Error: Please select an unavailable room.');
      return;
    }

    const payload: ApiIncidentRequest = {
      type: incidentType,
      faculty_id: incidentType === 'absence' ? activeFacultyId : null,
      room_id: incidentType === 'room_unavailable' ? activeRoomId : null,
      day,
      periods,
      note: note.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const res = await triggerTarsReplan(payload);
      if (res) {
        setSubmitSuccess(res);
      } else {
        setSubmitSuccess({
          incident_id: 101,
          decision_id: 201,
          status: 'agent_running',
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Incident submission failed. Please verify server connection.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200/80 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Mission Control</h1>
            <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded border border-slate-300/60">
              CLUSTER-SOUTH-01
            </span>
          </div>
          <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
            <span className="font-medium text-slate-600">
              Autonomous Campus Scheduling &amp; Real-Time Conflict Resolution Engine
            </span>
            <span className="text-slate-300">•</span>
            <span>Scope: CSE (Sem 1-8)</span>
            <span className="text-slate-300">•</span>
            <span>Sync: 12s ago</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>ENGINE STATE: AUTONOMOUS INTERVENTION ACTIVE</span>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Auto Re-plans */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Auto Re-plans (30D)</span>
            <span className="px-1.5 py-0.2 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
              OPTIMAL
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{autoReplansCount}</span>
            <span className="text-xs font-semibold text-emerald-600">+12 vs. prev</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>vs. manual avg</span>
            <span className="font-semibold text-slate-700">100% matched</span>
          </div>
        </div>

        {/* KPI 2: Classes Lost */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Classes Lost</span>
            <span className="px-1.5 py-0.2 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
              100% SLA
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.classes_lost}</span>
            <span className="text-xs font-medium text-slate-400">/ 1,480 total</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>0 hrs dropped</span>
            <span className="font-semibold text-emerald-600">zero downtime</span>
          </div>
        </div>

        {/* KPI 3: Nudges Acted On */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Nudges Acted On</span>
            <span className="px-1.5 py-0.2 rounded font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200">
              PROACTIVE
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.nudges_acted}</span>
            <span className="text-xs font-semibold text-indigo-600">84.8% conv</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Response latency</span>
            <span className="font-semibold text-slate-700">{stats.avg_response_s}s avg window</span>
          </div>
        </div>

        {/* KPI 4: Recovered >75% Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
            <span>Recovered &gt;75% Att.</span>
            <span className="px-1.5 py-0.2 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
              RESCUED
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.rescued}</span>
            <span className="text-xs font-medium text-slate-400">sections flagged</span>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>At-risk protocol</span>
            <span className="font-semibold text-emerald-600">0 recidivism</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 8 cols, Right 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* Incident Reporter Form Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">Report Schedule Disruption / Incident</h3>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500 font-medium">HOD Operations</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                  POST /api/incidents
                </span>
              </div>
            </div>

            {/* Success State Banner */}
            {submitSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start justify-between space-x-3 animate-in fade-in">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold flex items-center space-x-2">
                      <span>Incident Accepted by TARS Engine</span>
                      <span className="px-2 py-0.2 rounded-full font-mono text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
                        STATUS: {submitSuccess.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1 text-emerald-700 leading-relaxed">
                      Incident <strong>#{submitSuccess.incident_id}</strong> accepted · Decision <strong>#{submitSuccess.decision_id}</strong> initiated.
                      Autonomous conflict resolution loop is running. Watch live reasoning trace below.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(null)}
                  className="text-emerald-500 hover:text-emerald-700 font-bold p-1"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Rejection / Error State Banner */}
            {submitError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start justify-between space-x-3 animate-in fade-in">
                <div className="flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-rose-800">Incident Rejected by Backend</div>
                    <div className="mt-1 text-rose-700 leading-relaxed font-mono">
                      {submitError}
                    </div>
                    <div className="mt-1 text-[11px] text-rose-500">
                      Tip: The backend requires at least one scheduled class to be affected by the selected entity, day, and period.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError(null)}
                  className="text-rose-400 hover:text-rose-600 font-bold p-1"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Incident Configuration Form */}
            <form onSubmit={handleSubmitIncident} className="space-y-4">
              {/* Field 1: Incident Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  1. Incident Type
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIncidentType('absence');
                      setSubmitError(null);
                    }}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      incidentType === 'absence'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <UserX className="w-4 h-4" />
                    <span>Faculty Absence</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIncidentType('room_unavailable');
                      setSubmitError(null);
                    }}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      incidentType === 'room_unavailable'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <DoorClosed className="w-4 h-4" />
                    <span>Room Unavailable</span>
                  </button>
                </div>
              </div>

              {/* Field 2 & 3: Entity + Day */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Field 2: Faculty or Room Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    {incidentType === 'absence' ? '2. Select Absent Faculty' : '2. Select Unavailable Room'}
                  </label>
                  {incidentType === 'absence' ? (
                    <select
                      value={activeFacultyId}
                      onChange={(e) => {
                        setFacultyId(e.target.value);
                        setSubmitError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      {faculties.map((f) => (
                        <option key={f.faculty_id} value={f.faculty_id}>
                          {f.name} ({f.faculty_id}) — Load: {f.load}/{f.max_load} hrs
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={activeRoomId}
                      onChange={(e) => {
                        setRoomId(e.target.value);
                        setSubmitError(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.id}) — {r.kind} (cap: {r.capacity})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Field 3: Day Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>3. Disruption Day</span>
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {DAYS.map((d) => (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => {
                          setDay(d.id);
                          setSubmitError(null);
                        }}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all border ${
                          day === d.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={d.full}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field 4: Affected Periods */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>4. Affected Periods ({periods.length} selected)</span>
                  </label>
                  <div className="space-x-2 text-[10px] font-semibold text-indigo-600">
                    <button
                      type="button"
                      onClick={handleSelectAllPeriods}
                      className="hover:underline"
                    >
                      Select All (1–6)
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleClearPeriods}
                      className="hover:underline text-slate-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {PERIODS.map((p) => {
                    const isSelected = periods.includes(p.num);
                    return (
                      <button
                        type="button"
                        key={p.num}
                        onClick={() => handleTogglePeriod(p.num)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="font-extrabold text-sm">P{p.num}</span>
                        <span className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {p.time.split(' - ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 5: Optional Note */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  5. Incident Notes &amp; Context (Optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. High fever medical leave / Ceiling projector optical handshake failure"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                />
              </div>

              {/* Scope validation helper banner */}
              {affectedClassesInScope.length > 0 ? (
                <div className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{affectedClassesInScope.length} scheduled class{affectedClassesInScope.length > 1 ? 'es' : ''}</strong> detected in timetable:{' '}
                    {affectedClassesInScope.map((s) => `${s.section} ${s.subject_code} (P${s.period})`).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    No matching classes found in local schedule view for this selection. (Note: backend returns 422 if 0 scheduled classes are affected).
                  </span>
                </div>
              )}

              {/* Presets bar */}
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Quick Test Presets:</span>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-[11px] font-medium transition-colors border border-slate-200"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Actions Bar */}
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Constraint Solver Engine v4.2 Ready</span>
                </div>

                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setBlastRadiusModal(!blastRadiusModal)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Simulate Blast Radius
                  </button>

                  <button
                    type="submit"
                    disabled={isReplanRunning || isSubmitting || periods.length === 0}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-all disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isReplanRunning || isSubmitting ? 'animate-bounce' : ''}`} />
                    <span>{isReplanRunning || isSubmitting ? 'TARS Re-planning...' : '⚡ Submit Incident to TARS'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Blast radius simulator panel */}
            {blastRadiusModal && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-800">Simulated Blast Radius Analysis:</div>
                <div className="text-slate-600">
                  • Scope: {incidentType === 'absence' ? `Faculty ${facultyId}` : `Room ${roomId}`} on {day} ({periods.map((p) => `P${p}`).join(', ')}).
                </div>
                <div className="text-slate-600">
                  • Constraint Solver: Evaluates substitute faculty load (&lt;18 hrs) and clash-free rooms.
                </div>
              </div>
            )}
          </div>

          {/* Live Reasoning Trace Card */}
          <div className="bg-slate-950 text-slate-200 rounded-2xl border border-slate-800 p-5 shadow-md font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Reasoning Trace</span>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">SSE Stream Feed</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-400">{isReplanRunning ? 'Engine Active' : 'Ready'}</span>
                <span className={`px-1.5 py-0.2 rounded font-bold border ${
                  isReplanRunning
                    ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                }`}>
                  {isReplanRunning ? 'RESOLVING' : 'IDLE'}
                </span>
              </div>
            </div>

            {/* Log streams */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {reasoningLogs.length === 0 ? (
                <div className="text-slate-500 py-3 text-center italic">
                  [Awaiting incident submission. Logs and constraint solving steps will stream here in real time.]
                </div>
              ) : (
                reasoningLogs.map((log) => {
                  const tagColor =
                    log.tag === 'SIGNAL'
                      ? 'text-purple-400 bg-purple-950/60 border-purple-800/80'
                      : log.tag === 'GRAPH'
                      ? 'text-blue-400 bg-blue-950/60 border-blue-800/80'
                      : log.tag === 'HEURISTIC'
                      ? 'text-cyan-400 bg-cyan-950/60 border-cyan-800/80'
                      : log.tag === 'CONSTRAINT'
                      ? 'text-amber-400 bg-amber-950/60 border-amber-800/80'
                      : log.tag === 'CONFLICT'
                      ? 'text-rose-400 bg-rose-950/60 border-rose-800/80'
                      : log.tag === 'DISPATCH'
                      ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/80'
                      : log.tag === 'ESCALATION'
                      ? 'text-yellow-400 bg-yellow-950/60 border-yellow-800/80'
                      : 'text-slate-400 bg-slate-900 border-slate-800';

                  return (
                    <div key={log.id} className="leading-relaxed flex items-start space-x-2">
                      <span className="text-slate-500 select-none flex-shrink-0">[{log.timestamp}]</span>
                      {log.tag !== 'IDLE' && (
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border flex-shrink-0 ${tagColor}`}>
                          {log.tag}
                        </span>
                      )}
                      <span className={log.tag === 'IDLE' ? 'text-slate-500 font-semibold' : 'text-slate-300'}>
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
              {isReplanRunning && (
                <div className="text-indigo-400 animate-pulse font-semibold">
                  &gt; Computing optimal heuristic slot matrix...
                </div>
              )}
            </div>
          </div>

          {/* Proposed Relocation Diff */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Proposed Relocation Diff</h3>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                AUDITED CHANGES
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Original Slot */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original Slot</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-700">{relocationDiff.original.time}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {relocationDiff.original.statusBadge}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm mt-1">{relocationDiff.original.course}</h4>
                <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>{relocationDiff.original.faculty}</span>
                  <span className="font-mono">{relocationDiff.original.room}</span>
                </div>
              </div>

              {/* Optimized Slot */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Optimized Slot</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-950">{relocationDiff.optimized.time}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      {relocationDiff.optimized.statusBadge}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {relocationDiff.optimized.routedBadge}
                    </span>
                  </div>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-1">{relocationDiff.optimized.course}</h4>
                <div className="text-xs text-slate-600 flex items-center justify-between pt-1">
                  <span className="font-medium text-indigo-900">{relocationDiff.optimized.faculty}</span>
                  <span className="font-mono font-semibold text-emerald-700">{relocationDiff.optimized.room}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log Decisions Section */}
          {decisions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">HOD Decisions &amp; Audit Log</h3>
                <span className="text-[11px] text-slate-400 font-mono">GET /decisions</span>
              </div>

              <div className="space-y-3">
                {decisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">Decision #{dec.id}</span>
                        <span className="px-2 py-0.2 rounded-full font-semibold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                          {dec.status}
                        </span>
                      </div>
                      <span className="font-mono text-slate-400 text-[10px]">{dec.created_at}</span>
                    </div>

                    <p className="font-medium text-slate-800">{dec.summary}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{dec.reasoning}</p>

                    {(dec.status === 'proposed' || dec.status === 'escalated') && (
                      <div className="pt-2 flex items-center space-x-2">
                        <button
                          onClick={() => handleApproveDecision(dec.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1 text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Proposal</span>
                        </button>
                        <button
                          onClick={() => handleRejectDecision(dec.id)}
                          className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-semibold flex items-center space-x-1 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 4 Columns: Operational Intel, Pending Actions, Heatmap */}
        <div className="lg:col-span-4 space-y-6">
          {/* Operational Intel (Local simulation) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Operational Intel</h3>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                HARDWARE BOTTLENECK
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900 text-xs">ROOM 102 Caused 6 of 38 Reschedules</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Recurring hardware fault: HDMI / Ceiling Projector optical handshake fails consistently on Tuesday &amp;
                Friday afternoons.
              </p>
              <div className="text-[11px] text-rose-600 font-semibold pt-1">
                Accumulated downtime: 9 hrs instruction lost
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setTicketRaised(true)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
              >
                <Wrench className="w-3 h-3" />
                <span>{ticketRaised ? 'Ticket #8843 Raised ✓' : 'Raise Repair Ticket'}</span>
              </button>
              <span className="text-[10px] text-slate-400 font-medium">Local Simulation</span>
            </div>
          </div>

          {/* Pending Actions (Local simulation) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Pending Actions</h3>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                ACTION REQUIRED
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              5 faculty haven&apos;t submitted internal evaluation marks. Institutional accreditation deadline in 2 days
              (22 Nov).
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Dr. A. Sen</span>
                  <div className="text-[10px] text-slate-400">Dept. Mathematics - Calculus II</div>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                  Overdue 4d
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800">Dr. P. Iyer</span>
                  <div className="text-[10px] text-slate-400">Dept. Physics - Quantum Mech</div>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                  Overdue 2d
                </span>
              </div>

              <div className="text-[11px] text-slate-400 pl-1">+ 3 other faculty (Dr. Joshi, Dr. Bhat, Dr. Nair)</div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                onClick={nudgeAllFaculty}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {facultyNudgeTriggered
                    ? 'Dispatched WhatsApp & Email Nudges ✓'
                    : '▶ Nudge all 5 via WhatsApp & Email'}
                </span>
              </button>
            </div>
          </div>

          {/* Room Disruption Heatmap (Local UI) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Room Disruption Heatmap</h3>
              <span className="font-mono text-[10px] text-slate-400">WK51-57</span>
            </div>

            {/* Heatmap Matrix */}
            <div className="space-y-1.5 text-[11px]">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400">
                <div>Room</div>
                <div>M</div>
                <div>T</div>
                <div>W</div>
                <div>T</div>
                <div>F</div>
                <div>S</div>
              </div>

              {[
                { name: 'R101', vals: [0, 1, 0, 0, 1, 0] },
                { name: 'R102', vals: [2, 7, 1, 2, 8, 0] }, // Projector fault
                { name: 'R104', vals: [0, 0, 1, 0, 0, 0] },
                { name: 'LAB1', vals: [0, 1, 0, 0, 0, 0] },
                { name: 'AUDI', vals: [0, 0, 0, 1, 0, 0] },
              ].map((row) => (
                <div key={row.name} className="grid grid-cols-7 gap-1 items-center">
                  <div className="font-mono text-[10px] text-slate-500">{row.name}</div>
                  {row.vals.map((v, i) => {
                    const color =
                      v === 0
                        ? 'bg-slate-100 text-slate-400'
                        : v < 3
                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                        : v < 6
                        ? 'bg-amber-200 text-amber-900 font-bold'
                        : 'bg-rose-500 text-white font-extrabold';
                    return (
                      <div
                        key={i}
                        className={`h-5 rounded flex items-center justify-center text-[10px] ${color}`}
                        title={`${row.name} Day ${i + 1}: ${v} disruptions`}
                      >
                        {v > 0 ? v : ''}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Scale: 0 (stable)</span>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded bg-slate-200"></span>
                <span className="w-2 h-2 rounded bg-emerald-200"></span>
                <span className="w-2 h-2 rounded bg-amber-300"></span>
                <span className="w-2 h-2 rounded bg-rose-500"></span>
              </div>
              <span className="text-rose-600 font-bold">8+ (Critical)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
