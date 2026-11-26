import React from 'react';
import { Dumbbell, Flame, Utensils, Droplets, CheckCircle, Trash2, Plus } from 'lucide-react';
import { DailyBiometricRecord, HabitDefinition } from '../types/health';

interface TimelineFeedProps {
  today: DailyBiometricRecord | null;
  habitDefinitions: HabitDefinition[];
  dailyWaterGoalMl: number;
  onDeleteWorkout: (workoutId: string) => void;
  onDeleteMeal: (mealId: string) => void;
  onGoToLog: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const TimelineFeed: React.FC<TimelineFeedProps> = ({
  today,
  habitDefinitions,
  dailyWaterGoalMl,
  onDeleteWorkout,
  onDeleteMeal,
  onGoToLog,
}) => {
  const workouts = today?.workouts ?? [];
  const meals = today?.meals ?? [];
  const activeHabits = today
    ? habitDefinitions.filter((h) => today.habitsLogged.includes(h.id))
    : [];
  const totalKcal = meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = meals.reduce((s, m) => s + m.proteinG, 0);
  const waterMl = today?.hydration.waterMl ?? 0;
  const caffeineMg = today?.hydration.caffeineMg ?? 0;
  const isCompletelyEmpty =
    workouts.length === 0 && meals.length === 0 && activeHabits.length === 0 && waterMl === 0 && caffeineMg === 0;

  return (
    <section className="aether-glass rounded-3xl p-4 shadow-glass space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Today&apos;s Activity & Log</h3>
          <p className="text-xs text-slate-400">
            {workouts.length} workouts • {meals.length} meals • {activeHabits.length} habits
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToLog}
          className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Log
        </button>
      </div>

      {isCompletelyEmpty ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
          <p className="text-xs text-slate-400">
            Nothing logged today yet. Workouts synced from Health Connect or entries from the + Log tab will appear here chronologically.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {workouts.map((w) => {
            const totalZoneMin =
              w.hrZones.zone1 + w.hrZones.zone2 + w.hrZones.zone3 + w.hrZones.zone4 + w.hrZones.zone5 || 1;
            return (
              <div key={w.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                      {w.category === 'strength' ? <Dumbbell className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{w.title}</p>
                      <p className="tabular-mono text-[11px] text-slate-400">
                        {formatTime(w.timestampIso)} • {w.durationMin}m
                        {w.avgHrBpm > 0 ? ` • Avg ${w.avgHrBpm} bpm` : ''}
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
                      className="p-1 text-slate-500 hover:text-rose-400"
                      aria-label="Delete workout"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div style={{ width: `${(w.hrZones.zone1 / totalZoneMin) * 100}%` }} className="bg-slate-400" />
                  <div style={{ width: `${(w.hrZones.zone2 / totalZoneMin) * 100}%` }} className="bg-cyan-400" />
                  <div style={{ width: `${(w.hrZones.zone3 / totalZoneMin) * 100}%` }} className="bg-emerald-400" />
                  <div style={{ width: `${(w.hrZones.zone4 / totalZoneMin) * 100}%` }} className="bg-amber-400" />
                  <div style={{ width: `${(w.hrZones.zone5 / totalZoneMin) * 100}%` }} className="bg-rose-500" />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{w.activeCaloriesKcal} kcal • {w.source}</span>
                  {w.muscularLoadPoints > 0 && (
                    <span className="tabular-mono text-cyan-300">{w.muscularLoadPoints} muscular pts</span>
                  )}
                </div>
              </div>
            );
          })}

          {meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5"
            >
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
                <span className="tabular-mono text-xs font-semibold text-slate-200">{meal.calories} kcal</span>
                <button
                  type="button"
                  onClick={() => onDeleteMeal(meal.id)}
                  className="p-1 text-slate-500 hover:text-rose-400"
                  aria-label="Delete meal"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {(waterMl > 0 || caffeineMg > 0 || activeHabits.length > 0) && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="tabular-mono inline-flex items-center gap-1.5 text-slate-200">
                  <Droplets className="h-4 w-4 text-cyan-400" />
                  {(waterMl / 1000).toFixed(2)}L / {(dailyWaterGoalMl / 1000).toFixed(1)}L • {caffeineMg}mg caff
                </span>
                <span className="tabular-mono text-slate-400">
                  {totalKcal} kcal • {totalProtein}g P
                </span>
              </div>
              {activeHabits.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-white/[0.06] pt-2.5">
                  {activeHabits.map((h) => (
                    <span
                      key={h.id}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] text-emerald-300"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {h.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
