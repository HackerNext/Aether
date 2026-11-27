import React, { useState } from 'react';
import { Award, CheckCircle2, HeartPulse, Info, Timer } from 'lucide-react';
import { FitnessAgeMetrics, UserProfile } from '../types/health';
import { PageShell } from '../components/PageShell';

interface FitnessAgePageProps {
  fitnessAge: FitnessAgeMetrics;
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onBack: () => void;
  onOpenDocs: () => void;
}

export const FitnessAgePage: React.FC<FitnessAgePageProps> = ({
  fitnessAge,
  profile,
  onUpdateProfile,
  onBack,
  onOpenDocs,
}) => {
  const [cooperMeters, setCooperMeters] = useState(profile.cooper12MinMeters ? String(profile.cooper12MinMeters) : '');
  const [fiveKMin, setFiveKMin] = useState(
    profile.fiveKmTimeSeconds ? String(Math.floor(profile.fiveKmTimeSeconds / 60)) : ''
  );
  const [fiveKSec, setFiveKSec] = useState(
    profile.fiveKmTimeSeconds ? String(profile.fiveKmTimeSeconds % 60) : ''
  );
  const [savedMsg, setSavedMsg] = useState('');

  const saveCooper = () => {
    const m = Number(cooperMeters);
    if (!m || m < 1200 || m > 5000) {
      setSavedMsg('Enter a realistic 12-min run distance between 1200m and 5000m.');
      return;
    }
    onUpdateProfile({ cooper12MinMeters: Math.round(m), fiveKmTimeSeconds: null });
    setSavedMsg('VO2 Max calibrated from your Cooper 12-Minute Run!');
    setTimeout(() => setSavedMsg(''), 2800);
  };

  const saveFiveK = () => {
    const totalSec = Number(fiveKMin || 0) * 60 + Number(fiveKSec || 0);
    if (totalSec < 780 || totalSec > 3600) {
      setSavedMsg('Enter a realistic 5 km time between 13:00 and 60:00.');
      return;
    }
    onUpdateProfile({ fiveKmTimeSeconds: totalSec, cooper12MinMeters: null });
    setSavedMsg('VO2 Max calibrated from your 5 km Time Trial!');
    setTimeout(() => setSavedMsg(''), 2800);
  };

  const clearFieldTest = () => {
    setCooperMeters('');
    setFiveKMin('');
    setFiveKSec('');
    onUpdateProfile({ cooper12MinMeters: null, fiveKmTimeSeconds: null });
    setSavedMsg('Field test cleared (reverted to RHR estimate).');
    setTimeout(() => setSavedMsg(''), 2500);
  };

  const sourceLabel: Record<FitnessAgeMetrics['vo2Source'], string> = {
    field_test_cooper: 'Cooper 12-Min Field Test (High Accuracy)',
    field_test_5k: '5 km Time Trial (High Accuracy)',
    wearable: 'Watch VO2 Max Export',
    rhr_estimate: 'RHR Ratio Estimate (Enter run test below to calibrate)',
  };

  return (
    <PageShell
      title="Cardio & Sleep Fitness Age"
      subtitle="Honest Fitness Benchmark"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Hero Card */}
      <section className="aether-card rounded-3xl p-5 text-center space-y-3">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <p className="tabular-mono text-4xl font-bold text-white">
            {fitnessAge.fitnessAge !== null ? `${fitnessAge.fitnessAge} yrs` : '--'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Calendar Age: {fitnessAge.chronologicalAge} yrs
            {fitnessAge.healthspanPace !== null ? ` · Pace ${fitnessAge.healthspanPace}×` : ''}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">VO2 Max</p>
            <p className="tabular-mono mt-1 text-sm font-bold text-emerald-300">
              {fitnessAge.vo2MaxUsed ?? '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">30d RHR</p>
            <p className="tabular-mono mt-1 text-sm font-bold text-white">
              {fitnessAge.rhr30dAvg ?? '--'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-2.5">
            <p className="text-[10px] text-slate-400">Sleep Rhythm</p>
            <p className="tabular-mono mt-1 text-sm font-bold text-indigo-300">
              {fitnessAge.sleepRegularityPct !== null ? `${fitnessAge.sleepRegularityPct}%` : '--'}
            </p>
          </div>
        </div>

        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-400">
          <strong className="text-slate-200">VO2 Source:</strong> {sourceLabel[fitnessAge.vo2Source]}
        </p>
      </section>

      {/* Interactive Field-Test VO2 Max Calibrator (Upgrade 6) */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Calibrate VO2 Max via Field Test</h2>
            <p className="text-xs text-slate-400">Eliminates resting heart-rate genetic bias</p>
          </div>
        </div>

        {/* Option A: Cooper 12-Minute Run */}
        <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-[#080B10] p-3.5">
          <p className="text-xs font-semibold text-white">Option A: Cooper 12-Minute Run</p>
          <p className="text-[11px] text-slate-400">Max distance covered in 12 minutes (meters)</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={cooperMeters}
              onChange={(e) => setCooperMeters(e.target.value)}
              placeholder="e.g., 2650"
              className="tabular-mono flex-1 rounded-xl border border-white/10 bg-[#0E131C] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={saveCooper}
              className="rounded-xl bg-cyan-500 px-4 text-xs font-bold text-obsidian"
            >
              Calibrate
            </button>
          </div>
        </div>

        {/* Option B: 5 km Time Trial */}
        <div className="space-y-2 rounded-2xl border border-white/[0.07] bg-[#080B10] p-3.5">
          <p className="text-xs font-semibold text-white">Option B: 5 km Time Trial</p>
          <p className="text-[11px] text-slate-400">Your recent hard 5 km run time (minutes & seconds)</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={fiveKMin}
              onChange={(e) => setFiveKMin(e.target.value)}
              placeholder="Min (e.g. 23)"
              className="tabular-mono w-full rounded-xl border border-white/10 bg-[#0E131C] px-3 py-2 text-xs text-white"
            />
            <input
              type="number"
              value={fiveKSec}
              onChange={(e) => setFiveKSec(e.target.value)}
              placeholder="Sec (e.g. 30)"
              className="tabular-mono w-full rounded-xl border border-white/10 bg-[#0E131C] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={saveFiveK}
              className="shrink-0 rounded-xl bg-emerald-500 px-4 text-xs font-bold text-obsidian"
            >
              Save
            </button>
          </div>
        </div>

        {(profile.cooper12MinMeters || profile.fiveKmTimeSeconds) && (
          <button
            type="button"
            onClick={clearFieldTest}
            className="w-full rounded-xl border border-white/10 py-2 text-xs text-slate-400 hover:text-white"
          >
            Clear Field Test Calibration
          </button>
        )}

        {savedMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}
      </section>

      <div className="flex items-start gap-2.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>
          This is a <strong className="text-slate-200">Cardiovascular & Sleep Fitness Benchmark</strong>, not a medical epigenetic aging test. For cellular & metabolic health, track real blood biomarkers inside the Lab Vault.
        </span>
      </div>
    </PageShell>
  );
};
