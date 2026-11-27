import React, { useState } from 'react';
import { KeyRound, RotateCcw, Shield, SlidersHorizontal, HeartPulse, Moon } from 'lucide-react';
import { UserProfile } from '../types/health';
import { getEffectiveMaxHr } from '../utils/biometricsEngine';
import { PageShell } from '../components/PageShell';

interface SettingsPageProps {
  profile: UserProfile;
  demoSimulatorEnabled: boolean;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onToggleDemo: (enabled: boolean) => void;
  onResetAllData: () => void;
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  profile,
  demoSimulatorEnabled,
  onUpdateProfile,
  onToggleDemo,
  onResetAllData,
  onBack,
}) => {
  const [geminiDraft, setGeminiDraft] = useState(profile.geminiApiKey);
  const [confirmReset, setConfirmReset] = useState(false);

  const effectiveMaxHr = getEffectiveMaxHr(profile);
  const sleepNeedHours = Number((profile.personalSleepNeedMin / 60).toFixed(2));

  return (
    <PageShell title="Profile & Calibration" subtitle="Biometric Thresholds & Privacy" onBack={onBack}>
      {/* Core Physiology & Observed Peak HR (Upgrade 4) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <HeartPulse className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Physiology & Observed Max HR</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400">Age (years)</label>
            <input
              type="number"
              min={15}
              max={95}
              value={profile.chronologicalAge}
              onChange={(e) => onUpdateProfile({ chronologicalAge: Math.max(15, Number(e.target.value)) })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Body Weight (kg)</label>
            <input
              type="number"
              min={30}
              max={200}
              value={profile.bodyWeightKg}
              onChange={(e) => onUpdateProfile({ bodyWeightKg: Math.max(30, Number(e.target.value)) })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white">Observed Peak HR (bpm)</label>
            <span className="tabular-mono text-[11px] text-emerald-300">Active: {effectiveMaxHr} bpm</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Enter your highest real heart rate from an all-out climb or sprint to override generic 220 − Age.
          </p>
          <input
            type="number"
            min={140}
            max={220}
            value={profile.observedMaxHrBpm ?? ''}
            onChange={(e) =>
              onUpdateProfile({
                observedMaxHrBpm: e.target.value ? Math.max(140, Math.min(220, Number(e.target.value))) : null,
              })
            }
            placeholder={`Auto estimate: ${220 - profile.chronologicalAge} bpm`}
            className="tabular-mono w-full rounded-xl border border-white/10 bg-[#0E131C] px-3 py-2 text-xs text-white placeholder-slate-500"
          />
        </div>
      </section>

      {/* Adaptive Sleep Need & Daily Goals (Upgrade 5) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Moon className="h-4 w-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Personal Sleep Need & Goals</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400">Baseline Sleep Need (hrs)</label>
            <input
              type="number"
              step="0.25"
              min={6}
              max={10}
              value={sleepNeedHours}
              onChange={(e) =>
                onUpdateProfile({
                  personalSleepNeedMin: Math.round(Math.max(6, Math.min(10, Number(e.target.value))) * 60),
                })
              }
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Target Wake Time</label>
            <input
              type="time"
              value={profile.targetWakeTime}
              onChange={(e) => onUpdateProfile({ targetWakeTime: e.target.value })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-[#080B10] px-3.5 py-3">
          <div className="pr-3">
            <p className="text-xs font-semibold text-white">Auto-Calibrate Sleep Need</p>
            <p className="text-[11px] text-slate-400">
              Uses your median sleep on mornings rated ≥5/7 Freshness
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateProfile({ autoCalibrateSleepNeed: !profile.autoCalibrateSleepNeed })}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              profile.autoCalibrateSleepNeed ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                profile.autoCalibrateSleepNeed ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-400">Daily Water Goal (ml)</label>
            <input
              type="number"
              step={250}
              min={1000}
              max={6000}
              value={profile.dailyWaterGoalMl}
              onChange={(e) => onUpdateProfile({ dailyWaterGoalMl: Math.max(1000, Number(e.target.value)) })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Daily Calorie Goal</label>
            <input
              type="number"
              step={50}
              min={1200}
              max={5000}
              value={profile.dailyCalorieGoal}
              onChange={(e) => onUpdateProfile({ dailyCalorieGoal: Math.max(1200, Number(e.target.value)) })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white"
            />
          </div>
        </div>
      </section>

      {/* AI Key + Optional Demo Preview + Reset */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">AI Coach & Data Controls</h2>
        </div>

        <div>
          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <KeyRound className="h-3 w-3" /> Optional Gemini API Key (Stored Only on Device)
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              type="password"
              value={geminiDraft}
              onChange={(e) => setGeminiDraft(e.target.value)}
              placeholder="Leave blank for built-in offline engine"
              className="flex-1 rounded-xl border border-white/10 bg-[#080B10] px-3 py-2.5 text-xs text-white placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => onUpdateProfile({ geminiApiKey: geminiDraft.trim() })}
              className="rounded-xl bg-white/10 px-4 text-xs font-semibold text-white hover:bg-white/20"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-3.5 py-3">
          <div className="pr-3">
            <p className="text-xs font-semibold text-amber-200">Preview Demo Data (In-Memory Only)</p>
            <p className="text-[11px] text-slate-400">
              Explore all charts & unlocked Habit CIs safely without altering your real saved data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleDemo(!demoSimulatorEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              demoSimulatorEnabled ? 'bg-amber-400' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                demoSimulatorEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-xs font-semibold text-rose-300"
          >
            <RotateCcw className="h-4 w-4" />
            Clear All Local AETHER Data
          </button>
        ) : (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/15 p-3.5 space-y-2.5">
            <p className="text-xs font-semibold text-rose-200">
              Delete all synced records, logs, and Lab Vault entries on this phone?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-xl bg-white/10 py-2 text-xs font-semibold text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetAllData();
                  setConfirmReset(false);
                }}
                className="rounded-xl bg-rose-500 py-2 text-xs font-bold text-white"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
          <span>AETHER v3.0 · On-Device Privacy · Namespace aether_os_v3::</span>
        </div>
      </section>
    </PageShell>
  );
};
