import React, { useState } from 'react';
import { CheckCircle2, HeartPulse } from 'lucide-react';

export interface ManualVitalsPayload {
  restingHrBpm: number | null;
  spo2Pct: number | null;
  steps: number;
  sleepHours: number;
  deepMin: number;
  remMin: number;
  awakeMin: number;
}

interface ManualVitalsLoggerProps {
  onSaveVitals: (payload: ManualVitalsPayload) => void;
}

export const ManualVitalsLogger: React.FC<ManualVitalsLoggerProps> = ({ onSaveVitals }) => {
  const [rhr, setRhr] = useState<string>('56');
  const [spo2, setSpo2] = useState<string>('98');
  const [steps, setSteps] = useState<string>('6500');
  const [sleepHours, setSleepHours] = useState<string>('7.5');
  const [deepMin, setDeepMin] = useState<string>('95');
  const [remMin, setRemMin] = useState<string>('100');
  const [awakeMin, setAwakeMin] = useState<string>('20');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveVitals({
      restingHrBpm: rhr ? Number(rhr) : null,
      spo2Pct: spo2 ? Number(spo2) : null,
      steps: steps ? Math.max(0, Number(steps)) : 0,
      sleepHours: sleepHours ? Math.max(0, Number(sleepHours)) : 0,
      deepMin: deepMin ? Math.max(0, Number(deepMin)) : 0,
      remMin: remMin ? Math.max(0, Number(remMin)) : 0,
      awakeMin: awakeMin ? Math.max(0, Number(awakeMin)) : 0,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <form onSubmit={handleSubmit} className="aether-glass space-y-3.5 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-emerald-400" />
        <div>
          <h3 className="text-sm font-semibold text-white">Manual Vitals & Sleep Entry</h3>
          <p className="text-xs text-slate-400">Enter readings straight from your watch if not synced yet</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[11px] text-slate-400">Resting HR (bpm)</label>
          <input
            type="number"
            min={35}
            max={120}
            value={rhr}
            onChange={(e) => setRhr(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">SpO2 (%)</label>
          <input
            type="number"
            step="0.1"
            min={85}
            max={100}
            value={spo2}
            onChange={(e) => setSpo2(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">Steps</label>
          <input
            type="number"
            min={0}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-400">Total Sleep (hours)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={16}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">Awake in Bed (min)</label>
          <input
            type="number"
            min={0}
            value={awakeMin}
            onChange={(e) => setAwakeMin(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">Deep Sleep (min)</label>
          <input
            type="number"
            min={0}
            value={deepMin}
            onChange={(e) => setDeepMin(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-400">REM Sleep (min)</label>
          <input
            type="number"
            min={0}
            value={remMin}
            onChange={(e) => setRemMin(e.target.value)}
            className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-obsidian shadow-emeraldGlow"
      >
        Save Today&apos;s Vitals & Recalculate Scores
      </button>

      {saved && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Saved! Today&apos;s Recovery, Sleep & Bio Age updated.</span>
        </div>
      )}
    </form>
  );
};
