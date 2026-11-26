import React from 'react';
import {
  Activity,
  ChevronRight,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Moon,
  Sparkles,
  Wind,
} from 'lucide-react';
import {
  BiologicalAgeMetrics,
  CardioLoadAcwr,
  DailyBiometricRecord,
  DrilldownMetricType,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
} from '../types/health';
import { formatMinutesToHm } from '../utils/biometricsEngine';

interface DetailedFeatureSectionsProps {
  today: DailyBiometricRecord | null;
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  acwr: CardioLoadAcwr;
  bioAge: BiologicalAgeMetrics;
  onSelectMetric: (metric: DrilldownMetricType) => void;
  onGoToVault: () => void;
  onGoToLog: () => void;
}

export const DetailedFeatureSections: React.FC<DetailedFeatureSectionsProps> = ({
  today,
  recovery,
  strain,
  sleepPlan,
  acwr,
  bioAge,
  onSelectMetric,
  onGoToVault,
  onGoToLog,
}) => {
  const sleep = today?.sleep ?? null;
  const totalSleepBar = sleep ? Math.max(1, sleep.timeInBedMin) : 1;
  const totalZoneMin =
    strain.zoneMinutes.zone1 +
    strain.zoneMinutes.zone2 +
    strain.zoneMinutes.zone3 +
    strain.zoneMinutes.zone4 +
    strain.zoneMinutes.zone5;

  return (
    <div className="space-y-4">
      {/* SECTION 1: Recovery Readiness & Formula Breakdown */}
      <section className="aether-glass rounded-3xl p-4 shadow-glass">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <HeartPulse className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Recovery Readiness</h3>
              <p className="text-xs text-slate-400">
                {recovery.mode === 'hrv_native'
                  ? 'Dual-Mode: 50% HRV + 30% RHR + 20% Sleep'
                  : 'Proxy Mode: 55% RHR + 30% Deep/REM + 15% Efficiency'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectMetric('recovery')}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 hover:text-white"
            aria-label="Inspect recovery"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {recovery.score === null ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
            <p className="text-xs font-medium text-slate-200">No morning biometrics recorded yet</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Sync Health Connect from your watch or log your morning RHR & Sleep to calculate your 0–100% Recovery score.
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                onClick={onGoToVault}
                className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-obsidian"
              >
                Connect Health Connect
              </button>
              <button
                type="button"
                onClick={onGoToLog}
                className="rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white"
              >
                Log Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {recovery.components.map((comp) => (
              <div
                key={comp.label}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-100">
                    {comp.label}{' '}
                    <span className="tabular-mono text-[11px] font-normal text-slate-400">
                      ({comp.weightPct}% weight)
                    </span>
                  </p>
                  <p className="tabular-mono mt-0.5 text-[11px] text-slate-400">{comp.detail}</p>
                </div>
                <span className="tabular-mono text-sm font-bold text-emerald-400">
                  +{comp.contribution}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: Sleep Architecture & Smart Bedtime Planner */}
      <section className="aether-glass rounded-3xl p-4 shadow-glass">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sleep Architecture & Debt</h3>
              <p className="text-xs text-slate-400">Stages, restorative ratio & bedtime target</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectMetric('sleep')}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 hover:text-white"
            aria-label="Inspect sleep"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[11px] text-slate-400">Last Night</p>
            <p className="tabular-mono mt-1 text-base font-bold text-white">
              {sleep ? formatMinutesToHm(sleep.totalSleepMin) : '--'}
            </p>
            <p className="tabular-mono text-[11px] text-indigo-300">
              {sleep ? `${sleep.efficiencyPct}% eff.` : 'No sleep'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <p className="text-[11px] text-slate-400">7d Sleep Debt</p>
            <p className="tabular-mono mt-1 text-base font-bold text-white">
              {sleepPlan.hasSleepData ? formatMinutesToHm(sleepPlan.rolling7dDebtMin) : '--'}
            </p>
            <p className="text-[11px] text-slate-400">8h baseline</p>
          </div>
          <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-3">
            <p className="text-[11px] text-indigo-200">Tonight Bed</p>
            <p className="tabular-mono mt-1 text-base font-bold text-white">
              {sleepPlan.recommendedBedtime}
            </p>
            <p className="tabular-mono text-[11px] text-indigo-300">
              Wake {sleepPlan.targetWakeTime}
            </p>
          </div>
        </div>

        {sleep ? (
          <div className="mt-3.5 space-y-2">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div style={{ width: `${(sleep.stages.deepMin / totalSleepBar) * 100}%` }} className="bg-indigo-400" />
              <div style={{ width: `${(sleep.stages.remMin / totalSleepBar) * 100}%` }} className="bg-cyan-400" />
              <div style={{ width: `${(sleep.stages.lightMin / totalSleepBar) * 100}%` }} className="bg-slate-500" />
              <div style={{ width: `${(sleep.stages.awakeMin / totalSleepBar) * 100}%` }} className="bg-amber-400" />
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px]">
              <div className="rounded-xl bg-white/[0.03] py-1.5">
                <p className="text-indigo-300 font-medium">Deep</p>
                <p className="tabular-mono text-white">{sleep.stages.deepMin}m</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] py-1.5">
                <p className="text-cyan-300 font-medium">REM</p>
                <p className="tabular-mono text-white">{sleep.stages.remMin}m</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] py-1.5">
                <p className="text-slate-300 font-medium">Light</p>
                <p className="tabular-mono text-white">{sleep.stages.lightMin}m</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] py-1.5">
                <p className="text-amber-300 font-medium">Awake</p>
                <p className="tabular-mono text-white">{sleep.stages.awakeMin}m</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">
            Sleep stages (Deep, REM, Light, Awake) populate automatically once synced from Health Connect or logged manually.
          </p>
        )}
      </section>

      {/* SECTION 3: Cardiovascular & Muscular Strain + ACWR */}
      <section className="aether-glass rounded-3xl p-4 shadow-glass">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
              <Gauge className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Strain & Cardio Load (ACWR)</h3>
              <p className="text-xs text-slate-400">Logarithmic 0–21 scale + Strength multiplier</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectMetric('strain')}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-slate-400 hover:text-white"
            aria-label="Inspect strain"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* 0-21 Progress Bar */}
        <div className="mb-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="tabular-mono text-lg font-bold text-white">
              {strain.score.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 21.0</span>
            </span>
            <span className="tabular-mono text-xs text-cyan-300">
              Target {strain.targetRange[0]}–{strain.targetRange[1]}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (strain.score / 21) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>Status: {strain.label}</span>
            <span className="tabular-mono text-cyan-300">
              Muscular Boost: +{strain.muscularStrainBoost.toFixed(1)}
            </span>
          </div>
        </div>

        {/* HR Zones 1-5 + ACWR Grid */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {(
            [
              ['Z1', strain.zoneMinutes.zone1, 'bg-slate-400'],
              ['Z2', strain.zoneMinutes.zone2, 'bg-cyan-400'],
              ['Z3', strain.zoneMinutes.zone3, 'bg-emerald-400'],
              ['Z4', strain.zoneMinutes.zone4, 'bg-amber-400'],
              ['Z5', strain.zoneMinutes.zone5, 'bg-rose-500'],
            ] as const
          ).map(([z, mins, color]) => (
            <div key={z} className="rounded-xl border border-white/[0.06] bg-white/[0.025] py-2">
              <p className="text-[10px] font-semibold text-slate-400">{z}</p>
              <div className="mx-auto my-1.5 h-1.5 w-10 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className={`h-full rounded-full ${color}`}
                  style={{ width: `${totalZoneMin > 0 ? Math.min(100, (mins / totalZoneMin) * 100) : 0}%` }}
                />
              </div>
              <p className="tabular-mono text-xs font-semibold text-slate-200">{mins}m</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelectMetric('acwr')}
          className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-2.5 text-left transition hover:border-white/15"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: acwr.colorHex }} />
            <div>
              <p className="text-xs font-semibold text-white">Acute-to-Chronic Ratio (ACWR)</p>
              <p className="tabular-mono text-[11px] text-slate-400">
                7d Avg {acwr.acute7dAvg} vs 28d Avg {acwr.chronic28dAvg}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="tabular-mono text-sm font-bold text-white">{acwr.ratio ?? '--'}</p>
            <p className="text-[11px] font-medium" style={{ color: acwr.colorHex }}>
              {acwr.statusLabel}
            </p>
          </div>
        </button>
      </section>

      {/* SECTION 4: Daily Vitals & Biological Longevity */}
      <section className="aether-glass rounded-3xl p-4 shadow-glass">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Vitals & Biological Age</h3>
              <p className="text-xs text-slate-400">Live physiological markers & longevity pace</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onSelectMetric('rhr')}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left hover:border-white/15"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <HeartPulse className="h-3.5 w-3.5 text-emerald-400" />
              <span>Resting HR</span>
            </div>
            <p className="tabular-mono mt-1.5 text-lg font-bold text-white">
              {today?.restingHrBpm !== null && today?.restingHrBpm !== undefined ? `${today.restingHrBpm} bpm` : '--'}
            </p>
            <p className="tabular-mono text-[11px] text-slate-400">
              {recovery.rhrBaseline30d !== null ? `30d avg ${recovery.rhrBaseline30d}` : 'Awaiting sync'}
            </p>
          </button>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Wind className="h-3.5 w-3.5 text-cyan-400" />
              <span>Blood Oxygen (SpO2)</span>
            </div>
            <p className="tabular-mono mt-1.5 text-lg font-bold text-white">
              {today?.spo2Pct !== null && today?.spo2Pct !== undefined ? `${today.spo2Pct}%` : '--'}
            </p>
            <p className="text-[11px] text-slate-400">Healthy band ≥95%</p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Footprints className="h-3.5 w-3.5 text-indigo-400" />
              <span>Steps & Active Burn</span>
            </div>
            <p className="tabular-mono mt-1.5 text-lg font-bold text-white">
              {today ? today.steps.toLocaleString() : '0'}
            </p>
            <p className="tabular-mono text-[11px] text-slate-400">
              {today ? `${today.activeCaloriesKcal} kcal active` : '0 kcal'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectMetric('bio_age')}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left hover:border-white/15"
          >
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Flame className="h-3.5 w-3.5 text-emerald-400" />
              <span>Biological Age</span>
            </div>
            <p className="tabular-mono mt-1.5 text-lg font-bold text-white">
              {bioAge.biologicalAge !== null ? `${bioAge.biologicalAge} yrs` : '--'}
            </p>
            <p className="tabular-mono text-[11px] text-emerald-300">
              {bioAge.healthspanPace !== null
                ? `Pace ${bioAge.healthspanPace}x • VO2 ${bioAge.vo2Max30dAvg}`
                : `Chrono ${bioAge.chronologicalAge} yrs`}
            </p>
          </button>
        </div>
      </section>
    </div>
  );
};
