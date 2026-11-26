import React, { useState } from 'react';
import { FlaskConical, Plus, Trash2, X } from 'lucide-react';
import { LabBiomarker } from '../types/health';

interface LabVaultProps {
  biomarkers: LabBiomarker[];
  onAddBiomarker: (marker: LabBiomarker) => void;
  onDeleteBiomarker: (id: string) => void;
}

export const LabVault: React.FC<LabVaultProps> = ({
  biomarkers,
  onAddBiomarker,
  onDeleteBiomarker,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<LabBiomarker['category']>('vitamins');
  const [value, setValue] = useState(50);
  const [unit, setUnit] = useState('ng/mL');
  const [optimalMin, setOptimalMin] = useState(40);
  const [optimalMax, setOptimalMax] = useState(70);
  const [normalMin, setNormalMin] = useState(20);
  const [normalMax, setNormalMax] = useState(100);
  const [testedDate, setTestedDate] = useState(new Date().toISOString().slice(0, 10));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddBiomarker({
      id: `lab_${Date.now()}`,
      name: name.trim(),
      category,
      value,
      unit: unit.trim() || 'units',
      optimalMin,
      optimalMax,
      normalMin,
      normalMax,
      testedDate,
    });
    setName('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-indigo-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Offline Medical & Lab Vault</h3>
            <p className="text-[11px] text-slate-400">
              Encrypted-at-rest local browser storage • Optimal athletic ranges
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-full border border-indigo-400/35 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <div className="space-y-2.5">
        {biomarkers.map((m) => {
          const inOptimal = m.value >= m.optimalMin && m.value <= m.optimalMax;
          const inNormal = m.value >= m.normalMin && m.value <= m.normalMax;
          const statusColor = inOptimal
            ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/15'
            : inNormal
              ? 'text-amber-300 border-amber-500/25 bg-amber-500/15'
              : 'text-rose-300 border-rose-500/25 bg-rose-500/15';
          const statusLabel = inOptimal ? 'Optimal' : inNormal ? 'Borderline' : 'Out of Range';

          const rangeSpan = Math.max(0.01, m.normalMax - m.normalMin);
          const optLeftPct = Math.max(0, Math.min(100, ((m.optimalMin - m.normalMin) / rangeSpan) * 100));
          const optWidthPct = Math.max(6, Math.min(100 - optLeftPct, ((m.optimalMax - m.optimalMin) / rangeSpan) * 100));
          const markerPct = Math.max(2, Math.min(98, ((m.value - m.normalMin) / rangeSpan) * 100));

          return (
            <div key={m.id} className="aether-glass rounded-2xl p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{m.name}</p>
                  <p className="tabular-mono text-[11px] text-slate-400">
                    Optimal {m.optimalMin}–{m.optimalMax} {m.unit} • Tested {m.testedDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="tabular-mono text-sm font-bold text-white">
                      {m.value}{' '}
                      <span className="text-[11px] font-normal text-slate-400">{m.unit}</span>
                    </p>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteBiomarker(m.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    aria-label={`Delete ${m.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Optimal Reference Range Bar */}
              <div className="relative mt-3 h-2 w-full rounded-full bg-white/[0.07]">
                <div
                  className="absolute top-0 h-full rounded-full bg-emerald-500/35"
                  style={{ left: `${optLeftPct}%`, width: `${optWidthPct}%` }}
                />
                <div
                  className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#07090D] ${
                    inOptimal ? 'bg-emerald-400' : inNormal ? 'bg-amber-400' : 'bg-rose-500'
                  }`}
                  style={{ left: `${markerPct}%` }}
                />
              </div>

              {m.notes && <p className="mt-2 text-[11px] text-slate-400">{m.notes}</p>}
            </div>
          );
        })}
      </div>

      {/* Add Biomarker Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setModalOpen(false)}
        >
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="aether-glass-elevated w-full max-w-md space-y-3 rounded-t-3xl p-5 shadow-glass sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Add Blood Biomarker</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full bg-white/[0.05] p-1.5 text-slate-400"
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
                placeholder="e.g., Ferritin, HbA1c"
                className="col-span-2 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LabBiomarker['category'])}
                className="rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-slate-200"
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
                <label className="text-[10px] text-slate-400">Result Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-2.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Date</label>
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
                <label className="text-[10px] text-slate-400">Optimal Min / Max</label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={optimalMin}
                    onChange={(e) => setOptimalMin(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={optimalMax}
                    onChange={(e) => setOptimalMax(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Lab Ref Min / Max</label>
                <div className="mt-1 flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={normalMin}
                    onChange={(e) => setNormalMin(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={normalMax}
                    onChange={(e) => setNormalMax(Number(e.target.value))}
                    className="tabular-mono w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-500 py-2.5 text-xs font-bold text-white hover:bg-indigo-400"
            >
              Save to Offline Vault
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
