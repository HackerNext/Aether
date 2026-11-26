import React, { useState } from 'react';
import { Coffee, Droplets, Plus, Utensils, CheckCircle2 } from 'lucide-react';
import { HydrationCaffeineLog, MealRecord } from '../types/health';

interface NutritionLoggerProps {
  todayDate: string;
  hydration: HydrationCaffeineLog;
  dailyWaterGoalMl: number;
  dailyCalorieGoal: number;
  todayCalories: number;
  onAddWater: (ml: number) => void;
  onAddCaffeine: (mg: number) => void;
  onLogMeal: (meal: MealRecord) => void;
}

const QUICK_MEAL_PRESETS = [
  { name: 'Whey Isolate Shake + Banana', calories: 265, proteinG: 28, carbsG: 31, fatG: 3, mealType: 'snack' as const },
  { name: '3 Eggs, Sourdough & Avocado', calories: 520, proteinG: 26, carbsG: 36, fatG: 29, mealType: 'breakfast' as const },
  { name: 'Paneer / Chicken Rice Bowl', calories: 640, proteinG: 46, carbsG: 64, fatG: 19, mealType: 'lunch' as const },
  { name: 'Salmon, Quinoa & Greens', calories: 590, proteinG: 42, carbsG: 44, fatG: 24, mealType: 'dinner' as const },
];

export const NutritionLogger: React.FC<NutritionLoggerProps> = ({
  todayDate,
  hydration,
  dailyWaterGoalMl,
  dailyCalorieGoal,
  todayCalories,
  onAddWater,
  onAddCaffeine,
  onLogMeal,
}) => {
  const [name, setName] = useState('');
  const [mealType, setMealType] = useState<MealRecord['mealType']>('lunch');
  const [calories, setCalories] = useState(480);
  const [proteinG, setProteinG] = useState(35);
  const [carbsG, setCarbsG] = useState(45);
  const [fatG, setFatG] = useState(14);
  const [loggedFeedback, setLoggedFeedback] = useState(false);

  const waterPct = Math.min(100, Math.round((hydration.waterMl / Math.max(1, dailyWaterGoalMl)) * 100));
  const calPct = Math.min(100, Math.round((todayCalories / Math.max(1, dailyCalorieGoal)) * 100));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogMeal({
      id: `meal_${Date.now()}`,
      date: todayDate,
      timestampIso: new Date().toISOString(),
      name: name.trim(),
      mealType,
      calories,
      proteinG,
      carbsG,
      fatG,
    });
    setName('');
    setLoggedFeedback(true);
    setTimeout(() => setLoggedFeedback(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Water & Caffeine Quick-Add Strip */}
      <div className="aether-glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">Hydration</span>
          </div>
          <span className="tabular-mono text-xs text-cyan-300">
            {hydration.waterMl} / {dailyWaterGoalMl} ml ({waterPct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${waterPct}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddWater(250)}
            className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 active:scale-[0.98]"
          >
            +250 ml Glass
          </button>
          <button
            type="button"
            onClick={() => onAddWater(500)}
            className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 active:scale-[0.98]"
          >
            +500 ml Bottle
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-white">Caffeine</span>
          </div>
          <span className="tabular-mono text-xs text-amber-300">{hydration.caffeineMg} mg today</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddCaffeine(80)}
            className="tabular-mono rounded-xl border border-amber-500/25 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 active:scale-[0.98]"
          >
            +80 mg Espresso
          </button>
          <button
            type="button"
            onClick={() => onAddCaffeine(120)}
            className="tabular-mono rounded-xl border border-amber-500/25 bg-amber-500/10 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 active:scale-[0.98]"
          >
            +120 mg Coffee
          </button>
        </div>
      </div>

      {/* Smart Meal Presets */}
      <div>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            One-Tap Meal Presets
          </span>
          <span className="tabular-mono text-[11px] text-slate-400">
            {todayCalories} / {dailyCalorieGoal} kcal ({calPct}%)
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_MEAL_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                onLogMeal({
                  id: `meal_${Date.now()}`,
                  date: todayDate,
                  timestampIso: new Date().toISOString(),
                  ...preset,
                });
                setLoggedFeedback(true);
                setTimeout(() => setLoggedFeedback(false), 1800);
              }}
              className="aether-glass rounded-2xl p-3 text-left transition hover:border-amber-400/35 active:scale-[0.98]"
            >
              <p className="text-xs font-medium text-white line-clamp-1">{preset.name}</p>
              <p className="tabular-mono mt-1 text-[11px] text-slate-400">
                {preset.calories} kcal • {preset.proteinG}g P
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Macro Entry */}
      <form onSubmit={handleSubmit} className="aether-glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <Utensils className="h-3.5 w-3.5 text-amber-400" />
          <span>Custom Meal Entry</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meal name…"
            className="col-span-2 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400/50 focus:outline-none"
          />
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealRecord['mealType'])}
            className="rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-slate-200"
          >
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'kcal', val: calories, set: setCalories },
            { label: 'Prot (g)', val: proteinG, set: setProteinG },
            { label: 'Carb (g)', val: carbsG, set: setCarbsG },
            { label: 'Fat (g)', val: fatG, set: setFatG },
          ].map((f) => (
            <div key={f.label}>
              <label className="text-[10px] text-slate-400">{f.label}</label>
              <input
                type="number"
                min={0}
                value={f.val}
                onChange={(e) => f.set(Math.max(0, Number(e.target.value)))}
                className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-2.5 py-2 text-xs text-white"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-obsidian transition hover:bg-amber-300 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Log Meal
        </button>

        {loggedFeedback && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Added to Today&apos;s Timeline</span>
          </div>
        )}
      </form>
    </div>
  );
};
