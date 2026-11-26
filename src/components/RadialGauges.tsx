import React from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  DrilldownMetricType,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
} from '../types/health';

interface RadialGaugesProps {
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  onSelectMetric: (metric: DrilldownMetricType) => void;
}

interface SingleGaugeProps {
  label: string;
  valueText: string;
  subText: string;
  progress: number; // 0..1
  colorHex: string;
  glowRgba: string;
  onClick: () => void;
}

const SingleTelemetryRing: React.FC<SingleGaugeProps> = ({
  label,
  valueText,
  subText,
  progress,
  colorHex,
  glowRgba,
  onClick,
}) => {
  const size = 104;
  const strokeWidth = 7;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0.03, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center rounded-2xl p-2 transition-all active:scale-[0.97] hover:bg-white/[0.03] focus:outline-none"
      aria-label={`Inspect ${label} details`}
    >
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 overflow-visible"
          style={{ filter: `drop-shadow(0 0 12px ${glowRgba})` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colorHex}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular-mono text-xl font-bold tracking-tight text-slate-50">
            {valueText}
          </span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {subText}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-slate-300 group-hover:text-white">
        {label}
      </span>
    </button>
  );
};

export const RadialGauges: React.FC<RadialGaugesProps> = ({
  recovery,
  strain,
  sleepPlan,
  onSelectMetric,
}) => {
  const recoveryGlow =
    recovery.state === 'optimal'
      ? 'rgba(16, 185, 129, 0.35)'
      : recovery.state === 'moderate'
        ? 'rgba(245, 158, 11, 0.35)'
        : 'rgba(244, 63, 94, 0.38)';

  return (
    <section className="aether-glass rounded-3xl p-4 shadow-glass">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Daily Telemetry
        </span>
        <button
          type="button"
          onClick={() => onSelectMetric('recovery')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
        >
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>{recovery.badgeLabel}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <SingleTelemetryRing
          label="Recovery"
          valueText={`${recovery.score}%`}
          subText={recovery.state}
          progress={recovery.score / 100}
          colorHex={recovery.colorHex}
          glowRgba={recoveryGlow}
          onClick={() => onSelectMetric('recovery')}
        />
        <SingleTelemetryRing
          label="Strain"
          valueText={strain.score.toFixed(1)}
          subText="of 21.0"
          progress={strain.score / 21}
          colorHex="#06B6D4"
          glowRgba="rgba(6, 182, 212, 0.34)"
          onClick={() => onSelectMetric('strain')}
        />
        <SingleTelemetryRing
          label="Sleep"
          valueText={`${sleepPlan.sleepPerformancePct}%`}
          subText="perf"
          progress={sleepPlan.sleepPerformancePct / 100}
          colorHex="#818CF8"
          glowRgba="rgba(129, 140, 248, 0.34)"
          onClick={() => onSelectMetric('sleep')}
        />
      </div>
    </section>
  );
};
