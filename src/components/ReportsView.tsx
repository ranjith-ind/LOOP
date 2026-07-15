/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Sparkles, Calendar, CheckSquare, ChevronRight, ArrowLeft, RefreshCw, Clipboard, ExternalLink, Printer } from 'lucide-react';
import { Report, UserRole } from '../types.js';

interface ReportsViewProps {
  currentUserRole: UserRole;
  authToken: string;
}

export default function ReportsView({ currentUserRole, authToken }: ReportsViewProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  // New Report Form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [creating, setCreating] = useState(false);

  // Checked Actions State (simulated task completion)
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch reports');
      setReports(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || creating) return;
    setCreating(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          title,
          dateStart: dateStart || undefined,
          dateEnd: dateEnd || undefined,
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');

      setReports([data, ...reports]);
      setActiveReport(data);
      setShowCreateForm(false);
      setTitle('');
      setDateStart('');
      setDateEnd('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Helper to toggle action checkbox
  const toggleAction = (actionText: string) => {
    setCompletedActions(prev => ({
      ...prev,
      [actionText]: !prev[actionText]
    }));
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-900">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            Voice-of-Customer Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Generate and export professional executive narratives based on aggregated customer statistics
          </p>
        </div>

        {/* Action Button */}
        {currentUserRole !== 'VIEWER' && !activeReport && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-white hover:text-slate-900 border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-white cursor-pointer transition-all"
          >
            <Plus className="h-4 w-4" /> Generate Digest Report
          </button>
        )}
      </div>

      {/* DETAILED REPORT VIEW PANEL */}
      {activeReport ? (
        <div className="bg-white rounded-none border border-slate-900 overflow-hidden animate-fade-in">
          {/* Header Controls */}
          <div className="px-6 py-4 bg-slate-100 border-b border-slate-900 flex items-center justify-between">
            <button
              onClick={() => { setActiveReport(null); setCompletedActions({}); }}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:underline cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back to History
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:bg-slate-900 hover:text-white cursor-pointer transition-all"
              >
                <Printer className="h-4 w-4" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Report Sheet Layout */}
          <div className="p-8 max-w-3xl mx-auto space-y-8 font-sans">
            <div className="text-center pb-6 border-b border-slate-900">
              <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white text-[9px] font-bold px-2.5 py-1 rounded-none border border-slate-900 mb-3 uppercase tracking-widest">
                <Sparkles className="h-3 w-3" /> Gemini Executive Synthesis
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{activeReport.title}</h2>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex items-center justify-center gap-1.5">
                <span>By {activeReport.generatorName}</span>
                <span>•</span>
                <span>Generated on {new Date(activeReport.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {(() => {
              const body = JSON.parse(activeReport.contentJson || '{}');
              return (
                <div className="space-y-6 text-slate-900">
                  {/* Stats Summary Panel */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-900 rounded-none">
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Ingested logs</span>
                      <span className="text-xl font-black text-slate-900 block mt-1 font-mono">{body.stats?.totalCount}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Positive Share</span>
                      <span className="text-xl font-black text-emerald-700 block mt-1 font-mono">
                        {body.stats?.totalCount ? Math.round((body.stats.posCount / body.stats.totalCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Neutral Share</span>
                      <span className="text-xl font-black text-slate-600 block mt-1 font-mono">
                        {body.stats?.totalCount ? Math.round((body.stats.neuCount / body.stats.totalCount) * 100) : 0}%
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Negative Share</span>
                      <span className="text-xl font-black text-red-700 block mt-1 font-mono">
                        {body.stats?.totalCount ? Math.round((body.stats.negCount / body.stats.totalCount) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Section 1: Executive Narrative */}
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-1">I. Executive Summary</h3>
                    <div className="text-xs text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">
                      {body.narrative}
                    </div>
                  </div>

                  {/* Section 2: Top Recurring Themes */}
                  <div className="space-y-2 pt-4">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-1">II. Core Recurring Themes</h3>
                    <div className="text-xs text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">
                      {body.topThemesSummary}
                    </div>
                  </div>

                  {/* Section 3: Sentiment shifts */}
                  <div className="space-y-2 pt-4">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-1">III. Customer Sentiment Dynamics</h3>
                    <div className="text-xs text-slate-800 leading-relaxed font-bold whitespace-pre-wrap">
                      {body.sentimentShiftSummary}
                    </div>
                  </div>

                  {/* Section 4: Recommended Actions with Checkboxes */}
                  <div className="space-y-3 pt-4">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest border-b border-slate-900 pb-1 flex items-center gap-1">
                      <CheckSquare className="h-4 w-4 text-slate-900" /> IV. Priority Action Recommendation Tasks
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-relaxed">
                      Assigned priorities to improve customer health scores. Toggle checkboxes as you execute recommended actions:
                    </p>

                    <div className="space-y-2">
                      {body.recommendedActions?.map((action: string, idx: number) => {
                        const checked = !!completedActions[action];
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleAction(action)}
                            className={`p-3 border rounded-none flex items-start gap-3 cursor-pointer transition-all ${
                              checked
                                ? 'bg-slate-100 border-slate-900 text-slate-500'
                                : 'bg-white border-slate-900 text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="mt-0.5 accent-slate-900 h-4 w-4 rounded-none cursor-pointer border-slate-900"
                            />
                            <span className={`text-xs font-bold leading-relaxed ${checked ? 'line-through text-slate-400' : ''}`}>
                              {action}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : showCreateForm ? (
        /* CREATE REPORT PANEL FORM */
        <div className="bg-white rounded-none border-2 border-slate-900 p-6 max-w-lg mx-auto animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-900 mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Configure Executive VoC Report</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-950 font-bold p-1">
              X
            </button>
          </div>

          <form onSubmit={handleCreateReport} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Report Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Weekly Product Feedback Digest - Q2 Weeks 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none uppercase tracking-wide font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none text-slate-900 font-bold uppercase tracking-widest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none text-slate-900 font-bold uppercase tracking-widest"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-none border border-slate-900 text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-start gap-1.5">
              <Sparkles className="h-4 w-4 text-slate-950 mt-0.5" />
              <span>
                Gemini will scan your workspace logs matching this date window, compute exact sentiment shares and recurring topic counts, then draft a beautifully written executive document for your team.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-none text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-slate-900 transition-all cursor-pointer disabled:opacity-50"
              >
                {creating ? 'Analyzing & Writing...' : 'Generate with Gemini AI'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* REPORTS HISTORY LOG LIST */
        <div className="bg-white rounded-none border border-slate-900 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-slate-900" />
              Fetching Voice-of-Customer archives...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-3">
              <FileText className="h-10 w-10 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">No VoC reports found</p>
                {currentUserRole !== 'VIEWER' ? (
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Generate your first AI Customer Insight Digest above.</p>
                ) : (
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Ask an Admin or Analyst to generate reports for the team.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {reports.map((rep) => {
                const bodyObj = JSON.parse(rep.contentJson || '{}');
                return (
                  <div
                    key={rep.id}
                    onClick={() => setActiveReport(rep)}
                    className="p-5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between group text-slate-900"
                  >
                    <div className="space-y-1 max-w-xl">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 group-hover:underline">
                        {rep.title}
                      </h3>
                      <div className="text-[9px] text-slate-400 font-bold flex items-center gap-2 flex-wrap uppercase tracking-wider">
                        <span>Generated by {rep.generatorName}</span>
                        <span>•</span>
                        <span>Logs Analyzed: {bodyObj.stats?.totalCount || 0} items</span>
                        <span>•</span>
                        <span>Sentiment: NEG({bodyObj.stats?.negCount || 0}), POS({bodyObj.stats?.posCount || 0})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400 font-bold font-mono">
                        {new Date(rep.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-900 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
