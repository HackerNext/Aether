import React, { useState } from 'react';
import { Sparkles, MessageSquare, Send, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { CoachMessage, MorningBriefing } from '../types/health';

interface AICoachDrawerProps {
  briefing: MorningBriefing;
  isRefreshingBriefing: boolean;
  onRefreshBriefing: () => void;
  chatHistory: CoachMessage[];
  onSendQuestion: (q: string) => Promise<void>;
  hasGeminiKey: boolean;
}

const QUICK_PROMPTS = [
  'How hard should I train today?',
  'Explain my EWMA & Monotony',
  'When should I sleep tonight?',
];

export const AICoachDrawer: React.FC<AICoachDrawerProps> = ({
  briefing,
  isRefreshingBriefing,
  onRefreshBriefing,
  chatHistory,
  onSendQuestion,
  hasGeminiKey,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput('');
    setSending(true);
    try {
      await onSendQuestion(trimmed);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <section className="aether-card rounded-3xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-400">
                Aether Coach Briefing
              </h3>
              <p className="text-[10px] text-slate-500">
                {briefing.generatedBy === 'gemini' ? 'Gemini 2.5 Flash' : 'Local Biometric Engine'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshBriefing}
            disabled={isRefreshingBriefing}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-white"
            aria-label="Refresh briefing"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingBriefing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{briefing.headline}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">{briefing.summary}</p>
        </div>

        <ul className="space-y-2">
          {briefing.actionItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 rounded-2xl border border-white/[0.05] bg-[#080B10] px-3 py-2.5 text-xs text-slate-200"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Ask Aether Coach</span>
        </button>
      </section>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="aether-glass-elevated flex h-[82vh] w-full max-w-md flex-col rounded-t-3xl safe-bottom sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Aether Coach</h3>
                  <p className="text-[11px] text-slate-400">
                    {hasGeminiKey ? 'Gemini Live · Real Telemetry' : 'Offline Engine · Real Telemetry'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'border border-cyan-400/25 bg-cyan-500/20 text-cyan-50'
                        : 'border border-white/[0.08] bg-white/[0.05] text-slate-200'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs text-slate-400">
                    Analyzing telemetry…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.08] p-3.5">
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSubmit(prompt)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] text-slate-300"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Z-scores, EWMA, sleep, training…"
                  className="flex-1 rounded-2xl border border-white/10 bg-[#080B10] px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-obsidian disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
