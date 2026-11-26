import React from 'react';
import { Dumbbell, Flame, Utensils, Droplets, CheckCircle, Trash2 } from 'lucide-react';
import { DailyBiometricRecord, HabitDefinition } from '../types/health';

interface TimelineFeedProps {
  today: DailyBiometricRecord;
  habitDefinitions: HabitDefinition[];
  onDeleteWorkout: (workoutId: string) => void;
  onDeleteMeal: (mealId: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const TimelineFeed: React.FC<TimelineFeedProps> = ({
  today,
  habitDefinitions,
  onDeleteWorkout,
  onDeleteMeal,
}) => {
  const activeHabits = habitDefinitions.filter((h) => today.habitsLogged.includes(h.id));
  const totalKcal = today.meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = today.meals.reduce((s, m) => s + m.proteinG, 0);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Today&apos;s Timeline
        </h2>
        <span className="tabular-mono text-[11px] text-slate-500">
          {today.workouts.length} workouts • {today.meals.length} meals
        </span>
      </div>

      {/* Logged Workouts with 5-Zone HR Breakdown Bars */}
      {today.workouts.map((w) => {
        const totalZoneMin =
          w.hrZones.zone1 + w.hrZones.zone2 + w.hrZones.zone3 + w.hrZones.zone4 + w.hrZones.zone5 || 1;
        return (
          <div key={w.id} className="aether-glass rounded-2xl p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  {w.category === 'strength' ? (
                    <Dumbbell className="h-4 w-4" />
                  ) : (
                    <Flame className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{w.title}</p>
                  <p className="tabular-mono text-[11px] text-slate-400">
                    {formatTime(w.timestampIso)} • {w.durationMin}m • Avg {w.avgHrBpm} bpm
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tabular-mono rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                  +{w.computedStrainContribution.toFixed(1)}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteWorkout(w.id)}
                  className="p-1 text-slate-500 transition hover:text-rose-400"
                  aria-label="Delete workout"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* HR Zones 1-5 Bar */}
            <div className="mt-3">
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div style={{ width: `${(w.hrZones.zone1 / totalZoneMin) * 100}%` }} className="bg-slate-400" />
                <div style={{ width: `${(w.hrZones.zone2 / totalZoneMin) * 100}%` }} className="bg-cyan-400" />
                <div style={{ width: `${(w.hrZones.zone3 / totalZoneMin) * 100}%` }} className="bg-emerald-400" />
                <div style={{ width: `${(w.hrZones.zone4 / totalZoneMin) * 100}%` }} className="bg-amber-400" />
                <div style={{ width: `${(w.hrZones.zone5 / totalZoneMin) * 100}%` }} className="bg-rose-500" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  HR Zones 1–5 ({w.activeCaloriesKcal} kcal)
                </span>
                {w.muscularLoadPoints > 0 && (
                  <span className="tabular-mono text-cyan-300">
                    Muscular Load: {w.muscularLoadPoints} pts
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Meals */}
      {today.meals.map((meal) => (
        <div key={meal.id} className="aether-glass flex items-center justify-between rounded-2xl p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Utensils className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{meal.name}</p>
              <p className="tabular-mono text-[11px] text-slate-400">
                {formatTime(meal.timestampIso)} • P {meal.proteinG}g • C {meal.carbsG}g • F {meal.fatG}g
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="tabular-mono text-xs font-semibold text-slate-200">
              {meal.calories} kcal
            </span>
            <button
              type="button"
              onClick={() => onDeleteMeal(meal.id)}
              className="p-1 text-slate-500 transition hover:text-rose-400"
              aria-label="Delete meal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Hydration & Nutrition Rollup + Active Habits Pill Strip */}
      <div className="aether-glass rounded-2xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Droplets className="h-4 w-4 text-cyan-400" />
            <span className="tabular-mono font-medium">
              {(today.hydration.waterMl / 1000).toFixed(2)}L water • {today.hydration.caffeineMg}mg caffeine
            </span>
          </div>
          <span className="tabular-mono text-xs text-slate-400">
            {totalKcal} kcal • {totalProtein}g P
          </span>
        </div>

        {activeHabits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2.5">
            {activeHabits.map((h) => (
              <span
                key={h.id}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300"
              >
                <CheckCircle className="h-3 w-3" />
                {h.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
