import React, { useState } from 'react';
import { CheckCircle2, HeartHandshake } from 'lucide-react';
import { HooperWellnessLog } from '../types/health';
import { buildHooperWellness } from '../utils/biometricsEngine';

interface HooperWellnessCardProps {
  existing: HooperWellnessLog | null;
  onSave: (log: HooperWellnessLog) => void;
}

interface ScaleRowProps {
  title: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  invertedGood?: boolean; // true when higher number is worse (stress, soreness)
  onChange: (v: number) => void;
}

const PillScaleRow: React.FC<ScaleRowProps> = ({
  title,
  lowLabel,
  highLabel,
  value,
  invertedGood = false,
  onChange,
}) => {
  return (
    <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white">{title}</span>
        <span className="tabular-mono text-xs font-bold text-emerald-300">{value} / 7</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => {
          const active = value === n;
          let activeClass = 'bg-emerald-500 text-obsidian border-emerald-400';
          if (invertedGood) {
            if (n >= 5) activeClass = 'bg-rose-500 text-white border-rose-400';
            else if (n >= 3) activeClass = 'bg-amber-400 text-obsidian border-amber-300';
          } else {
            if (n <= 2) activeClass = 'bg-rose-500 text-white border-rose-400';
            else if (n <= 4) activeClass = 'bg-amber-400 text-obsidian border-amber-300';
          }
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`tabular-mono rounded-xl border py-2 text-xs font-bold transition active:scale-95 ${
                active
                  ? activeClass
                  : 'border-white/[0.08] bg-[#080B10] text-slate-400 hover:border-white/20 hover:text-white'
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span>1 · {lowLabel}</span>
        <span>7 · {highLabel}</span>
      </div>
    </div>
  );
};

export const HooperWellnessCard: React.FC<HooperWellnessCardProps> = ({ existing, onSave }) => {
  const [sleepQuality, setSleepQuality] = useState(existing?.sleepQuality ?? 5);
  const [freshness, setFreshness] = useState(existing?.freshness ?? 5);
  const [stress, setStress] = useState(existing?.stress ?? 2);
  const [soreness, setSoreness] = useState(existing?.soreness ?? 2);
  const [savedToast, setSavedToast] = useState(false);

  const preview = buildHooperWellness(sleepQuality, freshness, stress, soreness);

  const handleSave = () => {
    onSave(preview);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  return (
    <div className="space-y-4">
      <div className="aether-card rounded-3xl p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">15-Second Morning Check-In</h3>
              <p className="text-xs text-slate-400">Hooper Wellness Index • Catches soreness & stress</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#080B10] px-3 py-1.5 text-right">
            <p className="tabular-mono text-sm font-bold text-white">{preview.wellnessScore}</p>
            <p className="text-[9px] uppercase tracking-wider text-slate-400">Wellness</p>
          </div>
        </div>

        <div className="space-y-3">
          <PillScaleRow
            title="Sleep Quality"
            lowLabel="Restless"
            highLabel="Deep & Restorative"
            value={sleepQuality}
            onChange={setSleepQuality}
          />
          <PillScaleRow
            title="Morning Freshness & Energy"
            lowLabel="Exhausted"
            highLabel="Fresh & Ready"
            value={freshness}
            onChange={setFreshness}
          />
          <PillScaleRow
            title="Mental / Exam / Work Stress"
            lowLabel="Calm"
            highLabel="Overwhelmed"
            value={stress}
            invertedGood
            onChange={setStress}
          />
          <PillScaleRow
            title="Muscle Soreness (DOMS)"
            lowLabel="None"
            highLabel="Very Sore"
            value={soreness}
            invertedGood
            onChange={setSoreness}
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-2xl bg-emerald-500 py-3.5 text-xs font-bold text-obsidian shadow-emeraldGlow transition hover:bg-emerald-400 active:scale-[0.99]"
        >
          {existing ? 'Update Today’s Morning Check-In' : 'Save Morning Check-In (Updates Recovery)'}
        </button>

        {savedToast && (
          <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>Saved! Recovery Score & Perception Guard updated.</span>
          </div>
        )}
      </div>
    </div>
  );
};
