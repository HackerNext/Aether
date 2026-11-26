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
          <h3 className="text-sm font-semibold text-white">Daily Habit Check-In</h3>
          <p className="text-xs text-slate-400">One-tap toggles feed your Habit Impact Engine</p>
        </div>
        <span className="tabular-mono rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
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
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                active
                  ? 'border-emerald-400/45 bg-emerald-500/15 text-white'
                  : 'border-white/[0.08] bg-white/[0.025] text-slate-300 hover:border-white/15'
              }`}
            >
              <div>
                <p className="text-xs font-semibold">{habit.label}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{habit.category}</p>
              </div>
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                  active
                    ? 'border-emerald-400 bg-emerald-400 text-obsidian'
                    : 'border-white/20 bg-transparent text-transparent'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="aether-glass space-y-2.5 rounded-2xl p-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Add Custom Habit Factor</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g., Cold Shower, Vitamin D3, Creatine"
            className="flex-1 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400/50 focus:outline-none"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as HabitDefinition['category'])}
            className="rounded-xl border border-white/10 bg-[#07090D] px-2.5 py-2.5 text-xs text-slate-200"
          >
            <option value="recovery">Recovery</option>
            <option value="sleep">Sleep</option>
            <option value="nutrition">Nutrition</option>
            <option value="lifestyle">Lifestyle</option>
          </select>
          <button
            type="submit"
            disabled={!newLabel.trim()}
            className="flex items-center justify-center rounded-xl bg-cyan-500 px-3.5 text-obsidian disabled:opacity-40"
            aria-label="Add custom habit"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
