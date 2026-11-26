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
  'When should I sleep tonight?',
  'Explain my Redmi proxy score',
  'Which habits impact me most?',
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
      <section className="aether-glass relative overflow-hidden rounded-3xl p-4 shadow-glass">
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-400">
                Aether AI Briefing
              </p>
              <p className="text-[10px] text-slate-500">
                {briefing.generatedBy === 'gemini' ? 'Gemini 2.5 Flash Live' : 'Offline Heuristic Engine'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshBriefing}
            disabled={isRefreshingBriefing}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:text-white disabled:opacity-50"
            aria-label="Refresh AI briefing"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingBriefing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        <h3 className="text-sm font-semibold text-white">{briefing.headline}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{briefing.summary}</p>

        <ul className="mt-3 space-y-2">
          {briefing.actionItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2 text-xs text-slate-200"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-[0.99]"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Ask Aether Coach</span>
        </button>
      </section>

      {/* Slide-Up Ask Aether Coach Drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setDrawerOpen(false)}
        >
          <div
            className="aether-glass-elevated flex h-[82vh] w-full max-w-md flex-col rounded-t-3xl shadow-glass sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Aether Coach</h3>
                  <p className="text-[11px] text-slate-400">
                    {hasGeminiKey ? 'Gemini Live • Full Telemetry Context' : 'Offline Biometric Engine • Full Context'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-cyan-500/20 text-cyan-50 border border-cyan-400/25'
                        : 'bg-white/[0.05] text-slate-200 border border-white/[0.07]'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2 text-xs text-slate-400">
                    Analyzing telemetry…
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.07] p-3">
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSubmit(prompt)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-slate-300 transition hover:border-emerald-400/40 hover:text-white"
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
                  placeholder="Ask about Recovery, Strain, Sleep, Habits…"
                  className="flex-1 rounded-2xl border border-white/10 bg-[#080B10] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-obsidian transition hover:bg-emerald-400 disabled:opacity-40"
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
