import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import {
  DedicatedPageId,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
} from '../types/health';

interface RadialGaugesProps {
  recovery: RecoveryBreakdown;
  strain: StrainBreakdown;
  sleepPlan: SleepDebtPlan;
  hasAnyData: boolean;
  onOpenPage: (page: DedicatedPageId) => void;
}

interface RingProps {
  label: string;
  valueText: string;
  subText: string;
  progress: number;
  colorHex: string;
  glowRgba: string;
  dimmed?: boolean;
  onClick: () => void;
}

const TelemetryRing: React.FC<RingProps> = ({
  label,
  valueText,
  subText,
  progress,
  colorHex,
  glowRgba,
  dimmed,
  onClick,
}) => {
  const size = 104;
  const strokeWidth = 7;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = dimmed ? 0 : Math.max(0.04, Math.min(1, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center rounded-2xl py-2.5 px-1 transition hover:bg-white/[0.035] active:scale-[0.96] focus:outline-none"
      aria-label={`Open ${label} page`}
    >
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 overflow-visible"
          style={dimmed ? undefined : { filter: `drop-shadow(0 0 11px ${glowRgba})` }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={strokeWidth}
          />
          {!dimmed && (
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
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`tabular-mono text-[20px] font-bold tracking-tight ${dimmed ? 'text-slate-500' : 'text-white'}`}>
            {valueText}
          </span>
          <span className="mt-0.5 text-[9.5px] font-medium uppercase tracking-wider text-slate-400">
            {subText}
          </span>
        </div>
      </div>
      <span className="mt-2 text-xs font-medium text-slate-300 group-hover:text-white">{label}</span>
    </button>
  );
};

export const RadialGauges: React.FC<RadialGaugesProps> = ({
  recovery,
  strain,
  sleepPlan,
  hasAnyData,
  onOpenPage,
}) => {
  const recoveryGlow =
    recovery.state === 'optimal'
      ? 'rgba(16, 185, 129, 0.34)'
      : recovery.state === 'moderate'
        ? 'rgba(245, 158, 11, 0.34)'
        : 'rgba(244, 63, 94, 0.36)';

  return (
    <section className="aether-card rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Daily Readiness
        </span>
        <button
          type="button"
          onClick={() => onOpenPage('recovery')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-emerald-400/40"
        >
          {recovery.score !== null ? (
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
          ) : (
            <Info className="h-3 w-3 text-slate-400" />
          )}
          <span>{recovery.badgeLabel}</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <TelemetryRing
          label="Recovery"
          valueText={recovery.score !== null ? `${recovery.score}%` : '--'}
          subText={recovery.score !== null ? recovery.state : 'no data'}
          progress={(recovery.score ?? 0) / 100}
          colorHex={recovery.colorHex}
          glowRgba={recoveryGlow}
          dimmed={recovery.score === null}
          onClick={() => onOpenPage('recovery')}
        />
        <TelemetryRing
          label="Strain"
          valueText={hasAnyData ? strain.score.toFixed(1) : '--'}
          subText={hasAnyData ? 'of 21' : 'no data'}
          progress={strain.score / 21}
          colorHex="#06B6D4"
          glowRgba="rgba(6, 182, 212, 0.34)"
          dimmed={!hasAnyData || strain.score === 0}
          onClick={() => onOpenPage('strain')}
        />
        <TelemetryRing
          label="Sleep"
          valueText={sleepPlan.sleepPerformancePct !== null ? `${sleepPlan.sleepPerformancePct}%` : '--'}
          subText={sleepPlan.sleepPerformancePct !== null ? 'perf' : 'no data'}
          progress={(sleepPlan.sleepPerformancePct ?? 0) / 100}
          colorHex="#818CF8"
          glowRgba="rgba(129, 140, 248, 0.34)"
          dimmed={sleepPlan.sleepPerformancePct === null}
          onClick={() => onOpenPage('sleep')}
        />
      </div>
      <p className="mt-1 text-center text-[11px] text-slate-500">Tap any ring to open its full analysis page</p>
    </section>
  );
};
