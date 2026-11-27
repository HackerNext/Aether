import React, { useState } from 'react';
import { FlaskConical, Plus, Trash2, X } from 'lucide-react';
import { LabBiomarker } from '../types/health';
import { LAB_BIOMARKER_TEMPLATES } from '../services/healthConnectBridge';
import { PageShell } from '../components/PageShell';

interface LabVaultPageProps {
  biomarkers: LabBiomarker[];
  isDemoMode: boolean;
  onAddBiomarker: (marker: LabBiomarker) => void;
  onDeleteBiomarker: (id: string) => void;
  onBack: () => void;
  onOpenDocs: () => void;
}

export const LabVaultPage: React.FC<LabVaultPageProps> = ({
  biomarkers,
  isDemoMode,
  onAddBiomarker,
  onDeleteBiomarker,
  onBack,
  onOpenDocs,
}) => {
  const [filter, setFilter] = useState<'all' | LabBiomarker['category']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LabBiomarker['category']>('vitamins');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('ng/mL');
  const [optimalMin, setOptimalMin] = useState(40);
  const [optimalMax, setOptimalMax] = useState(70);
  const [normalMin, setNormalMin] = useState(20);
  const [normalMax, setNormalMax] = useState(100);
  const [testedDate, setTestedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const openModal = (tpl?: (typeof LAB_BIOMARKER_TEMPLATES)[number]) => {
    if (tpl) {
      setName(tpl.name);
      setCategory(tpl.category);
      setUnit(tpl.unit);
      setOptimalMin(tpl.optimalMin);
      setOptimalMax(tpl.optimalMax);
      setNormalMin(tpl.normalMin);
      setNormalMax(tpl.normalMax);
    } else {
      setName('');
    }
    setValue('');
    setNotes('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || value === '') return;
    onAddBiomarker({
      id: `lab_${Date.now()}`,
      name: name.trim(),
      category,
      value: Number(value),
      unit: unit.trim() || 'units',
      optimalMin,
      optimalMax,
      normalMin,
      normalMax,
      testedDate,
      notes: notes.trim() || undefined,
    });
    setModalOpen(false);
  };

  const visible = filter === 'all' ? biomarkers : biomarkers.filter((b) => b.category === filter);

  return (
    <PageShell
      title="Medical & Lab Vault"
      subtitle={isDemoMode ? 'Preview Demo Samples' : `${biomarkers.length} saved on device`}
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['all', 'vitamins', 'hematology', 'lipids', 'metabolic', 'inflammation'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                filter === cat
                  ? 'border-indigo-400/50 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-slate-400'
              }`}
            >
              {cat === 'hematology' ? 'Blood' : cat}
            </button>
          ))}
        </div>

        {!isDemoMode && (
          <button
            type="button"
            onClick={() => openModal()}
            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <section className="aether-card rounded-3xl p-6 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <FlaskConical className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Your Lab Vault is Empty</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              No fake results are pre-filled. Tap any common biomarker below to log your real blood test result offline:
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {LAB_BIOMARKER_TEMPLATES.map((tpl) => (
              <button
                key={tpl.name}
                type="button"
                onClick={() => openModal(tpl)}
                className="rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-indigo-400/50"
              >
                + {tpl.name}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="space-y-3">
          {visible.map((m) => {
            const inOpt = m.value >= m.optimalMin && m.value <= m.optimalMax;
            const inNorm = m.value >= m.normalMin && m.value <= m.normalMax;
            const badgeCls = inOpt
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
              : inNorm
                ? 'border-amber-500/30 bg-amber-500/15 text-amber-300'
                : 'border-rose-500/30 bg-rose-500/15 text-rose-300';
            const span = Math.max(0.01, m.normalMax - m.normalMin);
            const optLeft = Math.max(0, Math.min(100, ((m.optimalMin - m.normalMin) / span) * 100));
            const optW = Math.max(8, Math.min(100 - optLeft, ((m.optimalMax - m.optimalMin) / span) * 100));
            const dotPos = Math.max(2, Math.min(98, ((m.value - m.normalMin) / span) * 100));

            return (
              <div key={m.id} className="aether-card rounded-3xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{m.name}</p>
                    <p className="tabular-mono mt-0.5 text-[11px] text-slate-400">
                      Optimal {m.optimalMin}–{m.optimalMax} {m.unit} · {m.testedDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="tabular-mono text-sm font-bold text-white">
                        {m.value} <span className="text-[11px] font-normal text-slate-400">{m.unit}</span>
                      </p>
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeCls}`}>
                        {inOpt ? 'Optimal' : inNorm ? 'Borderline' : 'Out of Range'}
                      </span>
                    </div>
                    {!isDemoMode && (
                      <button
                        type="button"
                        onClick={() => onDeleteBiomarker(m.id)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        aria-label={`Delete ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative h-2.5 w-full rounded-full bg-white/[0.08]">
                  <div
                    className="absolute top-0 h-full rounded-full bg-emerald-500/35"
                    style={{ left: `${optLeft}%`, width: `${optW}%` }}
                  />
                  <div
                    className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07090D] ${
                      inOpt ? 'bg-emerald-400' : inNorm ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ left: `${dotPos}%` }}
                  />
                </div>
                {m.notes && <p className="text-xs text-slate-400">{m.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Clean Non-Overlapping Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="aether-glass-elevated max-h-[88vh] w-full max-w-md space-y-3.5 overflow-y-auto rounded-t-3xl p-5 safe-bottom sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Add Personal Blood Biomarker</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full bg-white/[0.06] p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Biomarker name"
                className="col-span-2 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2.5 text-xs text-white"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LabBiomarker['category'])}
                className="rounded-xl border border-white/10 bg-[#07090D] px-2 py-2.5 text-xs text-slate-200"
              >
                <option value="vitamins">Vitamins</option>
                <option value="hematology">Blood</option>
                <option value="lipids">Lipids</option>
                <option value="metabolic">Metabolic</option>
                <option value="inflammation">Inflammation</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">Result</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Value"
                  className="tabular-mono mt-1 w-full rounded-xl border border-indigo-400/40 bg-[#07090D] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Date</label>
                <input
                  type="date"
                  value={testedDate}
                  onChange={(e) => setTestedDate(e.target.value)}
                  className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">Optimal Min / Max</label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={optimalMin}
                    onChange={(e) => setOptimalMin(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={optimalMax}
                    onChange={(e) => setOptimalMax(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Lab Ref Min / Max</label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={normalMin}
                    onChange={(e) => setNormalMin(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={normalMax}
                    onChange={(e) => setNormalMax(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional note (e.g., Lab name, supplement plan)"
              className="w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2.5 text-xs text-white"
            />

            <button type="submit" className="w-full rounded-2xl bg-indigo-500 py-3 text-xs font-bold text-white">
              Save Biomarker
            </button>
          </form>
        </div>
      )}
    </PageShell>
  );
};
