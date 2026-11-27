import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { DailyBiometricRecord, UserProfile } from '../types/health';
import {
  computeDailyStrain,
  computeFitnessAge,
  computeUncoupledEwmaWorkload,
  formatMinutesToHm,
} from '../utils/biometricsEngine';
import { PageShell } from '../components/PageShell';

interface TrendsPageProps {
  records: DailyBiometricRecord[];
  profile: UserProfile;
  onBack: () => void;
  onOpenDocs: () => void;
  onOpenDevices: () => void;
}

type MetricKey = 'rhr' | 'sleep' | 'ewma' | 'strain' | 'spo2' | 'fitness_age';

export const TrendsPage: React.FC<TrendsPageProps> = ({
  records,
  profile,
  onBack,
  onOpenDocs,
  onOpenDevices,
}) => {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [metric, setMetric] = useState<MetricKey>('rhr');
  const [activeIdx, setActiveIdx] = useState<number>(999);

  const slice = useMemo(() => records.slice(-days), [records, days]);

  const series = useMemo(() => {
    const offset = Math.max(0, records.length - slice.length);
    if (metric === 'rhr') {
      return slice
        .filter((r) => r.restingHrBpm !== null && r.restingHrBpm > 0)
        .map((r) => ({ date: r.date, value: r.restingHrBpm!, rec: r }));
    }
    if (metric === 'sleep') {
      return slice
        .filter((r) => r.sleep && r.sleep.totalSleepMin > 0)
        .map((r) => ({ date: r.date, value: r.sleep!.totalSleepMin, rec: r }));
    }
    if (metric === 'strain') {
      return slice.map((r) => ({ date: r.date, value: computeDailyStrain(r).score, rec: r }));
    }
    if (metric === 'ewma') {
      return slice
        .map((r, i) => ({ date: r.date, value: computeUncoupledEwmaWorkload(records, offset + i).ratio, rec: r }))
        .filter((p): p is { date: string; value: number; rec: DailyBiometricRecord } => p.value !== null);
    }
    if (metric === 'spo2') {
      return slice
        .filter((r) => r.spo2Pct !== null && r.spo2Pct > 0)
        .map((r) => ({ date: r.date, value: r.spo2Pct!, rec: r }));
    }
    return slice
      .map((r, i) => {
        const sub = records.slice(0, offset + i + 1);
        return { date: r.date, value: computeFitnessAge(sub, profile, Math.min(30, sub.length)).fitnessAge, rec: r };
      })
      .filter((p): p is { date: string; value: number; rec: DailyBiometricRecord } => p.value !== null);
  }, [records, slice, metric, profile]);

  const meta: Record<
    MetricKey,
    { label: string; unit: string; color: string; band?: [number, number]; fmt: (v: number) => string; desc: string }
  > = {
    rhr: { label: 'Resting HR', unit: 'bpm', color: '#10B981', fmt: (v) => `${Math.round(v)}`, desc: 'Overnight resting heart rate trend vs your baseline.' },
    sleep: { label: 'Sleep', unit: '', color: '#818CF8', fmt: (v) => formatMinutesToHm(v), desc: 'Total nightly sleep duration & stages.' },
    strain: { label: 'Strain', unit: '/ 21', color: '#06B6D4', fmt: (v) => v.toFixed(1), desc: 'Daily combined cardiovascular & muscular strain.' },
    ewma: { label: 'EWMA Ratio', unit: 'ratio', color: '#F59E0B', band: [0.8, 1.3], fmt: (v) => v.toFixed(2), desc: 'Uncoupled acute-to-chronic workload ratio (0.8–1.3 sweet spot).' },
    spo2: { label: 'SpO2', unit: '%', color: '#06B6D4', band: [95, 100], fmt: (v) => v.toFixed(1), desc: 'Overnight blood oxygen saturation.' },
    fitness_age: { label: 'Fitness Age', unit: 'yrs', color: '#10B981', fmt: (v) => v.toFixed(1), desc: 'Cardiovascular & Sleep Fitness Age trend.' },
  };

  const curMeta = meta[metric];
  const safeIdx = Math.min(activeIdx, Math.max(0, series.length - 1));
  const activePt = series[safeIdx] ?? null;

  const vals = series.map((s) => s.value);
  const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const minV = vals.length > 0 ? Math.min(...vals) : 0;
  const maxV = vals.length > 0 ? Math.max(...vals) : 0;

  const w = 340;
  const h = 156;
  const plotMin = Math.min(...vals, curMeta.band ? curMeta.band[0] : Infinity);
  const plotMax = Math.max(...vals, curMeta.band ? curMeta.band[1] : -Infinity);
  const pad = Math.max((plotMax - plotMin) * 0.14, 0.5);
  const minY = plotMin - pad;
  const maxY = plotMax + pad;
  const toX = (i: number) => (series.length <= 1 ? w / 2 : (i / (series.length - 1)) * w);
  const toY = (v: number) => h - ((v - minY) / Math.max(0.001, maxY - minY)) * (h - 20) - 10;
  const polyline = series.map((s, i) => `${toX(i).toFixed(1)},${toY(s.value).toFixed(1)}`).join(' ');
  const area = series.length > 1 ? `0,${h} ${polyline} ${w},${h}` : '';

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (series.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    setActiveIdx(Math.round(rel * (series.length - 1)));
  };

  return (
    <PageShell
      title="Longitudinal Trends"
      subtitle="Touch-scrubbable multi-day analytics"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Timeframe + Metric Pill Pickers */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-400">Window</span>
        <div className="aether-card flex rounded-full p-1">
          {([7, 30, 90] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setDays(tf);
                setActiveIdx(999);
              }}
              className={`tabular-mono rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                days === tf ? 'bg-white/15 text-white' : 'text-slate-400'
              }`}
            >
              {tf}D
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(Object.keys(meta) as MetricKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMetric(key);
              setActiveIdx(999);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              metric === key
                ? 'border-emerald-400/50 bg-emerald-500/15 text-white'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white'
            }`}
          >
            {meta[key].label}
          </button>
        ))}
      </div>

      {records.length === 0 || series.length === 0 ? (
        <div className="aether-card rounded-3xl p-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <BarChart3 className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-white">No {curMeta.label} records yet</p>
          <p className="text-xs leading-relaxed text-slate-400">
            Sync Android Health Connect or log daily vitals to populate your {days}-day trend chart.
          </p>
          <button
            type="button"
            onClick={onOpenDevices}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-obsidian"
          >
            Connect Watch
          </button>
        </div>
      ) : (
        <>
          <section className="aether-card rounded-3xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">{curMeta.label}</p>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="tabular-mono text-3xl font-bold text-white">
                    {activePt ? curMeta.fmt(activePt.value) : '--'}
                  </span>
                  {curMeta.unit && <span className="text-xs text-slate-400">{curMeta.unit}</span>}
                </div>
              </div>
              <div className="text-right">
                <p className="tabular-mono text-xs font-semibold text-slate-200">{activePt?.date}</p>
                <p className="text-[11px] text-slate-500">{series.length} days plotted</p>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="h-40 w-full touch-none select-none overflow-visible"
              onPointerDown={handlePointer}
              onPointerMove={(e) => {
                if (e.buttons === 1 || e.pointerType === 'touch') handlePointer(e);
              }}
            >
              <defs>
                <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={curMeta.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={curMeta.color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {curMeta.band && (
                <rect
                  x={0}
                  y={toY(curMeta.band[1])}
                  width={w}
                  height={Math.max(4, toY(curMeta.band[0]) - toY(curMeta.band[1]))}
                  fill="rgba(16, 185, 129, 0.12)"
                  rx={6}
                />
              )}
              {area && <polygon points={area} fill="url(#trendArea)" />}
              {series.length > 1 && (
                <polyline
                  fill="none"
                  stroke={curMeta.color}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polyline}
                />
              )}
              {activePt && (
                <>
                  <line
                    x1={toX(safeIdx)}
                    x2={toX(safeIdx)}
                    y1={0}
                    y2={h}
                    stroke="rgba(255,255,255,0.22)"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={toX(safeIdx)}
                    cy={toY(activePt.value)}
                    r="6"
                    fill="#07090D"
                    stroke={curMeta.color}
                    strokeWidth="2.8"
                  />
                </>
              )}
            </svg>

            <p className="text-center text-[11px] text-slate-500">
              Touch or drag across the graph to inspect any day
            </p>
          </section>

          <section className="grid grid-cols-3 gap-2.5 text-center">
            <div className="aether-card rounded-2xl p-3">
              <p className="text-[10px] uppercase text-slate-400">Period Avg</p>
              <p className="tabular-mono mt-1 text-sm font-bold text-white">{curMeta.fmt(avg)}</p>
            </div>
            <div className="aether-card rounded-2xl p-3">
              <p className="text-[10px] uppercase text-slate-400">Low</p>
              <p className="tabular-mono mt-1 text-sm font-bold text-slate-200">{curMeta.fmt(minV)}</p>
            </div>
            <div className="aether-card rounded-2xl p-3">
              <p className="text-[10px] uppercase text-slate-400">High</p>
              <p className="tabular-mono mt-1 text-sm font-bold text-slate-200">{curMeta.fmt(maxV)}</p>
            </div>
          </section>

          <p className="px-1 text-xs leading-relaxed text-slate-400">{curMeta.desc}</p>
        </>
      )}
    </PageShell>
  );
};
