/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  LayoutDashboard, 
  Inbox, 
  HelpCircle, 
  FileText, 
  Settings, 
  LogOut, 
  User, 
  Building2, 
  ShieldCheck, 
  RefreshCw,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import { Session, Feedback, Theme } from './types.js';

// Import Views
import LoginView from './components/LoginView.js';
import DashboardView from './components/DashboardView.js';
import InboxView from './components/InboxView.js';
import AskLoopView from './components/AskLoopView.js';
import ReportsView from './components/ReportsView.js';
import SettingsView from './components/SettingsView.js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'ask' | 'reports' | 'settings'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters State shared between dashboard/inbox
  const [filters, setFilters] = useState({
    page: 1,
    limit: 15,
    search: undefined as string | undefined,
    channel: undefined as string | undefined,
    sentiment: undefined as string | undefined,
    theme: undefined as string | undefined,
    status: undefined as string | undefined,
  });

  // Database Data States
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(false);

  // Try auto-loading session from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('loop_session');
    if (cached) {
      try {
        setSession(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('loop_session');
      }
    }
  }, []);

  // Fetch feedback & themes whenever session or filters modify
  useEffect(() => {
    if (session) {
      fetchFeedbacks();
      fetchThemes();
    }
  }, [session, filters]);

  const fetchFeedbacks = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Build query string
      const qParams = new URLSearchParams();
      qParams.append('page', String(filters.page));
      qParams.append('limit', String(filters.limit));
      if (filters.search) qParams.append('search', filters.search);
      if (filters.channel) qParams.append('channel', filters.channel);
      if (filters.sentiment) qParams.append('sentiment', filters.sentiment);
      if (filters.theme) qParams.append('theme', filters.theme);
      if (filters.status) qParams.append('status', filters.status);

      const res = await fetch(`/api/feedback?${qParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await res.json();
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch feedback');

      setFeedbacks(data.items);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        totalItems: data.totalItems
      });
    } catch (err: any) {
      console.error('Error fetching feedbacks:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchThemes = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/themes', {
        headers: { 'Authorization': `Bearer ${session.token}` }
      });
      const data = await res.json();
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to fetch themes');
      setThemes(data);
    } catch (err: any) {
      console.error('Error fetching themes:', err.message);
    }
  };

  const handleLoginSuccess = (newSession: Session) => {
    setSession(newSession);
    localStorage.setItem('loop_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('loop_session');
    setActiveTab('dashboard');
  };

  // When database is reset back to seeded baseline, log user out so they can log in fresh
  const handleDbReset = () => {
    handleLogout();
  };

  // Auth Guard
  if (!session) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', name: 'Feedback Inbox', icon: Inbox },
    { id: 'ask', name: 'Ask LOOP (RAG)', icon: HelpCircle },
    { id: 'reports', name: 'VoC Reports', icon: FileText },
    { id: 'settings', name: 'Settings & Admin', icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      
      {/* Sidebar - Desktop Layout (Geometric Balance stark theme) */}
      <aside className="hidden md:flex flex-col w-64 bg-white text-slate-900 border-r border-slate-900">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-900 flex items-center gap-3">
          <div className="p-2 bg-slate-900 text-white rounded-none">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase font-sans">LOOP</h1>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block">Customer Intel</span>
          </div>
        </div>

        {/* Workspace Display Card */}
        <div className="px-4 py-3 mx-4 my-4 bg-slate-50 rounded-none border border-slate-900 flex items-center gap-2.5">
          <Building2 className="h-4 w-4 text-slate-700" />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Workspace</p>
            <p className="text-xs font-bold text-slate-900 truncate">{session.user.workspaceName}</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all cursor-pointer border ${
                  isActive 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {item.name}
                </span>
                {isActive && <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout bottom */}
        <div className="p-4 border-t border-slate-900 bg-slate-50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-slate-900 rounded-none border border-slate-950">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{session.user.name}</p>
              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-none text-[8px] font-mono font-bold tracking-wider bg-slate-900 text-white uppercase">
                <ShieldCheck className="h-2.5 w-2.5 text-white" /> {session.user.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2 px-3 border border-slate-900 rounded-none hover:bg-slate-900 hover:text-white text-[10px] font-bold uppercase tracking-widest text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile Header bar */}
        <header className="md:hidden bg-white text-slate-900 p-4 flex items-center justify-between border-b border-slate-900">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-slate-900 animate-pulse" />
            <span className="font-bold text-sm tracking-widest uppercase">LOOP</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wider opacity-80">{session.user.workspaceName}</span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 bg-slate-50 border border-slate-900 rounded-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Menu Nav links */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-white text-slate-900 border-b border-slate-900 p-4 space-y-1.5 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-none border ${
                    isActive ? 'bg-slate-900 text-white border-slate-900' : 'hover:bg-slate-100 border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-900 mt-2">
              <button
                onClick={handleLogout}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-900 text-xs font-bold uppercase tracking-wider rounded-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </nav>
        )}

        {/* Live Active Tab Content with Loader Layer */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          
          {/* Quick Refresh Status Indicator when dynamic fetching completes */}
          {loading && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-900 rounded-none text-[9px] text-slate-900 font-mono uppercase tracking-widest animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin text-slate-900" /> Synced
            </div>
          )}

          {/* Active component route rendering */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              feedbacks={feedbacks} 
              themes={themes} 
              loading={loading}
              filters={filters}
              setFilters={setFilters}
            />
          )}

          {activeTab === 'inbox' && (
            <InboxView 
              feedbacks={feedbacks} 
              themes={themes} 
              loading={loading}
              filters={filters}
              setFilters={setFilters}
              pagination={pagination}
              currentUserRole={session.user.role}
              onRefresh={fetchFeedbacks}
              authToken={session.token}
            />
          )}

          {activeTab === 'ask' && (
            <AskLoopView 
              authToken={session.token}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView 
              currentUserRole={session.user.role}
              authToken={session.token}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView 
              currentUserRole={session.user.role}
              workspaceName={session.user.workspaceName}
              workspaceId={session.user.workspaceId}
              authToken={session.token}
              onDbReset={handleDbReset}
            />
          )}
        </main>
      </div>
    </div>
  );
}
