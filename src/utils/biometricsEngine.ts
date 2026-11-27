import {
  CardioLoadEwma,
  DailyBiometricRecord,
  FitnessAgeMetrics,
  HabitCorrelationResult,
  HabitDefinition,
  HeartRateZonesMinutes,
  HooperWellnessLog,
  RecoveryBreakdown,
  SleepDebtPlan,
  StrainBreakdown,
  SwcBandStatus,
  UserProfile,
} from '../types/health';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

const mean = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  return nums.reduce((acc, v) => acc + v, 0) / nums.length;
};

const median = (nums: number[]): number => {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const sampleStdDev = (nums: number[]): number => {
  if (nums.length < 2) return 0;
  const avg = mean(nums);
  const sumSq = nums.reduce((acc, n) => acc + (n - avg) ** 2, 0);
  return Math.sqrt(sumSq / (nums.length - 1));
};

export function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getEffectiveMaxHr(profile: UserProfile): number {
  return profile.observedMaxHrBpm && profile.observedMaxHrBpm >= 140
    ? profile.observedMaxHrBpm
    : Math.max(150, 220 - profile.chronologicalAge);
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
    wellness: null,
    daytimeHrZones: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
    workouts: [],
    meals: [],
    hydration: { waterMl: 0, caffeineMg: 0 },
    habitsLogged: [],
    hourlySeries: [],
    dataOrigin: origin,
  };
}

/** Upgrade 2: Compute Hooper Wellness Score (0-100, higher = fresher) from 4 sliders (1-7) */
export function buildHooperWellness(
  sleepQuality: number,
  freshness: number,
  stress: number,
  soreness: number
): HooperWellnessLog {
  const sq = clamp(Math.round(sleepQuality), 1, 7);
  const fr = clamp(Math.round(freshness), 1, 7);
  const st = clamp(Math.round(stress), 1, 7);
  const so = clamp(Math.round(soreness), 1, 7);
  // Standard Hooper Index (4 = best possible, 28 = worst possible)
  const hooperIndex = (8 - sq) + (8 - fr) + st + so;
  const wellnessScore = Math.round(clamp(((28 - hooperIndex) / 24) * 100, 0, 100));
  return {
    sleepQuality: sq,
    freshness: fr,
    stress: st,
    soreness: so,
    hooperIndex,
    wellnessScore,
    loggedAtIso: new Date().toISOString(),
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

/**
 * Upgrade 4: Dual Cardiovascular + Muscular Strain Engine (0-21 Logarithmic Scale)
 * Integrates HR Zones 1-5 + Foster Session RPE x Duration (for lag-free sprints/HIIT)
 * AND separates Muscular Strain into its own visible sub-bar.
 */
export function computeDailyStrain(
  record: DailyBiometricRecord | null,
  recoveryScore?: number | null
): StrainBreakdown {
  if (!record) {
    return {
      score: 0,
      cardioScore: 0,
      muscularScore: 0,
      cardioLoadUnits: 0,
      sessionRpeLoadUnits: 0,
      muscularLoadUnits: 0,
      muscularStrainBoost: 0,
      zoneMinutes: { zone1: 0, zone2: 0, zone3: 0, zone4: 0, zone5: 0 },
      targetRange: [10.0, 14.0],
      label: 'No Activity Yet',
    };
  }

  const zones = aggregateDailyHrZones(record);
  const hrZoneUnits =
    zones.zone1 * 0.65 +
    zones.zone2 * 1.45 +
    zones.zone3 * 3.1 +
    zones.zone4 * 6.4 +
    zones.zone5 * 11.8 +
    record.steps * 0.0022;

  // Foster Session RPE (RPE * durationMin) normalized so anaerobic/sprint sessions without wrist HR accuracy still register
  const sessionRpeLoadUnits = record.workouts.reduce((sum, w) => {
    if (!w.sessionRpe) return sum;
    return sum + w.durationMin * w.sessionRpe * 0.24;
  }, 0);

  // Take the higher of HR-zone cardio load or blended Foster sRPE load for cardio-focused sessions
  const cardioLoadUnits = hrZoneUnits + sessionRpeLoadUnits * 0.45;

  const muscularLoadUnits = record.workouts.reduce((sum, w) => sum + w.muscularLoadPoints, 0);
  // If user reported high morning muscle soreness (>=5/7), reflect residual muscular strain carry-over
  const sorenessResidual = record.wellness && record.wellness.soreness >= 5 ? (record.wellness.soreness - 4) * 14 : 0;
  const effectiveMuscularUnits = muscularLoadUnits + sorenessResidual;

  const toLog21 = (units: number) =>
    units > 0 ? Number(clamp(21 * (1 - Math.exp(-Math.log1p(units / 28) * 0.56)), 0, 21).toFixed(1)) : 0;

  const cardioScore = toLog21(cardioLoadUnits);
  const muscularScore = toLog21(effectiveMuscularUnits * 1.35);
  const combinedScore = toLog21(cardioLoadUnits + effectiveMuscularUnits * 1.35);
  const muscularStrainBoost = Number(Math.max(0, combinedScore - cardioScore).toFixed(1));

  let targetRange: [number, number] = [10.0, 14.0];
  if (typeof recoveryScore === 'number') {
    if (recoveryScore >= 67) targetRange = [14.0, 18.0];
    else if (recoveryScore >= 34) targetRange = [10.0, 13.8];
    else targetRange = [4.0, 8.5];
  }

  let label = 'Rest / Baseline';
  if (combinedScore >= 18) label = 'All-Out Peak';
  else if (combinedScore >= 14) label = 'Strenuous';
  else if (combinedScore >= 10) label = 'Moderate Build';
  else if (combinedScore > 0.5) label = 'Light Movement';

  return {
    score: combinedScore,
    cardioScore,
    muscularScore,
    cardioLoadUnits: Number(cardioLoadUnits.toFixed(1)),
    sessionRpeLoadUnits: Number(sessionRpeLoadUnits.toFixed(1)),
    muscularLoadUnits: Number(muscularLoadUnits.toFixed(1)),
    muscularStrainBoost,
    zoneMinutes: zones,
    targetRange,
    label,
  };
}

export function computeWorkoutStrainContribution(
  hrZones: HeartRateZonesMinutes,
  muscularLoadPoints: number,
  durationMin: number = 0,
  sessionRpe?: number
): number {
  const sRpeUnits = sessionRpe ? durationMin * sessionRpe * 0.24 : 0;
  const load =
    hrZones.zone1 * 0.65 +
    hrZones.zone2 * 1.45 +
    hrZones.zone3 * 3.1 +
    hrZones.zone4 * 6.4 +
    hrZones.zone5 * 11.8 +
    sRpeUnits * 0.45 +
    muscularLoadPoints * 1.35;
  if (load <= 0) return 0.5;
  return Number(clamp(21 * (1 - Math.exp(-Math.log1p(load / 28) * 0.52)), 0.5, 20.5).toFixed(1));
}

/** Upgrade 5: Compute Adaptive Personal Sleep Need (auto-calibrates on fresh days >= 5/7) */
export function resolvePersonalSleepNeedMin(
  records: DailyBiometricRecord[],
  profile: UserProfile
): { needMin: number; isAutoCalibrated: boolean } {
  if (profile.autoCalibrateSleepNeed) {
    const freshSleepDurations = records
      .filter((r) => r.sleep && r.sleep.totalSleepMin >= 300 && r.wellness && r.wellness.freshness >= 5)
      .map((r) => r.sleep!.totalSleepMin);
    if (freshSleepDurations.length >= 4) {
      return { needMin: Math.round(clamp(median(freshSleepDurations), 390, 540)), isAutoCalibrated: true };
    }
  }
  return { needMin: clamp(profile.personalSleepNeedMin, 360, 600), isAutoCalibrated: false };
}

export function computeSleepPerformancePct(
  record: DailyBiometricRecord | null,
  priorDayStrain: number,
  personalNeedMin: number = 450
): number | null {
  if (!record || !record.sleep || record.sleep.totalSleepMin <= 0) return null;
  const strainBonusMin = Math.round(clamp((priorDayStrain - 9) * 3.8, 0, 45));
  const targetSleepMin = personalNeedMin + strainBonusMin;

  const durationRatio = clamp(record.sleep.totalSleepMin / targetSleepMin, 0, 1.06);
  const efficiencyScore = clamp((record.sleep.efficiencyPct / 92) * 100, 35, 100);

  // De-emphasized optical sleep stage share (only 15% weight) to limit wrist-sensor staging error
  const hasStages = record.sleep.stages.deepMin + record.sleep.stages.remMin > 0;
  const restorativeRatio = hasStages
    ? (record.sleep.stages.deepMin + record.sleep.stages.remMin) / Math.max(1, record.sleep.totalSleepMin)
    : 0.4;
  const restorativeScore = clamp((restorativeRatio / 0.42) * 100, 35, 100);

  const weighted = durationRatio * 100 * 0.68 + efficiencyScore * 0.17 + restorativeScore * 0.15;
  return Math.round(clamp(weighted, 15, 100));
}

/**
 * Upgrade 1 + Upgrade 2: Z-Score & SWC (±0.5σ) Adaptive Recovery Engine + Hooper Perception Override
 * - Uses personal 30d Mean (μ) and SD (σ) Z-scores instead of fixed arbitrary bpm cutoffs.
 * - Flags ±0.5σ as Normal Baseline Noise (SWC).
 * - Detects bidirectional RHR anomaly (Z < -1.8σ + poor subjective freshness => Parasympathetic Overtraining).
 * - Reduces optical sleep-stage weighting to 15% in Proxy Mode (shifting to Total Sleep Duration + RHR Z-Score).
 * - Blends Morning Hooper Wellness (25% weight when logged) & triggers Perception Override if wearable looks green while user feels wrecked.
 */
export function computeAdaptiveRecovery(
  records: DailyBiometricRecord[],
  profile: UserProfile,
  targetIndex: number = records.length - 1
): RecoveryBreakdown {
  if (records.length === 0 || targetIndex < 0 || targetIndex >= records.length) {
    return {
      score: null,
      state: 'no_data',
      mode: 'awaiting_data',
      badgeLabel: 'Awaiting Biometrics',
      colorHex: '#64748B',
      rhrMean30d: null,
      rhrSd30d: null,
      rhrDeltaBpm: null,
      rhrZScore: null,
      swcStatus: 'insufficient',
      swcLabel: 'Need synced data',
      hrvMean30d: null,
      hrvSd30d: null,
      hrvZScore: null,
      restorativeSleepPct: null,
      sleepEfficiencyPct: null,
      sleepPerformancePct: null,
      perceptionOverrideActive: false,
      perceptionOverrideReason: null,
      components: [],
    };
  }

  const current = records[targetIndex];
  const { needMin } = resolvePersonalSleepNeedMin(records, profile);
  const priorStrain = targetIndex > 0 ? computeDailyStrain(records[targetIndex - 1]).score : 8.0;
  const sleepPerformancePct = computeSleepPerformancePct(current, priorStrain, needMin);

  const hasRhr = current.restingHrBpm !== null && current.restingHrBpm > 0;
  const hasSleep = current.sleep !== null && current.sleep.totalSleepMin > 0;
  const hasHrv = current.overnightHrvMs !== null && current.overnightHrvMs > 0;
  const hasWellness = current.wellness !== null;

  if (!hasRhr && !hasSleep && !hasHrv && !hasWellness) {
    return {
      score: null,
      state: 'no_data',
      mode: 'awaiting_data',
      badgeLabel: 'Awaiting Sync or Check-In',
      colorHex: '#64748B',
      rhrMean30d: null,
      rhrSd30d: null,
      rhrDeltaBpm: null,
      rhrZScore: null,
      swcStatus: 'insufficient',
      swcLabel: 'No baseline yet',
      hrvMean30d: null,
      hrvSd30d: null,
      hrvZScore: null,
      restorativeSleepPct: null,
      sleepEfficiencyPct: null,
      sleepPerformancePct: null,
      perceptionOverrideActive: false,
      perceptionOverrideReason: null,
      components: [],
    };
  }

  const windowStart = Math.max(0, targetIndex - 30);
  const baselineSlice = records.slice(windowStart, targetIndex);
  const effectiveSlice = baselineSlice.length >= 3 ? baselineSlice : records.slice(0, targetIndex + 1);

  const rhrValues = effectiveSlice.map((r) => r.restingHrBpm).filter((v): v is number => v !== null && v > 0);
  const rhrMean30d = rhrValues.length > 0 ? Number(mean(rhrValues).toFixed(1)) : current.restingHrBpm;
  // Minimum physiological SD floor of 1.8 bpm prevents tiny sample noise from exploding Z-scores
  const rhrSd30d = rhrValues.length >= 3 ? Number(Math.max(1.8, sampleStdDev(rhrValues)).toFixed(2)) : 2.2;
  const rhrDeltaBpm =
    hasRhr && rhrMean30d !== null ? Number((current.restingHrBpm! - rhrMean30d).toFixed(1)) : null;
  const rhrZScore =
    rhrDeltaBpm !== null ? Number((rhrDeltaBpm / Math.max(1.5, rhrSd30d)).toFixed(2)) : null;

  // Bidirectional SWC (±0.5σ) & Parasympathetic Overtraining Detection
  let swcStatus: SwcBandStatus = 'insufficient';
  let swcLabel = 'Building 30d baseline';
  let parasympatheticWarning = false;

  if (rhrZScore !== null) {
    if (rhrZScore < -1.8 && current.wellness && current.wellness.freshness <= 3) {
      swcStatus = 'parasympathetic_alert';
      swcLabel = 'Low RHR + Low Energy (Parasympathetic Fatigue)';
      parasympatheticWarning = true;
    } else if (Math.abs(rhrZScore) <= 0.5) {
      swcStatus = 'normal_noise';
      swcLabel = 'Inside ±0.5σ Normal Baseline Band';
    } else if (rhrZScore < -0.5) {
      swcStatus = 'positive_shift';
      swcLabel = `${Math.abs(rhrZScore)}σ Below Baseline (Strong Rebound)`;
    } else {
      swcStatus = 'elevated_strain';
      swcLabel = `+${rhrZScore}σ Above Baseline (Physiological Load)`;
    }
  }

  // Z-score to 0-100 score (0σ => 74; -1.5σ => 96; +1.5σ => 44; parasympathetic fatigue penalizes instead of rewarding!)
  let rhrScore = 72;
  if (rhrZScore !== null) {
    if (parasympatheticWarning) {
      rhrScore = 36;
    } else {
      const effectiveZ = Math.abs(rhrZScore) <= 0.5 ? rhrZScore * 0.45 : rhrZScore;
      rhrScore = clamp(74 - effectiveZ * 17.5, 10, 100);
    }
  }

  const restorativeSleepPct = hasSleep
    ? Number(
        (((current.sleep!.stages.deepMin + current.sleep!.stages.remMin) / Math.max(1, current.sleep!.totalSleepMin)) * 100).toFixed(1)
      )
    : null;
  const sleepEfficiencyPct = hasSleep ? Number(current.sleep!.efficiencyPct.toFixed(1)) : null;

  const durationNorm = hasSleep
    ? clamp((current.sleep!.totalSleepMin / needMin) * 86, 15, 100)
    : 70;
  const stageNorm =
    restorativeSleepPct !== null && restorativeSleepPct > 0
      ? clamp(((restorativeSleepPct - 18) / 30) * 100, 20, 100)
      : durationNorm;

  let hrvMean30d: number | null = null;
  let hrvSd30d: number | null = null;
  let hrvZScore: number | null = null;
  let mode: RecoveryBreakdown['mode'] = hasHrv ? 'hrv_native' : 'rhr_sleep_proxy';
  let badgeLabel = hasHrv ? 'Z-Score HRV + RHR' : 'Z-Score RHR + Sleep Proxy';
  let wearableScore = 0;
  const components: RecoveryBreakdown['components'] = [];

  if (hasHrv) {
    const hrvValues = effectiveSlice.map((r) => r.overnightHrvMs).filter((v): v is number => v !== null && v > 0);
    hrvMean30d = Number((hrvValues.length > 0 ? mean(hrvValues) : current.overnightHrvMs!).toFixed(1));
    hrvSd30d = Number(Math.max(6, hrvValues.length >= 3 ? sampleStdDev(hrvValues) : 8).toFixed(1));
    hrvZScore = Number(((current.overnightHrvMs! - hrvMean30d) / hrvSd30d).toFixed(2));
    const hrvNorm = clamp(73 + hrvZScore * 16.5, 10, 100);
    const sleepNorm = sleepPerformancePct ?? 72;

    wearableScore = hrvNorm * 0.5 + rhrScore * 0.3 + sleepNorm * 0.2;
    components.push(
      { label: 'Overnight HRV Z-Score', weightPct: hasWellness ? 38 : 50, contribution: Math.round(hrvNorm * (hasWellness ? 0.38 : 0.5)), detail: `${current.overnightHrvMs} ms (${hrvZScore >= 0 ? '+' : ''}${hrvZScore}σ vs ${hrvMean30d})` },
      { label: 'Resting HR Z-Score', weightPct: hasWellness ? 22 : 30, contribution: Math.round(rhrScore * (hasWellness ? 0.22 : 0.3)), detail: hasRhr ? `${current.restingHrBpm} bpm (${rhrZScore! >= 0 ? '+' : ''}${rhrZScore}σ)` : 'Not synced' },
      { label: 'Sleep Performance', weightPct: hasWellness ? 15 : 20, contribution: Math.round(sleepNorm * (hasWellness ? 0.15 : 0.2)), detail: sleepPerformancePct !== null ? `${sleepPerformancePct}% of ${formatMinutesToHm(needMin)} need` : 'Not synced' }
    );
  } else {
    // Upgrade 1: Proxy Mode re-weighted so noisy optical sleep staging is ONLY 15% (RHR Z-Score 50%, Sleep Duration 35%, Stages 15%)
    const wRhr = hasWellness ? 0.38 : 0.5;
    const wDur = hasWellness ? 0.25 : 0.35;
    const wStg = hasWellness ? 0.12 : 0.15;

    if (hasRhr && hasSleep) {
      wearableScore = rhrScore * 0.5 + durationNorm * 0.35 + stageNorm * 0.15;
    } else if (hasRhr) {
      badgeLabel = 'RHR Z-Score Only';
      wearableScore = rhrScore;
    } else if (hasSleep) {
      badgeLabel = 'Sleep Duration Only';
      wearableScore = durationNorm * 0.75 + stageNorm * 0.25;
    } else {
      badgeLabel = 'Hooper Wellness Only';
      wearableScore = current.wellness!.wellnessScore;
    }

    components.push(
      { label: 'RHR Z-Score (30d SWC)', weightPct: Math.round(wRhr * 100), contribution: hasRhr ? Math.round(rhrScore * wRhr) : 0, detail: hasRhr ? `${current.restingHrBpm} bpm (${rhrZScore! >= 0 ? '+' : ''}${rhrZScore}σ vs ${rhrMean30d})` : 'Awaiting RHR' },
      { label: 'Total Sleep vs Personal Need', weightPct: Math.round(wDur * 100), contribution: hasSleep ? Math.round(durationNorm * wDur) : 0, detail: hasSleep ? `${formatMinutesToHm(current.sleep!.totalSleepMin)} / ${formatMinutesToHm(needMin)}` : 'Awaiting sleep' },
      { label: 'Optical Sleep Stages (Capped)', weightPct: Math.round(wStg * 100), contribution: hasSleep ? Math.round(stageNorm * wStg) : 0, detail: hasSleep ? `${restorativeSleepPct}% Deep+REM (15% max cap)` : 'Awaiting sleep' }
    );
  }

  // Upgrade 2: Blend Morning Hooper Wellness (25% weight) + Perception Override Guard
  let finalScore = wearableScore;
  let perceptionOverrideActive = false;
  let perceptionOverrideReason: string | null = null;

  if (current.wellness) {
    if (hasRhr || hasSleep || hasHrv) {
      finalScore = wearableScore * 0.75 + current.wellness.wellnessScore * 0.25;
      components.push({
        label: 'Morning Hooper Wellness',
        weightPct: 25,
        contribution: Math.round(current.wellness.wellnessScore * 0.25),
        detail: `Score ${current.wellness.wellnessScore}/100 (Hooper ${current.wellness.hooperIndex}/28)`,
      });
    } else {
      finalScore = current.wellness.wellnessScore;
    }

    const highSubjectiveLoad = current.wellness.freshness <= 3 || current.wellness.soreness >= 5 || current.wellness.stress >= 6;
    if (wearableScore >= 66 && highSubjectiveLoad) {
      perceptionOverrideActive = true;
      // Cap score inside Moderate band so green rings never tell an exhausted user to push all-out
      finalScore = Math.min(finalScore, 58);
      perceptionOverrideReason = `Watch telemetry looks green (${Math.round(wearableScore)}%), but your Morning Check-In flagged high fatigue, soreness (${current.wellness.soreness}/7), or stress (${current.wellness.stress}/7). Subjective feel overrides wrist sensors—scale intensity back today.`;
    } else if (parasympatheticWarning) {
      perceptionOverrideActive = true;
      perceptionOverrideReason = `Your RHR dropped sharply (${rhrZScore}σ) while freshness is low (${current.wellness.freshness}/7). This pattern can signal parasympathetic fatigue rather than peak fitness.`;
    }
  }

  const score = Math.round(clamp(finalScore, 1, 100));
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
    rhrMean30d,
    rhrSd30d,
    rhrDeltaBpm,
    rhrZScore,
    swcStatus,
    swcLabel,
    hrvMean30d,
    hrvSd30d,
    hrvZScore,
    restorativeSleepPct,
    sleepEfficiencyPct,
    sleepPerformancePct,
    perceptionOverrideActive,
    perceptionOverrideReason,
    components,
  };
}

/**
 * Upgrade 5: Adaptive Personal Sleep Need, 7-Day Sleep Regularity Score & Capped Realistic Bedtime Shifts
 */
export function computeSleepDebtPlan(
  records: DailyBiometricRecord[],
  profile: UserProfile
): SleepDebtPlan {
  const { needMin, isAutoCalibrated } = resolvePersonalSleepNeedMin(records, profile);
  const last7WithSleep = records.slice(-7).filter((r) => r.sleep && r.sleep.totalSleepMin > 0);
  const today = records.length > 0 ? records[records.length - 1] : null;
  const todayStrain = computeDailyStrain(today).score;
  const todayStrainAdjustmentMin = Math.round(clamp((todayStrain - 9.0) * 4.0, 0, 45));

  let cumulativeDebtMin = 0;
  last7WithSleep.forEach((rec, idx) => {
    const prevStrain =
      idx > 0 ? computeDailyStrain(last7WithSleep[idx - 1]).score : computeDailyStrain(rec).score;
    const strainAdj = Math.round(clamp((prevStrain - 9) * 3.8, 0, 45));
    cumulativeDebtMin += needMin + strainAdj - rec.sleep!.totalSleepMin;
  });
  const rolling7dDebtMin = Math.round(clamp(cumulativeDebtMin, 0, 360));

  // Cap nightly bedtime shift to realistic <= 40m debt payback so we avoid orthosomnia / impossible 2h jumps
  const cappedPaybackMin = Math.min(40, Math.round(rolling7dDebtMin * 0.25));
  const recommendedDurationMin = needMin + todayStrainAdjustmentMin + cappedPaybackMin;

  const [wakeH, wakeM] = profile.targetWakeTime.split(':').map(Number);
  const wakeTotalMin = (isNaN(wakeH) ? 6 : wakeH) * 60 + (isNaN(wakeM) ? 45 : wakeM);
  let bedTotalMin = wakeTotalMin - (recommendedDurationMin + 15);
  while (bedTotalMin < 0) bedTotalMin += 1440;
  bedTotalMin = bedTotalMin % 1440;

  // 7-day Sleep Regularity Score from bedtime + wake time SD
  const bedMins = last7WithSleep
    .filter((r) => r.sleep?.bedtimeIso)
    .map((r) => {
      const d = new Date(r.sleep!.bedtimeIso!);
      let m = d.getHours() * 60 + d.getMinutes();
      if (m < 720) m += 1440;
      return m;
    });

  let bedtimeShiftCappedNote: string | null = null;
  if (bedMins.length >= 2) {
    const typicalBed = mean(bedMins) % 1440;
    let diff = bedTotalMin - typicalBed;
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    if (Math.abs(diff) > 45) {
      bedTotalMin = (Math.round(typicalBed + Math.sign(diff) * 45) + 1440) % 1440;
      bedtimeShiftCappedNote = 'Capped within ±45m of your usual bedtime to protect circadian rhythm.';
    }
  }

  const regularityScorePct =
    bedMins.length >= 2 ? Math.round(clamp(100 - sampleStdDev(bedMins) * 0.78, 35, 99)) : null;
  let regularityLabel = 'Needs 2+ nights';
  if (regularityScorePct !== null) {
    if (regularityScorePct >= 85) regularityLabel = 'Locked-In Rhythm';
    else if (regularityScorePct >= 70) regularityLabel = 'Steady Schedule';
    else regularityLabel = 'Irregular Timing';
  }

  const recommendedBedtime = `${String(Math.floor(bedTotalMin / 60)).padStart(2, '0')}:${String(bedTotalMin % 60).padStart(2, '0')}`;
  const priorStrain = records.length > 1 ? computeDailyStrain(records[records.length - 2]).score : todayStrain;
  const sleepPerformancePct = computeSleepPerformancePct(today, priorStrain, needMin);

  return {
    hasSleepData: last7WithSleep.length > 0,
    personalBaselineNeedMin: needMin,
    isAutoCalibratedNeed: isAutoCalibrated,
    rolling7dDebtMin,
    todayStrainAdjustmentMin,
    recommendedDurationMin,
    targetWakeTime: profile.targetWakeTime,
    recommendedBedtime,
    bedtimeShiftCappedNote,
    sleepPerformancePct,
    regularityScorePct,
    regularityLabel,
  };
}

/**
 * Upgrade 3: Uncoupled EWMA Workload Ratio + Minimum Chronic Load Floor + Weekly Training Monotony
 * - Acute EWMA uses α = 2/(7+1) = 0.25 over the last 7 days.
 * - Uncoupled Chronic EWMA uses α = 2/(28+1) ≈ 0.069 strictly on days PRIOR to the current 7-day block
 *   (removes mathematical coupling bias).
 * - Minimum Chronic Load Floor (< 4.0) prevents false "Overreaching" alarms when returning from rest.
 * - Weekly Training Monotony = Weekly Mean / Weekly SD (> 2.0 flags repetitive strain with no rest days).
 */
export function computeUncoupledEwmaWorkload(
  records: DailyBiometricRecord[],
  endIndex: number = records.length - 1
): CardioLoadEwma {
  if (records.length === 0 || endIndex < 0) {
    return {
      acuteEwma7d: 0,
      chronicUncoupledEwma28d: 0,
      ratio: null,
      status: 'no_data',
      statusLabel: 'Awaiting Activity',
      colorHex: '#64748B',
      belowChronicFloor: false,
      weeklyMonotony: null,
      monotonyAlert: false,
      weeklyTotalStrain: 0,
    };
  }

  const allStrains = records.slice(0, endIndex + 1).map((r) => computeDailyStrain(r).score);
  const last7 = allStrains.slice(-7);
  const weeklyTotalStrain = Number(last7.reduce((s, v) => s + v, 0).toFixed(1));

  // Acute EWMA (α = 0.25)
  const alphaAcute = 2 / (7 + 1);
  let acuteEwma = last7[0] ?? 0;
  for (let i = 1; i < last7.length; i++) {
    acuteEwma = last7[i] * alphaAcute + acuteEwma * (1 - alphaAcute);
  }

  // Uncoupled Chronic EWMA on days strictly BEFORE the last 7 days (falls back to all days if < 10 days exist)
  const priorSlice = allStrains.length >= 10 ? allStrains.slice(Math.max(0, allStrains.length - 35), -7) : allStrains;
  const alphaChronic = 2 / (28 + 1);
  let chronicEwma = priorSlice[0] ?? 0;
  for (let i = 1; i < priorSlice.length; i++) {
    chronicEwma = priorSlice[i] * alphaChronic + chronicEwma * (1 - alphaChronic);
  }

  const acuteEwma7d = Number(acuteEwma.toFixed(2));
  const chronicUncoupledEwma28d = Number(chronicEwma.toFixed(2));

  // Weekly Training Monotony (Foster) = Mean / SD across last 7 days (requires >= 5 days)
  let weeklyMonotony: number | null = null;
  let monotonyAlert = false;
  if (last7.length >= 5 && mean(last7) > 2.5) {
    const sd = Math.max(0.8, sampleStdDev(last7));
    weeklyMonotony = Number((mean(last7) / sd).toFixed(2));
    monotonyAlert = weeklyMonotony > 2.0;
  }

  if (allStrains.length < 3 || (acuteEwma7d < 0.5 && chronicUncoupledEwma28d < 0.5)) {
    return {
      acuteEwma7d,
      chronicUncoupledEwma28d,
      ratio: null,
      status: 'no_data',
      statusLabel: 'Needs 3+ Active Days',
      colorHex: '#64748B',
      belowChronicFloor: false,
      weeklyMonotony,
      monotonyAlert,
      weeklyTotalStrain,
    };
  }

  // Minimum Chronic Load Floor (< 4.0) guards against false spikes right after a rest week
  if (chronicUncoupledEwma28d < 4.0) {
    return {
      acuteEwma7d,
      chronicUncoupledEwma28d,
      ratio: Number((acuteEwma7d / Math.max(4.0, chronicUncoupledEwma28d)).toFixed(2)),
      status: 'low_chronic_floor',
      statusLabel: 'Rebuilding Base (Low Chronic Floor)',
      colorHex: '#06B6D4',
      belowChronicFloor: true,
      weeklyMonotony,
      monotonyAlert,
      weeklyTotalStrain,
    };
  }

  const ratio = Number((acuteEwma7d / chronicUncoupledEwma28d).toFixed(2));
  if (ratio < 0.8) {
    return { acuteEwma7d, chronicUncoupledEwma28d, ratio, status: 'detraining', statusLabel: 'Tapering / Light', colorHex: '#818CF8', belowChronicFloor: false, weeklyMonotony, monotonyAlert, weeklyTotalStrain };
  }
  if (ratio <= 1.3) {
    return { acuteEwma7d, chronicUncoupledEwma28d, ratio, status: 'optimal', statusLabel: 'Balanced Build Zone', colorHex: '#10B981', belowChronicFloor: false, weeklyMonotony, monotonyAlert, weeklyTotalStrain };
  }
  if (ratio <= 1.5) {
    return { acuteEwma7d, chronicUncoupledEwma28d, ratio, status: 'building', statusLabel: 'High Overload', colorHex: '#F59E0B', belowChronicFloor: false, weeklyMonotony, monotonyAlert, weeklyTotalStrain };
  }
  return { acuteEwma7d, chronicUncoupledEwma28d, ratio, status: 'overreaching', statusLabel: 'Rapid Load Spike', colorHex: '#F43F5E', belowChronicFloor: false, weeklyMonotony, monotonyAlert, weeklyTotalStrain };
}

/**
 * Upgrade 6: Cardiovascular & Sleep Fitness Age (with Cooper 12-Min / 5K Field-Test VO2 Max calibration)
 */
export function computeFitnessAge(
  records: DailyBiometricRecord[],
  profile: UserProfile,
  windowDays: number = 30
): FitnessAgeMetrics {
  const slice = records.slice(-windowDays);
  const rhrValues = slice.map((r) => r.restingHrBpm).filter((v): v is number => v !== null && v > 0);
  const wearableVo2 = slice.map((r) => r.vo2MaxEstimate).filter((v): v is number => v !== null && v > 0);
  const sleepBedMinutes = slice
    .filter((r) => r.sleep?.bedtimeIso)
    .map((r) => {
      const d = new Date(r.sleep!.bedtimeIso!);
      let m = d.getHours() * 60 + d.getMinutes();
      if (m < 720) m += 1440;
      return m;
    });

  // Priority 1: Validated Cooper 12-Min Run Test => VO2max = (distance_m - 504.9) / 44.73
  // Priority 2: 5K Time Trial => velocity-based Daniels/Gilbert approximation
  // Priority 3: Wearable VO2 Max
  // Priority 4: Uth-Sørensen RHR ratio estimate
  let vo2MaxUsed: number | null = null;
  let vo2Source: FitnessAgeMetrics['vo2Source'] = 'rhr_estimate';

  if (profile.cooper12MinMeters && profile.cooper12MinMeters >= 1200) {
    vo2MaxUsed = Number(clamp((profile.cooper12MinMeters - 504.9) / 44.73, 22, 80).toFixed(1));
    vo2Source = 'field_test_cooper';
  } else if (profile.fiveKmTimeSeconds && profile.fiveKmTimeSeconds >= 780) {
    const mins = profile.fiveKmTimeSeconds / 60;
    const speedMPerMin = 5000 / mins;
    const vo2AtRace = -4.6 + 0.182258 * speedMPerMin + 0.000104 * speedMPerMin * speedMPerMin;
    const pctVo2Max = 0.8 + 0.1894393 * Math.exp(-0.012778 * mins) + 0.2989558 * Math.exp(-0.1932605 * mins);
    vo2MaxUsed = Number(clamp(vo2AtRace / Math.max(0.65, pctVo2Max), 22, 80).toFixed(1));
    vo2Source = 'field_test_5k';
  } else if (wearableVo2.length > 0) {
    vo2MaxUsed = Number(mean(wearableVo2).toFixed(1));
    vo2Source = 'wearable';
  } else if (rhrValues.length > 0) {
    const maxHr = getEffectiveMaxHr(profile);
    vo2MaxUsed = Number(clamp(15.3 * (maxHr / Math.max(42, mean(rhrValues))), 26, 70).toFixed(1));
    vo2Source = 'rhr_estimate';
  }

  if (vo2MaxUsed === null && rhrValues.length === 0) {
    return {
      hasEnoughData: false,
      chronologicalAge: profile.chronologicalAge,
      fitnessAge: null,
      deltaYears: null,
      healthspanPace: null,
      rhr30dAvg: null,
      vo2MaxUsed: null,
      vo2Source: 'rhr_estimate',
      sleepRegularityPct: null,
    };
  }

  const rhr30dAvg = rhrValues.length > 0 ? Number(mean(rhrValues).toFixed(1)) : null;
  const sleepRegularityPct =
    sleepBedMinutes.length >= 2 ? Math.round(clamp(100 - sampleStdDev(sleepBedMinutes) * 0.78, 35, 99)) : null;

  const expectedVo2 = 51.8 - profile.chronologicalAge * 0.35;
  const vo2DeltaYears = vo2MaxUsed !== null ? (expectedVo2 - vo2MaxUsed) * 0.34 : 0;
  const rhrDeltaYears = rhr30dAvg !== null ? (rhr30dAvg - 62) * 0.2 : 0;
  const sleepDeltaYears = sleepRegularityPct !== null ? (80 - sleepRegularityPct) * 0.05 : 0;

  const deltaYears = Number(clamp(vo2DeltaYears + rhrDeltaYears + sleepDeltaYears, -8.5, 8.5).toFixed(1));
  const fitnessAge = Number(Math.max(16, profile.chronologicalAge + deltaYears).toFixed(1));
  const healthspanPace = Number(clamp(1 + deltaYears * 0.045, 0.68, 1.35).toFixed(2));

  return {
    hasEnoughData: true,
    chronologicalAge: profile.chronologicalAge,
    fitnessAge,
    deltaYears,
    healthspanPace,
    rhr30dAvg,
    vo2MaxUsed,
    vo2Source,
    sleepRegularityPct,
  };
}

/**
 * Upgrade 6: Habit Correlation Engine with Minimum Sample Gates (>=7 with & >=7 without) + 95% CI
 */
export function computeHabitCorrelations(
  records: DailyBiometricRecord[],
  habits: HabitDefinition[],
  profile: UserProfile
): HabitCorrelationResult[] {
  const REQUIRED_MIN = 7;

  const dailyOutcomes = records.map((rec, idx) => {
    const recovery = computeAdaptiveRecovery(records, profile, idx).score;
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
      if (next.recovery !== null) (hasHabit ? withRec : withoutRec).push(next.recovery);
      if (next.deepPct !== null) (hasHabit ? withDeep : withoutDeep).push(next.deepPct);
      if (next.efficiencyPct !== null) (hasHabit ? withEff : withoutEff).push(next.efficiencyPct);
    }

    const unlocked = withRec.length >= REQUIRED_MIN && withoutRec.length >= REQUIRED_MIN;

    let recoveryDeltaPct = 0;
    let recoveryCi95 = 0;
    let deepSleepDeltaPct = 0;
    let deepSleepCi95 = 0;
    let sleepEfficiencyDeltaPct = 0;

    if (unlocked) {
      recoveryDeltaPct = Math.round(mean(withRec) - mean(withoutRec));
      const seRec = Math.sqrt(
        (sampleStdDev(withRec) ** 2) / withRec.length + (sampleStdDev(withoutRec) ** 2) / withoutRec.length
      );
      recoveryCi95 = Number((1.96 * seRec).toFixed(1));

      if (withDeep.length >= 4 && withoutDeep.length >= 4) {
        const baseDeep = Math.max(1, mean(withoutDeep));
        deepSleepDeltaPct = Math.round(((mean(withDeep) - baseDeep) / baseDeep) * 100);
        const seDeep = Math.sqrt(
          (sampleStdDev(withDeep) ** 2) / withDeep.length + (sampleStdDev(withoutDeep) ** 2) / withoutDeep.length
        );
        deepSleepCi95 = Number(((1.96 * seDeep / baseDeep) * 100).toFixed(1));
      }
      if (withEff.length >= 4 && withoutEff.length >= 4) {
        sleepEfficiencyDeltaPct = Math.round(mean(withEff) - mean(withoutEff));
      }
    }

    const minPair = Math.min(withRec.length, withoutRec.length);
    const confidence: HabitCorrelationResult['confidence'] = !unlocked
      ? 'locked'
      : minPair >= 14
        ? 'high'
        : 'moderate';

    results.push({
      habitId: habit.id,
      label: habit.label,
      category: habit.category,
      sampleDaysWith: withRec.length,
      sampleDaysWithout: withoutRec.length,
      requiredMinSamples: REQUIRED_MIN,
      unlocked,
      recoveryDeltaPct,
      recoveryCi95,
      deepSleepDeltaPct,
      deepSleepCi95,
      sleepEfficiencyDeltaPct,
      confidence,
    });
  }

  return results.sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    if (a.unlocked && b.unlocked) {
      return Math.abs(b.recoveryDeltaPct) - Math.abs(a.recoveryDeltaPct);
    }
    return (b.sampleDaysWith + b.sampleDaysWithout) - (a.sampleDaysWith + a.sampleDaysWithout);
  });
}

export function formatMinutesToHm(totalMin: number): string {
  const rounded = Math.max(0, Math.round(totalMin));
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
