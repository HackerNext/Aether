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

export function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function createEmptyDailyRecord(
  date: string = getTodayDateStr(),
  origin: DailyBiometricRecord['dataOrigin'] = 'manual'
): DailyBiometricRecord {
  return {
    date,
    restingHrBpm: null,
    overnightHrvMs: null,
    spo2Pct: null,
    steps: 0,
    activeCaloriesKcal: 0,
    vo2MaxEstimate: null,
    sleep: null,
    daytimeHrZones: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
    workouts: [],
    meals: [],
    hydration: { waterMl: 0, caffeineMg: 0 },
    habitsLogged: [],
    hourlySeries: [],
    dataOrigin: origin,
  };
}

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
  const rpeMultiplier = 0.45 + Math.pow(clamp(rpe, 1, 10) / 8, 1.55) * 0.55;
  return Number(((volumeKg / 120) * rpeMultiplier).toFixed(1));
}

export function aggregateDailyHrZones(record: DailyBiometricRecord | null): HeartRateZonesMinutes {
  if (!record) return { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 };
  const totals: HeartRateZonesMinutes = { ...record.daytimeHrZones };
  for (const w of record.workouts) {
    totals.zone1 += w.hrZones.zone1;
    totals.zone2 += w.hrZones.zone2;
    totals.zone3 += w.hrZones.zone3;
    totals.zone4 += w.hrZones.zone4;
    totals.zone5 += w.hrZones.zone5;
  }
  return totals;
}

export function computeDailyStrain(
  record: DailyBiometricRecord | null,
  recoveryScore?: number | null
): StrainBreakdown {
  if (!record) {
    return {
      score: 0,
      cardioLoadUnits: 0,
      muscularLoadUnits: 0,
      muscularStrainBoost: 0,
      zoneMinutes: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
      targetRange: [10.0, 14.0],
      label: 'No Activity Yet',
    };
  }

  const zones = aggregateDailyHrZones(record);
  const cardioLoadUnits =
    zones.zone1 * 0.65 +
    zones.zone2 * 1.45 +
    zones.zone3 * 3.1 +
    zones.zone4 * 6.4 +
    zones.zone5 * 11.8 +
    record.steps * 0.0022;

  const muscularLoadUnits = record.workouts.reduce((sum, w) => sum + w.muscularLoadPoints, 0);
  const totalLoad = cardioLoadUnits + muscularLoadUnits * 1.35;

  const cardioOnlyScore =
    cardioLoadUnits > 0 ? 21 * (1 - Math.exp(-Math.log1p(cardioLoadUnits / 28) * 0.56)) : 0;
  const combinedScore =
    totalLoad > 0 ? 21 * (1 - Math.exp(-Math.log1p(totalLoad / 28) * 0.56)) : 0;

  const score = Number(clamp(combinedScore, 0, 21).toFixed(1));
  const muscularStrainBoost = Number(Math.max(0, combinedScore - cardioOnlyScore).toFixed(1));

  let targetRange: [number, number] = [10.0, 14.0];
  if (typeof recoveryScore === 'number') {
    if (recoveryScore >= 67) targetRange = [14.0, 18.0];
    else if (recoveryScore >= 34) targetRange = [10.0, 13.8];
    else targetRange = [4.0, 8.5];
  }

  let label = 'Rest / Baseline';
  if (score >= 18) label = 'All-Out Peak';
  else if (score >= 14) label = 'Strenuous';
  else if (score >= 10) label = 'Moderate Build';
  else if (score > 0.5) label = 'Light Recovery';

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
  if (load <= 0) return 0.5;
  return Number(clamp(21 * (1 - Math.exp(-Math.log1p(load / 28) * 0.52)), 0.5, 20.5).toFixed(1));
}

export function computeSleepPerformancePct(
  record: DailyBiometricRecord | null,
  priorDayStrain: number
): number | null {
  if (!record || !record.sleep || record.sleep.totalSleepMin <= 0) return null;
  const baselineNeedMin = 480;
  const strainBonusMin = Math.round(clamp((priorDayStrain - 8) * 4.5, 0, 55));
  const targetSleepMin = baselineNeedMin + strainBonusMin;

  const durationRatio = clamp(record.sleep.totalSleepMin / targetSleepMin, 0, 1.08);
  const hasStages = record.sleep.stages.deepMin + record.sleep.stages.remMin > 0;
  const restorativeRatio = hasStages
    ? (record.sleep.stages.deepMin + record.sleep.stages.remMin) / Math.max(1, record.sleep.totalSleepMin)
    : 0.38;
  const restorativeScore = clamp((restorativeRatio / 0.44) * 100, 30, 105);
  const efficiencyScore = clamp((record.sleep.efficiencyPct / 92) * 100, 35, 102);

  const weighted = durationRatio * 100 * 0.62 + restorativeScore * 0.23 + efficiencyScore * 0.15;
  return Math.round(clamp(weighted, 15, 100));
}

export function computeAdaptiveRecovery(
  records: DailyBiometricRecord[],
  targetIndex: number = records.length - 1
): RecoveryBreakdown {
  if (records.length === 0 || targetIndex < 0 || targetIndex >= records.length) {
    return {
      score: null,
      state: 'no_data',
      mode: 'awaiting_data',
      badgeLabel: 'Awaiting Biometrics',
      colorHex: '#64748B',
      rhrBaseline30d: null,
      rhrDeltaBpm: null,
      hrvBaseline30d: null,
      hrvDeltaPct: null,
      restorativeSleepPct: null,
      sleepEfficiencyPct: null,
      sleepPerformancePct: null,
      components: [],
    };
  }

  const current = records[targetIndex];
  const priorStrain =
    targetIndex > 0 ? computeDailyStrain(records[targetIndex - 1]).score : 8.0;
  const sleepPerformancePct = computeSleepPerformancePct(current, priorStrain);

  const hasRhr = current.restingHrBpm !== null && current.restingHrBpm > 0;
  const hasSleep = current.sleep !== null && current.sleep.totalSleepMin > 0;
  const hasOvernightHrv = current.overnightHrvMs !== null && current.overnightHrvMs > 0;

  if (!hasRhr && !hasSleep && !hasOvernightHrv) {
    return {
      score: null,
      state: 'no_data',
      mode: 'awaiting_data',
      badgeLabel: 'Awaiting Sync or Log',
      colorHex: '#64748B',
      rhrBaseline30d: null,
      rhrDeltaBpm: null,
      hrvBaseline30d: null,
      hrvDeltaPct: null,
      restorativeSleepPct: null,
      sleepEfficiencyPct: null,
      sleepPerformancePct: null,
      components: [],
    };
  }

  const windowStart = Math.max(0, targetIndex - 30);
  const baselineSlice = records.slice(windowStart, targetIndex);
  const effectiveSlice = baselineSlice.length >= 2 ? baselineSlice : records.slice(0, targetIndex + 1);

  const rhrValues = effectiveSlice
    .map((r) => r.restingHrBpm)
    .filter((v): v is number => v !== null && v > 0);
  const rhrBaseline30d =
    rhrValues.length > 0 ? Number(mean(rhrValues).toFixed(1)) : current.restingHrBpm;
  const rhrDeltaBpm =
    hasRhr && rhrBaseline30d !== null
      ? Number((current.restingHrBpm! - rhrBaseline30d).toFixed(1))
      : null;

  const restorativeSleepPct = hasSleep
    ? Number(
        (
          ((current.sleep!.stages.deepMin + current.sleep!.stages.remMin) /
            Math.max(1, current.sleep!.totalSleepMin)) *
          100
        ).toFixed(1)
      )
    : null;
  const sleepEfficiencyPct = hasSleep ? Number(current.sleep!.efficiencyPct.toFixed(1)) : null;

  const rhrNormalized =
    rhrDeltaBpm !== null ? clamp(74 - rhrDeltaBpm * 6.2, 8, 100) : 70;

  let score = 0;
  let mode: RecoveryBreakdown['mode'] = 'rhr_sleep_proxy';
  let badgeLabel = 'RHR + Sleep Calibrated';
  let hrvBaseline30d: number | null = null;
  let hrvDeltaPct: number | null = null;
  const components: RecoveryBreakdown['components'] = [];

  if (hasOvernightHrv) {
    mode = 'hrv_native';
    badgeLabel = 'HRV + RHR Native';
    const hrvValues = effectiveSlice
      .map((r) => r.overnightHrvMs)
      .filter((v): v is number => v !== null && v > 0);
    hrvBaseline30d = Number(
      (hrvValues.length > 0 ? mean(hrvValues) : current.overnightHrvMs!).toFixed(1)
    );
    hrvDeltaPct = Number(
      (((current.overnightHrvMs! - hrvBaseline30d) / Math.max(1, hrvBaseline30d)) * 100).toFixed(1)
    );
    const hrvNormalized = clamp(72 + hrvDeltaPct * 1.65, 8, 100);
    const sleepNorm = sleepPerformancePct ?? 72;

    score = Math.round(clamp(hrvNormalized * 0.5 + rhrNormalized * 0.3 + sleepNorm * 0.2, 1, 100));
    components.push(
      {
        label: 'Overnight RMSSD HRV',
        weightPct: 50,
        contribution: Math.round(hrvNormalized * 0.5),
        detail: `${current.overnightHrvMs} ms (${hrvDeltaPct >= 0 ? '+' : ''}${hrvDeltaPct}% vs baseline)`,
      },
      {
        label: 'Resting Heart Rate',
        weightPct: 30,
        contribution: Math.round(rhrNormalized * 0.3),
        detail: hasRhr
          ? `${current.restingHrBpm} bpm (${rhrDeltaBpm! >= 0 ? '+' : ''}${rhrDeltaBpm} vs ${rhrBaseline30d})`
          : 'Not synced yet',
      },
      {
        label: 'Sleep Performance',
        weightPct: 20,
        contribution: Math.round(sleepNorm * 0.2),
        detail: sleepPerformancePct !== null ? `${sleepPerformancePct}% of sleep need` : 'Not synced yet',
      }
    );
  } else {
    // Proxy Mode (Redmi Watch 5 Lite / wearables without continuous overnight HRV)
    const restorativeNormalized =
      restorativeSleepPct !== null && restorativeSleepPct > 0
        ? clamp(((restorativeSleepPct - 18) / 30) * 100, 12, 100)
        : sleepPerformancePct ?? 68;
    const efficiencyNormalized =
      sleepEfficiencyPct !== null ? clamp(((sleepEfficiencyPct - 68) / 28) * 100, 12, 100) : 70;

    if (hasRhr && hasSleep) {
      score = Math.round(
        clamp(rhrNormalized * 0.55 + restorativeNormalized * 0.3 + efficiencyNormalized * 0.15, 1, 100)
      );
    } else if (hasRhr) {
      badgeLabel = 'RHR Only (Sync Sleep)';
      score = Math.round(rhrNormalized);
    } else {
      badgeLabel = 'Sleep Only (Sync RHR)';
      score = Math.round(clamp(restorativeNormalized * 0.65 + efficiencyNormalized * 0.35, 15, 100));
    }

    components.push(
      {
        label: 'Overnight RHR Baseline',
        weightPct: 55,
        contribution: hasRhr ? Math.round(rhrNormalized * 0.55) : 0,
        detail: hasRhr
          ? `${current.restingHrBpm} bpm (${rhrDeltaBpm! >= 0 ? '+' : ''}${rhrDeltaBpm} vs ${rhrBaseline30d})`
          : 'Awaiting RHR record',
      },
      {
        label: 'Restorative Sleep (Deep+REM)',
        weightPct: 30,
        contribution: hasSleep ? Math.round(restorativeNormalized * 0.3) : 0,
        detail: hasSleep ? `${restorativeSleepPct}% of total sleep` : 'Awaiting sleep session',
      },
      {
        label: 'Sleep Efficiency',
        weightPct: 15,
        contribution: hasSleep ? Math.round(efficiencyNormalized * 0.15) : 0,
        detail: hasSleep ? `${sleepEfficiencyPct}% asleep in bed` : 'Awaiting sleep session',
      }
    );
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

export function computeSleepDebtPlan(
  records: DailyBiometricRecord[],
  targetWakeTime: string
): SleepDebtPlan {
  const baselineNeedMin = 480;
  const last7WithSleep = records.slice(-7).filter((r) => r.sleep && r.sleep.totalSleepMin > 0);
  const today = records.length > 0 ? records[records.length - 1] : null;
  const todayStrain = computeDailyStrain(today).score;
  const todayStrainAdjustmentMin = Math.round(clamp((todayStrain - 8.5) * 4.8, 0, 58));

  let cumulativeDebtMin = 0;
  last7WithSleep.forEach((rec, idx) => {
    const prevStrain =
      idx > 0 ? computeDailyStrain(last7WithSleep[idx - 1]).score : computeDailyStrain(rec).score;
    const strainAdj = Math.round(clamp((prevStrain - 9) * 4.5, 0, 50));
    cumulativeDebtMin += baselineNeedMin + strainAdj - rec.sleep!.totalSleepMin;
  });

  const rolling7dDebtMin = Math.round(clamp(cumulativeDebtMin, 0, 420));
  const debtPaybackMin = Math.min(60, Math.round(rolling7dDebtMin * 0.35));
  const recommendedDurationMin = baselineNeedMin + todayStrainAdjustmentMin + debtPaybackMin;

  const [wakeH, wakeM] = targetWakeTime.split(':').map(Number);
  const wakeTotalMin = (isNaN(wakeH) ? 6 : wakeH) * 60 + (isNaN(wakeM) ? 45 : wakeM);
  let bedTotalMin = wakeTotalMin - (recommendedDurationMin + 15);
  while (bedTotalMin < 0) bedTotalMin += 1440;
  bedTotalMin = bedTotalMin % 1440;

  const recommendedBedtime = `${String(Math.floor(bedTotalMin / 60)).padStart(2, '0')}:${String(bedTotalMin % 60).padStart(2, '0')}`;
  const priorStrain =
    records.length > 1 ? computeDailyStrain(records[records.length - 2]).score : todayStrain;
  const sleepPerformancePct = computeSleepPerformancePct(today, priorStrain);

  return {
    hasSleepData: last7WithSleep.length > 0,
    rolling7dDebtMin,
    baselineNeedMin,
    todayStrainAdjustmentMin,
    recommendedDurationMin,
    targetWakeTime,
    recommendedBedtime,
    sleepPerformancePct,
  };
}

export function computeCardioLoadAcwr(
  records: DailyBiometricRecord[],
  endIndex: number = records.length - 1
): CardioLoadAcwr {
  if (records.length === 0 || endIndex < 0) {
    return {
      acute7dAvg: 0,
      chronic28dAvg: 0,
      ratio: null,
      status: 'no_data',
      statusLabel: 'Awaiting Activity',
      colorHex: '#64748B',
    };
  }

  const slice28 = records.slice(Math.max(0, endIndex - 27), endIndex + 1);
  const slice7 = records.slice(Math.max(0, endIndex - 6), endIndex + 1);

  const acute7dAvg = Number(mean(slice7.map((r) => computeDailyStrain(r).score)).toFixed(2));
  const chronic28dAvg = Number(mean(slice28.map((r) => computeDailyStrain(r).score)).toFixed(2));

  if (chronic28dAvg < 0.2) {
    return {
      acute7dAvg,
      chronic28dAvg,
      ratio: null,
      status: 'no_data',
      statusLabel: 'Needs 3+ Active Days',
      colorHex: '#64748B',
    };
  }

  const ratio = Number((acute7dAvg / Math.max(0.5, chronic28dAvg)).toFixed(2));

  if (ratio < 0.8) {
    return { acute7dAvg, chronic28dAvg, ratio, status: 'detraining', statusLabel: 'Detraining', colorHex: '#818CF8' };
  }
  if (ratio <= 1.3) {
    return { acute7dAvg, chronic28dAvg, ratio, status: 'optimal', statusLabel: 'Optimal Sweet Spot', colorHex: '#10B981' };
  }
  if (ratio <= 1.5) {
    return { acute7dAvg, chronic28dAvg, ratio, status: 'building', statusLabel: 'Elevated Build', colorHex: '#F59E0B' };
  }
  return { acute7dAvg, chronic28dAvg, ratio, status: 'overreaching', statusLabel: 'Overreaching Risk', colorHex: '#F43F5E' };
}

export function computeBiologicalAge(
  records: DailyBiometricRecord[],
  profile: UserProfile,
  windowDays: number = 30
): BiologicalAgeMetrics {
  const slice = records.slice(-windowDays);
  const rhrValues = slice.map((r) => r.restingHrBpm).filter((v): v is number => v !== null && v > 0);
  const vo2Values = slice.map((r) => r.vo2MaxEstimate).filter((v): v is number => v !== null && v > 0);
  const sleepBedMinutes = slice
    .filter((r) => r.sleep?.bedtimeIso)
    .map((r) => {
      const d = new Date(r.sleep!.bedtimeIso!);
      let m = d.getHours() * 60 + d.getMinutes();
      if (m < 720) m += 1440;
      return m;
    });

  if (rhrValues.length === 0) {
    return {
      hasEnoughData: false,
      chronologicalAge: profile.chronologicalAge,
      biologicalAge: null,
      deltaYears: null,
      healthspanPace: null,
      rhr30dAvg: null,
      vo2Max30dAvg: null,
      sleepConsistencyPct: null,
    };
  }

  const rhr30dAvg = Number(mean(rhrValues).toFixed(1));
  // Estimate VO2 Max via Uth-Sørensen-Overgaard-Pedersen formula (15.3 * HRmax / RHR) when wearable doesn't export VO2
  const vo2Max30dAvg =
    vo2Values.length > 0
      ? Number(mean(vo2Values).toFixed(1))
      : Number(clamp(15.3 * (profile.maxHrBpm / Math.max(40, rhr30dAvg)), 28, 72).toFixed(1));

  const sleepConsistencyPct =
    sleepBedMinutes.length >= 2
      ? Math.round(clamp(100 - stdDev(sleepBedMinutes) * 0.72, 42, 99))
      : null;

  const expectedVo2 = 51.8 - profile.chronologicalAge * 0.35;
  const vo2DeltaYears = (expectedVo2 - vo2Max30dAvg) * 0.36;
  const rhrDeltaYears = (rhr30dAvg - 62) * 0.22;
  const sleepDeltaYears = sleepConsistencyPct !== null ? (80 - sleepConsistencyPct) * 0.05 : 0;

  const deltaYears = Number(clamp(vo2DeltaYears + rhrDeltaYears + sleepDeltaYears, -8.5, 8.5).toFixed(1));
  const biologicalAge = Number(Math.max(16, profile.chronologicalAge + deltaYears).toFixed(1));
  const healthspanPace = Number(clamp(1 + deltaYears * 0.045, 0.68, 1.35).toFixed(2));

  return {
    hasEnoughData: true,
    chronologicalAge: profile.chronologicalAge,
    biologicalAge,
    deltaYears,
    healthspanPace,
    rhr30dAvg,
    vo2Max30dAvg,
    sleepConsistencyPct,
  };
}

export function computeHabitCorrelations(
  records: DailyBiometricRecord[],
  habits: HabitDefinition[]
): HabitCorrelationResult[] {
  if (records.length < 5) return [];

  const dailyOutcomes = records.map((rec, idx) => {
    const recovery = computeAdaptiveRecovery(records, idx).score;
    const deepPct =
      rec.sleep && rec.sleep.totalSleepMin > 0
        ? (rec.sleep.stages.deepMin / rec.sleep.totalSleepMin) * 100
        : null;
    const efficiencyPct = rec.sleep ? rec.sleep.efficiencyPct : null;
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

    for (let i = 0; i < records.length - 1; i++) {
      const hasHabit = records[i].habitsLogged.includes(habit.id);
      const next = dailyOutcomes[i + 1];
      if (next.recovery !== null) {
        (hasHabit ? withRec : withoutRec).push(next.recovery);
      }
      if (next.deepPct !== null) {
        (hasHabit ? withDeep : withoutDeep).push(next.deepPct);
      }
      if (next.efficiencyPct !== null) {
        (hasHabit ? withEff : withoutEff).push(next.efficiencyPct);
      }
    }

    if (withRec.length === 0 || withoutRec.length === 0) continue;

    const recoveryDeltaPct = Math.round(mean(withRec) - mean(withoutRec));
    const deepSleepDeltaPct =
      withDeep.length > 0 && withoutDeep.length > 0
        ? Math.round(((mean(withDeep) - mean(withoutDeep)) / Math.max(1, mean(withoutDeep))) * 100)
        : 0;
    const sleepEfficiencyDeltaPct =
      withEff.length > 0 && withoutEff.length > 0
        ? Math.round(mean(withEff) - mean(withoutEff))
        : 0;

    const minSample = Math.min(withRec.length, withoutRec.length);
    results.push({
      habitId: habit.id,
      label: habit.label,
      category: habit.category,
      sampleDaysWith: withRec.length,
      sampleDaysWithout: withoutRec.length,
      recoveryDeltaPct,
      deepSleepDeltaPct,
      sleepEfficiencyDeltaPct,
      confidence: minSample >= 10 ? 'high' : minSample >= 5 ? 'moderate' : 'emerging',
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
