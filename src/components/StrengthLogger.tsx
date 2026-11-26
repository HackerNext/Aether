import React, { useMemo, useState } from 'react';
import { Dumbbell, Plus, Trash2, Zap } from 'lucide-react';
import { StrengthExerciseSet, WorkoutRecord } from '../types/health';
import { computeMuscularLoadPoints, computeWorkoutStrainContribution } from '../utils/biometricsEngine';

interface StrengthLoggerProps {
  userBodyWeightKg: number;
  todayDate: string;
  onLogWorkout: (workout: WorkoutRecord) => void;
}

const EXERCISE_PRESETS = [
  'Push-Ups (Bodyweight)',
  'Pull-Ups (Bodyweight)',
  'Resistance Band Rows',
  'Bodyweight Squats',
  'Barbell Back Squat',
  'Bench Press',
  'Romanian Deadlift',
  'Plank / Core Hold',
];

export const StrengthLogger: React.FC<StrengthLoggerProps> = ({
  userBodyWeightKg,
  todayDate,
  onLogWorkout,
}) => {
  const [sessionTitle, setSessionTitle] = useState('Strength & Muscular Session');
  const [durationMin, setDurationMin] = useState(40);
  const [exerciseName, setExerciseName] = useState(EXERCISE_PRESETS[0]);
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(12);
  const [loadKg, setLoadKg] = useState(20);
  const [isBodyweight, setIsBodyweight] = useState(true);
  const [rpe, setRpe] = useState(8);
  const [queuedSets, setQueuedSets] = useState<StrengthExerciseSet[]>([]);
  const [savedToast, setSavedToast] = useState(false);

  const previewPoints = useMemo(
    () => computeMuscularLoadPoints(sets, reps, loadKg, isBodyweight, rpe, userBodyWeightKg),
    [sets, reps, loadKg, isBodyweight, rpe, userBodyWeightKg]
  );

  const totalMuscularLoad = useMemo(
    () => Number(queuedSets.reduce((s, item) => s + item.muscularLoadPoints, 0).toFixed(1)),
    [queuedSets]
  );

  const addExercise = () => {
    if (!exerciseName.trim()) return;
    setQueuedSets((prev) => [
      ...prev,
      {
        id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        exerciseName: exerciseName.trim(),
        sets,
        reps,
        loadKg: isBodyweight ? 0 : loadKg,
        isBodyweight,
        rpe,
        muscularLoadPoints: previewPoints,
      },
    ]);
  };

  const commitSession = () => {
    const activeSets =
      queuedSets.length > 0
        ? queuedSets
        : [
            {
              id: `ex_${Date.now()}`,
              exerciseName: exerciseName.trim() || 'Strength Exercise',
              sets,
              reps,
              loadKg: isBodyweight ? 0 : loadKg,
              isBodyweight,
              rpe,
              muscularLoadPoints: previewPoints,
            },
          ];

    const muscularSum = Number(activeSets.reduce((s, item) => s + item.muscularLoadPoints, 0).toFixed(1));
    const zones = {
      zone1: Math.round(durationMin * 0.28),
      zone2: Math.round(durationMin * 0.36),
      zone3: Math.round(durationMin * 0.24),
      zone4: Math.round(durationMin * 0.1),
      zone5: Math.round(durationMin * 0.02),
    };

    onLogWorkout({
      id: `wk_${Date.now()}`,
      date: todayDate,
      timestampIso: new Date().toISOString(),
      title: sessionTitle.trim() || 'Strength Session',
      category: 'strength',
      durationMin,
      avgHrBpm: 118 + Math.round(rpe * 1.8),
      maxHrBpm: 148 + Math.round(rpe * 2.2),
      activeCaloriesKcal: Math.round(durationMin * 6.5 + muscularSum * 1.2),
      hrZones: zones,
      muscularLoadPoints: muscularSum,
      strengthSets: activeSets,
      computedStrainContribution: computeWorkoutStrainContribution(zones, muscularSum),
      source: 'Manual Strength Log',
    });

    setQueuedSets([]);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-white">Strength & Muscular Load Logger</h3>
        <p className="text-xs text-slate-400">Adds accurate muscular strain to your 0–21 Strain gauge</p>
      </div>

      <div className="aether-glass space-y-3 rounded-2xl p-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className="text-[11px] text-slate-400">Session Title</label>
            <input
              type="text"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Minutes</label>
            <input
              type="number"
              min={5}
              max={240}
              value={durationMin}
              onChange={(e) => setDurationMin(Math.max(5, Number(e.target.value)))}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-slate-400">Exercise Name</label>
          <input
            type="text"
            list="exercise-presets"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
          />
          <datalist id="exercise-presets">
            {EXERCISE_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-slate-400">Sets</label>
            <input
              type="number"
              min={1}
              max={20}
              value={sets}
              onChange={(e) => setSets(Math.max(1, Number(e.target.value)))}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Reps</label>
            <input
              type="number"
              min={1}
              max={100}
              value={reps}
              onChange={(e) => setReps(Math.max(1, Number(e.target.value)))}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">{isBodyweight ? 'Mode' : 'Load (kg)'}</label>
            {isBodyweight ? (
              <div className="tabular-mono mt-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
                BW ({userBodyWeightKg}kg)
              </div>
            ) : (
              <input
                type="number"
                min={2}
                max={400}
                value={loadKg}
                onChange={(e) => setLoadKg(Math.max(0, Number(e.target.value)))}
                className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={isBodyweight}
              onChange={(e) => setIsBodyweight(e.target.checked)}
              className="h-4 w-4 accent-cyan-400"
            />
            Bodyweight
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">RPE</span>
            <input
              type="range"
              min={5}
              max={10}
              step={0.5}
              value={rpe}
              onChange={(e) => setRpe(Number(e.target.value))}
              className="w-24 accent-cyan-400"
            />
            <span className="tabular-mono w-7 text-right text-xs font-bold text-cyan-300">{rpe}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs">
          <span className="text-slate-400">Computed Muscular Load</span>
          <span className="tabular-mono font-bold text-cyan-300">+{previewPoints} pts</span>
        </div>

        <button
          type="button"
          onClick={addExercise}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.05] py-2.5 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Exercise to Queue
        </button>
      </div>

      {queuedSets.length > 0 && (
        <div className="aether-glass space-y-2 rounded-2xl p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">Queued ({queuedSets.length})</span>
            <span className="tabular-mono font-bold text-cyan-300">{totalMuscularLoad} pts</span>
          </div>
          {queuedSets.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-xs">
              <div>
                <p className="font-medium text-white">{item.exerciseName}</p>
                <p className="tabular-mono text-[11px] text-slate-400">
                  {item.sets}×{item.reps} • {item.isBodyweight ? 'Bodyweight' : `${item.loadKg}kg`} • RPE {item.rpe}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQueuedSets((prev) => prev.filter((x) => x.id !== item.id))}
                className="p-1 text-slate-500 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={commitSession}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-3 text-xs font-bold text-obsidian shadow-cyanGlow"
      >
        <Dumbbell className="h-4 w-4" />
        <span>Log Strength Workout & Update Strain</span>
      </button>

      {savedToast && (
        <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 text-xs font-semibold text-emerald-300">
          <Zap className="h-3.5 w-3.5" />
          <span>Saved! Strain ring & Today&apos;s Log updated.</span>
        </div>
      )}
    </div>
  );
};
