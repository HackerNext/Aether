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
  today: DailyBiometricRecord | null;
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

  const hourly = today?.hourlySeries ?? [];
  const hasHourly = hourly.length >= 2;

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
  const chartValues = hourly.map((h) => h.hrBpm);
  const chartMin = hasHourly ? Math.min(...chartValues) - 4 : 45;
  const chartMax = hasHourly ? Math.max(...chartValues) + 4 : 140;

  if (metric === 'recovery') {
    title = recovery.score !== null ? `Recovery ${recovery.score}%` : 'Recovery — Awaiting Data';
    subtitle = recovery.badgeLabel;
    accentHex = recovery.colorHex;
    iconNode = <HeartPulse className="h-4 w-4" style={{ color: accentHex }} />;
    plainEnglish =
      recovery.score === null
        ? 'No morning RHR or Sleep data is synced yet. Connect Android Health Connect in the Vault tab or log your morning vitals in + Log.'
        : recovery.state === 'optimal'
          ? `Strong autonomic rebound (${today?.restingHrBpm ?? '--'} bpm RHR vs ${recovery.rhrBaseline30d ?? '--'} bpm baseline). You have green-light readiness for high strain today.`
          : recovery.state === 'moderate'
            ? `Steady readiness. Aim for Strain ${strain.targetRange[0]}–${strain.targetRange[1]} with Zone 2 aerobic volume or crisp strength work.`
            : `Suppressed recovery signals elevated physiological load. Keep strain light and target tonight's ${sleepPlan.recommendedBedtime} bedtime.`;
  } else if (metric === 'strain') {
    title = `Daily Strain ${strain.score.toFixed(1)} / 21`;
    subtitle = `${strain.label} • Target ${strain.targetRange[0]}–${strain.targetRange[1]}`;
    accentHex = '#06B6D4';
    iconNode = <Gauge className="h-4 w-4 text-cyan-400" />;
    plainEnglish = `Strain uses a logarithmic 0–21 curve combining continuous HR Zones 1–5 (${strain.cardioLoadUnits} cardio units) and logged strength training (+${strain.muscularStrainBoost.toFixed(1)} muscular boost).`;
  } else if (metric === 'sleep' || metric === 'sleep_debt') {
    title =
      sleepPlan.sleepPerformancePct !== null
        ? `Sleep Performance ${sleepPlan.sleepPerformancePct}%`
        : 'Sleep Planner — Awaiting Sleep Data';
    subtitle = `Recommended Bedtime: ${sleepPlan.recommendedBedtime}`;
    accentHex = '#818CF8';
    iconNode = <Moon className="h-4 w-4 text-indigo-400" />;
    plainEnglish = today?.sleep
      ? `Last night: ${formatMinutesToHm(today.sleep.totalSleepMin)} (${today.sleep.efficiencyPct}% efficiency). Rolling 7-day debt is ${formatMinutesToHm(sleepPlan.rolling7dDebtMin)}; lights-out by ${sleepPlan.recommendedBedtime} aligns with your ${sleepPlan.targetWakeTime} wake goal.`
      : `Wear your watch overnight and sync Health Connect (or enter sleep manually in + Log) to track Deep/REM architecture and rolling 7-day sleep debt.`;
  } else if (metric === 'acwr') {
    title = `Cardio Load ACWR ${acwr.ratio ?? '--'}`;
    subtitle = acwr.statusLabel;
    accentHex = acwr.colorHex;
    iconNode = <Activity className="h-4 w-4" style={{ color: accentHex }} />;
    plainEnglish =
      acwr.ratio !== null
        ? `7-day Acute Strain (${acwr.acute7dAvg}) divided by 28-day Chronic Strain (${acwr.chronic28dAvg}) = ${acwr.ratio}. Staying inside 0.80–1.30 maximizes fitness adaptation while avoiding overtraining.`
        : 'ACWR compares your 7-day training load against your 28-day baseline. Sync or log 3+ active days to activate this ratio.';
  } else if (metric === 'rhr') {
    title = `Resting HR ${today?.restingHrBpm ?? '--'} bpm`;
    subtitle = recovery.rhrBaseline30d !== null ? `30-Day Baseline: ${recovery.rhrBaseline30d} bpm` : 'No baseline yet';
    accentHex = '#10B981';
    iconNode = <HeartPulse className="h-4 w-4 text-emerald-400" />;
    plainEnglish =
      'Overnight Resting Heart Rate is the highest-signal recovery biomarker for wearables like Redmi Watch 5 Lite. Lower RHR relative to your rolling baseline indicates stronger cardiovascular recovery.';
  } else if (metric === 'bio_age') {
    title = bioAge.biologicalAge !== null ? `Biological Age ${bioAge.biologicalAge} yrs` : 'Biological Age — Awaiting Data';
    subtitle =
      bioAge.healthspanPace !== null
        ? `Healthspan Pace ${bioAge.healthspanPace}x • Chronological ${bioAge.chronologicalAge}`
        : `Chronological Age ${bioAge.chronologicalAge} yrs`;
    accentHex = '#10B981';
    iconNode = <Sparkles className="h-4 w-4 text-emerald-400" />;
    plainEnglish = bioAge.hasEnoughData
      ? `Calculated from your 30-day RHR average (${bioAge.rhr30dAvg} bpm), estimated VO2 Max (${bioAge.vo2Max30dAvg} mL/kg/min), and sleep consistency (${bioAge.sleepConsistencyPct ?? '--'}%).`
      : 'Sync RHR and Sleep history via Health Connect to compute your Biological Age and Healthspan Pace.';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="aether-glass-elevated max-h-[86vh] w-full max-w-md overflow-y-auto rounded-t-3xl p-5 shadow-glass sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              {iconNode}
            </div>
            <div>
              <h3 className="tabular-mono text-base font-bold text-white">{title}</h3>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-400 hover:text-white"
            aria-label="Close detail sheet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasHourly && (
          <div className="mb-4 rounded-2xl border border-white/[0.08] bg-[#090C12] p-3.5">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
              <span>Hourly Heart Rate Telemetry (bpm)</span>
              <span className="tabular-mono text-slate-300">{hourly.length} hrs</span>
            </div>
            <svg viewBox="0 0 320 96" className="h-24 w-full overflow-visible">
              <polyline
                fill="none"
                stroke={accentHex}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={buildPolyline(chartValues, chartMin, chartMax)}
              />
            </svg>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-100">
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            <span>What this means for you today</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">{plainEnglish}</p>
        </div>
      </div>
    </div>
  );
};
