/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Inbox, ThumbsUp, ThumbsDown, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { Feedback, Theme } from '../types.js';

interface DashboardViewProps {
  feedbacks: Feedback[];
  themes: Theme[];
  loading: boolean;
  filters: any;
  setFilters: (filters: any) => void;
}

export default function DashboardView({ feedbacks, themes, loading, filters, setFilters }: DashboardViewProps) {
  
  // --- Calculate Metrics ---
  const totalCount = feedbacks.length;
  const negCount = feedbacks.filter(f => f.sentiment === 'NEG').length;
  const posCount = feedbacks.filter(f => f.sentiment === 'POS').length;
  const neuCount = feedbacks.filter(f => f.sentiment === 'NEU').length;

  const percentNegative = totalCount > 0 ? Math.round((negCount / totalCount) * 100) : 0;
  const percentPositive = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;

  // New this week count (past 7 days)
  const past7Days = Date.now() - 7 * 24 * 3600 * 1000;
  const newThisWeekCount = feedbacks.filter(f => new Date(f.createdAt).getTime() >= past7Days).length;

  const actionedCount = feedbacks.filter(f => f.status === 'ACTIONED').length;

  // --- Chart 1: Volume Over Time (Grouped by Date) ---
  const dateMap: Record<string, { date: string; Total: number; Positive: number; Negative: number }> = {};
  
  // Initialize last 10 days to make sure the line is continuous
  const now = Date.now();
  for (let i = 9; i >= 0; i--) {
    const dStr = new Date(now - i * 24 * 3600 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    dateMap[dStr] = { date: dStr, Total: 0, Positive: 0, Negative: 0 };
  }

  feedbacks.forEach(f => {
    const dStr = new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (dateMap[dStr]) {
      dateMap[dStr].Total++;
      if (f.sentiment === 'POS') dateMap[dStr].Positive++;
      if (f.sentiment === 'NEG') dateMap[dStr].Negative++;
    } else {
      // Just record if within a larger date range
      dateMap[dStr] = {
        date: dStr,
        Total: 1,
        Positive: f.sentiment === 'POS' ? 1 : 0,
        Negative: f.sentiment === 'NEG' ? 1 : 0,
      };
    }
  });

  const volumeData = Object.values(dateMap).slice(-10); // Keep last 10 sorted days

  // --- Chart 2: Sentiment Breakdown (Pie Data) ---
  const sentimentData = [
    { name: 'Positive', value: posCount, color: '#10b981' },
    { name: 'Neutral', value: neuCount, color: '#64748b' },
    { name: 'Negative', value: negCount, color: '#ef4444' },
  ].filter(s => s.value > 0);

  // --- Chart 3: Top Themes Map ---
  const themeMap: Record<string, { name: string; count: number; color: string }> = {};
  themes.forEach(t => {
    themeMap[t.id] = { name: t.name, count: 0, color: t.color };
  });

  feedbacks.forEach(f => {
    f.themes.forEach(tId => {
      if (themeMap[tId]) {
        themeMap[tId].count++;
      }
    });
  });

  const topThemesData = Object.values(themeMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-900">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Intelligence Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Real-time customer feedback distribution, themes, and sentiment analysis
          </p>
        </div>

        {/* Local Simple Filters in Dashboard */}
        <div className="flex items-center gap-3">
          <select
            value={filters.channel || ''}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-0 shadow-none cursor-pointer"
          >
            <option value="">All Channels</option>
            <option value="Support ticket">Support Ticket</option>
            <option value="App store review">App Store Review</option>
            <option value="NPS survey">NPS Survey</option>
            <option value="Sales call note">Sales Call Note</option>
            <option value="Community post">Community Post</option>
          </select>

          <select
            value={filters.sentiment || ''}
            onChange={(e) => setFilters({ ...filters, sentiment: e.target.value || undefined, page: 1 })}
            className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-0 shadow-none cursor-pointer"
          >
            <option value="">All Sentiments</option>
            <option value="POS">Positive Only</option>
            <option value="NEU">Neutral Only</option>
            <option value="NEG">Negative Only</option>
          </select>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total feedback card */}
        <div className="bg-white p-5 rounded-none border border-slate-900 flex items-center justify-between hover:bg-slate-50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Total Feedback</span>
            <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
              {loading ? '...' : totalCount}
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-1">Workspace Items</span>
          </div>
          <div className="p-3 bg-slate-100 border border-slate-900 text-slate-900 rounded-none">
            <Inbox className="h-6 w-6" />
          </div>
        </div>

        {/* Negative Ratio Card */}
        <div className="bg-white p-5 rounded-none border border-slate-900 flex items-center justify-between hover:bg-slate-50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">% Negative</span>
            <div className={`text-3xl font-black mt-1 font-mono ${percentNegative > 40 ? 'text-red-600' : 'text-slate-900'}`}>
              {loading ? '...' : `${percentNegative}%`}
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-1">Critical Pain Issues</span>
          </div>
          <div className={`p-3 border border-slate-900 rounded-none ${percentNegative > 40 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-900'}`}>
            <ThumbsDown className="h-6 w-6" />
          </div>
        </div>

        {/* New this week card */}
        <div className="bg-white p-5 rounded-none border border-slate-900 flex items-center justify-between hover:bg-slate-50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">New This Week</span>
            <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
              {loading ? '...' : newThisWeekCount}
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-1 flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3 text-slate-900" /> Recent Stream Spikes
            </span>
          </div>
          <div className="p-3 bg-slate-100 border border-slate-900 text-slate-900 rounded-none">
            <MessageSquare className="h-6 w-6" />
          </div>
        </div>

        {/* Actioned items card */}
        <div className="bg-white p-5 rounded-none border border-slate-900 flex items-center justify-between hover:bg-slate-50 transition-all">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Actioned Items</span>
            <div className="text-3xl font-black text-slate-900 mt-1 font-mono">
              {loading ? '...' : `${actionedCount} / ${totalCount}`}
            </div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mt-1">Resolution closure rate</span>
          </div>
          <div className="p-3 bg-slate-100 border border-slate-900 text-slate-900 rounded-none">
            <ThumbsUp className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Charts Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Volume Over Time (Take 2 columns) */}
        <div className="bg-white p-5 rounded-none border border-slate-900 shadow-none lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-900 pb-2">Volume & Sentiment Trends</h3>
          <div className="h-72">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                Analyzing temporal distribution...
              </div>
            ) : totalCount === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest gap-2">
                <AlertCircle className="h-8 w-8 text-slate-400" /> No data matching selected filters
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#0f172a" fontSize={10} tickLine={true} />
                  <YAxis stroke="#0f172a" fontSize={10} tickLine={true} />
                  <Tooltip contentStyle={{ background: '#ffffff', color: '#000000', border: '1px solid #000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="rect" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '1px' }} />
                  <Area name="All Feedback" type="monotone" dataKey="Total" stroke="#0f172a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area name="Negative Feedback" type="monotone" dataKey="Negative" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorNeg)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Sentiment Pie (Take 1 column) */}
        <div className="bg-white p-5 rounded-none border border-slate-900 shadow-none">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-900 pb-2">Customer Emotion Shares</h3>
          <div className="h-72 flex flex-col items-center justify-center relative">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                Calculating percentages...
              </div>
            ) : totalCount === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest gap-2">
                <AlertCircle className="h-8 w-8 text-slate-400" /> No feedback
              </div>
            ) : (
              <>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#ffffff', color: '#000000', border: '1px solid #000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend */}
                <div className="grid grid-cols-3 gap-2 w-full text-center mt-2 border-t border-slate-200 pt-2">
                  {sentimentData.map((s, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                      <span className="text-xs font-black text-slate-900 font-mono mt-0.5">
                        {Math.round((s.value / totalCount) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Chart 3: Top Themes Bar Chart (Take full width/colspan) */}
        <div className="bg-white p-5 rounded-none border border-slate-900 shadow-none lg:col-span-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 border-b border-slate-900 pb-2">Core Topic / Theme Distribution</h3>
          <div className="h-72">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                Analyzing semantic categories...
              </div>
            ) : totalCount === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest gap-2">
                <AlertCircle className="h-8 w-8 text-slate-400" /> No themes mapped
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topThemesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#0f172a" fontSize={10} tickLine={true} />
                  <YAxis stroke="#0f172a" fontSize={10} tickLine={true} />
                  <Tooltip contentStyle={{ background: '#ffffff', color: '#000000', border: '1px solid #000000', borderRadius: '0px', fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="count" fill="#0f172a" radius={0} maxBarSize={40}>
                    {topThemesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#000000" strokeWidth={1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
