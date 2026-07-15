/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, MessageSquare, ArrowRight, CornerDownRight, CheckCircle2, ShieldCheck, HelpCircle, FileText, X, AlertCircle } from 'lucide-react';
import { Feedback } from '../types.js';

interface AskLoopViewProps {
  authToken: string;
}

interface GroundedItem {
  id: string;
  content: string;
  channel: string;
  sentiment: string;
  customerLabel: string;
}

export default function AskLoopView({ authToken }: AskLoopViewProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [matchedItems, setMatchedItems] = useState<GroundedItem[]>([]);
  const [inspectItem, setInspectItem] = useState<GroundedItem | null>(null);

  const sampleQuestions = [
    "What are users saying about onboarding and setup?",
    "Are there any major billing or checkout issues?",
    "What complaints are people raising about performance or lag?",
    "What are the top requested features or integrations?",
  ];

  const handleAsk = async (queryText: string) => {
    if (!queryText || loading) return;
    setLoading(true);
    setAnswer(null);
    setCitations([]);
    setMatchedItems([]);
    setQuestion(queryText);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ question: queryText })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch answer');

      setAnswer(data.answer);
      setCitations(data.citedIds);
      setMatchedItems(data.matchedItems);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render answer text with interactive citation buttons/badges
  const renderAnswerWithCitations = (text: string) => {
    if (!text) return null;

    // Use regex to locate citations matching [feedback-abc12]
    const parts = text.split(/(\[feedback-[a-zA-Z0-9-]+\])/g);
    return parts.map((part, idx) => {
      const citationMatch = part.match(/^\[(feedback-[a-zA-Z0-9-]+)\]$/);
      if (citationMatch) {
        const fId = citationMatch[1];
        // Check if we have this matched item in our grounding list
        const matchedObj = matchedItems.find(m => m.id === fId);
        return (
          <button
            key={idx}
            onClick={() => {
              if (matchedObj) {
                setInspectItem(matchedObj);
              } else {
                alert(`Source doc ${fId} not in local context range.`);
              }
            }}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-none text-[9px] font-mono font-bold bg-slate-100 border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-all cursor-pointer align-baseline"
          >
            {fId}
          </button>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-900">
      
      {/* Title Header */}
      <div className="border-b border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
          Ask LOOP <span className="inline-flex items-center gap-1 bg-white text-slate-900 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-none border border-slate-900"><Sparkles className="h-3 w-3 animate-pulse" /> RAG Powered</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
          Ask plain-English questions and get comprehensive summaries grounded strictly in real customer feedback records
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Main Q&A Workspace Panel (Takes 2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Ask Input Card */}
          <div className="bg-white p-5 rounded-none border border-slate-900 space-y-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <HelpCircle className="h-4 w-4 text-slate-900" /> What would you like to investigate?
            </h3>

            <div className="relative">
              <input
                type="text"
                placeholder="e.g. What are customers saying about dark mode contrast ratio?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAsk(question)}
                className="w-full pl-4 pr-12 py-3 bg-white border border-slate-900 rounded-none text-xs focus:outline-none placeholder-slate-400 font-bold uppercase tracking-wider text-slate-900"
              />
              <button
                onClick={() => handleAsk(question)}
                disabled={loading || !question}
                className="absolute inset-y-2 right-2 p-1.5 bg-slate-900 hover:bg-slate-100 border border-slate-900 disabled:opacity-40 text-white hover:text-slate-900 rounded-none transition-all cursor-pointer"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Sample Prefilled Queries */}
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Example Inquiries</span>
              <div className="flex flex-col gap-1.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(q)}
                    disabled={loading}
                    className="text-[10px] font-bold uppercase tracking-widest text-slate-900 bg-white hover:bg-slate-900 hover:text-white border border-slate-900 px-3 py-2 rounded-none transition-all cursor-pointer text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Grounded Answer Panel */}
          {(loading || answer) && (
            <div className="bg-white p-6 rounded-none border border-slate-900 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-widest">
                  <Sparkles className="h-4 w-4 text-slate-900 animate-pulse" />
                  Intelligent Agent Response
                </div>
                {answer && (
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-900 bg-white border border-slate-900 px-2 py-0.5 rounded-none">
                    <ShieldCheck className="h-3.5 w-3.5" /> 100% Grounded
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium flex flex-col items-center justify-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="h-8 w-8 rounded-none border-2 border-slate-900 border-t-transparent animate-spin" />
                  </div>
                  <div className="uppercase font-bold tracking-wider text-[10px]">
                    <p className="text-slate-900">Generating Grounded Synthesis...</p>
                    <p className="text-slate-400 mt-1">Performing cosine similarity & passing top 10 matching feedback logs to Gemini</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Markdown Narrative */}
                  <div className="text-xs text-slate-900 leading-relaxed font-medium space-y-3 whitespace-pre-wrap">
                    {renderAnswerWithCitations(answer || '')}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-none border border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-start gap-1.5">
                    <CornerDownRight className="h-3.5 w-3.5 text-slate-900 mt-0.5" />
                    <span>The citations shown above are interactive buttons. Click on any citation badge (like <span className="font-bold">feedback-12</span>) to instantly read the original, unaltered user feedback message.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Semantic Grounding context sidebar (Takes 1 Column) */}
        <div className="bg-white p-5 rounded-none border border-slate-900 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-slate-900" /> Grounding Range
          </h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold leading-relaxed">
            These are the top semantic matching customer logs retrieved by local vector similarity to ground the AI response:
          </p>

          {loading ? (
            <div className="space-y-2.5 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-slate-50 border border-slate-200 rounded-none" />
              ))}
            </div>
          ) : matchedItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-[9px] font-bold uppercase tracking-widest border border-dashed border-slate-900 rounded-none bg-slate-50">
              No active grounding search context
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {matchedItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setInspectItem(item)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-900 rounded-none cursor-pointer transition-all text-left group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-900 group-hover:underline">{item.id}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold border border-slate-900 rounded-none uppercase tracking-widest ${
                      item.sentiment === 'POS' ? 'bg-emerald-100 text-emerald-900' :
                      item.sentiment === 'NEG' ? 'bg-red-100 text-red-900' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {item.sentiment}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-900 font-bold line-clamp-1 mt-1.5">
                    "{item.content}"
                  </p>
                  <div className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                    {item.channel}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Grounding Document Inspector */}
      {inspectItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-none max-w-md w-full border-2 border-slate-900">
            <div className="px-6 py-4 border-b border-slate-900 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Original Customer Communication</h3>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5 block">Grounding Document: {inspectItem.id}</span>
              </div>
              <button onClick={() => setInspectItem(null)} className="text-slate-400 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-900 leading-relaxed font-bold">
              <div className="p-4 bg-slate-50 rounded-none border border-slate-900 text-slate-800">
                "{inspectItem.content}"
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-wider border-t border-b border-slate-900 py-3">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source Channel</span>
                  <span className="text-slate-900">{inspectItem.channel}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Product Area</span>
                  <span className="text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-900 rounded-none inline-block">
                    {inspectItem.customerLabel || 'General'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-none border border-slate-900 text-[9px] font-bold uppercase tracking-widest text-slate-700 flex items-start gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-900 mt-0.5" />
                <span>This text has been verified as unaltered and direct from the customer source to ground the generative response.</span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectItem(null)}
                  className="px-4 py-2 bg-slate-900 border border-slate-900 hover:bg-white hover:text-slate-900 text-white font-bold rounded-none text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                >
                  Close Grounding Inspector
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
