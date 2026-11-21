import React, { useState } from 'react';
import { useTars } from '../../context/TarsContext';
import type { ViewTab } from '../../types/tars';
import { SignInModal } from '../auth/SignInModal';
import {
  Sun,
  Bell,
  Calendar,
  LayoutGrid,
  ShieldAlert,
  Search,
  HelpCircle,
  ChevronDown,
  ArrowRightLeft,
  LogOut,
  LogIn,
  Settings,
  Server,
} from 'lucide-react';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isMockMode,
    currentUser,
    demoUsers,
    switchUser,
    logout,
    isAuthenticated,
    showLoginModal,
    setShowLoginModal,
    role,
    currentView,
    setCurrentView,
    unreadNudgesCount,
  } = useTars();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: number; adminOnly?: boolean }[] = [
    { id: 'today', label: 'Today', icon: <Sun className="w-4 h-4" /> },
    { id: 'nudges', label: 'Nudges', icon: <Bell className="w-4 h-4" />, badge: unreadNudgesCount },
    { id: 'events', label: 'Events', icon: <Calendar className="w-4 h-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'admin', label: 'Admin Console', icon: <ShieldAlert className="w-4 h-4" />, adminOnly: true },
  ];

  // Show navigation routes based on the verified role
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || role === 'hod');

  const handleSelectTab = (id: ViewTab) => {
    setCurrentView(id);
  };

  const handleSelectUser = async (userId: string) => {
    await switchUser(userId);
    setRoleMenuOpen(false);
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
              {visibleNavItems.map((item) => {
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
                title="Settings (Out of scope)"
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

        {/* User Card & Demo Persona Switcher */}
        <div className="p-3 border-t border-slate-100 relative">
          <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 pb-1.5 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Server className="w-3 h-3 text-slate-400" />
              <span>{isMockMode ? 'Mock Mode' : 'Verified Session'}</span>
            </span>
            {isMockMode && (
              <span
                className="text-indigo-600 font-semibold cursor-pointer hover:underline text-[10px]"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              >
                Demo Switcher ⇄
              </span>
            )}
          </div>

          <div
            onClick={() => {
              if (isMockMode) setRoleMenuOpen(!roleMenuOpen);
            }}
            className={`flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 transition-all ${
              isMockMode ? 'hover:bg-slate-100 cursor-pointer' : ''
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                  role === 'hod' ? 'bg-purple-600' : role === 'faculty' ? 'bg-teal-600' : 'bg-indigo-600'
                }`}
              >
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-slate-800 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 truncate">
                  {currentUser.role.toUpperCase()} {currentUser.section ? `• ${currentUser.section}` : ''} {currentUser.usn ? `(${currentUser.usn})` : ''}
                </div>
              </div>
            </div>
            {isMockMode && <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          </div>

          {/* Demo role switcher menu (Mock Mode Only) */}
          {isMockMode && roleMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 max-h-72 overflow-y-auto">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Demo Accounts (Mock Mode Only)</span>
                <span className="text-[10px] font-mono">{demoUsers.length} users</span>
              </div>
              {demoUsers.map((u) => {
                const isSelected = u.user_id === currentUser.user_id;
                return (
                  <button
                    key={u.user_id}
                    onClick={() => handleSelectUser(u.user_id)}
                    className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-medium my-0.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-bold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded text-white text-[10px] flex items-center justify-center font-bold flex-shrink-0 ${
                        u.role === 'hod'
                          ? 'bg-purple-600'
                          : u.role === 'faculty'
                          ? 'bg-teal-600'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {u.user_id}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{u.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {u.role.toUpperCase()} {u.section ? `(${u.section})` : ''} {u.usn ? `• ${u.usn}` : ''}
                      </div>
                    </div>
                  </button>
                );
              })}
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

            {/* Mode badge pill */}
            <div
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isMockMode
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={isMockMode ? 'Running in offline client mock mode' : 'Connected to API'}
            >
              {isMockMode ? 'Mock Mode (Default)' : 'API Mode'}
            </div>

            {/* Quick role toggle button (Mock Mode only) */}
            {isMockMode && (
              <button
                onClick={() => {
                  const nextUser = role === 'student' ? 'H01' : 'S001';
                  handleSelectUser(nextUser);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] font-semibold border border-slate-200 transition-colors"
                title="Mock Mode Demo: Quick role switcher"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>Role: {currentUser.role.toUpperCase()}</span>
              </button>
            )}

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

            {/* Auth Sign In / Sign Out Button */}
            {isAuthenticated ? (
              <button
                onClick={() => logout()}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-[11px] font-semibold border border-slate-200 transition-colors"
                title="Sign out of current session"
              >
                <LogOut className="w-3 h-3" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}

            {/* Avatar circle */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                role === 'hod' ? 'bg-purple-600' : role === 'faculty' ? 'bg-teal-600' : 'bg-indigo-600'
              }`}
            >
              {currentUser.name[0]}
            </div>
          </div>
        </header>

        {/* View content area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-6">
          {children}
        </main>
      </div>

      {/* Production Sign In Modal */}
      <SignInModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};
