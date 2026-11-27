export type WearableBrandId =
  | 'redmi_watch_5_lite'
  | 'amazfit_zepp'
  | 'fitbit_pixel'
  | 'samsung_galaxy'
  | 'apple_watch'
  | 'ble_generic';

export type IngestionTransport =
  | 'health_connect_mi_fitness'
  | 'health_connect_zepp'
  | 'health_connect_google'
  | 'health_connect_samsung'
  | 'apple_health_export'
  | 'web_bluetooth_ble'
  | 'file_import';

export interface SensorCapabilities {
  heartRate: 'active' | 'inactive';
  sleepStages: 'active' | 'inactive';
  spo2: 'active' | 'inactive';
  overnightHrv: 'active' | 'proxy_mode';
  stepsAndCalories: 'active' | 'inactive';
}

export interface HealthConnectDiagnostics {
  sdkAvailable: boolean;
  statusLabel: string;
  grantedCount: number;
  totalRequested: number;
  lastRawRecordCount: number;
  detectedSources: string[];
  lastError?: string;
}

export interface ConnectedDevice {
  id: WearableBrandId;
  name: string;
  ecosystem: string;
  transport: IngestionTransport;
  connected: boolean;
  batteryPct: number | null;
  lastSyncedIso: string | null;
  capabilities: SensorCapabilities;
  liveBleBpm?: number;
  liveBleRrMs?: number;
  healthConnect: HealthConnectDiagnostics;
}

/** Upgrade 2: Validated 15-Second Morning Hooper Wellness Check-In (1-7 scales) */
export interface HooperWellnessLog {
  /** 1 = Terrible sleep, 7 = Deeply restorative */
  sleepQuality: number;
  /** 1 = Completely exhausted, 7 = Fresh & energized (higher = better) */
  freshness: number;
  /** 1 = Calm & clear, 7 = Overwhelmed / high stress (higher = worse) */
  stress: number;
  /** 1 = Zero soreness, 7 = Severe muscle soreness (higher = worse) */
  soreness: number;
  /** Composite Hooper Index: 4 (best) to 28 (worst) = (8-sleepQ) + (8-freshness) + stress + soreness */
  hooperIndex: number;
  /** Normalized 0-100 wellness score (higher = better) */
  wellnessScore: number;
  loggedAtIso: string;
}

export interface SleepStageBreakdown {
  awakeMin: number;
  lightMin: number;
  deepMin: number;
  remMin: number;
}

export interface SleepSessionRecord {
  id: string;
  date: string;
  bedtimeIso: string | null;
  wakeTimeIso: string | null;
  timeInBedMin: number;
  totalSleepMin: number;
  stages: SleepStageBreakdown;
  efficiencyPct: number;
  source: string;
}

export interface HeartRateZonesMinutes {
  zone1: number;
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export interface StrengthExerciseSet {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  loadKg: number;
  isBodyweight: boolean;
  rpe: number;
  muscularLoadPoints: number;
}

export interface WorkoutRecord {
  id: string;
  date: string;
  timestampIso: string;
  title: string;
  category: 'cardio' | 'strength' | 'hiit' | 'mobility' | 'sport';
  durationMin: number;
  avgHrBpm: number;
  maxHrBpm: number;
  activeCaloriesKcal: number;
  hrZones: HeartRateZonesMinutes;
  /** Upgrade 4: Foster Session RPE (1-10) for lag-free anaerobic tracking */
  sessionRpe?: number;
  muscularLoadPoints: number;
  strengthSets?: StrengthExerciseSet[];
  computedStrainContribution: number;
  source: string;
}

export interface MealRecord {
  id: string;
  date: string;
  timestampIso: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface HydrationCaffeineLog {
  waterMl: number;
  caffeineMg: number;
  lastCaffeineIso?: string;
}

export interface HabitDefinition {
  id: string;
  label: string;
  category: 'recovery' | 'nutrition' | 'sleep' | 'lifestyle';
  expectedDirection: 'positive' | 'negative' | 'neutral';
}

export interface HourlyBiometricPoint {
  hour: number;
  label: string;
  hrBpm: number;
  strainCumulative: number;
  stressIndex: number;
}

export interface DailyBiometricRecord {
  date: string;
  restingHrBpm: number | null;
  overnightHrvMs: number | null;
  spo2Pct: number | null;
  steps: number;
  activeCaloriesKcal: number;
  vo2MaxEstimate: number | null;
  sleep: SleepSessionRecord | null;
  wellness: HooperWellnessLog | null;
  daytimeHrZones: HeartRateZonesMinutes;
  workouts: WorkoutRecord[];
  meals: MealRecord[];
  hydration: HydrationCaffeineLog;
  habitsLogged: string[];
  hourlySeries: HourlyBiometricPoint[];
  dataOrigin: 'health_connect' | 'manual' | 'imported' | 'demo';
}

export type RecoveryState = 'optimal' | 'moderate' | 'low' | 'no_data';
export type RecoveryMode = 'hrv_native' | 'rhr_sleep_proxy' | 'awaiting_data';
export type SwcBandStatus = 'normal_noise' | 'positive_shift' | 'elevated_strain' | 'parasympathetic_alert' | 'insufficient';

export interface RecoveryBreakdown {
  score: number | null;
  state: RecoveryState;
  mode: RecoveryMode;
  badgeLabel: string;
  colorHex: string;
  /** Upgrade 1: Personal 30d Mean, SD, Z-score & SWC (±0.5σ) status */
  rhrMean30d: number | null;
  rhrSd30d: number | null;
  rhrDeltaBpm: number | null;
  rhrZScore: number | null;
  swcStatus: SwcBandStatus;
  swcLabel: string;
  hrvMean30d: number | null;
  hrvSd30d: number | null;
  hrvZScore: number | null;
  restorativeSleepPct: number | null;
  sleepEfficiencyPct: number | null;
  sleepPerformancePct: number | null;
  /** Upgrade 2: Perception Override when wearable looks green but Hooper Fatigue/Soreness spike */
  perceptionOverrideActive: boolean;
  perceptionOverrideReason: string | null;
  components: {
    label: string;
    weightPct: number;
    contribution: number;
    detail: string;
  }[];
}

/** Upgrade 4: Dual Cardio + Muscular Strain sub-bars */
export interface StrainBreakdown {
  score: number;
  cardioScore: number; // 0-21 cardio component
  muscularScore: number; // 0-21 muscular/soreness component
  cardioLoadUnits: number;
  sessionRpeLoadUnits: number;
  muscularLoadUnits: number;
  muscularStrainBoost: number;
  zoneMinutes: HeartRateZonesMinutes;
  targetRange: [number, number];
  label: string;
}

/** Upgrade 5: Adaptive Personal Sleep Need & 7-Day Sleep Regularity Score */
export interface SleepDebtPlan {
  hasSleepData: boolean;
  personalBaselineNeedMin: number;
  isAutoCalibratedNeed: boolean;
  rolling7dDebtMin: number;
  todayStrainAdjustmentMin: number;
  recommendedDurationMin: number;
  targetWakeTime: string;
  recommendedBedtime: string;
  bedtimeShiftCappedNote: string | null;
  sleepPerformancePct: number | null;
  regularityScorePct: number | null; // 7-day bedtime/waketime consistency (0-100)
  regularityLabel: string;
}

/** Upgrade 3: Uncoupled EWMA + Minimum Chronic Floor + Training Monotony */
export type WorkloadStatus = 'detraining' | 'optimal' | 'building' | 'overreaching' | 'low_chronic_floor' | 'no_data';

export interface CardioLoadEwma {
  acuteEwma7d: number;
  chronicUncoupledEwma28d: number;
  ratio: number | null;
  status: WorkloadStatus;
  statusLabel: string;
  colorHex: string;
  belowChronicFloor: boolean;
  weeklyMonotony: number | null;
  monotonyAlert: boolean;
  weeklyTotalStrain: number;
}

/** Upgrade 6: Honestly framed Cardiovascular & Sleep Fitness Age + Field-Test VO2 Max */
export interface FitnessAgeMetrics {
  hasEnoughData: boolean;
  chronologicalAge: number;
  fitnessAge: number | null;
  deltaYears: number | null;
  healthspanPace: number | null;
  rhr30dAvg: number | null;
  vo2MaxUsed: number | null;
  vo2Source: 'field_test_cooper' | 'field_test_5k' | 'wearable' | 'rhr_estimate';
  sleepRegularityPct: number | null;
}

/** Upgrade 6: Habit Correlation Engine with Minimum Sample Gates & 95% Confidence Intervals */
export interface HabitCorrelationResult {
  habitId: string;
  label: string;
  category: HabitDefinition['category'];
  sampleDaysWith: number;
  sampleDaysWithout: number;
  requiredMinSamples: number;
  unlocked: boolean;
  recoveryDeltaPct: number;
  recoveryCi95: number;
  deepSleepDeltaPct: number;
  deepSleepCi95: number;
  sleepEfficiencyDeltaPct: number;
  confidence: 'high' | 'moderate' | 'locked';
}

export interface LabBiomarker {
  id: string;
  name: string;
  category: 'vitamins' | 'hematology' | 'lipids' | 'metabolic' | 'inflammation';
  value: number;
  unit: string;
  optimalMin: number;
  optimalMax: number;
  normalMin: number;
  normalMax: number;
  testedDate: string;
  notes?: string;
}

export interface UserProfile {
  name: string;
  chronologicalAge: number;
  /** Upgrade 4: Observed Peak HR overrides 220-Age */
  observedMaxHrBpm: number | null;
  bodyWeightKg: number;
  /** Upgrade 5: Adaptive Personal Sleep Need */
  personalSleepNeedMin: number;
  autoCalibrateSleepNeed: boolean;
  targetWakeTime: string;
  dailyWaterGoalMl: number;
  dailyCalorieGoal: number;
  /** Upgrade 6: Field-test VO2 calibration */
  cooper12MinMeters: number | null;
  fiveKmTimeSeconds: number | null;
  geminiApiKey: string;
}

export interface MorningBriefing {
  headline: string;
  summary: string;
  actionItems: string[];
  generatedBy: 'gemini' | 'aether_heuristic';
  generatedAtIso: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestampIso: string;
}

export interface AetherAppState {
  profile: UserProfile;
  device: ConnectedDevice;
  demoSimulatorEnabled: boolean;
  records: DailyBiometricRecord[];
  habitDefinitions: HabitDefinition[];
  labBiomarkers: LabBiomarker[];
  coachHistory: CoachMessage[];
}

export type ActiveTab = 'today' | 'biology' | 'log' | 'system';

export type DedicatedPageId =
  | null
  | 'recovery'
  | 'strain'
  | 'sleep'
  | 'fitness_age'
  | 'habits_lab'
  | 'trends'
  | 'devices'
  | 'lab_vault'
  | 'settings'
  | 'science_docs';
