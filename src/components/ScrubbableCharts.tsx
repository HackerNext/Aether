import React, { useMemo, useState } from 'react';
import { DailyBiometricRecord, UserProfile } from '../types/health';
import {
  computeBiologicalAge,
  computeCardioLoadAcwr,
  formatMinutesToHm,
} from '../utils/biometricsEngine';

interface ScrubbableChartsProps {
  records: DailyBiometricRecord[];
  profile: UserProfile;
}

type TimeframeDays = 7 | 30 | 90;

interface LineSeriesChartProps {
  title: string;
  unit: string;
  accentHex: string;
  dates: string[];
  values: number[];
  secondaryLabel?: string;
  sweetSpotBand?: [number, number];
  baselineValue?: number;
  formatter?: (val: number) => string;
}

const ScrubbableLineCard: React.FC<LineSeriesChartProps> = ({
  title,
  unit,
  accentHex,
  dates,
  values,
  secondaryLabel,
  sweetSpotBand,
  baselineValue,
  formatter = (v) => String(v),
}) => {
  const [activeIdx, setActiveIdx] = useState<number>(values.length - 1);
  const safeIdx = Math.min(activeIdx, Math.max(0, values.length - 1));

  const minRaw = Math.min(...values, sweetSpotBand ? sweetSpotBand[0] : Infinity, baselineValue ?? Infinity);
  const maxRaw = Math.max(...values, sweetSpotBand ? sweetSpotBand[1] : -Infinity, baselineValue ?? -Infinity);
  const pad = Math.max((maxRaw - minRaw) * 0.14, 0.5);
  const minY = minRaw - pad;
  const maxY = maxRaw + pad;

  const w = 340;
  const h = 112;
  const toX = (i: number) => (i / Math.max(1, values.length - 1)) * w;
  const toY = (v: number) => h - ((v - minY) / Math.max(0.001, maxY - minY)) * (h - 16) - 8;

  const pathPoints = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaPoints = `0,${h} ${pathPoints} ${w},${h}`;

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const idx = Math.round(relX * (values.length - 1));
    setActiveIdx(idx);
  };

  const activeVal = values[safeIdx] ?? 0;
  const activeDate = dates[safeIdx] ?? '';
  const cx = toX(safeIdx);
  const cy = toY(activeVal);

  return (
    <div className="aether-glass rounded-3xl p-4 shadow-glass">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {title}
          </p>
          <div className="mt-0.5 flex items-baseline gap-1.5">
            <span className="tabular-mono text-2xl font-bold text-white">
              {formatter(activeVal)}
            </span>
            <span className="text-xs text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="tabular-mono text-xs font-medium text-slate-300">{activeDate}</p>
          {secondaryLabel && <p className="text-[11px] text-slate-500">{secondaryLabel}</p>}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-28 w-full touch-none select-none overflow-visible"
        onPointerDown={handlePointer}
        onPointerMove={(e) => {
          if (e.buttons === 1 || e.pointerType === 'touch') handlePointer(e);
        }}
      >
        <defs>
          <linearGradient id={`grad_${title.replace(/\W/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentHex} stopOpacity="0.28" />
            <stop offset="100%" stopColor={accentHex} stopOpacity="0" />
          </linearGradient>
        </defs>

        {sweetSpotBand && (
          <rect
            x={0}
            y={toY(sweetSpotBand[1])}
            width={w}
            height={Math.max(4, toY(sweetSpotBand[0]) - toY(sweetSpotBand[1]))}
            fill="rgba(16, 185, 129, 0.11)"
            rx={4}
          />
        )}

        {baselineValue !== undefined && (
          <line
            x1={0}
            x2={w}
            y1={toY(baselineValue)}
            y2={toY(baselineValue)}
            stroke="rgba(255,255,255,0.22)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}

        <polygon points={areaPoints} fill={`url(#grad_${title.replace(/\W/g, '')})`} />
        <polyline
          fill="none"
          stroke={accentHex}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pathPoints}
        />

        {/* Scrub Crosshair */}
        <line
          x1={cx}
          x2={cx}
          y1={0}
          y2={h}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle cx={cx} cy={cy} r="5.5" fill="#07090D" stroke={accentHex} strokeWidth="2.5" />
      </svg>
      <p className="mt-1.5 text-[10px] text-slate-500">Touch or drag along chart to inspect exact day</p>
    </div>
  );
};

export const ScrubbableCharts: React.FC<ScrubbableChartsProps> = ({ records, profile }) => {
  const [timeframe, setTimeframe] = useState<TimeframeDays>(30);
  const [sleepIdx, setSleepIdx] = useState<number>(timeframe - 1);

  const slice = useMemo(() => records.slice(-timeframe), [records, timeframe]);
  const safeSleepIdx = Math.min(sleepIdx, Math.max(0, slice.length - 1));
  const selectedSleepDay = slice[safeSleepIdx] ?? slice[slice.length - 1];

  const rhrBaseline = useMemo(() => {
    const last30 = records.slice(-30);
    return Number(
      (last30.reduce((s, r) => s + r.restingHrBpm, 0) / Math.max(1, last30.length)).toFixed(1)
    );
  }, [records]);

  const acwrSeries = useMemo(() => {
    const startOffset = Math.max(0, records.length - slice.length);
    return slice.map((_, i) => computeCardioLoadAcwr(records, startOffset + i).ratio);
  }, [records, slice]);

  const bioAgeSeries = useMemo(() => {
    const startOffset = Math.max(0, records.length - slice.length);
    return slice.map((_, i) => {
      const sub = records.slice(0, startOffset + i + 1);
      return computeBiologicalAge(sub, profile, Math.min(30, sub.length)).biologicalAge;
    });
  }, [records, slice, profile]);

  const latestBioAge = useMemo(
    () => computeBiologicalAge(records, profile, timeframe === 90 ? 90 : 30),
    [records, profile, timeframe]
  );

  const dates = slice.map((r) => r.date);

  return (
    <div className="space-y-4">
      {/* Timeframe Segmented Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Biology & Trends</h2>
          <p className="text-xs text-slate-400">Scrubbable longitudinal telemetry</p>
        </div>
        <div className="aether-glass flex rounded-full p-1">
          {([7, 30, 90] as TimeframeDays[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setSleepIdx(tf - 1);
              }}
              className={`tabular-mono rounded-full px-3 py-1 text-xs font-semibold transition ${
                timeframe === tf
                  ? 'bg-white/15 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}D
            </button>
          ))}
        </div>
      </div>

      {/* 1. Resting Heart Rate */}
      <ScrubbableLineCard
        title="Resting Heart Rate"
        unit="bpm"
        accentHex="#10B981"
        dates={dates}
        values={slice.map((r) => r.restingHrBpm)}
        baselineValue={rhrBaseline}
        secondaryLabel={`30d Baseline ${rhrBaseline} bpm`}
      />

      {/* 2. Sleep Stages Stacked Interactive Bars */}
      {selectedSleepDay && (
        <div className="aether-glass rounded-3xl p-4 shadow-glass">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                Sleep Architecture
              </p>
              <p className="tabular-mono mt-0.5 text-2xl font-bold text-white">
                {formatMinutesToHm(selectedSleepDay.sleep.totalSleepMin)}
              </p>
            </div>
            <div className="text-right">
              <p className="tabular-mono text-xs font-medium text-slate-300">
                {selectedSleepDay.date}
              </p>
              <p className="tabular-mono text-[11px] text-indigo-300">
                {selectedSleepDay.sleep.efficiencyPct}% Eff.
              </p>
            </div>
          </div>

          <div
            className="flex h-28 items-end gap-[3px] touch-none"
            onPointerMove={(e) => {
              if (e.buttons !== 1 && e.pointerType !== 'touch') return;
              const rect = e.currentTarget.getBoundingClientRect();
              const rel = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
              setSleepIdx(Math.round(rel * (slice.length - 1)));
            }}
          >
            {slice.map((rec, idx) => {
              const total = Math.max(1, rec.sleep.timeInBedMin);
              const heightPct = Math.min(100, (total / 560) * 100);
              const isSelected = idx === safeSleepIdx;
              return (
                <button
                  key={rec.date}
                  type="button"
                  onClick={() => setSleepIdx(idx)}
                  className={`flex h-full flex-1 flex-col justify-end rounded-sm transition ${
                    isSelected ? 'opacity-100 ring-1 ring-white/50' : 'opacity-70 hover:opacity-95'
                  }`}
                  title={`${rec.date}: ${formatMinutesToHm(rec.sleep.totalSleepMin)}`}
                >
                  <div
                    className="flex w-full flex-col overflow-hidden rounded-t-sm"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div
                      style={{ flex: rec.sleep.stages.awakeMin }}
                      className="bg-amber-400/80"
                    />
                    <div
                      style={{ flex: rec.sleep.stages.lightMin }}
                      className="bg-slate-500/70"
                    />
                    <div
                      style={{ flex: rec.sleep.stages.remMin }}
                      className="bg-cyan-400/85"
                    />
                    <div
                      style={{ flex: rec.sleep.stages.deepMin }}
                      className="bg-indigo-400"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-white/[0.03] py-1">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 mr-1" />
              <span className="text-slate-400">Deep </span>
              <span className="tabular-mono text-slate-200">{selectedSleepDay.sleep.stages.deepMin}m</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] py-1">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 mr-1" />
              <span className="text-slate-400">REM </span>
              <span className="tabular-mono text-slate-200">{selectedSleepDay.sleep.stages.remMin}m</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] py-1">
              <span className="inline-block h-2 w-2 rounded-full bg-slate-500 mr-1" />
              <span className="text-slate-400">Light </span>
              <span className="tabular-mono text-slate-200">{selectedSleepDay.sleep.stages.lightMin}m</span>
            </div>
            <div className="rounded-lg bg-white/[0.03] py-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1" />
              <span className="text-slate-400">Awake </span>
              <span className="tabular-mono text-slate-200">{selectedSleepDay.sleep.stages.awakeMin}m</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Blood Oxygen (SpO2) */}
      <ScrubbableLineCard
        title="Overnight SpO2"
        unit="%"
        accentHex="#06B6D4"
        dates={dates}
        values={slice.map((r) => r.spo2Pct)}
        sweetSpotBand={[95, 100]}
        secondaryLabel="Normal Band ≥95%"
        formatter={(v) => v.toFixed(1)}
      />

      {/* 4. Cardio Load (ACWR) */}
      <ScrubbableLineCard
        title="Cardio Load (ACWR)"
        unit="ratio"
        accentHex="#F59E0B"
        dates={dates}
        values={acwrSeries}
        sweetSpotBand={[0.8, 1.3]}
        secondaryLabel="Sweet Spot 0.80–1.30"
        formatter={(v) => v.toFixed(2)}
      />

      {/* 5. Biological Age & Healthspan Pace */}
      <ScrubbableLineCard
        title="Biological Age"
        unit="yrs"
        accentHex="#818CF8"
        dates={dates}
        values={bioAgeSeries}
        baselineValue={profile.chronologicalAge}
        secondaryLabel={`Pace ${latestBioAge.healthspanPace}x • VO2 ${latestBioAge.vo2Max30dAvg}`}
        formatter={(v) => v.toFixed(1)}
      />
    </div>
  );
};
