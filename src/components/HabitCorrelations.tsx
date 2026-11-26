import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { HabitCorrelationResult } from '../types/health';

interface HabitCorrelationsProps {
  correlations: HabitCorrelationResult[];
}

export const HabitCorrelations: React.FC<HabitCorrelationsProps> = ({ correlations }) => {
  const [focusMetric, setFocusMetric] = useState<'recovery' | 'deepSleep'>('recovery');

  return (
    <section className="aether-glass rounded-3xl p-4 shadow-glass space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Habit Impact Correlation Engine</h3>
          <p className="text-xs text-slate-400">Next-day biometric shift on logged vs unlogged days</p>
        </div>
        {correlations.length > 0 && (
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setFocusMetric('recovery')}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                focusMetric === 'recovery' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
              }`}
            >
              Recovery
            </button>
            <button
              type="button"
              onClick={() => setFocusMetric('deepSleep')}
              className={`rounded-full px-2.5 py-1 font-semibold ${
                focusMetric === 'deepSleep' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
              }`}
            >
              Deep
            </button>
          </div>
        )}
      </div>

      {correlations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4 text-center">
          <p className="text-xs leading-relaxed text-slate-400">
            Log habits in the <span className="font-semibold text-white">+ Log</span> tab alongside 5+ days of synced biometrics to calculate how Magnesium, Caffeine Cutoff, Late Meals, and Stress shift your Recovery and Deep Sleep.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {correlations.map((item) => {
            const val = focusMetric === 'recovery' ? item.recoveryDeltaPct : item.deepSleepDeltaPct;
            const isPositive = val >= 0;
            const barWidth = Math.min(100, Math.abs(val) * 4.2);

            return (
              <div key={item.habitId} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="tabular-mono text-[11px] text-slate-400">
                      n={item.sampleDaysWith} days • Efficiency {item.sleepEfficiencyDeltaPct >= 0 ? '+' : ''}
                      {item.sleepEfficiencyDeltaPct}%
                    </p>
                  </div>
                  <div
                    className={`tabular-mono inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${
                      isPositive
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    <span>
                      {isPositive ? '+' : ''}
                      {val}%
                    </span>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={`h-full rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-500'}`}
                    style={{ width: `${Math.max(8, barWidth)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
