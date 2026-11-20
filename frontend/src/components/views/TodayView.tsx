import React from 'react';
import { useTars } from '../../context/TarsContext';
import {
  CheckCircle2,
  Sparkles,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const TodayView: React.FC = () => {
  const {
    currentUser,
    slots,
    nudges,
    attendanceList,
    events,
    handleNudgeBlock,
    handleNudgeRead,
    studySlotLocked,
    setStudySlotLocked,
    setCurrentView,
  } = useTars();

  // Find replan nudge for the banner
  const replanNudge = nudges.find((n) => n.kind === 'replan' && !n.read && !n.blocked);

  // Today's slots (backend pins DEMO_DAY to MON by default)
  const todaySlots = slots.filter((s) => s.day === 'MON');
  const displaySlots = todaySlots.length > 0 ? todaySlots : slots.slice(0, 6);

  const subjectNames: Record<string, string> = {
    DS: 'Data Structures',
    DSL: 'Data Structures Lab',
    MATH: 'Engineering Maths',
    DLD: 'Digital Logic Design',
    OOP: 'OOP with Java',
    COA: 'Computer Organisation',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top greeting header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Good morning, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser.role.toUpperCase()} {currentUser.section ? `• Section ${currentUser.section}` : ''} • Academic Week 12
          </p>
        </div>
        <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 rounded-full text-emerald-700 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Synced with campus schedule</span>
        </div>
      </div>

      {/* Main Grid: Left 2 cols, Right 1 col */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Autonomous Schedule Update Banner */}
          {replanNudge ? (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 text-indigo-700 text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Autonomous Schedule Update</span>
                </div>
                <span className="text-[11px] font-medium text-indigo-600/90 bg-indigo-100/60 px-2 py-0.5 rounded-full border border-indigo-200/50">
                  High confidence (99.8%)
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-lg font-bold text-slate-900">{replanNudge.title}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {replanNudge.body}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleNudgeBlock(replanNudge.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Block on Calendar</span>
                </button>
                <button
                  onClick={() => handleNudgeRead(replanNudge.id)}
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-100/80 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>0 clashes detected</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Room 101</span>
                </span>
                <span>•</span>
                <span>Prof. Vikram Joshi substituting</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {studySlotLocked
                    ? 'Study block locked on calendar. Rescheduled slots verified.'
                    : 'Schedule verified. Daily campus agenda in sync.'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700">0 clashes</span>
            </div>
          )}

          {/* Today's Schedule Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Today&apos;s Schedule</h3>
                <span className="text-[11px] text-slate-400">09:00 – 15:35 Campus Operatives (MON)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>05:31:17 PM</span>
              </div>
            </div>

            {/* Vertical timeline */}
            <div className="mt-4 space-y-3.5">
              {displaySlots.map((slot) => {
                const isReplanned = slot.status === 'replanned';
                const isCancelled = slot.status === 'cancelled';

                return (
                  <div
                    key={slot.id}
                    className={`relative p-3.5 rounded-xl border transition-all ${
                      isReplanned
                        ? 'bg-purple-50/50 border-purple-300 ring-1 ring-purple-200 shadow-xs'
                        : isCancelled
                        ? 'bg-rose-50/60 border-rose-200 opacity-70'
                        : 'bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5">
                          {isReplanned ? (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                              ★
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-semibold text-slate-500">
                              {slot.start} – {slot.end}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              Period {slot.period}
                            </span>
                            {isReplanned && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100 px-2 py-0.2 rounded-full">
                                TARS Re-planned
                              </span>
                            )}
                            {isCancelled && (
                              <span className="text-[10px] font-semibold text-rose-700 bg-rose-100 px-2 py-0.2 rounded-full">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                            {slot.subject_name} ({slot.subject_code})
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {slot.faculty_name} • Room: {slot.room_id}
                          </p>
                        </div>
                      </div>

                      {/* Right Tag */}
                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                            isReplanned
                              ? 'bg-purple-100 text-purple-800'
                              : isCancelled
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {slot.status}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">{slot.section}</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Free slot recommended card if study slot is not locked */}
              <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-indigo-700">14:40 – 15:35</span>
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.2 rounded-full">
                      Free Slot Recommended
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs mt-1">DS Assignment Study Block</h4>
                  <p className="text-[11px] text-slate-500">Reading Room 3 • Desk #14</p>
                </div>
                <button
                  onClick={() => setStudySlotLocked(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    studySlotLocked
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white hover:bg-indigo-50 border border-indigo-300 text-indigo-700'
                  }`}
                >
                  {studySlotLocked ? 'Locked ✓' : 'Accept & Lock Slot'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance, Deadlines, Campus Event */}
        <div className="space-y-6">
          {/* Attendance Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Attendance Matrix</h3>
              <span className="text-[11px] text-slate-400">Min 75% req</span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">81.4%</span>
                <span className="ml-2 text-xs font-semibold text-emerald-600">+0.6%</span>
              </div>
              <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Good Standing</span>
              </div>
            </div>

            {/* Courses progress from attendanceList */}
            <div className="mt-5 space-y-3">
              {attendanceList.map((item) => {
                const isWarning = item.percent < 75;
                const fullName = subjectNames[item.subject_code] || item.subject_code;
                return (
                  <div key={item.subject_code}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{fullName}</span>
                      <span className={`font-bold ${isWarning ? 'text-rose-600' : 'text-slate-700'}`}>
                        {item.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isWarning ? 'bg-rose-500' : 'bg-indigo-600'}`}
                        style={{ width: `${item.percent}%` }}
                      ></div>
                    </div>
                    {isWarning && (
                      <div className="mt-1 flex items-center space-x-1 text-[10px] text-rose-600 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        <span>Below 75% threshold • Cancellation protected by TARS</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setCurrentView('schedule')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center space-x-1"
              >
                <span>Forecast &amp; leaves</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Upcoming Deadlines</h3>
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                3 pending
              </span>
            </div>

            <div className="mt-3.5 space-y-3">
              <div
                onClick={() => setCurrentView('nudges')}
                className="p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/60 border border-slate-200/60 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">DS Lab Assignment 4</span>
                  <span className="text-[10px] font-bold text-rose-600">Tomorrow, 11:59 PM</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Self Balancing BST rotation validation - GitHub</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Maths Problem Set 3</span>
                  <span className="text-[10px] font-bold text-slate-500">Nov 23</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Taylor Series &amp; Partial Derivatives - Offline</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">CTF Team Registration</span>
                  <span className="text-[10px] font-bold text-slate-500">Nov 22</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Team roster lockdown (max 4 members)</p>
              </div>
            </div>
          </div>

          {/* Campus Event Card */}
          {events.length > 0 && (
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-indigo-300">
                <span className="uppercase tracking-wider font-semibold">Campus Event</span>
                <span>{events[0].day} • {events[0].start}</span>
              </div>
              <h4 className="text-base font-bold mt-2 text-white">{events[0].title}</h4>
              <p className="text-xs text-slate-300 mt-1">{events[0].org} • {events[0].venue}</p>
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">RSVPs: {events[0].rsvp_count}</span>
                <button
                  onClick={() => setCurrentView('events')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
                >
                  <span>View in Events Hub</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
