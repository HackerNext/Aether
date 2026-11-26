import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { HabitCorrelationResult } from '../types/health';

interface HabitCorrelationsProps {
  correlations: HabitCorrelationResult[];
}

export const HabitCorrelations: React.FC<HabitCorrelationsProps> = ({ correlations }) => {
  const [focusMetric, setFocusMetric] = useState<'recovery' | 'deepSleep'>('recovery');

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Habit Impact Engine</h3>
          <p className="text-xs text-slate-400">Next-day biometric shift vs non-logged days</p>
        </div>
        <div className="aether-glass flex rounded-full p-1 text-[11px]">
          <button
            type="button"
            onClick={() => setFocusMetric('recovery')}
            className={`rounded-full px-2.5 py-1 font-medium transition ${
              focusMetric === 'recovery' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
            }`}
          >
            Recovery
          </button>
          <button
            type="button"
            onClick={() => setFocusMetric('deepSleep')}
            className={`rounded-full px-2.5 py-1 font-medium transition ${
              focusMetric === 'deepSleep' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
            }`}
          >
            Deep Sleep
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {correlations.map((item) => {
          const val = focusMetric === 'recovery' ? item.recoveryDeltaPct : item.deepSleepDeltaPct;
          const isPositive = val >= 0;
          const barWidth = Math.min(100, Math.abs(val) * 4.2);

          return (
            <div key={item.habitId} className="aether-glass rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="tabular-mono text-[11px] text-slate-400">
                    n={item.sampleDaysWith} logged days • Eff.{' '}
                    {item.sleepEfficiencyDeltaPct >= 0 ? '+' : ''}
                    {item.sleepEfficiencyDeltaPct}%
                  </p>
                </div>
                <div
                  className={`tabular-mono inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isPositive
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/25'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {isPositive ? '+' : ''}
                    {val}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPositive ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(8, barWidth)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
