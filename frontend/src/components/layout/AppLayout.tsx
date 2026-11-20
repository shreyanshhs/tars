import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import type { ViewTab, Role } from '../../types/tars';
import {
  Sun,
  Bell,
  Calendar,
  LayoutGrid,
  ShieldAlert,
  Settings,
  Search,
  HelpCircle,
  ChevronDown,
  ArrowRightLeft,
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, setRole, currentView, setCurrentView, unreadNudgesCount } = useTars();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number; adminOnly?: boolean }[] = [
    { id: 'today', label: 'Today', icon: <Sun className="w-4 h-4" /> },
    { id: 'nudges', label: 'Nudges', icon: <Bell className="w-4 h-4" />, badge: unreadNudgesCount },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Console', icon: <ShieldAlert className="w-4 h-4" />, adminOnly: true },
  ];

  const handleSelectTab = (id: ViewTab) => {
    if (id === 'admin' && role !== 'hod') {
      // Auto-switch to HOD role when admin console is chosen, or just open it
      setRole('hod');
    }
    setCurrentView(id);
  };

  const handleSwitchRole = (newRole: Role) => {
    setRole(newRole);
    setRoleMenuOpen(false);
    if (newRole === 'hod') {
      setCurrentView('admin');
    } else {
      setCurrentView('today');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100/60 font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col justify-between border-r border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm z-20">
        <div>
          {/* Brand header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-tight text-slate-900 text-lg">TARS</span>
              <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">v2.4 OPS</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Online</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-3">
            <div className="px-3 pb-2 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Operations
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.2 bg-indigo-600 text-white text-[11px] font-bold rounded-full min-w-5 text-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              System
            </div>
            <div className="space-y-1">
              <button
                disabled
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-400 cursor-not-allowed opacity-60"
                title="Settings (Out of scope for prototype)"
              >
                <div className="flex items-center space-x-2.5">
                  <Settings className="w-4 h-4 text-slate-300" />
                  <span>Settings</span>
                </div>
                <span className="text-[10px] text-slate-400 uppercase">n/a</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Card & Role Switcher */}
        <div className="p-3 border-t border-slate-100 relative">
          <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 pb-1.5 flex items-center justify-between">
            <span>Demo Mode</span>
            <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => handleSwitchRole(role === 'student' ? 'hod' : 'student')}>
              Switch Role ⇄
            </span>
          </div>

          <div
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-pointer transition-all"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                  role === 'student' ? 'bg-indigo-600' : 'bg-purple-600'
                }`}
              >
                {role === 'student' ? 'SV' : 'VS'}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {role === 'student' ? 'Shreyansh' : 'Dr. V. Sharma'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {role === 'student' ? 'CSE - 1st yr - Sec A' : 'HOD Computer Science'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Role switcher menu */}
          {roleMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">Select Persona</div>
              <button
                onClick={() => handleSwitchRole('student')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-medium ${
                  role === 'student' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-5 h-5 rounded bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  SV
                </div>
                <div className="text-left">
                  <div className="font-semibold">Student: Shreyansh</div>
                  <div className="text-[10px] text-slate-500">CSE - 1st yr - Sec A</div>
                </div>
              </button>
              <button
                onClick={() => handleSwitchRole('hod')}
                className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-xs font-medium mt-1 ${
                  role === 'hod' ? 'bg-purple-50 text-purple-700' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-5 h-5 rounded bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
                  VS
                </div>
                <div className="text-left">
                  <div className="font-semibold">HOD: Dr. V. Sharma</div>
                  <div className="text-[10px] text-slate-500">Admin Mission Control</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main View Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between z-10 flex-shrink-0">
          {/* Global Search */}
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search anything or run action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-10 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-200">
              ⌘K
            </span>
          </div>

          {/* Telemetry info */}
          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span>Fleet</span>
              <span className="font-semibold text-slate-700">99.4%</span>
            </div>
            <span className="text-slate-300">•</span>
            <div>Friday, 20 Nov 2024</div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono text-[11px]">38ms</span>
            </div>
            <span className="text-slate-300">•</span>

            {/* Quick role toggle pill in topbar */}
            <button
              onClick={() => handleSwitchRole(role === 'student' ? 'hod' : 'student')}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold border border-slate-200 transition-colors"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>Role: {role === 'student' ? 'Student' : 'HOD / Admin'}</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setCurrentView('nudges')}
              className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadNudgesCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600"></span>
              )}
            </button>

            {/* Help */}
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Avatar circle */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                role === 'student' ? 'bg-indigo-600' : 'bg-purple-600'
              }`}
            >
              {role === 'student' ? 'S' : 'V'}
            </div>
          </div>
        </header>

        {/* View content area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
