import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import {
  Filter,
  Share2,
  MoreVertical,
  Calendar,
  CheckCircle2,
  RotateCcw,
  Info,
} from 'lucide-react';

export const NudgesView: React.FC = () => {
  const {
    nudges,
    selectedNudgeId,
    setSelectedNudgeId,
    handleNudgeRead,
    handleNudgeSnooze,
    handleNudgeBlock,
    refreshData,
  } = useTars();
  const [filterActive, setFilterActive] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);

  const activeNudges = nudges.filter((n) => !n.blocked);
  const selectedNudge = activeNudges.find((n) => n.id === selectedNudgeId) || activeNudges[0] || null;

  const triggerReevaluate = async () => {
    setIsReevaluating(true);
    await refreshData();
    setTimeout(() => {
      setIsReevaluating(false);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200/80 gap-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Autonomous Intervention Engine</span>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md">
            STREAM: LIVE
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
            QUEUE-HEALTH: OPTIMAL (99.8%)
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200/60">
            <span>J / K NAVIGATE</span>
            <span>•</span>
            <span>ENTER EXECUTE</span>
          </div>

          <button
            onClick={triggerReevaluate}
            disabled={isReevaluating}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-all"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-indigo-600 ${isReevaluating ? 'animate-spin' : ''}`} />
            <span>{isReevaluating ? 'Re-evaluating...' : 'Re-evaluate'}</span>
          </button>
        </div>
      </div>

      {/* Split master-detail layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Inbox Column (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Inbox</h3>
              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                {activeNudges.filter((n) => !n.read).length}
              </span>
            </div>
            <button
              onClick={() => setFilterActive(!filterActive)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* List items */}
          <div className="divide-y divide-slate-100">
            {activeNudges.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No active nudges in inbox.
              </div>
            ) : (
              activeNudges.map((nudge) => {
                const isSelected = selectedNudge && nudge.id === selectedNudge.id;
                const isRead = nudge.read;
                const dotColor =
                  nudge.kind === 'replan'
                    ? 'bg-purple-500'
                    : nudge.kind === 'deadline'
                    ? 'bg-rose-500'
                    : 'bg-indigo-500';

                return (
                  <div
                    key={nudge.id}
                    onClick={() => setSelectedNudgeId(nudge.id)}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/70 border-l-4 border-l-indigo-600'
                        : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <div className="flex items-center space-x-1.5 font-bold">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                        <span className="text-slate-600 uppercase">{nudge.kind}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[10px]">
                        {nudge.created_at ? nudge.created_at.slice(11, 16) : 'Today'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-xs mt-1">{nudge.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {nudge.body}
                    </p>

                    <div className="mt-2 flex items-center space-x-2">
                      {isRead && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Read</span>
                        </span>
                      )}
                      {nudge.snoozed_until && (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <span>Snoozed</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Column (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          {selectedNudge ? (
            <>
              {/* Header metadata */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-xs font-bold text-indigo-700">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  <span className="uppercase">{selectedNudge.kind} INTERVENTION</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-500 font-normal">
                    {selectedNudge.created_at || 'Today'}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-slate-400">
                  <button className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-1 hover:text-slate-600 hover:bg-slate-100 rounded">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Headline & Body */}
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">{selectedNudge.title}</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{selectedNudge.body}</p>
              </div>

              {/* Recommended Plan Details */}
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Recommended Plan
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mt-0.5">
                    01
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Target Execution Slot: Today, 10:00 AM – 11:00 AM
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Utilizes free morning window with zero calendar conflicts.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mt-0.5">
                    02
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Setup &amp; Core Structure</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fork repository, verify helper methods, and run unit tests.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start space-x-3.5">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mt-0.5">
                    03
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Recommended Sanctuary: Quiet Study Hub
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Central Library 2nd Floor - 34 dB noise level with verified open power outlets.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleNudgeBlock(selectedNudge.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-2 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Block on Calendar</span>
                </button>
                <button
                  onClick={() => handleNudgeSnooze(selectedNudge.id, 120)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  Snooze (2h)
                </button>
                <button
                  onClick={() => handleNudgeRead(selectedNudge.id)}
                  className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
                >
                  Mark Done
                </button>
              </div>

              {/* Escalation watchdog disclaimer */}
              <div className="pt-4 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <p>
                  TARS coordinates automatic escalation with advisor if critical interventions are deferred.
                </p>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Select an item from the inbox to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
