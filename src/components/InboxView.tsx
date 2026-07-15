/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Search, Plus, Filter, RefreshCw, UploadCloud, Play, ArrowLeft, ArrowRight, Eye, Calendar, Sparkles, AlertCircle, FileText, CheckCircle2, MoreVertical, X, Trash2 } from 'lucide-react';
import { Feedback, Theme, UserRole } from '../types.js';

interface InboxViewProps {
  feedbacks: Feedback[];
  themes: Theme[];
  loading: boolean;
  filters: any;
  setFilters: (filters: any) => void;
  pagination: { page: number; totalPages: number; totalItems: number };
  currentUserRole: UserRole;
  onRefresh: () => void;
  authToken: string;
}

export default function InboxView({
  feedbacks,
  themes,
  loading,
  filters,
  setFilters,
  pagination,
  currentUserRole,
  onRefresh,
  authToken,
}: InboxViewProps) {
  
  // Modals & UI States
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [activeDetailItem, setActiveDetailItem] = useState<Feedback | null>(null);

  // Manual Ingest Form State
  const [manualText, setManualText] = useState('');
  const [manualChannel, setManualChannel] = useState('Support ticket');
  const [manualSource, setManualSource] = useState('');
  const [manualLabel, setManualLabel] = useState('');
  const [ingesting, setIngesting] = useState(false);

  // CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ imported: number; failed: number } | null>(null);

  // Simulation Channel State
  const [simChannel, setSimChannel] = useState('Support ticket');
  const [simulating, setSimulating] = useState(false);

  // Re-classifying individual state
  const [reclassifyingId, setReclassifyingId] = useState<string | null>(null);

  // --- Handlers ---
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText || ingesting) return;
    setIngesting(true);

    try {
      const res = await fetch('/api/feedback/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          content: manualText,
          channel: manualChannel,
          sourceRef: manualSource || undefined,
          customerLabel: manualLabel || undefined,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Ingestion failed');
      }

      setManualText('');
      setManualSource('');
      setManualLabel('');
      setShowManualModal(false);
      onRefresh();
    } catch (err: any) {
      alert(`Ingestion error: ${err.message}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || csvUploading) return;
    setCsvUploading(true);
    setCsvResult(null);

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          // Parse rows into structured content
          const items = rows.map(row => ({
            content: row.content || row.Content || row.text || row.Text,
            channel: row.channel || row.Channel || 'CSV upload',
            sourceRef: row.sourceRef || row.source_ref || '',
            customerLabel: row.customerLabel || row.customer_label || 'Bulk Import'
          })).filter(item => item.content);

          if (items.length === 0) {
            throw new Error('No valid rows containing feedback "content" found in CSV.');
          }

          const res = await fetch('/api/feedback/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ items })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Bulk upload failed');

          setCsvResult({ imported: data.importedCount, failed: data.failedCount });
          setCsvFile(null);
          onRefresh();
        } catch (err: any) {
          alert(`CSV error: ${err.message}`);
        } finally {
          setCsvUploading(false);
        }
      },
      error: (err) => {
        alert(`CSV parse error: ${err.message}`);
        setCsvUploading(false);
      }
    });
  };

  const handleSimulateChannel = async () => {
    if (simulating) return;
    setSimulating(true);

    try {
      const res = await fetch('/api/feedback/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ channel: simChannel })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Simulation failed');
      }

      onRefresh();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/feedback/status/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Status update failed');
      }

      onRefresh();
      if (activeDetailItem && activeDetailItem.id === itemId) {
        setActiveDetailItem({ ...activeDetailItem, status: newStatus as any });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReclassify = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (reclassifyingId) return;
    setReclassifyingId(itemId);

    try {
      const res = await fetch(`/api/feedback/reclassify/${itemId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Reclassification failed');
      }

      const data = await res.json();
      onRefresh();
      if (activeDetailItem && activeDetailItem.id === itemId) {
        setActiveDetailItem(data.item);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReclassifyingId(null);
    }
  };

  // UI Helpers
  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'POS': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-slate-900">POS</span>;
      case 'NEG': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-red-100 text-red-900 border border-slate-900">NEG</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none text-[9px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-900">NEU</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIONED': return <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider bg-slate-900 text-white border border-slate-900">Actioned</span>;
      case 'REVIEWED': return <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-900">Reviewed</span>;
      default: return <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider bg-white text-slate-950 border border-slate-900">New</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-900">
      
      {/* Title Header with Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Feedback Inbox</h1>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
            Search, filter, categorize, and triage raw multi-channel customer communications
          </p>
        </div>

        {/* Action controls (Only Admin/Analyst can modify) */}
        {currentUserRole !== 'VIEWER' && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowCsvModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-800 hover:bg-slate-900 hover:text-white cursor-pointer transition-all"
            >
              <UploadCloud className="h-4 w-4" /> CSV Ingestion
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white hover:text-slate-900 border border-slate-900 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" /> Add Feedback
            </button>
          </div>
        )}
      </div>

      {/* Ingestion & Simulation Tools Drawer */}
      {currentUserRole !== 'VIEWER' && (
        <div className="bg-slate-50 p-4 rounded-none border border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 bg-slate-900 text-white px-2.5 py-1 rounded-none text-[9px] font-bold uppercase tracking-widest border border-slate-900">
              <Sparkles className="h-3 w-3 animate-pulse" /> Sandbox Mode
            </span>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Simulate pulling live feedback channels in real-time to test AI workflows
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={simChannel}
              onChange={(e) => setSimChannel(e.target.value)}
              className="w-full sm:w-44 px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="Support ticket">Support Ticket Stream</option>
              <option value="App store review">App Store Reviews</option>
              <option value="NPS survey">NPS survey Comments</option>
              <option value="Sales call note">CRM Sales Notes</option>
              <option value="Community post">Community Stream</option>
            </select>
            <button
              onClick={handleSimulateChannel}
              disabled={simulating}
              className="px-3.5 py-2 bg-slate-900 border border-slate-900 hover:bg-white hover:text-slate-900 text-white rounded-none text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="h-3 w-3 fill-current" /> {simulating ? 'Pulling...' : 'Pull Feed'}
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Advanced Filter Bar */}
      <div className="bg-white p-4 rounded-none border border-slate-900 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search feedback text, features, rationales..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined, page: 1 })}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-900 rounded-none text-[11px] uppercase tracking-wider focus:outline-none placeholder-slate-400 text-slate-900 font-medium"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Channel filter */}
            <select
              value={filters.channel || ''}
              onChange={(e) => setFilters({ ...filters, channel: e.target.value || undefined, page: 1 })}
              className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-800 focus:outline-none"
            >
              <option value="">Channels</option>
              <option value="Support ticket">Support Ticket</option>
              <option value="App store review">App Store Review</option>
              <option value="NPS survey">NPS Survey</option>
              <option value="Sales call note">Sales Call Note</option>
              <option value="Community post">Community Post</option>
            </select>

            {/* Sentiment Filter */}
            <select
              value={filters.sentiment || ''}
              onChange={(e) => setFilters({ ...filters, sentiment: e.target.value || undefined, page: 1 })}
              className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-800 focus:outline-none"
            >
              <option value="">Sentiment</option>
              <option value="POS">Positive</option>
              <option value="NEU">Neutral</option>
              <option value="NEG">Negative</option>
            </select>

            {/* Theme filter */}
            <select
              value={filters.theme || ''}
              onChange={(e) => setFilters({ ...filters, theme: e.target.value || undefined, page: 1 })}
              className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-800 focus:outline-none max-w-[130px]"
            >
              <option value="">Themes</option>
              {themes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined, page: 1 })}
              className="px-3 py-2 bg-white border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-wider text-slate-800 focus:outline-none"
            >
              <option value="">Workflow Status</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACTIONED">Actioned</option>
            </select>

            {/* Reset button */}
            {Object.keys(filters).some(k => k !== 'page' && k !== 'limit') && (
              <button
                onClick={() => setFilters({ page: 1, limit: 15 })}
                className="text-[10px] font-bold text-slate-900 uppercase tracking-widest border border-slate-900 px-3 py-2 hover:bg-slate-900 hover:text-white transition-all cursor-pointer rounded-none"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table / Inbox List Card */}
      <div className="bg-white rounded-none border border-slate-900 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400 font-medium flex flex-col items-center justify-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin text-slate-900" />
            Loading customer feedback logs...
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-medium flex flex-col items-center justify-center gap-3">
            <AlertCircle className="h-10 w-10 text-slate-400" />
            <div>
              <p className="text-sm font-semibold text-slate-700">No feedback items match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your filter fields or seeding simulation logs.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 uppercase tracking-wider text-[10px] font-black border-b border-slate-900">
                  <th className="py-3.5 px-4 font-black">Feedback</th>
                  <th className="py-3.5 px-4 font-black">Channel</th>
                  <th className="py-3.5 px-4 font-black">Sentiment</th>
                  <th className="py-3.5 px-4 font-black">Themes</th>
                  <th className="py-3.5 px-4 font-black">Status</th>
                  <th className="py-3.5 px-4 font-black text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {feedbacks.map((item) => {
                  const itemThemeNames = item.themes.map(tId => themes.find(t => t.id === tId)?.name || 'General').join(', ');
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setActiveDetailItem(item)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* Content block */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div className="font-bold text-slate-900 line-clamp-1 group-hover:underline">
                          {item.content}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="font-mono">{item.id}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold tracking-wider">{item.customerLabel || item.featureArea || 'General'}</span>
                        </div>
                      </td>

                      {/* Channel block */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-bold uppercase tracking-wider">
                        {item.channel}
                      </td>

                      {/* Sentiment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getSentimentBadge(item.sentiment)}
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.sentimentScore > 0 ? `+${item.sentimentScore}` : item.sentimentScore}
                          </span>
                        </div>
                      </td>

                      {/* Themes mapped */}
                      <td className="py-3.5 px-4 max-w-[120px] truncate text-slate-600 font-medium">
                        {itemThemeNames}
                      </td>

                      {/* Inline Triaging Status drop-down */}
                      <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {currentUserRole === 'VIEWER' ? (
                          getStatusBadge(item.status)
                        ) : (
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="NEW">New</option>
                            <option value="REVIEWED">Reviewed</option>
                            <option value="ACTIONED">Actioned</option>
                          </select>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {currentUserRole !== 'VIEWER' && (
                            <button
                              onClick={(e) => handleReclassify(item.id, e)}
                              disabled={reclassifyingId === item.id}
                              title="Re-classify with AI"
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-0.5 cursor-pointer"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${reclassifyingId === item.id ? 'animate-spin' : ''}`} />
                            </button>
                          )}
                          <button
                            onClick={() => setActiveDetailItem(item)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer / Pagination */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div>
            SHOWING <span className="font-bold text-slate-900">{feedbacks.length}</span> OF <span className="font-bold text-slate-900">{pagination.totalItems}</span> RECORD CHUNKS
          </div>

          <div className="flex items-center gap-1">
            <button
              disabled={filters.page === 1 || loading}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              className="p-1 border border-slate-900 bg-white hover:bg-slate-100 rounded-none disabled:opacity-40 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 uppercase font-bold tracking-wider">
              PAGE <span className="font-bold text-slate-900">{pagination.page}</span> OF <span className="font-bold text-slate-900">{pagination.totalPages || 1}</span>
            </span>
            <button
              disabled={filters.page === pagination.totalPages || pagination.totalPages === 0 || loading}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              className="p-1 border border-slate-900 bg-white hover:bg-slate-100 rounded-none disabled:opacity-40 transition-all cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Manual Input Feedback */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-none max-w-lg w-full border-2 border-slate-900">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Ingest Single Feedback Record</h3>
              <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Feedback Content *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste the raw chat transcript, email contents, app review comment, or sales call notes..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none focus:ring-0 resize-none bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Channel Source *
                  </label>
                  <select
                    value={manualChannel}
                    onChange={(e) => setManualChannel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none"
                  >
                    <option value="Support ticket">Support Ticket</option>
                    <option value="App store review">App Store Review</option>
                    <option value="NPS survey">NPS Survey</option>
                    <option value="Sales call note">Sales Call Note</option>
                    <option value="Community post">Community Post</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Customer Label / Product (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Onboarding, Billing"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Source Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ticket-901, customer-id"
                  value={manualSource}
                  onChange={(e) => setManualSource(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-900 rounded-none text-xs focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-none text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-start gap-1.5 border border-slate-900">
                <Sparkles className="h-3.5 w-3.5 text-slate-900 mt-0.5" />
                <span>On submit, Gemini AI will automatically run structured classification to extract sentiment, scores, feature areas, and match topics.</span>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-none text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-slate-900 transition-all cursor-pointer disabled:opacity-50"
                >
                  {ingesting ? 'Analyzing Ingest...' : 'Ingest & AI Classify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CSV Bulk Ingestion */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-none max-w-md w-full border-2 border-slate-900">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Bulk Import via CSV</h3>
              <button onClick={() => { setShowCsvModal(false); setCsvResult(null); }} className="text-slate-400 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCsvUpload} className="p-6 space-y-4">
              {csvResult ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 text-slate-900 rounded-none border border-slate-900 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="h-10 w-10 text-slate-900 mb-2" />
                    <h4 className="text-xs font-black uppercase tracking-widest">Import Completed!</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-1">
                      Successfully imported <span className="font-bold text-slate-950">{csvResult.imported}</span> items. Failed rows: <span className="font-bold text-red-600">{csvResult.failed}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowCsvModal(false); setCsvResult(null); }}
                    className="w-full py-2 bg-slate-900 border border-slate-900 hover:bg-white hover:text-slate-900 text-white rounded-none text-xs font-bold transition-all uppercase tracking-widest cursor-pointer"
                  >
                    Done & View Logs
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-wider">
                    Upload a feedback CSV spreadsheet. The file must contain a <span className="font-mono font-black text-slate-900">content</span> or <span className="font-mono font-black text-slate-900">text</span> column. Optional: <span className="font-mono text-slate-900">channel, customer_label, source_ref</span>.
                  </p>

                  <div className="border border-dashed border-slate-900 rounded-none p-6 hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center relative bg-white">
                    <UploadCloud className="h-8 w-8 text-slate-950 mb-2" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900">Drag your file here or click to select</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-1">Supports standard .csv format</span>
                    
                    <input
                      type="file"
                      accept=".csv"
                      required
                      onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>

                  {csvFile && (
                    <div className="p-3 bg-slate-50 rounded-none text-xs text-slate-900 border border-slate-900 flex items-center justify-between font-mono">
                      <span className="font-bold truncate">{csvFile.name}</span>
                      <span className="text-[10px] text-slate-500">{(csvFile.size / 1024).toFixed(1)} KB</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowCsvModal(false)}
                      className="px-4 py-2 border border-slate-900 rounded-none text-[10px] font-bold uppercase tracking-widest text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!csvFile || csvUploading}
                      className="px-4 py-2 bg-slate-900 text-white font-bold rounded-none text-[10px] uppercase tracking-widest hover:bg-white hover:text-slate-900 border border-slate-900 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {csvUploading ? 'Processing upload...' : 'Upload & Parse CSV'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* DETAILED FEEDBACK SIDE-DRAWER */}
      {activeDetailItem && (
        <div className="fixed inset-0 overflow-hidden z-50 font-sans">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop slide click */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setActiveDetailItem(null)} />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300">
                <div className="flex h-full flex-col overflow-y-auto bg-white py-6 border-l border-slate-900 animate-fade-in text-slate-900">
                  
                  {/* Header */}
                  <div className="px-6 border-b border-slate-900 pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest">Feedback Details</h2>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">{activeDetailItem.id}</span>
                    </div>
                    <button onClick={() => setActiveDetailItem(null)} className="rounded-none text-slate-500 hover:text-slate-900 p-1 border border-transparent hover:border-slate-900 bg-slate-50">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body content */}
                  <div className="flex-1 px-6 py-4 space-y-6">
                    
                    {/* Raw content text card */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Raw Feedback text</label>
                      <div className="p-4 bg-slate-50 rounded-none text-xs text-slate-900 leading-relaxed font-bold border border-slate-900">
                        "{activeDetailItem.content}"
                      </div>
                    </div>

                    {/* Metadata indicators */}
                    <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-950 py-4">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Channel Source</label>
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">{activeDetailItem.channel}</span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reference Link</label>
                        <span className="text-xs font-mono text-slate-500 truncate block">{activeDetailItem.sourceRef || 'NONE'}</span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ingested Date</label>
                        <span className="text-xs font-bold text-slate-800 block flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-950" />
                          {new Date(activeDetailItem.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Product Label</label>
                        <span className="text-[10px] font-bold text-slate-950 block bg-slate-100 border border-slate-900 rounded-none px-2 py-0.5 inline-block text-center max-w-fit uppercase tracking-wide">
                          {activeDetailItem.customerLabel || activeDetailItem.featureArea || 'General'}
                        </span>
                      </div>
                    </div>

                    {/* AI Classification Analysis Panel */}
                    <div className="bg-slate-50 p-4 rounded-none border border-slate-900 space-y-4">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                        <Sparkles className="h-4 w-4 text-slate-900" /> AI Classification Insights
                      </div>

                      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Emotion Sentiment</label>
                          <div className="flex items-center gap-1.5">
                            {getSentimentBadge(activeDetailItem.sentiment)}
                            <span className="text-xs font-bold font-mono text-slate-600">
                              (Score: {activeDetailItem.sentimentScore})
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Feature Area</label>
                          <span className="text-xs font-bold text-slate-900 block uppercase tracking-wider">
                            {activeDetailItem.featureArea || 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mapped Workspace Themes</label>
                        <div className="flex flex-wrap gap-1">
                          {activeDetailItem.themes.map(tId => {
                            const thObj = themes.find(t => t.id === tId);
                            return (
                              <span
                                key={tId}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-bold text-white rounded-none uppercase tracking-wider border border-slate-900"
                                style={{ backgroundColor: thObj?.color || '#000000' }}
                              >
                                {thObj?.name || 'Theme'}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5 border-t border-slate-200 pt-3">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Classification Rationale</label>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {activeDetailItem.rationale || 'No explanation recorded.'}
                        </p>
                      </div>
                    </div>

                    {/* Workflow status controls */}
                    <div className="space-y-2 border-t border-slate-900 pt-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">triage & action</label>
                      {currentUserRole === 'VIEWER' ? (
                        <div className="p-3 bg-slate-50 border border-slate-900 text-xs text-slate-500 uppercase font-bold tracking-wider">
                          Your read-only viewer role prevents changing ticket workflow status.
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {['NEW', 'REVIEWED', 'ACTIONED'].map((st) => (
                            <button
                              key={st}
                              onClick={() => handleStatusChange(activeDetailItem.id, st)}
                              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-none border transition-all cursor-pointer ${
                                activeDetailItem.status === st
                                  ? 'bg-slate-900 border-slate-900 text-white shadow-none'
                                  : 'bg-white border-slate-900 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {st === 'NEW' ? 'New' : st === 'REVIEWED' ? 'Reviewed' : 'Actioned'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  {currentUserRole !== 'VIEWER' && (
                    <div className="px-6 border-t border-slate-900 pt-4 flex items-center justify-between">
                      <button
                        onClick={(e) => handleReclassify(activeDetailItem.id, e)}
                        disabled={reclassifyingId === activeDetailItem.id}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:underline disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`h-4 w-4 ${reclassifyingId === activeDetailItem.id ? 'animate-spin' : ''}`} />
                        {reclassifyingId === activeDetailItem.id ? 'Reclassifying...' : 'Force AI Re-classify'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
