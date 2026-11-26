import React, { useState } from 'react';
import { CheckSquare, Dumbbell, HeartPulse, Utensils } from 'lucide-react';
import {
  DailyBiometricRecord,
  HabitDefinition,
  MealRecord,
  UserProfile,
  WorkoutRecord,
} from '../types/health';
import { getTodayDateStr } from '../utils/biometricsEngine';
import { HabitJournalModal } from './HabitJournalModal';
import { StrengthLogger } from './StrengthLogger';
import { NutritionLogger } from './NutritionLogger';
import { ManualVitalsLogger, ManualVitalsPayload } from './ManualVitalsLogger';

interface QuickLogHubProps {
  today: DailyBiometricRecord | null;
  profile: UserProfile;
  habitDefinitions: HabitDefinition[];
  onToggleHabit: (habitId: string) => void;
  onAddCustomHabit: (label: string, category: HabitDefinition['category']) => void;
  onLogWorkout: (workout: WorkoutRecord) => void;
  onLogMeal: (meal: MealRecord) => void;
  onAddWater: (ml: number) => void;
  onAddCaffeine: (mg: number) => void;
  onSaveManualVitals: (payload: ManualVitalsPayload) => void;
}

export const QuickLogHub: React.FC<QuickLogHubProps> = ({
  today,
  profile,
  habitDefinitions,
  onToggleHabit,
  onAddCustomHabit,
  onLogWorkout,
  onLogMeal,
  onAddWater,
  onAddCaffeine,
  onSaveManualVitals,
}) => {
  const [subTab, setSubTab] = useState<'habits' | 'strength' | 'nutrition' | 'vitals'>('habits');
  const todayDate = today?.date ?? getTodayDateStr();
  const todayCalories = (today?.meals ?? []).reduce((s, m) => s + m.calories, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-white">Quick-Log Hub</h2>
        <p className="text-xs text-slate-400">Record habits, strength load, nutrition, or manual vitals</p>
      </div>

      <div className="aether-glass grid grid-cols-4 gap-1 rounded-2xl p-1">
        {(
          [
            { id: 'habits', label: 'Habits', icon: CheckSquare, activeCls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
            { id: 'strength', label: 'Strength', icon: Dumbbell, activeCls: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
            { id: 'nutrition', label: 'Food', icon: Utensils, activeCls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            { id: 'vitals', label: 'Vitals', icon: HeartPulse, activeCls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[11px] font-semibold transition ${
                isActive ? t.activeCls : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {subTab === 'habits' && (
        <HabitJournalModal
          habitDefinitions={habitDefinitions}
          loggedTodayIds={today?.habitsLogged ?? []}
          onToggleHabit={onToggleHabit}
          onAddCustomHabit={onAddCustomHabit}
        />
      )}

      {subTab === 'strength' && (
        <StrengthLogger
          userBodyWeightKg={profile.bodyWeightKg}
          todayDate={todayDate}
          onLogWorkout={onLogWorkout}
        />
      )}

      {subTab === 'nutrition' && (
        <NutritionLogger
          todayDate={todayDate}
          hydration={today?.hydration ?? { waterMl: 0, caffeineMg: 0 }}
          dailyWaterGoalMl={profile.dailyWaterGoalMl}
          dailyCalorieGoal={profile.dailyCalorieGoal}
          todayCalories={todayCalories}
          onAddWater={onAddWater}
          onAddCaffeine={onAddCaffeine}
          onLogMeal={onLogMeal}
        />
      )}

      {subTab === 'vitals' && <ManualVitalsLogger onSaveVitals={onSaveManualVitals} />}
    </div>
  );
};
