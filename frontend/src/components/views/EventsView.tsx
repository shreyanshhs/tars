import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import {
  FileUp,
  Search,
  RotateCcw,
  Sparkles,
  MapPin,
  ChevronRight,
  UploadCloud,
  Check,
} from 'lucide-react';

export const EventsView: React.FC = () => {
  const { events, handleEventRsvp, refreshData, setCurrentView } = useTars();
  const [activeTab, setActiveTab] = useState<'all' | 'recommended' | 'week' | 'clash-free'>('all');
  const [eventSearch, setEventSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [uploadNoticeModalOpen, setUploadNoticeModalOpen] = useState(false);
  const [noticeUploaded, setNoticeUploaded] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleUploadSimulate = () => {
    setNoticeUploaded(true);
    setTimeout(() => {
      setUploadNoticeModalOpen(false);
      setNoticeUploaded(false);
    }, 1200);
  };

  const filteredEvents = events.filter((ev) => {
    if (activeTab === 'clash-free') return ev.clashes_with.length === 0;
    if (activeTab === 'week') return ev.day === 'WED' || ev.day === 'THU' || ev.day === 'FRI';
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        (ev.org || '').toLowerCase().includes(q) ||
        (ev.venue || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const bannerGradients = [
    'from-blue-900 to-indigo-950',
    'from-amber-900 to-stone-900',
    'from-slate-800 to-blue-950',
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Telemetry / Sub-header */}
      <div className="flex flex-wrap items-start justify-between pb-3 border-b border-slate-200/80 gap-3">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-emerald-600 font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>FEED: LIVE_TELEMETRY / CRON_INGEST_OK / NODE_ALPHA_ONLINE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campus Events Hub</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Unified feed parsed from 14 WhatsApp batch groups, Discord servers, and department flyers via multimodal
            OCR &amp; schedule extraction.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-xs flex items-center space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>14 Sources (3 parsed today [100% conf])</span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notice Ingestion Dropzone Banner (Local Simulation) */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200/80 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 text-sm">Forward or drop event posters &amp; notices</h3>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                Local Simulation
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              TARS automatically extracts schedule, checks calendar clashes, and adds verified events.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              alert(
                'Ingested channels: WhatsApp CSE-A, CSE Batch 2028, ACM Discord, Robotics Club, IEEE Chapter, Tech Park notice board.',
              )
            }
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Browse Sources (14)
          </button>
          <button
            onClick={() => setUploadNoticeModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>+ Upload Notice</span>
          </button>
        </div>
      </div>

      {/* Upload notice simulated modal */}
      {uploadNoticeModalOpen && (
        <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-indigo-950">
            <UploadCloud className="w-4 h-4 text-indigo-600 animate-bounce" />
            <span>
              {noticeUploaded
                ? 'OCR Parsing Notice... Verified zero calendar clash with CSE-A timetable!'
                : 'Select flyer image or drop WhatsApp broadcast screenshot here (Local UI Simulation)'}
            </span>
          </div>
          <button
            onClick={handleUploadSimulate}
            className="px-3 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
          >
            {noticeUploaded ? 'Processing...' : 'Simulate OCR Ingest'}
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center space-x-1.5 bg-slate-200/60 p-1 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('recommended')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'recommended'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recommended
          </button>
          <button
            onClick={() => setActiveTab('week')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'week'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setActiveTab('clash-free')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all ${
              activeTab === 'clash-free'
                ? 'bg-white text-emerald-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Clash Free</span>
          </button>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events..."
            value={eventSearch}
            onChange={(e) => setEventSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Featured Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event, idx) => {
          const isRsvpd = event.rsvp;
          const hasClash = event.clashes_with && event.clashes_with.length > 0;
          const gradient = bannerGradients[idx % bannerGradients.length];

          return (
            <div
              key={event.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Banner Header */}
                <div className={`h-36 bg-gradient-to-r ${gradient} relative p-4 flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-md bg-black/40 backdrop-blur-md text-[11px] font-semibold text-white border border-white/10">
                      {event.day} • {event.start}–{event.end}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-500/80 text-white text-[10px] font-bold">
                      {event.rsvp_count} RSVPs
                    </span>
                  </div>
                  <div className="text-white/80 text-[11px] font-medium tracking-wide">
                    {event.org}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-2.5">
                  <h3 className="font-bold text-slate-900 text-sm">{event.title}</h3>

                  <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{event.venue}</span>
                  </div>

                  {/* Clash detection status */}
                  <div className="pt-2 flex items-center justify-between text-xs">
                    {!hasClash ? (
                      <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>You&apos;re free • No clashes</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-rose-600 font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Clashes with timetable slot</span>
                        <button
                          onClick={() => setCurrentView('schedule')}
                          className="text-[11px] text-indigo-600 hover:underline font-semibold ml-1"
                        >
                          View Schedule
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-5 pt-0">
                <button
                  onClick={() => handleEventRsvp(event.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isRsvpd
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center space-x-1'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                  }`}
                >
                  {isRsvpd ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>RSVP Confirmed ✓</span>
                    </>
                  ) : (
                    <span>RSVP to Event</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upcoming Campus Radar Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-sm">Upcoming Campus Radar</h3>
          <button
            onClick={() => setCurrentView('schedule')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>View calendar grid</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-medium">Dec 02 • 3:00 PM</span>
              <span className="px-2 py-0.2 rounded-full font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                Free Slot
              </span>
            </div>
            <h4 className="font-bold text-slate-800 text-xs truncate">ACM Distinguished Lecture: Quantum...</h4>
            <p className="text-[11px] text-slate-400">CS Hall 3 - Dr. V. Raman</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-medium">Dec 05 • 11:00 AM</span>
              <span className="px-2 py-0.2 rounded-full font-semibold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                Elective
              </span>
            </div>
            <h4 className="font-bold text-slate-800 text-xs truncate">Winter Robotics Showcase &amp; Drone Trials</h4>
            <p className="text-[11px] text-slate-400">Football Ground Arena</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 font-medium">Nov 22 • 6:00 PM</span>
              <span className="px-2 py-0.2 rounded-full font-semibold text-[10px] bg-slate-200/60 text-slate-700">
                Evening
              </span>
            </div>
            <h4 className="font-bold text-slate-800 text-xs truncate">Open Mic &amp; Cultural Jam Session</h4>
            <p className="text-[11px] text-slate-400">Student Amphitheater</p>
          </div>
        </div>
      </div>
    </div>
  );
};
