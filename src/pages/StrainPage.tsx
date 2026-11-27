import React from 'react';
import { Activity, AlertTriangle, Dumbbell, Flame, Gauge, Plus, Trash2 } from 'lucide-react';
import {
  CardioLoadEwma,
  DailyBiometricRecord,
  StrainBreakdown,
  UserProfile,
} from '../types/health';
import { getEffectiveMaxHr } from '../utils/biometricsEngine';
import { PageShell } from '../components/PageShell';

interface StrainPageProps {
  today: DailyBiometricRecord | null;
  profile: UserProfile;
  strain: StrainBreakdown;
  ewma: CardioLoadEwma;
  onBack: () => void;
  onOpenDocs: () => void;
  onOpenTrainingLog: () => void;
  onDeleteWorkout: (id: string) => void;
}

export const StrainPage: React.FC<StrainPageProps> = ({
  today,
  profile,
  strain,
  ewma,
  onBack,
  onOpenDocs,
  onOpenTrainingLog,
  onDeleteWorkout,
}) => {
  const maxHr = getEffectiveMaxHr(profile);
  const totalZoneMin =
    strain.zoneMinutes.zone1 +
    strain.zoneMinutes.zone2 +
    strain.zoneMinutes.zone3 +
    strain.zoneMinutes.zone4 +
    strain.zoneMinutes.zone5;
  const workouts = today?.workouts ?? [];

  return (
    <PageShell
      title="Strain & EWMA Workload"
      subtitle="Dual Cardio + Muscular Load"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Unified 0-21 Hero + Dual Cardio / Muscular Sub-Bars (Upgrade 4) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-400">
              Daily Strain (0–21)
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="tabular-mono text-4xl font-bold text-white">{strain.score.toFixed(1)}</span>
              <span className="text-xs text-slate-400">/ 21.0 · {strain.label}</span>
            </div>
          </div>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-right">
            <p className="text-[10px] text-cyan-200">Target Range</p>
            <p className="tabular-mono text-xs font-bold text-white">
              {strain.targetRange[0]}–{strain.targetRange[1]}
            </p>
          </div>
        </div>

        {/* Dual Separate Sub-Bars */}
        <div className="space-y-3 border-t border-white/[0.07] pt-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                <Flame className="h-3.5 w-3.5 text-cyan-400" />
                Cardiovascular Load (HR Zones + sRPE)
              </span>
              <span className="tabular-mono font-bold text-cyan-300">{strain.cardioScore.toFixed(1)} / 21</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (strain.cardioScore / 21) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                <Dumbbell className="h-3.5 w-3.5 text-indigo-400" />
                Muscular Load (Strength Volume + Soreness)
              </span>
              <span className="tabular-mono font-bold text-indigo-300">{strain.muscularScore.toFixed(1)} / 21</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-indigo-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (strain.muscularScore / 21) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Heart Rate Zones with Calibrated Observed Peak HR */}
      <section className="aether-card rounded-3xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Heart Rate Zones</h2>
          </div>
          <span className="tabular-mono rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] text-slate-300">
            Max HR: {maxHr} bpm {profile.observedMaxHrBpm ? '(Observed)' : '(Est.)'}
          </span>
        </div>

        <div className="space-y-2">
          {(
            [
              { label: 'Zone 5 · Peak (90–100%)', mins: strain.zoneMinutes.zone5, color: 'bg-rose-500' },
              { label: 'Zone 4 · Threshold (80–90%)', mins: strain.zoneMinutes.zone4, color: 'bg-amber-400' },
              { label: 'Zone 3 · Aerobic (70–80%)', mins: strain.zoneMinutes.zone3, color: 'bg-emerald-400' },
              { label: 'Zone 2 · Endurance (60–70%)', mins: strain.zoneMinutes.zone2, color: 'bg-cyan-400' },
              { label: 'Zone 1 · Recovery (50–60%)', mins: strain.zoneMinutes.zone1, color: 'bg-slate-400' },
            ] as const
          ).map((z) => (
            <div key={z.label} className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-300">{z.label}</span>
                <span className="tabular-mono font-semibold text-white">{z.mins} min</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full ${z.color}`}
                  style={{ width: `${totalZoneMin > 0 ? Math.min(100, (z.mins / totalZoneMin) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Uncoupled EWMA Workload & Training Monotony (Upgrade 3) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Uncoupled EWMA & Monotony</h2>
              <p className="text-xs font-medium" style={{ color: ewma.colorHex }}>
                {ewma.statusLabel}
              </p>
            </div>
          </div>
          <span className="tabular-mono text-2xl font-bold text-white">{ewma.ratio ?? '--'}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3">
            <p className="text-[10px] text-slate-400">7d Acute EWMA</p>
            <p className="tabular-mono mt-1 text-sm font-bold text-white">{ewma.acuteEwma7d}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3">
            <p className="text-[10px] text-slate-400">Prior 28d Base</p>
            <p className="tabular-mono mt-1 text-sm font-bold text-white">{ewma.chronicUncoupledEwma28d}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3">
            <p className="text-[10px] text-slate-400">Monotony</p>
            <p className={`tabular-mono mt-1 text-sm font-bold ${ewma.monotonyAlert ? 'text-amber-300' : 'text-white'}`}>
              {ewma.weeklyMonotony ?? '--'}
            </p>
          </div>
        </div>

        {ewma.belowChronicFloor && (
          <p className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
            Chronic Load Floor Active (&lt;4.0): Ratio alerts are paused while rebuilding your training base so returning from rest doesn’t trigger false injury warnings.
          </p>
        )}

        {ewma.monotonyAlert && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Training Monotony is {ewma.weeklyMonotony} (&gt;2.0). Your daily loads are very repetitive—add a genuine easy/rest day to lower overuse risk.
            </span>
          </div>
        )}
      </section>

      {/* Today's Logged Workouts */}
      <section className="aether-card rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Today&apos;s Sessions ({workouts.length})</h2>
          <button
            type="button"
            onClick={onOpenTrainingLog}
            className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-3 py-1.5 text-xs font-bold text-obsidian"
          >
            <Plus className="h-3.5 w-3.5" />
            Log Workout
          </button>
        </div>

        {workouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/12 py-5 text-center text-xs text-slate-400">
            No workouts recorded today yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {workouts.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#080B10] px-3.5 py-3"
              >
                <div>
                  <p className="text-xs font-semibold text-white">{w.title}</p>
                  <p className="tabular-mono mt-0.5 text-[11px] text-slate-400">
                    {w.durationMin}m • {w.activeCaloriesKcal} kcal
                    {w.sessionRpe ? ` • sRPE ${w.sessionRpe}/10` : ''}
                    {w.muscularLoadPoints > 0 ? ` • ${w.muscularLoadPoints}m pts` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular-mono rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-bold text-cyan-300">
                    +{w.computedStrainContribution.toFixed(1)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteWorkout(w.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    aria-label="Delete workout"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
};
