import React, { useState } from 'react';
import { Lock, TrendingDown, TrendingUp, Info, Plus } from 'lucide-react';
import { HabitCorrelationResult } from '../types/health';
import { PageShell } from '../components/PageShell';

interface HabitsLabPageProps {
  correlations: HabitCorrelationResult[];
  onBack: () => void;
  onOpenDocs: () => void;
  onOpenHabitLog: () => void;
}

export const HabitsLabPage: React.FC<HabitsLabPageProps> = ({
  correlations,
  onBack,
  onOpenDocs,
  onOpenHabitLog,
}) => {
  const [focus, setFocus] = useState<'recovery' | 'deepSleep'>('recovery');
  const unlocked = correlations.filter((c) => c.unlocked);
  const locked = correlations.filter((c) => !c.unlocked);

  return (
    <PageShell
      title="Habit Impact Lab"
      subtitle="Sample-Gated · 95% Confidence Ranges"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Top Switcher + Log CTA */}
      <div className="flex items-center justify-between gap-2">
        <div className="aether-card flex rounded-full p-1 text-xs">
          <button
            type="button"
            onClick={() => setFocus('recovery')}
            className={`rounded-full px-3.5 py-1.5 font-semibold transition ${
              focus === 'recovery' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
            }`}
          >
            Recovery %
          </button>
          <button
            type="button"
            onClick={() => setFocus('deepSleep')}
            className={`rounded-full px-3.5 py-1.5 font-semibold transition ${
              focus === 'deepSleep' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
            }`}
          >
            Deep Sleep %
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenHabitLog}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3.5 py-2 text-xs font-bold text-obsidian"
        >
          <Plus className="h-3.5 w-3.5" />
          Log Today
        </button>
      </div>

      {/* Unlocked Statistically Validated Insights */}
      <section className="space-y-3">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">
          Unlocked Insights ({unlocked.length})
        </h2>

        {unlocked.length === 0 ? (
          <div className="aether-card rounded-3xl p-5 text-center space-y-2">
            <p className="text-sm font-semibold text-white">No habits unlocked yet</p>
            <p className="text-xs leading-relaxed text-slate-400">
              To stop random 2-day coincidences from misleading you, every habit requires at least{' '}
              <strong className="text-slate-200">7 days WITH</strong> and{' '}
              <strong className="text-slate-200">7 days WITHOUT</strong> the habit paired with morning biometrics.
            </p>
          </div>
        ) : (
          unlocked.map((item) => {
            const delta = focus === 'recovery' ? item.recoveryDeltaPct : item.deepSleepDeltaPct;
            const ci = focus === 'recovery' ? item.recoveryCi95 : item.deepSleepCi95;
            const positive = delta >= 0;
            const statisticallyClear = Math.abs(delta) > ci;

            return (
              <div key={item.habitId} className="aether-card rounded-3xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="tabular-mono mt-0.5 text-[11px] text-slate-400">
                      With: {item.sampleDaysWith}d · Without: {item.sampleDaysWithout}d · 95% CI ±{ci}%
                    </p>
                  </div>
                  <div
                    className={`tabular-mono inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                      positive
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>
                      {positive ? '+' : ''}
                      {delta}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${positive ? 'bg-emerald-400' : 'bg-rose-500'}`}
                    style={{ width: `${Math.max(10, Math.min(100, Math.abs(delta) * 4.5))}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400">
                  {statisticallyClear
                    ? 'Signal is clear above the 95% noise margin.'
                    : 'Confidence interval crosses zero — keep logging to sharpen this signal.'}
                </p>
              </div>
            );
          })
        )}
      </section>

      {/* Calibrating / Sample-Gated Habits */}
      <section className="space-y-2.5">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Calibrating Sample Gates ({locked.length})
        </h2>

        {locked.map((item) => {
          const withPct = Math.min(100, (item.sampleDaysWith / item.requiredMinSamples) * 100);
          const withoutPct = Math.min(100, (item.sampleDaysWithout / item.requiredMinSamples) * 100);
          return (
            <div key={item.habitId} className="aether-card rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] text-slate-400">
                <div>
                  <div className="mb-1 flex justify-between">
                    <span>Logged days</span>
                    <span className="tabular-mono text-slate-200">
                      {item.sampleDaysWith}/{item.requiredMinSamples}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-emerald-400/70" style={{ width: `${withPct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between">
                    <span>Unlogged days</span>
                    <span className="tabular-mono text-slate-200">
                      {item.sampleDaysWithout}/{item.requiredMinSamples}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-cyan-400/70" style={{ width: `${withoutPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-[11px] leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span>
          Correlation ≠ causation. Watch for paired habits (e.g., late meals happening on the same nights as late screens).
        </span>
      </div>
    </PageShell>
  );
};
