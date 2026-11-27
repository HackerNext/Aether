import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CheckSquare,
  Coffee,
  Droplets,
  Dumbbell,
  Flame,
  HeartHandshake,
  HeartPulse,
  Plus,
  Sparkles,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react';
import {
  DailyBiometricRecord,
  HabitDefinition,
  HooperWellnessLog,
  MealRecord,
  StrengthExerciseSet,
  UserProfile,
  WorkoutRecord,
} from '../types/health';
import {
  computeMuscularLoadPoints,
  computeWorkoutStrainContribution,
  getTodayDateStr,
} from '../utils/biometricsEngine';
import { HooperWellnessCard } from './HooperWellnessCard';

export interface ManualVitalsPayload {
  restingHrBpm: number | null;
  spo2Pct: number | null;
  steps: number;
  sleepHours: number;
  deepMin: number;
  remMin: number;
  awakeMin: number;
}

export type LogSubTab = 'wellness' | 'habits' | 'training' | 'vitals_food';

interface QuickLogHubProps {
  initialSubTab?: LogSubTab;
  today: DailyBiometricRecord | null;
  profile: UserProfile;
  habitDefinitions: HabitDefinition[];
  onSaveWellness: (log: HooperWellnessLog) => void;
  onToggleHabit: (habitId: string) => void;
  onAddCustomHabit: (label: string, category: HabitDefinition['category']) => void;
  onLogWorkout: (workout: WorkoutRecord) => void;
  onLogMeal: (meal: MealRecord) => void;
  onAddWater: (ml: number) => void;
  onAddCaffeine: (mg: number) => void;
  onSaveManualVitals: (payload: ManualVitalsPayload) => void;
}

const EXERCISE_PRESETS = [
  'Push-Ups (Bodyweight)',
  'Pull-Ups (Bodyweight)',
  'Bodyweight Squats',
  'Plank / Core Hold',
  'Dumbbell Press',
  'Barbell Squat',
  'Romanian Deadlift',
];

const MEAL_PRESETS = [
  { name: '2 Eggs + Bread / Roti', calories: 320, proteinG: 18, carbsG: 30, fatG: 14, mealType: 'breakfast' as const },
  { name: 'Chicken & Rice Plate', calories: 610, proteinG: 44, carbsG: 66, fatG: 17, mealType: 'lunch' as const },
  { name: 'Mutton & Rice Meal', calories: 690, proteinG: 40, carbsG: 64, fatG: 28, mealType: 'dinner' as const },
  { name: 'Milk + Banana / Shake', calories: 280, proteinG: 16, carbsG: 38, fatG: 7, mealType: 'snack' as const },
];

export const QuickLogHub: React.FC<QuickLogHubProps> = ({
  initialSubTab = 'wellness',
  today,
  profile,
  habitDefinitions,
  onSaveWellness,
  onToggleHabit,
  onAddCustomHabit,
  onLogWorkout,
  onLogMeal,
  onAddWater,
  onAddCaffeine,
  onSaveManualVitals,
}) => {
  const [subTab, setSubTab] = useState<LogSubTab>(initialSubTab);

  // Habits state
  const [newHabit, setNewHabit] = useState('');
  const [newHabitCat, setNewHabitCat] = useState<HabitDefinition['category']>('recovery');

  // Training state (Strength Muscular Load + Foster Session RPE Cardio)
  const [trainMode, setTrainMode] = useState<'strength' | 'cardio_srpe'>('strength');
  const [sessionTitle, setSessionTitle] = useState('Upper Bodyweight & Core');
  const [durationMin, setDurationMin] = useState(40);
  const [sessionRpe, setSessionRpe] = useState(7);
  const [peakHrInput, setPeakHrInput] = useState('');
  const [exerciseName, setExerciseName] = useState(EXERCISE_PRESETS[0]);
  const [sets, setSets] = useState(4);
  const [reps, setReps] = useState(12);
  const [loadKg, setLoadKg] = useState(20);
  const [isBodyweight, setIsBodyweight] = useState(true);
  const [rpe, setRpe] = useState(8);
  const [queuedSets, setQueuedSets] = useState<StrengthExerciseSet[]>([]);
  const [trainSaved, setTrainSaved] = useState(false);

  // Vitals & Food state
  const [mealName, setMealName] = useState('');
  const [mealKcal, setMealKcal] = useState(450);
  const [mealProt, setMealProt] = useState(30);
  const [rhr, setRhr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [steps, setSteps] = useState('');
  const [sleepHrs, setSleepHrs] = useState('');
  const [deepMin, setDeepMin] = useState('90');
  const [remMin, setRemMin] = useState('95');
  const [awakeMin, setAwakeMin] = useState('18');
  const [vitalsSaved, setVitalsSaved] = useState(false);

  const todayDate = today?.date ?? getTodayDateStr();
  const loggedHabits = today?.habitsLogged ?? [];
  const waterMl = today?.hydration.waterMl ?? 0;
  const caffMg = today?.hydration.caffeineMg ?? 0;

  const previewMusc = useMemo(
    () => computeMuscularLoadPoints(sets, reps, loadKg, isBodyweight, rpe, profile.bodyWeightKg),
    [sets, reps, loadKg, isBodyweight, rpe, profile.bodyWeightKg]
  );

  const commitWorkout = () => {
    if (trainMode === 'cardio_srpe') {
      const z = {
        zone1: Math.round(durationMin * 0.15),
        zone2: Math.round(durationMin * (sessionRpe <= 6 ? 0.55 : 0.3)),
        zone3: Math.round(durationMin * (sessionRpe >= 7 ? 0.35 : 0.2)),
        zone4: Math.round(durationMin * (sessionRpe >= 8 ? 0.15 : 0.08)),
        zone5: Math.round(durationMin * (sessionRpe >= 9 ? 0.05 : 0.02)),
      };
      const peak = peakHrInput ? Number(peakHrInput) : 0;
      onLogWorkout({
        id: `wk_${Date.now()}`,
        date: todayDate,
        timestampIso: new Date().toISOString(),
        title: sessionTitle.trim() || 'Cardio / Sport Session',
        category: 'cardio',
        durationMin,
        avgHrBpm: peak > 0 ? Math.round(peak * 0.82) : 0,
        maxHrBpm: peak,
        activeCaloriesKcal: Math.round(durationMin * (4.5 + sessionRpe * 0.8)),
        hrZones: z,
        sessionRpe,
        muscularLoadPoints: Math.round(durationMin * sessionRpe * 0.08),
        computedStrainContribution: computeWorkoutStrainContribution(z, Math.round(durationMin * sessionRpe * 0.08), durationMin, sessionRpe),
        source: `Session RPE (${sessionRpe}/10)`,
      });
    } else {
      const activeSets =
        queuedSets.length > 0
          ? queuedSets
          : [
              {
                id: `ex_${Date.now()}`,
                exerciseName: exerciseName.trim() || 'Strength Set',
                sets,
                reps,
                loadKg: isBodyweight ? 0 : loadKg,
                isBodyweight,
                rpe,
                muscularLoadPoints: previewMusc,
              },
            ];
      const muscSum = Number(activeSets.reduce((s, x) => s + x.muscularLoadPoints, 0).toFixed(1));
      const z = {
        zone1: Math.round(durationMin * 0.3),
        zone2: Math.round(durationMin * 0.35),
        zone3: Math.round(durationMin * 0.22),
        zone4: Math.round(durationMin * 0.1),
        zone5: Math.round(durationMin * 0.03),
      };
      onLogWorkout({
        id: `wk_${Date.now()}`,
        date: todayDate,
        timestampIso: new Date().toISOString(),
        title: sessionTitle.trim() || 'Strength Session',
        category: 'strength',
        durationMin,
        avgHrBpm: 0,
        maxHrBpm: peakHrInput ? Number(peakHrInput) : 0,
        activeCaloriesKcal: Math.round(durationMin * 6 + muscSum * 1.1),
        hrZones: z,
        sessionRpe: rpe,
        muscularLoadPoints: muscSum,
        strengthSets: activeSets,
        computedStrainContribution: computeWorkoutStrainContribution(z, muscSum, durationMin, rpe),
        source: 'Strength & Muscular Engine',
      });
      setQueuedSets([]);
    }
    setPeakHrInput('');
    setTrainSaved(true);
    setTimeout(() => setTrainSaved(false), 2400);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white">Daily Log</h1>
        <p className="text-xs text-slate-400">Clean, structured logging — updates all scores immediately</p>
      </div>

      {/* 4-Pill Segmented Sub-Tab Switcher */}
      <div className="aether-card grid grid-cols-4 gap-1 rounded-2xl p-1">
        {(
          [
            { id: 'wellness', label: 'Wellness', icon: HeartHandshake, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
            { id: 'habits', label: 'Habits', icon: CheckSquare, cls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
            { id: 'training', label: 'Training', icon: Dumbbell, cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
            { id: 'vitals_food', label: 'Vitals', icon: HeartPulse, cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[11px] font-semibold transition ${
                active ? t.cls : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: 15-Second Morning Hooper Wellness */}
      {subTab === 'wellness' && (
        <HooperWellnessCard existing={today?.wellness ?? null} onSave={onSaveWellness} />
      )}

      {/* SUB-TAB 2: Daily Habits */}
      {subTab === 'habits' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {habitDefinitions.map((h) => {
              const active = loggedHabits.includes(h.id);
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onToggleHabit(h.id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                    active
                      ? 'border-emerald-400/45 bg-emerald-500/15 text-white'
                      : 'border-white/[0.08] bg-[#0E131C] text-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-xs font-semibold">{h.label}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{h.category}</p>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                      active ? 'border-emerald-400 bg-emerald-400 text-obsidian' : 'border-white/20 text-transparent'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newHabit.trim()) return;
              onAddCustomHabit(newHabit.trim(), newHabitCat);
              setNewHabit('');
            }}
            className="aether-card space-y-2.5 rounded-3xl p-4"
          >
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              Add Custom Habit Factor
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="e.g., Cold Shower, Creatine 5g"
                className="flex-1 rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white placeholder-slate-500"
              />
              <select
                value={newHabitCat}
                onChange={(e) => setNewHabitCat(e.target.value as HabitDefinition['category'])}
                className="rounded-xl border border-white/10 bg-[#080B10] px-2 text-xs text-slate-200"
              >
                <option value="recovery">Recovery</option>
                <option value="sleep">Sleep</option>
                <option value="nutrition">Nutrition</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
              <button
                type="submit"
                disabled={!newHabit.trim()}
                className="rounded-xl bg-cyan-500 px-3 text-obsidian disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: Training (Strength Muscular Load + Foster Session RPE Cardio) */}
      {subTab === 'training' && (
        <div className="aether-card space-y-4 rounded-3xl p-4">
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-white/[0.06] bg-[#080B10] p-1">
            <button
              type="button"
              onClick={() => {
                setTrainMode('strength');
                setSessionTitle('Strength & Muscular Session');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold ${
                trainMode === 'strength' ? 'bg-indigo-500/25 text-indigo-200' : 'text-slate-400'
              }`}
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Strength Sets
            </button>
            <button
              type="button"
              onClick={() => {
                setTrainMode('cardio_srpe');
                setSessionTitle('Football / Cycling / Run');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold ${
                trainMode === 'cardio_srpe' ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-400'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              Cardio (sRPE)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] text-slate-400">Session Title</label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400">Minutes</label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMin}
                onChange={(e) => setDurationMin(Math.max(5, Number(e.target.value)))}
                className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {trainMode === 'cardio_srpe' ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/[0.06] bg-[#080B10] p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">Foster Session RPE (Overall Effort)</span>
                  <span className="tabular-mono font-bold text-cyan-300">{sessionRpe} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={sessionRpe}
                  onChange={(e) => setSessionRpe(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <p className="text-[11px] text-slate-400">
                  Captures sprints, football bursts, and climbs even if wrist optical HR lags.
                </p>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Optional Observed Peak HR (bpm)</label>
                <input
                  type="number"
                  min={100}
                  max={220}
                  value={peakHrInput}
                  onChange={(e) => setPeakHrInput(e.target.value)}
                  placeholder="Auto-updates your Max HR if higher"
                  className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400">Exercise</label>
                <input
                  type="text"
                  list="aether-ex-list"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
                />
                <datalist id="aether-ex-list">
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
                    className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
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
                    className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">{isBodyweight ? 'Mode' : 'Load (kg)'}</label>
                  {isBodyweight ? (
                    <div className="tabular-mono mt-1 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
                      BW {profile.bodyWeightKg}kg
                    </div>
                  ) : (
                    <input
                      type="number"
                      min={2}
                      max={400}
                      value={loadKg}
                      onChange={(e) => setLoadKg(Math.max(0, Number(e.target.value)))}
                      className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={isBodyweight}
                    onChange={(e) => setIsBodyweight(e.target.checked)}
                    className="h-4 w-4 accent-indigo-400"
                  />
                  Bodyweight
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">RPE</span>
                  <input
                    type="range"
                    min={5}
                    max={10}
                    step={0.5}
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="w-24 accent-indigo-400"
                  />
                  <span className="tabular-mono font-bold text-indigo-300">{rpe}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!exerciseName.trim()) return;
                  setQueuedSets((prev) => [
                    ...prev,
                    {
                      id: `ex_${Date.now()}`,
                      exerciseName: exerciseName.trim(),
                      sets,
                      reps,
                      loadKg: isBodyweight ? 0 : loadKg,
                      isBodyweight,
                      rpe,
                      muscularLoadPoints: previewMusc,
                    },
                  ]);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Queue Exercise (+{previewMusc} pts)
              </button>

              {queuedSets.length > 0 && (
                <div className="space-y-1.5">
                  {queuedSets.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-[#080B10] px-3 py-2 text-xs"
                    >
                      <span className="text-slate-200">
                        {item.exerciseName} ({item.sets}×{item.reps})
                      </span>
                      <button
                        type="button"
                        onClick={() => setQueuedSets((p) => p.filter((x) => x.id !== item.id))}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={commitWorkout}
            className="w-full rounded-2xl bg-cyan-500 py-3.5 text-xs font-bold text-obsidian shadow-cyanGlow"
          >
            Log Session & Update Dual Strain
          </button>

          {trainSaved && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
              <Zap className="h-4 w-4" />
              <span>Logged! Dual Strain & EWMA updated.</span>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: Vitals, Hydration & Nutrition */}
      {subTab === 'vitals_food' && (
        <div className="space-y-4">
          {/* Quick Water & Caffeine */}
          <div className="aether-card rounded-3xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                <Droplets className="h-4 w-4 text-cyan-400" />
                Hydration & Caffeine
              </span>
              <span className="tabular-mono text-cyan-300">
                {waterMl} ml · {caffMg} mg
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAddWater(250)}
                className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200"
              >
                +250 ml Water
              </button>
              <button
                type="button"
                onClick={() => onAddWater(500)}
                className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200"
              >
                +500 ml Bottle
              </button>
              <button
                type="button"
                onClick={() => onAddCaffeine(45)}
                className="tabular-mono inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-200"
              >
                <Coffee className="h-3.5 w-3.5" /> +45 mg Tea
              </button>
              <button
                type="button"
                onClick={() => onAddCaffeine(95)}
                className="tabular-mono inline-flex items-center justify-center gap-1 rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-200"
              >
                <Coffee className="h-3.5 w-3.5" /> +95 mg Coffee
              </button>
            </div>
          </div>

          {/* Quick Meal Logging */}
          <div className="aether-card rounded-3xl p-4 space-y-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
              <Utensils className="h-4 w-4 text-amber-400" />
              Quick Meal Entry
            </p>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() =>
                    onLogMeal({
                      id: `meal_${Date.now()}`,
                      date: todayDate,
                      timestampIso: new Date().toISOString(),
                      ...p,
                    })
                  }
                  className="rounded-2xl border border-white/[0.07] bg-[#080B10] p-3 text-left hover:border-amber-400/40"
                >
                  <p className="text-xs font-semibold text-white">{p.name}</p>
                  <p className="tabular-mono mt-0.5 text-[11px] text-slate-400">
                    {p.calories} kcal · {p.proteinG}g P
                  </p>
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!mealName.trim()) return;
                onLogMeal({
                  id: `meal_${Date.now()}`,
                  date: todayDate,
                  timestampIso: new Date().toISOString(),
                  name: mealName.trim(),
                  mealType: 'lunch',
                  calories: mealKcal,
                  proteinG: mealProt,
                  carbsG: Math.round((mealKcal - mealProt * 4) / 6),
                  fatG: Math.round((mealKcal - mealProt * 4) / 24),
                });
                setMealName('');
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="Custom meal…"
                className="flex-1 rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                value={mealKcal}
                onChange={(e) => setMealKcal(Math.max(0, Number(e.target.value)))}
                className="tabular-mono w-20 rounded-xl border border-white/10 bg-[#080B10] px-2.5 py-2 text-xs text-white"
                aria-label="Calories"
              />
              <button
                type="submit"
                disabled={!mealName.trim()}
                className="rounded-xl bg-amber-400 px-3 text-xs font-bold text-obsidian disabled:opacity-40"
              >
                Add
              </button>
            </form>
          </div>

          {/* Manual Watch Vitals Entry */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSaveManualVitals({
                restingHrBpm: rhr ? Number(rhr) : null,
                spo2Pct: spo2 ? Number(spo2) : null,
                steps: steps ? Number(steps) : 0,
                sleepHours: sleepHrs ? Number(sleepHrs) : 0,
                deepMin: deepMin ? Number(deepMin) : 0,
                remMin: remMin ? Number(remMin) : 0,
                awakeMin: awakeMin ? Number(awakeMin) : 0,
              });
              setVitalsSaved(true);
              setTimeout(() => setVitalsSaved(false), 2200);
            }}
            className="aether-card rounded-3xl p-4 space-y-3"
          >
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
              <HeartPulse className="h-4 w-4 text-emerald-400" />
              Manual Watch Vitals & Sleep
            </p>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={rhr}
                onChange={(e) => setRhr(e.target.value)}
                placeholder="RHR bpm"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                step="0.1"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value)}
                placeholder="SpO2 %"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="Steps"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.1"
                value={sleepHrs}
                onChange={(e) => setSleepHrs(e.target.value)}
                placeholder="Sleep hours (e.g. 7.5)"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                value={awakeMin}
                onChange={(e) => setAwakeMin(e.target.value)}
                placeholder="Awake min"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                value={deepMin}
                onChange={(e) => setDeepMin(e.target.value)}
                placeholder="Deep min"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
              <input
                type="number"
                value={remMin}
                onChange={(e) => setRemMin(e.target.value)}
                placeholder="REM min"
                className="tabular-mono rounded-xl border border-white/10 bg-[#080B10] px-3 py-2 text-xs text-white"
              />
            </div>
            <button type="submit" className="w-full rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-obsidian">
              Save Manual Vitals
            </button>
            {vitalsSaved && (
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Vitals saved!
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
};
