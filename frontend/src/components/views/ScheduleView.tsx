import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import {
  RotateCcw,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export const ScheduleView: React.FC = () => {
  const {
    slots,
    selectedSection,
    setSelectedSection,
    facultyList,
    roomList,
    refreshData,
  } = useTars();

  const [viewMode, setViewMode] = useState<'week' | 'day' | 'faculty' | 'rooms'>('week');
  const [calendarSynced, setCalendarSynced] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);

  const days: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI')[] = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  const dayNumbers: Record<string, string> = {
    MON: '17',
    TUE: '18',
    WED: '19',
    THU: '20',
    FRI: '21',
  };

  const periods = [
    { period: 1, time: '09:00 – 09:55' },
    { period: 2, time: '09:55 – 10:50' },
    { period: 3, time: '11:05 – 12:00' },
    { period: 4, time: '12:00 – 12:55' },
    { period: 5, time: '13:45 – 14:40' },
    { period: 6, time: '14:40 – 15:35' },
  ];

  const handleSyncCalendar = () => {
    setCalendarSynced(true);
    setTimeout(() => setCalendarSynced(false), 2500);
  };

  const handleReevaluate = async () => {
    setIsReevaluating(true);
    await refreshData();
    setTimeout(() => setIsReevaluating(false), 600);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200/80 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Academic Schedule: Section {selectedSection}
            </h1>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="CSE-A">CSE-A</option>
              <option value="CSE-B">CSE-B</option>
              <option value="CSE-C">CSE-C</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Week 12: Nov 17 – Nov 22, 2024 • B.Tech Computer Science &amp; Engineering
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggles */}
          <div className="flex items-center bg-slate-200/70 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Week view
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Day view
            </button>
            <button
              onClick={() => setViewMode('faculty')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'faculty'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setViewMode('rooms')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'rooms'
                  ? 'bg-white text-slate-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rooms
            </button>
          </div>

          {/* Week navigator */}
          <div className="flex items-center space-x-1 bg-white border border-slate-200 rounded-xl px-2 py-1 text-xs">
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700 px-1.5">Current</span>
            <button className="p-1 hover:bg-slate-100 rounded text-slate-500">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Re-evaluate CTA */}
          <button
            onClick={handleReevaluate}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReevaluating ? 'animate-spin' : ''}`} />
            <span>Re-evaluate</span>
          </button>
        </div>
      </div>

      {/* Legend & Interval bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 bg-white border border-slate-200/80 px-4 py-2.5 rounded-xl shadow-xs">
        <div className="flex items-center space-x-5">
          <span className="text-[11px] font-bold uppercase text-slate-400">Legend</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600"></span>
            <span className="font-semibold text-indigo-700">TARS Re-planned</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
            <span>Cancelled</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-slate-400">6 Periods • 55 min intervals</div>
      </div>

      {/* Main Grid & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Weekly Matrix Grid (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs overflow-x-auto">
          {/* Matrix Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 min-w-[600px]">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Weekly Matrix</h3>
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60">
                {selectedSection} • Sem 1
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1 text-rose-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Room 102 Projector Locked</span>
              </span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center space-x-1 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Grid Synced</span>
              </span>
            </div>
          </div>

          {/* Timetable Table */}
          <div className="mt-4 min-w-[620px]">
            {/* Table Header */}
            <div className="grid grid-cols-6 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              <div>Period</div>
              {days.map((day) => (
                <div key={day} className="flex flex-col items-center">
                  <span className="text-[11px] text-slate-400">{day}</span>
                  <span className="text-sm font-extrabold text-slate-800">{dayNumbers[day]}</span>
                </div>
              ))}
            </div>

            {/* Time Slot Rows */}
            <div className="divide-y divide-slate-100 mt-1">
              {periods.map(({ period, time }, idx) => {
                return (
                  <React.Fragment key={period}>
                    {/* Lunch Break banner after period 4 */}
                    {idx === 4 && (
                      <div className="py-2.5 my-1">
                        <div className="w-full bg-amber-50/70 border border-amber-200/70 rounded-xl py-1.5 px-4 text-center text-xs font-semibold text-amber-800 flex items-center justify-center space-x-2">
                          <span>🍴</span>
                          <span>Recess &amp; Refectory Window (12:55 – 13:45)</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-6 gap-2 py-2 items-stretch">
                      {/* Period Label */}
                      <div className="flex flex-col items-center justify-center font-mono text-[11px] font-semibold text-slate-400">
                        <span className="font-bold text-slate-700">P{period}</span>
                        <span className="text-[10px] text-slate-400">{time}</span>
                      </div>

                      {/* 5 Day Cells */}
                      {days.map((day) => {
                        const slot = slots.find((s) => s.period === period && s.day === day);
                        if (!slot) {
                          return (
                            <div
                              key={day}
                              className="p-2 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center text-[10px] text-slate-400 flex items-center justify-center min-h-[64px]"
                            >
                              Free
                            </div>
                          );
                        }

                        const isReplanned = slot.status === 'replanned';
                        const isCancelled = slot.status === 'cancelled';

                        return (
                          <div
                            key={day}
                            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all min-h-[68px] ${
                              isReplanned
                                ? 'bg-purple-50/80 border-purple-300 shadow-xs ring-1 ring-purple-200'
                                : isCancelled
                                ? 'bg-rose-50/50 border-rose-200'
                                : 'bg-white border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-slate-900 text-[11px] truncate">
                                  {slot.subject_code}
                                </h5>
                                {isReplanned && (
                                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {slot.room_id}
                              </span>
                            </div>
                            <div className="text-[10px] font-medium text-slate-500 truncate mt-1">
                              {slot.faculty_name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Footer of Matrix */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Push &amp; Digital Signage in sync</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => alert(`Printing official schedule for ${selectedSection}...`)}
                className="hover:text-slate-800 transition-colors"
              >
                Print PDF
              </button>
              <button
                onClick={() =>
                  alert('Timetable rules: Max 18 contact hrs/wk per faculty, min 75% attendance threshold protected.')
                }
                className="hover:text-slate-800 transition-colors"
              >
                Timetable Rules
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Faculty & Rooms Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Faculty Directory & Status */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Faculty Workload Directory</h3>
              <span className="text-[11px] text-slate-400">{facultyList.length} Monitored</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {facultyList.map((fac) => (
                <div key={fac.faculty_id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="font-bold text-slate-800">{fac.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 ml-3.5">
                      Subjects: {fac.subjects.join(', ')}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Load: {fac.load}/{fac.max_load} hrs
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rooms & Labs */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Rooms &amp; Labs</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Live Status
              </span>
            </div>

            <div className="mt-3.5 space-y-3">
              {roomList.map((rm) => (
                <div key={rm.id} className="flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${rm.free ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      ></span>
                      <span className="font-bold text-slate-800">{rm.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 ml-3.5">
                      {rm.kind} • Cap: {rm.capacity}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      rm.free
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {rm.free ? 'Available' : 'Occupied'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync & Export */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Sync &amp; Export</h3>

            <button
              onClick={handleSyncCalendar}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{calendarSynced ? 'Synced to Google Calendar ✓' : 'Sync to Calendar'}</span>
            </button>

            <button
              onClick={() => alert(`Downloading official ${selectedSection} timetable PDF...`)}
              className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>

            <div className="pt-2 text-center">
              <button
                onClick={() => alert('Feed URL copied to clipboard: webcal://campus.tars.internal/csea.ics')}
                className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center space-x-1"
              >
                <span>Feed URL Copy Link</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>No schedule conflicts remaining</span>
          </span>
          <span className="text-slate-300">•</span>
          <span>SLA: 100% attendance compliance</span>
        </div>

        <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live</span>
        </div>
      </div>
    </div>
  );
};
