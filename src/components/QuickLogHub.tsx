import React, { useState } from 'react';
import { CheckSquare, Dumbbell, Utensils } from 'lucide-react';
import {
  DailyBiometricRecord,
  HabitDefinition,
  MealRecord,
  UserProfile,
  WorkoutRecord,
} from '../types/health';
import { HabitJournalModal } from './HabitJournalModal';
import { StrengthLogger } from './StrengthLogger';
import { NutritionLogger } from './NutritionLogger';

interface QuickLogHubProps {
  today: DailyBiometricRecord;
  profile: UserProfile;
  habitDefinitions: HabitDefinition[];
  onToggleHabit: (habitId: string) => void;
  onAddCustomHabit: (label: string, category: HabitDefinition['category']) => void;
  onLogWorkout: (workout: WorkoutRecord) => void;
  onLogMeal: (meal: MealRecord) => void;
  onAddWater: (ml: number) => void;
  onAddCaffeine: (mg: number) => void;
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
}) => {
  const [subTab, setSubTab] = useState<'habits' | 'strength' | 'nutrition'>('habits');
  const todayCalories = today.meals.reduce((s, m) => s + m.calories, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">Quick-Log Hub</h2>
        <p className="text-xs text-slate-400">
          Capture habits, muscular strain, and nutrition in seconds
        </p>
      </div>

      {/* 3-Mode Action Hub Switcher */}
      <div className="aether-glass grid grid-cols-3 gap-1 rounded-2xl p-1">
        <button
          type="button"
          onClick={() => setSubTab('habits')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
            subTab === 'habits'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          <span>Habits</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('strength')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
            subTab === 'strength'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          <span>Strength</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('nutrition')}
          className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
            subTab === 'nutrition'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Utensils className="h-3.5 w-3.5" />
          <span>Nutrition</span>
        </button>
      </div>

      {subTab === 'habits' && (
        <HabitJournalModal
          habitDefinitions={habitDefinitions}
          loggedTodayIds={today.habitsLogged}
          onToggleHabit={onToggleHabit}
          onAddCustomHabit={onAddCustomHabit}
        />
      )}

      {subTab === 'strength' && (
        <StrengthLogger
          userBodyWeightKg={profile.bodyWeightKg}
          todayDate={today.date}
          onLogWorkout={onLogWorkout}
        />
      )}

      {subTab === 'nutrition' && (
        <NutritionLogger
          todayDate={today.date}
          hydration={today.hydration}
          dailyWaterGoalMl={profile.dailyWaterGoalMl}
          dailyCalorieGoal={profile.dailyCalorieGoal}
          todayCalories={todayCalories}
          onAddWater={onAddWater}
          onAddCaffeine={onAddCaffeine}
          onLogMeal={onLogMeal}
        />
      )}
    </div>
  );
};
