import React from 'react';
import { X, Info, Activity, Moon, HeartPulse, Gauge, Sparkles } from 'lucide-react';
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

interface MetricDrilldownSheetProps {
  metric: DrilldownMetricType;
  onClose: () => void;
  today: DailyBiometricRecord;
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  acwr: CardioLoadAcwr;
  bioAge: BiologicalAgeMetrics;
}

export const MetricDrilldownSheet: React.FC<MetricDrilldownSheetProps> = ({
  metric,
  onClose,
  today,
  recovery,
  strain,
  sleepPlan,
  acwr,
  bioAge,
}) => {
  if (!metric) return null;

  const hourly = today.hourlySeries;
  const maxHr = Math.max(...hourly.map((h) => h.hrBpm), 120);
  const minHr = Math.min(...hourly.map((h) => h.hrBpm), 48);

  const buildPolyline = (values: number[], minVal: number, maxVal: number) => {
    const w = 320;
    const h = 92;
    const span = Math.max(1, maxVal - minVal);
    return values
      .map((v, idx) => {
        const x = (idx / Math.max(1, values.length - 1)) * w;
        const y = h - ((v - minVal) / span) * (h - 14) - 7;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  let title = '';
  let subtitle = '';
  let accentHex = '#10B981';
  let plainEnglish = '';
  let iconNode: React.ReactNode = <Activity className="h-4 w-4" />;
  let chartValues: number[] = hourly.map((h) => h.hrBpm);
  let chartMin = minHr;
  let chartMax = maxHr;
  let chartLabel = '24h Heart Rate Telemetry (bpm)';

  if (metric === 'recovery') {
    title = `Recovery ${recovery.score}%`;
    subtitle = recovery.badgeLabel;
    accentHex = recovery.colorHex;
    iconNode = <HeartPulse className="h-4 w-4" style={{ color: accentHex }} />;
    plainEnglish =
      recovery.state === 'optimal'
        ? `Your autonomic nervous system has rebounded cleanly (${today.restingHrBpm} bpm RHR vs ${recovery.rhrBaseline30d} bpm baseline). You are primed to absorb high cardiovascular or strength strain today.`
        : recovery.state === 'moderate'
          ? `Your physiology is steady but not fully peaked. Moderate Zone 2 aerobic work or structured strength training (Strain ${strain.targetRange[0]}–${strain.targetRange[1]}) will stimulate fitness without accumulating excessive fatigue.`
          : `Elevated RHR or curtailed restorative sleep signals active physiological stress. Keep strain light today, hydrate early, and prioritize tonight's ${sleepPlan.recommendedBedtime} bedtime.`;
  } else if (metric === 'strain') {
    title = `Daily Strain ${strain.score.toFixed(1)} / 21`;
    subtitle = `${strain.label} • Target ${strain.targetRange[0]}–${strain.targetRange[1]}`;
    accentHex = '#06B6D4';
    iconNode = <Gauge className="h-4 w-4 text-cyan-400" />;
    chartValues = hourly.map((h) => h.strainCumulative);
    chartMin = 0;
    chartMax = Math.max(18, strain.score + 2);
    chartLabel = 'Cumulative Logarithmic Strain Curve (0–21)';
    plainEnglish = `Strain combines continuous HR Zones 1–5 (${strain.cardioLoadUnits} cardio units) with logged muscular strength volume (+${strain.muscularStrainBoost} strain boost). Because the scale is logarithmic, going from 14 to 18 requires dramatically higher sustained effort than 4 to 8.`;
  } else if (metric === 'sleep' || metric === 'sleep_debt') {
    title =
      metric === 'sleep'
        ? `Sleep Performance ${sleepPlan.sleepPerformancePct}%`
        : `Sleep Debt ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)}`;
    subtitle = `Recommended Tonight Bedtime: ${sleepPlan.recommendedBedtime}`;
    accentHex = '#818CF8';
    iconNode = <Moon className="h-4 w-4 text-indigo-400" />;
    chartValues = hourly.map((h) => h.stressIndex);
    chartMin = 0;
    chartMax = 100;
    chartLabel = '24h Autonomic Stress & Down-Regulation Profile';
    plainEnglish = `You slept ${formatMinutesToHm(today.sleep.totalSleepMin)} (${today.sleep.efficiencyPct}% efficiency, ${recovery.restorativeSleepPct}% Deep+REM). Accounting for your 8h baseline, +${sleepPlan.todayStrainAdjustmentMin}m strain demand, and 7-day debt, lights-out by ${sleepPlan.recommendedBedtime} puts you on track for a ${sleepPlan.targetWakeTime} wake-up.`;
  } else if (metric === 'acwr') {
    title = `Cardio Load ACWR ${acwr.ratio}`;
    subtitle = acwr.statusLabel;
    accentHex = acwr.colorHex;
    iconNode = <Activity className="h-4 w-4" style={{ color: accentHex }} />;
    plainEnglish = `Your 7-day Acute Strain (${acwr.acute7dAvg}) divided by your 28-day Chronic Strain (${acwr.chronic28dAvg}) is ${acwr.ratio}. Staying inside the 0.80–1.30 Sweet Spot builds aerobic & muscular capacity while minimizing overuse injury risk.`;
  } else if (metric === 'rhr') {
    title = `Resting HR ${today.restingHrBpm} bpm`;
    subtitle = `30-Day Baseline: ${recovery.rhrBaseline30d} bpm (${recovery.rhrDeltaBpm >= 0 ? '+' : ''}${recovery.rhrDeltaBpm})`;
    accentHex = '#10B981';
    iconNode = <HeartPulse className="h-4 w-4 text-emerald-400" />;
    plainEnglish = `Overnight Resting Heart Rate is the highest-signal proxy for recovery when continuous HRV isn't exported. Lower values relative to your ${recovery.rhrBaseline30d} bpm baseline indicate stronger parasympathetic recovery and cardiac efficiency.`;
  } else if (metric === 'bio_age') {
    title = `Biological Age ${bioAge.biologicalAge} yrs`;
    subtitle = `Healthspan Pace ${bioAge.healthspanPace}x • Chronological ${bioAge.chronologicalAge}`;
    accentHex = '#10B981';
    iconNode = <Sparkles className="h-4 w-4 text-emerald-400" />;
    plainEnglish = `Computed over a rolling 30-day window from RHR (${bioAge.rhr30dAvg} bpm), VO2 Max estimate (${bioAge.vo2Max30dAvg} mL/kg/min), and sleep timing consistency (${bioAge.sleepConsistencyPct}%). Maintaining <1.0x pace means you are accumulating biological wear slower than calendar time.`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="aether-glass-elevated max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-glass sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              {iconNode}
            </div>
            <div>
              <h3 className="tabular-mono text-base font-semibold text-white">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-slate-400 transition hover:text-white"
            aria-label="Close detail sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Granular 24h Sparkline */}
        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-[#090C12] p-3.5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-400">
            <span>{chartLabel}</span>
            <span className="tabular-mono text-slate-300">00:00 → 23:00</span>
          </div>
          <svg viewBox="0 0 320 96" className="h-24 w-full overflow-visible">
            <defs>
              <linearGradient id="drillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentHex} stopOpacity="0.32" />
                <stop offset="100%" stopColor={accentHex} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke={accentHex}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={buildPolyline(chartValues, chartMin, chartMax)}
            />
          </svg>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>

        {/* Formula Components Breakdown */}
        {metric === 'recovery' && (
          <div className="mb-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Algorithmic Weighting ({recovery.mode === 'hrv_native' ? 'Dual-Mode HRV' : 'Proxy Mode'})
            </p>
            {recovery.components.map((comp) => (
              <div
                key={comp.label}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    {comp.label}{' '}
                    <span className="tabular-mono text-[11px] text-slate-500">({comp.weightPct}%)</span>
                  </p>
                  <p className="tabular-mono text-[11px] text-slate-400">{comp.detail}</p>
                </div>
                <span className="tabular-mono text-sm font-semibold text-emerald-400">
                  +{comp.contribution}
                </span>
              </div>
            ))}
          </div>
        )}

        {metric === 'strain' && (
          <div className="mb-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Heart Rate Zones & Muscular Load
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  ['Z1', strain.zoneMinutes.zone1, 'bg-slate-500/40'],
                  ['Z2', strain.zoneMinutes.zone2, 'bg-cyan-500/50'],
                  ['Z3', strain.zoneMinutes.zone3, 'bg-emerald-500/60'],
                  ['Z4', strain.zoneMinutes.zone4, 'bg-amber-500/70'],
                  ['Z5', strain.zoneMinutes.zone5, 'bg-rose-500/80'],
                ] as const
              ).map(([z, mins, barClass]) => (
                <div
                  key={z}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-center"
                >
                  <span className="text-[10px] font-semibold text-slate-400">{z}</span>
                  <div className="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${barClass}`}
                      style={{ width: `${Math.min(100, (mins / 45) * 100)}%` }}
                    />
                  </div>
                  <span className="tabular-mono text-[11px] text-slate-200">{mins}m</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2 text-xs">
              <span className="text-cyan-200">Strength / Muscular Load Multiplier</span>
              <span className="tabular-mono font-semibold text-cyan-300">
                +{strain.muscularStrainBoost.toFixed(1)} Strain ({strain.muscularLoadUnits} pts)
              </span>
            </div>
          </div>
        )}

        {(metric === 'sleep' || metric === 'sleep_debt') && (
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: 'Deep', min: today.sleep.stages.deepMin, color: 'text-indigo-300' },
              { label: 'REM', min: today.sleep.stages.remMin, color: 'text-cyan-300' },
              { label: 'Light', min: today.sleep.stages.lightMin, color: 'text-slate-300' },
              { label: 'Awake', min: today.sleep.stages.awakeMin, color: 'text-amber-300' },
            ].map((st) => (
              <div
                key={st.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-center"
              >
                <p className="text-[10px] uppercase text-slate-400">{st.label}</p>
                <p className={`tabular-mono mt-1 text-xs font-semibold ${st.color}`}>
                  {formatMinutesToHm(st.min)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Plain-English Interpretation */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            <span>What this means for you today</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">{plainEnglish}</p>
        </div>
      </div>
    </div>
  );
};
