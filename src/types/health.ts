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

export interface ConnectedDevice {
  id: WearableBrandId;
  name: string;
  ecosystem: string;
  transport: IngestionTransport;
  connected: boolean;
  batteryPct: number;
  lastSyncedIso: string;
  capabilities: SensorCapabilities;
  liveBleBpm?: number;
  liveBleRrMs?: number;
}

export interface SleepStageBreakdown {
  awakeMin: number;
  lightMin: number;
  deepMin: number;
  remMin: number;
}

export interface SleepSessionRecord {
  id: string;
  date: string; // YYYY-MM-DD (morning wake date)
  bedtimeIso: string;
  wakeTimeIso: string;
  timeInBedMin: number;
  totalSleepMin: number;
  stages: SleepStageBreakdown;
  efficiencyPct: number; // totalSleepMin / timeInBedMin * 100
  source: string;
}

export interface HeartRateZonesMinutes {
  zone1: number; // 50-60% Max HR
  zone2: number; // 60-70% Max HR
  zone3: number; // 70-80% Max HR
  zone4: number; // 80-90% Max HR
  zone5: number; // 90-100% Max HR
}

export interface StrengthExerciseSet {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  loadKg: number; // 0 when bodyweight
  isBodyweight: boolean;
  rpe: number; // 1-10
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
  hour: number; // 0..23
  label: string;
  hrBpm: number;
  strainCumulative: number;
  stressIndex: number; // 0-100
}

export interface DailyBiometricRecord {
  date: string; // YYYY-MM-DD
  restingHrBpm: number;
  overnightHrvMs: number | null; // null on Redmi Watch 5 Lite -> triggers Proxy Mode
  spo2Pct: number;
  steps: number;
  activeCaloriesKcal: number;
  vo2MaxEstimate: number;
  sleep: SleepSessionRecord;
  daytimeHrZones: HeartRateZonesMinutes;
  workouts: WorkoutRecord[];
  meals: MealRecord[];
  hydration: HydrationCaffeineLog;
  habitsLogged: string[]; // HabitDefinition ids active on this day
  hourlySeries: HourlyBiometricPoint[];
}

export type RecoveryState = 'optimal' | 'moderate' | 'low';
export type RecoveryMode = 'hrv_native' | 'rhr_sleep_proxy';

export interface RecoveryBreakdown {
  score: number; // 0-100
  state: RecoveryState;
  mode: RecoveryMode;
  badgeLabel: string;
  colorHex: string;
  rhrBaseline30d: number;
  rhrDeltaBpm: number;
  hrvBaseline30d: number | null;
  hrvDeltaPct: number | null;
  restorativeSleepPct: number;
  sleepEfficiencyPct: number;
  sleepPerformancePct: number;
  components: {
    label: string;
    weightPct: number;
    contribution: number;
    detail: string;
  }[];
}

export interface StrainBreakdown {
  score: number; // 0-21 logarithmic
  cardioLoadUnits: number;
  muscularLoadUnits: number;
  muscularStrainBoost: number;
  zoneMinutes: HeartRateZonesMinutes;
  targetRange: [number, number];
  label: string;
}

export interface SleepDebtPlan {
  rolling7dDebtMin: number;
  baselineNeedMin: number;
  todayStrainAdjustmentMin: number;
  recommendedDurationMin: number;
  targetWakeTime: string; // HH:MM
  recommendedBedtime: string; // HH:MM
  sleepPerformancePct: number;
}

export type AcwrStatus = 'detraining' | 'optimal' | 'building' | 'overreaching';

export interface CardioLoadAcwr {
  acute7dAvg: number;
  chronic28dAvg: number;
  ratio: number;
  status: AcwrStatus;
  statusLabel: string;
  colorHex: string;
}

export interface BiologicalAgeMetrics {
  chronologicalAge: number;
  biologicalAge: number;
  deltaYears: number; // negative = younger than chronological age
  healthspanPace: number; // e.g., 0.84x
  rhr30dAvg: number;
  vo2Max30dAvg: number;
  sleepConsistencyPct: number;
}

export interface HabitCorrelationResult {
  habitId: string;
  label: string;
  category: HabitDefinition['category'];
  sampleDaysWith: number;
  sampleDaysWithout: number;
  recoveryDeltaPct: number; // e.g., +8 or -9
  deepSleepDeltaPct: number; // e.g., +12 or -6
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
  targetWakeTime: string; // "06:45"
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
  demoSimulatorEnabled: boolean;
  records: DailyBiometricRecord[]; // chronologically ascending (oldest -> today)
  habitDefinitions: HabitDefinition[];
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
