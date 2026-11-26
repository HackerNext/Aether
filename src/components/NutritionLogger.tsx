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
  { name: '2 Boiled Eggs + Bread', calories: 320, proteinG: 18, carbsG: 30, fatG: 14, mealType: 'breakfast' as const },
  { name: 'Chicken & Rice Plate', calories: 610, proteinG: 44, carbsG: 66, fatG: 17, mealType: 'lunch' as const },
  { name: 'Mutton & Rice Meal', calories: 690, proteinG: 40, carbsG: 64, fatG: 28, mealType: 'dinner' as const },
  { name: 'Protein Shake + Banana', calories: 265, proteinG: 28, carbsG: 31, fatG: 3, mealType: 'snack' as const },
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
  const [calories, setCalories] = useState(450);
  const [proteinG, setProteinG] = useState(30);
  const [carbsG, setCarbsG] = useState(50);
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
      <div className="aether-glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
            <Droplets className="h-4 w-4 text-cyan-400" />
            Hydration
          </span>
          <span className="tabular-mono text-xs text-cyan-300">
            {hydration.waterMl} / {dailyWaterGoalMl} ml ({waterPct}%)
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-cyan-400 transition-all" style={{ width: `${waterPct}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddWater(250)}
            className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200"
          >
            +250 ml Glass
          </button>
          <button
            type="button"
            onClick={() => onAddWater(500)}
            className="tabular-mono rounded-xl border border-cyan-500/25 bg-cyan-500/10 py-2.5 text-xs font-semibold text-cyan-200"
          >
            +500 ml Bottle
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-white">
            <Coffee className="h-4 w-4 text-amber-400" />
            Caffeine
          </span>
          <span className="tabular-mono text-xs text-amber-300">{hydration.caffeineMg} mg today</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAddCaffeine(45)}
            className="tabular-mono rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-200"
          >
            +45 mg Tea / Chai
          </button>
          <button
            type="button"
            onClick={() => onAddCaffeine(95)}
            className="tabular-mono rounded-xl border border-amber-500/25 bg-amber-500/10 py-2.5 text-xs font-semibold text-amber-200"
          >
            +95 mg Coffee
          </button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-0.5 text-xs">
          <span className="font-semibold text-slate-300">Quick Meal Presets</span>
          <span className="tabular-mono text-slate-400">
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
              className="aether-glass rounded-2xl p-3 text-left hover:border-amber-400/35"
            >
              <p className="text-xs font-semibold text-white">{preset.name}</p>
              <p className="tabular-mono mt-1 text-[11px] text-slate-400">
                {preset.calories} kcal • {preset.proteinG}g P
              </p>
            </button>
          ))}
        </div>
      </div>

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
            className="col-span-2 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white placeholder-slate-500"
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
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-xs font-bold text-obsidian disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Log Meal
        </button>
        {loggedFeedback && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Added to Today&apos;s Log</span>
          </div>
        )}
      </form>
    </div>
  );
};
