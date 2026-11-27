import React from 'react';
import { Clock, Info, Moon, Sparkles } from 'lucide-react';
import { DailyBiometricRecord, SleepDebtPlan } from '../types/health';
import { formatMinutesToHm } from '../utils/biometricsEngine';
import { PageShell } from '../components/PageShell';

interface SleepPageProps {
  today: DailyBiometricRecord | null;
  sleepPlan: SleepDebtPlan;
  onBack: () => void;
  onOpenDocs: () => void;
  onOpenSettings: () => void;
  onOpenVitalsLog: () => void;
}

export const SleepPage: React.FC<SleepPageProps> = ({
  today,
  sleepPlan,
  onBack,
  onOpenDocs,
  onOpenSettings,
  onOpenVitalsLog,
}) => {
  const sleep = today?.sleep ?? null;
  const totalInBed = sleep ? Math.max(1, sleep.timeInBedMin) : 1;

  return (
    <PageShell
      title="Sleep & Regularity"
      subtitle="Personal Need & 7-Day Rhythm"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Hero Sleep Performance & Regularity */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-300">
              Last Night Duration
            </p>
            <p className="tabular-mono mt-1 text-4xl font-bold text-white">
              {sleep ? formatMinutesToHm(sleep.totalSleepMin) : '--'}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {sleep ? `${sleep.efficiencyPct}% sleep efficiency` : 'No sleep session synced yet'}
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 px-3.5 py-2.5 text-right">
            <p className="text-[10px] uppercase text-indigo-200">7d Regularity</p>
            <p className="tabular-mono mt-0.5 text-xl font-bold text-white">
              {sleepPlan.regularityScorePct !== null ? `${sleepPlan.regularityScorePct}%` : '--'}
            </p>
            <p className="text-[10px] text-indigo-300">{sleepPlan.regularityLabel}</p>
          </div>
        </div>

        {!sleep && (
          <button
            type="button"
            onClick={onOpenVitalsLog}
            className="w-full rounded-xl border border-white/15 bg-white/[0.05] py-2.5 text-xs font-semibold text-white"
          >
            Log Last Night’s Sleep Manually
          </button>
        )}
      </section>

      {/* Adaptive Personal Sleep Need & Capped Bedtime Planner */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Smart Bedtime Planner</h2>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
          >
            Edit Target
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/15 p-3">
            <p className="text-[10px] text-indigo-200">Tonight Bed</p>
            <p className="tabular-mono mt-1 text-lg font-bold text-white">{sleepPlan.recommendedBedtime}</p>
            <p className="tabular-mono text-[10px] text-indigo-300">Wake {sleepPlan.targetWakeTime}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3">
            <p className="text-[10px] text-slate-400">Personal Need</p>
            <p className="tabular-mono mt-1 text-base font-bold text-white">
              {formatMinutesToHm(sleepPlan.personalBaselineNeedMin)}
            </p>
            <p className="text-[10px] text-emerald-300">
              {sleepPlan.isAutoCalibratedNeed ? 'Auto-calibrated' : 'Custom set'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3">
            <p className="text-[10px] text-slate-400">7d Deficit</p>
            <p className="tabular-mono mt-1 text-base font-bold text-white">
              {sleepPlan.hasSleepData ? formatMinutesToHm(sleepPlan.rolling7dDebtMin) : '--'}
            </p>
            <p className="text-[10px] text-slate-500">+{sleepPlan.todayStrainAdjustmentMin}m strain</p>
          </div>
        </div>

        {sleepPlan.bedtimeShiftCappedNote && (
          <div className="flex items-start gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.08] px-3 py-2 text-xs text-indigo-200">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
            <span>{sleepPlan.bedtimeShiftCappedNote}</span>
          </div>
        )}
      </section>

      {/* Nightly Sleep Stages */}
      <section className="aether-card rounded-3xl p-5 space-y-3.5">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Sleep Stage Architecture</h2>
        </div>

        {sleep ? (
          <>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div style={{ width: `${(sleep.stages.deepMin / totalInBed) * 100}%` }} className="bg-indigo-400" />
              <div style={{ width: `${(sleep.stages.remMin / totalInBed) * 100}%` }} className="bg-cyan-400" />
              <div style={{ width: `${(sleep.stages.lightMin / totalInBed) * 100}%` }} className="bg-slate-500" />
              <div style={{ width: `${(sleep.stages.awakeMin / totalInBed) * 100}%` }} className="bg-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { label: 'Deep Sleep', min: sleep.stages.deepMin, dot: 'bg-indigo-400' },
                { label: 'REM Sleep', min: sleep.stages.remMin, dot: 'bg-cyan-400' },
                { label: 'Light Sleep', min: sleep.stages.lightMin, dot: 'bg-slate-500' },
                { label: 'Awake in Bed', min: sleep.stages.awakeMin, dot: 'bg-amber-400' },
              ].map((st) => (
                <div
                  key={st.label}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#080B10] px-3.5 py-2.5"
                >
                  <span className="inline-flex items-center gap-2 text-slate-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                  <span className="tabular-mono font-bold text-white">{formatMinutesToHm(st.min)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/12 py-5 text-center text-xs text-slate-400">
            Wear your watch overnight and sync Health Connect to view sleep stages.
          </p>
        )}

        <div className="flex items-start gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-[11px] leading-relaxed text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            Optical wrist sensors are strong at total sleep hours (~85–90%) but only ~65% accurate on Deep vs REM. AETHER caps stage weighting at 15% so staging noise won’t distort your Recovery.
          </span>
        </div>
      </section>
    </PageShell>
  );
};
