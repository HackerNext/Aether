import React from 'react';
import { AlertTriangle, HeartPulse, ShieldCheck, Sliders } from 'lucide-react';
import { DailyBiometricRecord, RecoveryBreakdown } from '../types/health';
import { PageShell } from '../components/PageShell';

interface RecoveryPageProps {
  today: DailyBiometricRecord | null;
  recovery: RecoveryBreakdown;
  onBack: () => void;
  onOpenDocs: () => void;
  onOpenWellnessLog: () => void;
  onOpenDevices: () => void;
}

export const RecoveryPage: React.FC<RecoveryPageProps> = ({
  today,
  recovery,
  onBack,
  onOpenDocs,
  onOpenWellnessLog,
  onOpenDevices,
}) => {
  // Map RHR Z-score (-2.5σ to +2.5σ) to percentage (0% to 100%) for visual SWC bar
  const zClamped = recovery.rhrZScore !== null ? Math.max(-2.5, Math.min(2.5, recovery.rhrZScore)) : 0;
  const markerLeftPct = ((zClamped + 2.5) / 5) * 100;

  return (
    <PageShell
      title="Recovery Readiness"
      subtitle={recovery.badgeLabel}
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Hero Score Card */}
      <section className="aether-card rounded-3xl p-5 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          {recovery.badgeLabel}
        </span>

        <div className="mt-4">
          <p
            className="tabular-mono text-5xl font-bold tracking-tight"
            style={{ color: recovery.score !== null ? recovery.colorHex : '#64748B' }}
          >
            {recovery.score !== null ? `${recovery.score}%` : '--'}
          </p>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            {recovery.score !== null ? `${recovery.state} readiness` : 'awaiting sync or morning check-in'}
          </p>
        </div>

        {recovery.score === null && (
          <div className="mt-5 flex justify-center gap-2.5">
            <button
              type="button"
              onClick={onOpenDevices}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-obsidian"
            >
              Sync Watch
            </button>
            <button
              type="button"
              onClick={onOpenWellnessLog}
              className="rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-xs font-semibold text-white"
            >
              Morning Check-In
            </button>
          </div>
        )}
      </section>

      {/* Perception Override Banner (Upgrade 2) */}
      {recovery.perceptionOverrideActive && recovery.perceptionOverrideReason && (
        <section className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Perception Override Active
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
                {recovery.perceptionOverrideReason}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Personal 30-Day Z-Score & SWC (±0.5σ) Visualizer (Upgrade 1) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <HeartPulse className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">RHR Z-Score & Normal Band (±0.5σ)</h2>
              <p className="text-xs text-slate-400">{recovery.swcLabel}</p>
            </div>
          </div>
          <span className="tabular-mono text-sm font-bold text-white">
            {today?.restingHrBpm !== null && today?.restingHrBpm !== undefined ? `${today.restingHrBpm} bpm` : '--'}
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <div className="relative h-3.5 w-full rounded-full bg-white/[0.07]">
            {/* Optimal -0.5σ to +0.5σ Normal Noise SWC Band (40% to 60%) */}
            <div
              className="absolute top-0 h-full rounded-full border border-emerald-400/40 bg-emerald-500/25"
              style={{ left: '40%', width: '20%' }}
            />
            {recovery.rhrZScore !== null && (
              <div
                className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07090D] bg-white shadow-lg transition-all duration-500"
                style={{ left: `${markerLeftPct}%` }}
              />
            )}
          </div>
          <div className="tabular-mono flex justify-between text-[10px] text-slate-500">
            <span>−2.5σ (Low)</span>
            <span className="text-emerald-400">±0.5σ Normal Noise</span>
            <span>+2.5σ (High)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">30d Mean</p>
            <p className="tabular-mono mt-0.5 text-sm font-bold text-white">
              {recovery.rhrMean30d !== null ? `${recovery.rhrMean30d}` : '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">Spread (±σ)</p>
            <p className="tabular-mono mt-0.5 text-sm font-bold text-white">
              {recovery.rhrSd30d !== null ? `±${recovery.rhrSd30d}` : '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">Today Z</p>
            <p className="tabular-mono mt-0.5 text-sm font-bold text-emerald-300">
              {recovery.rhrZScore !== null ? `${recovery.rhrZScore >= 0 ? '+' : ''}${recovery.rhrZScore}σ` : '--'}
            </p>
          </div>
        </div>
      </section>

      {/* Weighted Components Breakdown */}
      {recovery.components.length > 0 && (
        <section className="aether-card rounded-3xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">Score Component Weights</h2>
          <div className="space-y-2.5">
            {recovery.components.map((comp) => (
              <div
                key={comp.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#080B10] px-3.5 py-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100">
                    {comp.label}{' '}
                    <span className="tabular-mono text-[11px] font-normal text-slate-400">
                      ({comp.weightPct}%)
                    </span>
                  </p>
                  <p className="tabular-mono mt-0.5 truncate text-[11px] text-slate-400">{comp.detail}</p>
                </div>
                <span className="tabular-mono shrink-0 text-sm font-bold text-emerald-400">
                  +{comp.contribution}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hooper Wellness Status CTA */}
      <section className="aether-card rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Morning Hooper Check-In</p>
              <p className="text-[11px] text-slate-400">
                {today?.wellness
                  ? `Logged: Wellness ${today.wellness.wellnessScore}/100 (Soreness ${today.wellness.soreness}/7)`
                  : 'Not checked in today — takes 15 seconds'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenWellnessLog}
            className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white"
          >
            {today?.wellness ? 'Edit' : 'Check In'}
          </button>
        </div>
      </section>
    </PageShell>
  );
};
