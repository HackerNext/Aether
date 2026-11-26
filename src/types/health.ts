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
  /** Only populated when a real BLE device reports 0x180F battery; Health Connect does not provide watch battery. */
  batteryPct: number | null;
  lastSyncedIso: string | null;
  capabilities: SensorCapabilities;
  liveBleBpm?: number;
  liveBleRrMs?: number;
  healthConnect: HealthConnectDiagnostics;
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
  icon: string;
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
  date: string; // YYYY-MM-DD
  restingHrBpm: number | null;
  overnightHrvMs: number | null;
  spo2Pct: number | null;
  steps: number;
  activeCaloriesKcal: number;
  vo2MaxEstimate: number | null;
  sleep: SleepSessionRecord | null;
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

export interface RecoveryBreakdown {
  score: number | null;
  state: RecoveryState;
  mode: RecoveryMode;
  badgeLabel: string;
  colorHex: string;
  rhrBaseline30d: number | null;
  rhrDeltaBpm: number | null;
  hrvBaseline30d: number | null;
  hrvDeltaPct: number | null;
  restorativeSleepPct: number | null;
  sleepEfficiencyPct: number | null;
  sleepPerformancePct: number | null;
  components: {
    label: string;
    weightPct: number;
    contribution: number;
    detail: string;
  }[];
}

export interface StrainBreakdown {
  score: number;
  cardioLoadUnits: number;
  muscularLoadUnits: number;
  muscularStrainBoost: number;
  zoneMinutes: HeartRateZonesMinutes;
  targetRange: [number, number];
  label: string;
}

export interface SleepDebtPlan {
  hasSleepData: boolean;
  rolling7dDebtMin: number;
  baselineNeedMin: number;
  todayStrainAdjustmentMin: number;
  recommendedDurationMin: number;
  targetWakeTime: string;
  recommendedBedtime: string;
  sleepPerformancePct: number | null;
}

export type AcwrStatus = 'detraining' | 'optimal' | 'building' | 'overreaching' | 'no_data';

export interface CardioLoadAcwr {
  acute7dAvg: number;
  chronic28dAvg: number;
  ratio: number | null;
  status: AcwrStatus;
  statusLabel: string;
  colorHex: string;
}

export interface BiologicalAgeMetrics {
  hasEnoughData: boolean;
  chronologicalAge: number;
  biologicalAge: number | null;
  deltaYears: number | null;
  healthspanPace: number | null;
  rhr30dAvg: number | null;
  vo2Max30dAvg: number | null;
  sleepConsistencyPct: number | null;
}

export interface HabitCorrelationResult {
  habitId: string;
  label: string;
  category: HabitDefinition['category'];
  sampleDaysWith: number;
  sampleDaysWithout: number;
  recoveryDeltaPct: number;
  deepSleepDeltaPct: number;
  sleepEfficiencyDeltaPct: number;
  confidence: 'high' | 'moderate' | 'emerging';
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
  maxHrBpm: number;
  bodyWeightKg: number;
  targetWakeTime: string;
  dailyWaterGoalMl: number;
  dailyCalorieGoal: number;
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
  /** Always false by default so zero boilerplate data appears unless the user opts into Preview Demo Mode. */
  demoSimulatorEnabled: boolean;
  /** User's real persisted biometric records (starts empty [] until Health Connect sync or manual log). */
  records: DailyBiometricRecord[];
  habitDefinitions: HabitDefinition[];
  /** User's real persisted blood lab biomarkers (starts empty [] until user enters real results). */
  labBiomarkers: LabBiomarker[];
  coachHistory: CoachMessage[];
}

export type ActiveTab = 'today' | 'biology' | 'log' | 'devices';
export type DrilldownMetricType =
  | 'recovery'
  | 'strain'
  | 'sleep'
  | 'sleep_debt'
  | 'acwr'
  | 'rhr'
  | 'bio_age'
  | null;
