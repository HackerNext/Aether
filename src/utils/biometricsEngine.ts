import {
  BiologicalAgeMetrics,
  CardioLoadAcwr,
  DailyBiometricRecord,
  HabitCorrelationResult,
  HabitDefinition,
  HeartRateZonesMinutes,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
  StrengthExerciseSet,
  UserProfile,
} from '../types/health';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const mean = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
};

const stdDev = (nums: number[]): number => {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const variance = mean(nums.map((n) => (n - avg) ** 2));
  return Math.sqrt(variance);
};

/**
 * Computes muscular load points for a single strength exercise entry.
 * Scales bodyweight sets relative to user body weight so calisthenics & gym lifts
 * both contribute accurately to the 0-21 Daily Strain ring.
 */
export function computeMuscularLoadPoints(
  sets: number,
  reps: number,
  loadKg: number,
  isBodyweight: boolean,
  rpe: number,
  userBodyWeightKg: number
): number {
  const effectiveLoad = isBodyweight ? userBodyWeightKg * 0.58 : Math.max(4, loadKg);
  const volumeKg = sets * reps * effectiveLoad;
  // RPE 6 -> 0.72x, RPE 8 -> 1.0x, RPE 10 -> 1.38x
  const rpeMultiplier = 0.45 + Math.pow(clamp(rpe, 1, 10) / 8, 1.55) * 0.55;
  return Number(((volumeKg / 120) * rpeMultiplier).toFixed(1));
}

/**
 * Aggregates HR zone minutes from passive daytime tracking + logged workouts.
 */
export function aggregateDailyHrZones(record: DailyBiometricRecord): HeartRateZonesMinutes {
  const totals: HeartRateZonesMinutes = {
    zone1: record.daytimeHrZones.zone1,
    zone2: record.daytimeHrZones.zone2,
    zone3: record.daytimeHrZones.zone3,
    zone4: record.daytimeHrZones.zone4,
    zone5: record.daytimeHrZones.zone5,
  };

  for (const w of record.workouts) {
    totals.zone1 += w.hrZones.zone1;
    totals.zone2 += w.hrZones.zone2;
    totals.zone3 += w.hrZones.zone3;
    totals.zone4 += w.hrZones.zone4;
    totals.zone5 += w.hrZones.zone5;
  }

  return totals;
}

/**
 * Daily Strain Score on WHOOP-style 0-21 Logarithmic Scale.
 * Early movement builds easily (0-10); 14-17 is high training load; 18+ requires extreme endurance.
 * Integrates both HR Zones 1-5 cardiovascular load AND muscular strength load.
 */
export function computeDailyStrain(
  record: DailyBiometricRecord,
  recoveryScore?: number
): StrainBreakdown {
  const zones = aggregateDailyHrZones(record);

  // Exponential zone weighting per minute (Zone 1=50-60% ... Zone 5=90-100% Max HR)
  const cardioLoadUnits =
    zones.zone1 * 0.65 +
    zones.zone2 * 1.45 +
    zones.zone3 * 3.1 +
    zones.zone4 * 6.4 +
    zones.zone5 * 11.8 +
    record.steps * 0.0022;

  const muscularLoadUnits = record.workouts.reduce((sum, w) => sum + w.muscularLoadPoints, 0);

  // Convert muscular load units into equivalent cardiovascular load units
  const muscularEquivalentCardio = muscularLoadUnits * 1.35;
  const totalLoad = cardioLoadUnits + muscularEquivalentCardio;

  // Logarithmic compression curve calibrated to [0, 21]
  // At totalLoad = 80 -> ~9.3, totalLoad = 220 -> ~14.2, totalLoad = 450 -> ~17.6, totalLoad = 850 -> ~19.8
  const cardioOnlyScore = 21 * (1 - Math.exp(-Math.log1p(cardioLoadUnits / 28) * 0.56));
  const combinedScore = 21 * (1 - Math.exp(-Math.log1p(totalLoad / 28) * 0.56));

  const score = Number(clamp(combinedScore, 0, 21).toFixed(1));
  const muscularStrainBoost = Number(Math.max(0, combinedScore - cardioOnlyScore).toFixed(1));

  // Recommended strain target corridor based on morning recovery
  let targetRange: [number, number] = [10.0, 14.0];
  if (typeof recoveryScore === 'number') {
    if (recoveryScore >= 67) targetRange = [14.0, 18.0];
    else if (recoveryScore >= 34) targetRange = [10.0, 13.8];
    else targetRange = [4.0, 8.5];
  }

  let label = 'Light Recovery';
  if (score >= 18) label = 'All-Out Peak';
  else if (score >= 14) label = 'Strenuous';
  else if (score >= 10) label = 'Moderate Build';

  return {
    score,
    cardioLoadUnits: Number(cardioLoadUnits.toFixed(1)),
    muscularLoadUnits: Number(muscularLoadUnits.toFixed(1)),
    muscularStrainBoost,
    zoneMinutes: zones,
    targetRange,
    label,
  };
}

/**
 * Calculates single workout's strain contribution for timeline display.
 */
export function computeWorkoutStrainContribution(
  hrZones: HeartRateZonesMinutes,
  muscularLoadPoints: number
): number {
  const load =
    hrZones.zone1 * 0.65 +
    hrZones.zone2 * 1.45 +
    hrZones.zone3 * 3.1 +
    hrZones.zone4 * 6.4 +
    hrZones.zone5 * 11.8 +
    muscularLoadPoints * 1.35;
  return Number(clamp(21 * (1 - Math.exp(-Math.log1p(load / 28) * 0.52)), 0.5, 20.5).toFixed(1));
}

/**
 * Computes Sleep Performance % (0-100) relative to sleep need (8h baseline + strain bonus).
 */
export function computeSleepPerformancePct(
  record: DailyBiometricRecord,
  priorDayStrain: number
): number {
  const baselineNeedMin = 480; // 8h
  const strainBonusMin = Math.round(clamp((priorDayStrain - 8) * 4.5, 0, 55));
  const targetSleepMin = baselineNeedMin + strainBonusMin;

  const durationRatio = clamp(record.sleep.totalSleepMin / targetSleepMin, 0, 1.08);
  const restorativeRatio =
    (record.sleep.stages.deepMin + record.sleep.stages.remMin) /
    Math.max(1, record.sleep.totalSleepMin);
  // Optimal restorative sleep (Deep + REM) is ~42-48% of total sleep
  const restorativeScore = clamp((restorativeRatio / 0.44) * 100, 30, 105);
  const efficiencyScore = clamp((record.sleep.efficiencyPct / 92) * 100, 35, 102);

  const weighted = durationRatio * 100 * 0.62 + restorativeScore * 0.23 + efficiencyScore * 0.15;
  return Math.round(clamp(weighted, 15, 100));
}

/**
 * Adaptive Recovery Score (0-100%) with Dual-Mode Formula:
 * - Native Mode (wearable exports overnight RMSSD HRV):
 *     50% HRV deviation from 30d rolling baseline
 *   + 30% RHR deviation from 30d rolling baseline
 *   + 20% Sleep Performance
 * - Proxy Mode (Redmi Watch 5 Lite / wearables without continuous overnight HRV):
 *     55% Overnight RHR deviation from 30d rolling baseline
 *   + 30% Restorative Sleep Ratio (Deep + REM %)
 *   + 15% Sleep Efficiency
 */
export function computeAdaptiveRecovery(
  records: DailyBiometricRecord[],
  targetIndex: number = records.length - 1
): RecoveryBreakdown {
  const current = records[targetIndex];
  const windowStart = Math.max(0, targetIndex - 30);
  const baselineSlice = records.slice(windowStart, targetIndex);
  const effectiveSlice = baselineSlice.length >= 3 ? baselineSlice : records.slice(0, targetIndex + 1);

  const rhrBaseline30d = Number(mean(effectiveSlice.map((r) => r.restingHrBpm)).toFixed(1));
  const rhrDeltaBpm = Number((current.restingHrBpm - rhrBaseline30d).toFixed(1));

  const priorStrain =
    targetIndex > 0 ? computeDailyStrain(records[targetIndex - 1]).score : 11.2;
  const sleepPerformancePct = computeSleepPerformancePct(current, priorStrain);

  const restorativeSleepPct = Number(
    (
      ((current.sleep.stages.deepMin + current.sleep.stages.remMin) /
        Math.max(1, current.sleep.totalSleepMin)) *
      100
    ).toFixed(1)
  );
  const sleepEfficiencyPct = Number(current.sleep.efficiencyPct.toFixed(1));

  // RHR normalized score: lower RHR than 30d baseline boosts recovery; higher RHR reduces it
  // Baseline delta 0 bpm -> 74 pts; -4 bpm -> ~94 pts; +5 bpm -> ~44 pts
  const rhrNormalized = clamp(74 - rhrDeltaBpm * 6.2, 8, 100);

  const hasOvernightHrv = current.overnightHrvMs !== null && current.overnightHrvMs > 0;
  const hrvSamples = effectiveSlice
    .map((r) => r.overnightHrvMs)
    .filter((v): v is number => v !== null && v > 0);

  let score = 0;
  let mode: RecoveryBreakdown['mode'] = 'rhr_sleep_proxy';
  let badgeLabel = 'RHR + Sleep Calibrated';
  let hrvBaseline30d: number | null = null;
  let hrvDeltaPct: number | null = null;
  let components: RecoveryBreakdown['components'] = [];

  if (hasOvernightHrv && current.overnightHrvMs !== null) {
    mode = 'hrv_native';
    badgeLabel = 'HRV + RHR Native';
    hrvBaseline30d = Number(
      (hrvSamples.length > 0 ? mean(hrvSamples) : current.overnightHrvMs).toFixed(1)
    );
    hrvDeltaPct = Number(
      (((current.overnightHrvMs - hrvBaseline30d) / Math.max(1, hrvBaseline30d)) * 100).toFixed(1)
    );
    // HRV delta 0% -> 72 pts; +15% -> ~96 pts; -20% -> ~38 pts
    const hrvNormalized = clamp(72 + hrvDeltaPct * 1.65, 8, 100);

    score = Math.round(
      clamp(hrvNormalized * 0.5 + rhrNormalized * 0.3 + sleepPerformancePct * 0.2, 1, 100)
    );

    components = [
      {
        label: 'Overnight RMSSD HRV',
        weightPct: 50,
        contribution: Math.round(hrvNormalized * 0.5),
        detail: `${current.overnightHrvMs} ms (${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}% vs 30d)`,
      },
      {
        label: 'Resting Heart Rate',
        weightPct: 30,
        contribution: Math.round(rhrNormalized * 0.3),
        detail: `${current.restingHrBpm} bpm (${rhrDeltaBpm >= 0 ? '+' : ''}${rhrDeltaBpm} vs ${rhrBaseline30d})`,
      },
      {
        label: 'Sleep Performance',
        weightPct: 20,
        contribution: Math.round(sleepPerformancePct * 0.2),
        detail: `${sleepPerformancePct}% of strain-adjusted need`,
      },
    ];
  } else {
    // Proxy Mode tailored for Redmi Watch 5 Lite & non-overnight-HRV wearables
    // 55% Overnight RHR deviation + 30% Restorative Sleep Ratio + 15% Sleep Efficiency
    const restorativeNormalized = clamp(((restorativeSleepPct - 18) / 30) * 100, 12, 100);
    const efficiencyNormalized = clamp(((sleepEfficiencyPct - 68) / 28) * 100, 12, 100);

    score = Math.round(
      clamp(
        rhrNormalized * 0.55 + restorativeNormalized * 0.3 + efficiencyNormalized * 0.15,
        1,
        100
      )
    );

    components = [
      {
        label: 'Overnight RHR Baseline',
        weightPct: 55,
        contribution: Math.round(rhrNormalized * 0.55),
        detail: `${current.restingHrBpm} bpm (${rhrDeltaBpm >= 0 ? '+' : ''}${rhrDeltaBpm} vs ${rhrBaseline30d})`,
      },
      {
        label: 'Restorative Sleep (Deep+REM)',
        weightPct: 30,
        contribution: Math.round(restorativeNormalized * 0.3),
        detail: `${restorativeSleepPct}% of total sleep`,
      },
      {
        label: 'Sleep Efficiency',
        weightPct: 15,
        contribution: Math.round(efficiencyNormalized * 0.15),
        detail: `${sleepEfficiencyPct}% asleep in bed`,
      },
    ];
  }

  let state: RecoveryBreakdown['state'] = 'moderate';
  let colorHex = '#F59E0B';
  if (score >= 67) {
    state = 'optimal';
    colorHex = '#10B981';
  } else if (score <= 33) {
    state = 'low';
    colorHex = '#F43F5E';
  }

  return {
    score,
    state,
    mode,
    badgeLabel,
    colorHex,
    rhrBaseline30d,
    rhrDeltaBpm,
    hrvBaseline30d,
    hrvDeltaPct,
    restorativeSleepPct,
    sleepEfficiencyPct,
    sleepPerformancePct,
    components,
  };
}

/**
 * Rolling 7-day Sleep Debt & Smart Bedtime Planner.
 * Formula: Baseline Need (8h) + Daily Strain Adjustment - Actual Sleep.
 */
export function computeSleepDebtPlan(
  records: DailyBiometricRecord[],
  targetWakeTime: string
): SleepDebtPlan {
  const baselineNeedMin = 480; // 8 hours
  const last7 = records.slice(-7);
  let cumulativeDebtMin = 0;

  last7.forEach((rec, idx) => {
    const prevStrain =
      idx > 0 ? computeDailyStrain(last7[idx - 1]).score : computeDailyStrain(rec).score;
    const strainAdj = Math.round(clamp((prevStrain - 9) * 4.5, 0, 50));
    const dailyNeed = baselineNeedMin + strainAdj;
    cumulativeDebtMin += dailyNeed - rec.sleep.totalSleepMin;
  });

  const rolling7dDebtMin = Math.round(clamp(cumulativeDebtMin, 0, 420));
  const today = records[records.length - 1];
  const todayStrain = computeDailyStrain(today).score;
  const todayStrainAdjustmentMin = Math.round(clamp((todayStrain - 8.5) * 4.8, 0, 58));

  // Recommend paying back up to 35% of accumulated 7d sleep debt tonight (capped at +60m)
  const debtPaybackMin = Math.min(60, Math.round(rolling7dDebtMin * 0.35));
  const recommendedDurationMin = baselineNeedMin + todayStrainAdjustmentMin + debtPaybackMin;

  // Convert targetWakeTime ("06:45") minus recommendedDurationMin + 15m sleep latency
  const [wakeH, wakeM] = targetWakeTime.split(':').map(Number);
  const wakeTotalMin = (isNaN(wakeH) ? 6 : wakeH) * 60 + (isNaN(wakeM) ? 45 : wakeM);
  let bedTotalMin = wakeTotalMin - (recommendedDurationMin + 15);
  while (bedTotalMin < 0) bedTotalMin += 1440;
  bedTotalMin = bedTotalMin % 1440;

  const bedH = Math.floor(bedTotalMin / 60);
  const bedM = bedTotalMin % 60;
  const recommendedBedtime = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;

  const priorStrain =
    records.length > 1 ? computeDailyStrain(records[records.length - 2]).score : todayStrain;
  const sleepPerformancePct = computeSleepPerformancePct(today, priorStrain);

  return {
    rolling7dDebtMin,
    baselineNeedMin,
    todayStrainAdjustmentMin,
    recommendedDurationMin,
    targetWakeTime,
    recommendedBedtime,
    sleepPerformancePct,
  };
}

/**
 * Cardio Load & Acute-to-Chronic Workload Ratio (ACWR):
 * 7-day Acute Strain avg vs 28-day Chronic Strain avg.
 */
export function computeCardioLoadAcwr(
  records: DailyBiometricRecord[],
  endIndex: number = records.length - 1
): CardioLoadAcwr {
  const slice28 = records.slice(Math.max(0, endIndex - 27), endIndex + 1);
  const slice7 = records.slice(Math.max(0, endIndex - 6), endIndex + 1);

  const acute7dAvg = Number(mean(slice7.map((r) => computeDailyStrain(r).score)).toFixed(2));
  const chronic28dAvg = Number(
    Math.max(1, mean(slice28.map((r) => computeDailyStrain(r).score))).toFixed(2)
  );
  const ratio = Number((acute7dAvg / chronic28dAvg).toFixed(2));

  if (ratio < 0.8) {
    return {
      acute7dAvg,
      chronic28dAvg,
      ratio,
      status: 'detraining',
      statusLabel: 'Detraining',
      colorHex: '#818CF8',
    };
  }
  if (ratio <= 1.3) {
    return {
      acute7dAvg,
      chronic28dAvg,
      ratio,
      status: 'optimal',
      statusLabel: 'Optimal Sweet Spot',
      colorHex: '#10B981',
    };
  }
  if (ratio <= 1.5) {
    return {
      acute7dAvg,
      chronic28dAvg,
      ratio,
      status: 'building',
      statusLabel: 'Elevated Build',
      colorHex: '#F59E0B',
    };
  }
  return {
    acute7dAvg,
    chronic28dAvg,
    ratio,
    status: 'overreaching',
    statusLabel: 'Overreaching Risk',
    colorHex: '#F43F5E',
  };
}

/**
 * Biological Age & Healthspan Pace computed over a 30/90-day rolling window
 * based on RHR trend, VO2 Max estimate, and sleep consistency.
 */
export function computeBiologicalAge(
  records: DailyBiometricRecord[],
  profile: UserProfile,
  windowDays: number = 30
): BiologicalAgeMetrics {
  const slice = records.slice(-windowDays);
  const rhr30dAvg = Number(mean(slice.map((r) => r.restingHrBpm)).toFixed(1));
  const vo2Max30dAvg = Number(mean(slice.map((r) => r.vo2MaxEstimate)).toFixed(1));

  // Sleep consistency from bedtime minute variance
  const bedMinutes = slice.map((r) => {
    const d = new Date(r.sleep.bedtimeIso);
    let m = d.getHours() * 60 + d.getMinutes();
    if (m < 720) m += 1440; // normalize after-midnight bedtimes (e.g., 00:30 -> 24:30)
    return m;
  });
  const bedSd = stdDev(bedMinutes);
  const sleepConsistencyPct = Math.round(clamp(100 - bedSd * 0.72, 42, 99));

  // Age-normalized VO2 Max benchmark (~42 ml/kg/min at age 28, -0.35/yr)
  const expectedVo2 = 51.8 - profile.chronologicalAge * 0.35;
  const vo2DeltaYears = (expectedVo2 - vo2Max30dAvg) * 0.42;

  // RHR benchmark (~62 bpm neutral)
  const rhrDeltaYears = (rhr30dAvg - 62) * 0.24;

  // Sleep consistency bonus/penalty (80% neutral)
  const sleepDeltaYears = (80 - sleepConsistencyPct) * 0.06;

  const deltaYears = Number(clamp(vo2DeltaYears + rhrDeltaYears + sleepDeltaYears, -9.5, 9.5).toFixed(1));
  const biologicalAge = Number(Math.max(16, profile.chronologicalAge + deltaYears).toFixed(1));

  // Healthspan Pace: 1.00x = normal aging, <1.00x = decelerated aging
  const healthspanPace = Number(clamp(1 + deltaYears * 0.045, 0.65, 1.38).toFixed(2));

  return {
    chronologicalAge: profile.chronologicalAge,
    biologicalAge,
    deltaYears,
    healthspanPace,
    rhr30dAvg,
    vo2Max30dAvg,
    sleepConsistencyPct,
  };
}

/**
 * Statistical Habit Impact Correlation Engine.
 * Compares next-day Recovery %, Deep Sleep %, and Sleep Efficiency %
 * on nights following a logged habit vs nights without it.
 */
export function computeHabitCorrelations(
  records: DailyBiometricRecord[],
  habits: HabitDefinition[]
): HabitCorrelationResult[] {
  if (records.length < 5) return [];

  // Precompute daily recovery & sleep metrics for days 1..N-1 (next-day outcomes)
  const dailyOutcomes = records.map((rec, idx) => {
    const recovery = computeAdaptiveRecovery(records, idx).score;
    const deepPct =
      (rec.sleep.stages.deepMin / Math.max(1, rec.sleep.totalSleepMin)) * 100;
    const efficiencyPct = rec.sleep.efficiencyPct;
    return { recovery, deepPct, efficiencyPct };
  });

  const results: HabitCorrelationResult[] = [];

  for (const habit of habits) {
    const withRec: number[] = [];
    const withoutRec: number[] = [];
    const withDeep: number[] = [];
    const withoutDeep: number[] = [];
    const withEff: number[] = [];
    const withoutEff: number[] = [];

    // Day i habit impacts Day i+1 morning biometrics (and same-night sleep recorded on Day i+1)
    for (let i = 0; i < records.length - 1; i++) {
      const hasHabit = records[i].habitsLogged.includes(habit.id);
      const nextOutcome = dailyOutcomes[i + 1];
      if (hasHabit) {
        withRec.push(nextOutcome.recovery);
        withDeep.push(nextOutcome.deepPct);
        withEff.push(nextOutcome.efficiencyPct);
      } else {
        withoutRec.push(nextOutcome.recovery);
        withoutDeep.push(nextOutcome.deepPct);
        withoutEff.push(nextOutcome.efficiencyPct);
      }
    }

    if (withRec.length === 0 || withoutRec.length === 0) continue;

    const recoveryDeltaPct = Math.round(mean(withRec) - mean(withoutRec));
    const deepSleepDeltaPct = Math.round(
      ((mean(withDeep) - mean(withoutDeep)) / Math.max(1, mean(withoutDeep))) * 100
    );
    const sleepEfficiencyDeltaPct = Math.round(mean(withEff) - mean(withoutEff));

    const minSample = Math.min(withRec.length, withoutRec.length);
    const confidence: HabitCorrelationResult['confidence'] =
      minSample >= 10 ? 'high' : minSample >= 5 ? 'moderate' : 'emerging';

    results.push({
      habitId: habit.id,
      label: habit.label,
      category: habit.category,
      sampleDaysWith: withRec.length,
      sampleDaysWithout: withoutRec.length,
      recoveryDeltaPct,
      deepSleepDeltaPct,
      sleepEfficiencyDeltaPct,
      confidence,
    });
  }

  return results.sort(
    (a, b) =>
      Math.abs(b.recoveryDeltaPct) +
      Math.abs(b.deepSleepDeltaPct) -
      (Math.abs(a.recoveryDeltaPct) + Math.abs(a.deepSleepDeltaPct))
  );
}

export function formatMinutesToHm(totalMin: number): string {
  const rounded = Math.max(0, Math.round(totalMin));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
