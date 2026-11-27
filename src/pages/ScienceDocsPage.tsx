import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { SCIENCE_DOC_CHAPTERS, ScienceDocChapter } from '../data/scienceDocs';
import { PageShell } from '../components/PageShell';

interface ScienceDocsPageProps {
  onBack: () => void;
}

export const ScienceDocsPage: React.FC<ScienceDocsPageProps> = ({ onBack }) => {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<'all' | ScienceDocChapter['category']>('all');
  const [openId, setOpenId] = useState<string>(SCIENCE_DOC_CHAPTERS[0].id);

  const filtered = SCIENCE_DOC_CHAPTERS.filter((ch) => {
    const matchCat = cat === 'all' || ch.category === cat;
    const q = query.trim().toLowerCase();
    const matchQ =
      !q ||
      ch.title.toLowerCase().includes(q) ||
      ch.subtitle.toLowerCase().includes(q) ||
      ch.plainEnglish.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <PageShell
      title="How Every Metric Works"
      subtitle="Plain-English Science & Methods Guide"
      onBack={onBack}
    >
      <div className="aether-card rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
            <BookOpen className="h-4 w-4" />
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Every baseline, score, and graph in AETHER is transparent. Tap any chapter below to read how it’s calculated in everyday language—plus what your watch can and cannot measure.
          </p>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Z-score, EWMA, sleep, Hooper, VO2…"
            className="w-full rounded-2xl border border-white/10 bg-[#080B10] py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-slate-500 focus:border-emerald-400/50 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['all', 'All'],
            ['recovery', 'Recovery'],
            ['strain', 'Strain & EWMA'],
            ['sleep', 'Sleep'],
            ['longevity', 'Fitness Age'],
            ['habits', 'Habits'],
            ['sensors', 'Sensors'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setCat(id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              cat === id
                ? 'border-emerald-400/50 bg-emerald-500/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((ch) => {
          const isOpen = openId === ch.id;
          return (
            <article key={ch.id} className="aether-card overflow-hidden rounded-3xl">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? '' : ch.id)}
                className="flex w-full items-start justify-between gap-3 p-4 text-left transition hover:bg-white/[0.02]"
              >
                <div>
                  <span className="inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-emerald-300">
                    {ch.category}
                  </span>
                  <h2 className="mt-1.5 text-sm font-semibold text-white">{ch.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-400">{ch.subtitle}</p>
                </div>
                <div className="mt-1 rounded-xl bg-white/[0.05] p-1.5 text-slate-400">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="space-y-4 border-t border-white/[0.07] bg-[#090D14] px-4 py-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                      In Plain English
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-200">{ch.plainEnglish}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                      How AETHER Calculates It
                    </p>
                    <ul className="mt-1.5 space-y-2">
                      {ch.howWeCalculate.map((step, i) => (
                        <li
                          key={i}
                          className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2 text-xs leading-relaxed text-slate-300"
                        >
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                      Practical Takeaway
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-amber-100/90">{ch.whatToWatchFor}</p>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </PageShell>
  );
};
