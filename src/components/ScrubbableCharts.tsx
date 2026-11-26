import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { DailyBiometricRecord, UserProfile } from '../types/health';
import {
  computeBiologicalAge,
  computeCardioLoadAcwr,
  formatMinutesToHm,
} from '../utils/biometricsEngine';

interface ScrubbableChartsProps {
  records: DailyBiometricRecord[];
  profile: UserProfile;
  onGoToVault: () => void;
}

type TimeframeDays = 7 | 30 | 90;

interface LineSeriesChartProps {
  title: string;
  description: string;
  unit: string;
  accentHex: string;
  points: { date: string; value: number }[];
  secondaryLabel?: string;
  sweetSpotBand?: [number, number];
  baselineValue?: number;
  formatter?: (val: number) => string;
}

const ScrubbableLineCard: React.FC<LineSeriesChartProps> = ({
  title,
  description,
  unit,
  accentHex,
  points,
  secondaryLabel,
  sweetSpotBand,
  baselineValue,
  formatter = (v) => String(v),
}) => {
  const [activeIdx, setActiveIdx] = useState<number>(Math.max(0, points.length - 1));
  const safeIdx = Math.min(activeIdx, Math.max(0, points.length - 1));

  if (points.length === 0) {
    return (
      <div className="aether-glass rounded-3xl p-4 shadow-glass">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-6 text-center text-xs text-slate-500">
          No {title.toLowerCase()} records synced yet
        </div>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minRaw = Math.min(...values, sweetSpotBand ? sweetSpotBand[0] : Infinity, baselineValue ?? Infinity);
  const maxRaw = Math.max(...values, sweetSpotBand ? sweetSpotBand[1] : -Infinity, baselineValue ?? -Infinity);
  const pad = Math.max((maxRaw - minRaw) * 0.15, 0.5);
  const minY = minRaw - pad;
  const maxY = maxRaw + pad;

  const w = 340;
  const h = 112;
  const toX = (i: number) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const toY = (v: number) => h - ((v - minY) / Math.max(0.001, maxY - minY)) * (h - 16) - 8;

  const pathPoints = values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const areaPoints = points.length > 1 ? `0,${h} ${pathPoints} ${w},${h}` : '';

  const handlePointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (points.length < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    setActiveIdx(Math.round(relX * (points.length - 1)));
  };

  const activePt = points[safeIdx];
  const avgVal = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div className="aether-glass rounded-3xl p-4 shadow-glass">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400">{description}</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="tabular-mono text-2xl font-bold text-white">
              {formatter(activePt.value)}
            </span>
            <span className="text-xs text-slate-400">{unit}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="tabular-mono text-xs font-semibold text-slate-200">{activePt.date}</p>
          <p className="tabular-mono text-[11px] text-slate-400">Avg {formatter(Number(avgVal.toFixed(1)))}</p>
          {secondaryLabel && <p className="text-[10px] text-slate-500">{secondaryLabel}</p>}
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

        {areaPoints && <polygon points={areaPoints} fill={`url(#grad_${title.replace(/\W/g, '')})`} />}
        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={accentHex}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pathPoints}
          />
        )}
        <line
          x1={toX(safeIdx)}
          x2={toX(safeIdx)}
          y1={0}
          y2={h}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
        <circle cx={toX(safeIdx)} cy={toY(activePt.value)} r="5.5" fill="#07090D" stroke={accentHex} strokeWidth="2.5" />
      </svg>
    </div>
  );
};

export const ScrubbableCharts: React.FC<ScrubbableChartsProps> = ({
  records,
  profile,
  onGoToVault,
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeDays>(30);
  const [sleepIdx, setSleepIdx] = useState<number>(0);

  const slice = useMemo(() => records.slice(-timeframe), [records, timeframe]);
  const sleepDays = useMemo(() => slice.filter((r) => r.sleep && r.sleep.totalSleepMin > 0), [slice]);
  const safeSleepIdx = Math.min(sleepIdx, Math.max(0, sleepDays.length - 1));
  const selectedSleepDay = sleepDays[safeSleepIdx] ?? sleepDays[sleepDays.length - 1] ?? null;

  const rhrPoints = useMemo(
    () =>
      slice
        .filter((r) => r.restingHrBpm !== null && r.restingHrBpm > 0)
        .map((r) => ({ date: r.date, value: r.restingHrBpm! })),
    [slice]
  );

  const spo2Points = useMemo(
    () =>
      slice
        .filter((r) => r.spo2Pct !== null && r.spo2Pct > 0)
        .map((r) => ({ date: r.date, value: r.spo2Pct! })),
    [slice]
  );

  const acwrPoints = useMemo(() => {
    const startOffset = Math.max(0, records.length - slice.length);
    return slice
      .map((r, i) => ({ date: r.date, value: computeCardioLoadAcwr(records, startOffset + i).ratio }))
      .filter((p): p is { date: string; value: number } => p.value !== null);
  }, [records, slice]);

  const bioAgePoints = useMemo(() => {
    const startOffset = Math.max(0, records.length - slice.length);
    return slice
      .map((r, i) => {
        const sub = records.slice(0, startOffset + i + 1);
        return { date: r.date, value: computeBiologicalAge(sub, profile, Math.min(30, sub.length)).biologicalAge };
      })
      .filter((p): p is { date: string; value: number } => p.value !== null);
  }, [records, slice, profile]);

  if (records.length === 0) {
    return (
      <div className="aether-glass rounded-3xl p-6 text-center shadow-glass">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-white">Biology & Longitudinal Trends</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Your charts are currently empty because no fake boilerplate data is loaded. Connect Android Health Connect (Mi Fitness / Zepp / Fitbit) or log your daily vitals to start building your 7D / 30D / 90D biometric trends.
        </p>
        <button
          type="button"
          onClick={onGoToVault}
          className="mt-4 rounded-2xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-obsidian"
        >
          Go to Health Connect & Devices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Biology & Trends</h2>
          <p className="text-xs text-slate-400">{records.length} tracked days • Touch charts to scrub</p>
        </div>
        <div className="aether-glass flex rounded-full p-1">
          {([7, 30, 90] as TimeframeDays[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => {
                setTimeframe(tf);
                setSleepIdx(999);
              }}
              className={`tabular-mono rounded-full px-3 py-1 text-xs font-semibold transition ${
                timeframe === tf ? 'bg-white/15 text-white' : 'text-slate-400'
              }`}
            >
              {tf}D
            </button>
          ))}
        </div>
      </div>

      <ScrubbableLineCard
        title="Resting Heart Rate"
        description="Lower values vs baseline indicate stronger autonomic recovery"
        unit="bpm"
        accentHex="#10B981"
        points={rhrPoints}
      />

      {/* Sleep Architecture Stacked Chart */}
      <div className="aether-glass rounded-3xl p-4 shadow-glass">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Sleep Architecture Stages</h3>
            <p className="text-[11px] text-slate-400">Deep, REM, Light & Awake nightly breakdown</p>
            <p className="tabular-mono mt-1.5 text-2xl font-bold text-white">
              {selectedSleepDay?.sleep ? formatMinutesToHm(selectedSleepDay.sleep.totalSleepMin) : '--'}
            </p>
          </div>
          {selectedSleepDay?.sleep && (
            <div className="text-right">
              <p className="tabular-mono text-xs font-semibold text-slate-200">{selectedSleepDay.date}</p>
              <p className="tabular-mono text-[11px] text-indigo-300">
                {selectedSleepDay.sleep.efficiencyPct}% efficiency
              </p>
            </div>
          )}
        </div>

        {sleepDays.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-6 text-center text-xs text-slate-500">
            No sleep sessions synced yet
          </div>
        ) : (
          <>
            <div className="flex h-28 items-end gap-1">
              {sleepDays.map((rec, idx) => {
                const slp = rec.sleep!;
                const heightPct = Math.min(100, (slp.timeInBedMin / 560) * 100);
                const selected = idx === safeSleepIdx;
                return (
                  <button
                    key={rec.date}
                    type="button"
                    onClick={() => setSleepIdx(idx)}
                    className={`flex h-full flex-1 flex-col justify-end rounded-sm transition ${
                      selected ? 'opacity-100 ring-1 ring-white/50' : 'opacity-70'
                    }`}
                  >
                    <div className="flex w-full flex-col overflow-hidden rounded-t-sm" style={{ height: `${heightPct}%` }}>
                      <div style={{ flex: slp.stages.awakeMin }} className="bg-amber-400/85" />
                      <div style={{ flex: slp.stages.lightMin }} className="bg-slate-500/75" />
                      <div style={{ flex: slp.stages.remMin }} className="bg-cyan-400/85" />
                      <div style={{ flex: slp.stages.deepMin }} className="bg-indigo-400" />
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedSleepDay?.sleep && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="rounded-xl bg-white/[0.03] py-1.5">
                  <span className="text-indigo-300">Deep </span>
                  <span className="tabular-mono text-white">{selectedSleepDay.sleep.stages.deepMin}m</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] py-1.5">
                  <span className="text-cyan-300">REM </span>
                  <span className="tabular-mono text-white">{selectedSleepDay.sleep.stages.remMin}m</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] py-1.5">
                  <span className="text-slate-300">Light </span>
                  <span className="tabular-mono text-white">{selectedSleepDay.sleep.stages.lightMin}m</span>
                </div>
                <div className="rounded-xl bg-white/[0.03] py-1.5">
                  <span className="text-amber-300">Awake </span>
                  <span className="tabular-mono text-white">{selectedSleepDay.sleep.stages.awakeMin}m</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ScrubbableLineCard
        title="Blood Oxygen (SpO2)"
        description="Overnight respiratory oxygen saturation"
        unit="%"
        accentHex="#06B6D4"
        points={spo2Points}
        sweetSpotBand={[95, 100]}
        secondaryLabel="Normal ≥95%"
        formatter={(v) => v.toFixed(1)}
      />

      <ScrubbableLineCard
        title="Cardio Load (ACWR)"
        description="7-day acute vs 28-day chronic workload balance"
        unit="ratio"
        accentHex="#F59E0B"
        points={acwrPoints}
        sweetSpotBand={[0.8, 1.3]}
        secondaryLabel="Sweet Spot 0.8–1.3"
        formatter={(v) => v.toFixed(2)}
      />

      <ScrubbableLineCard
        title="Biological Age"
        description="Estimated physiological age from RHR, VO2 Max & sleep consistency"
        unit="yrs"
        accentHex="#818CF8"
        points={bioAgePoints}
        baselineValue={profile.chronologicalAge}
        secondaryLabel={`Chronological ${profile.chronologicalAge}`}
        formatter={(v) => v.toFixed(1)}
      />
    </div>
  );
};
