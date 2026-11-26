import React, { useState } from 'react';
import { Check, Plus, Sparkles } from 'lucide-react';
import { HabitDefinition } from '../types/health';

interface HabitJournalModalProps {
  habitDefinitions: HabitDefinition[];
  loggedTodayIds: string[];
  onToggleHabit: (habitId: string) => void;
  onAddCustomHabit: (label: string, category: HabitDefinition['category']) => void;
}

export const HabitJournalModal: React.FC<HabitJournalModalProps> = ({
  habitDefinitions,
  loggedTodayIds,
  onToggleHabit,
  onAddCustomHabit,
}) => {
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<HabitDefinition['category']>('recovery');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    onAddCustomHabit(trimmed, newCategory);
    setNewLabel('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Morning Habit Check-In</h3>
          <p className="text-xs text-slate-400">
            One-tap toggles feed the Habit Impact Correlation Engine immediately
          </p>
        </div>
        <span className="tabular-mono rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          {loggedTodayIds.length}/{habitDefinitions.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {habitDefinitions.map((habit) => {
          const active = loggedTodayIds.includes(habit.id);
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => onToggleHabit(habit.id)}
              className={`flex items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.98] ${
                active
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-white'
                  : 'border-white/[0.07] bg-white/[0.025] text-slate-300 hover:border-white/15'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">{habit.label}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  {habit.category}
                </p>
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-400 text-obsidian'
                    : 'border-white/15 bg-transparent text-transparent'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="aether-glass rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Add Custom Factor</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Cold Shower, Creatine 5g, Sauna"
            className="flex-1 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as HabitDefinition['category'])}
            className="rounded-xl border border-white/10 bg-[#07090D] px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="recovery">Recovery</option>
            <option value="sleep">Sleep</option>
            <option value="nutrition">Nutrition</option>
            <option value="lifestyle">Lifestyle</option>
          </select>
          <button
            type="submit"
            disabled={!newLabel.trim()}
            className="flex items-center justify-center rounded-xl bg-cyan-500 px-3 text-obsidian transition hover:bg-cyan-400 disabled:opacity-40"
            aria-label="Add custom habit"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
