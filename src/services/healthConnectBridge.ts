import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  ConnectedDevice,
  DailyBiometricRecord,
  HabitDefinition,
  HealthConnectDiagnostics,
  HourlyBiometricPoint,
  LabBiomarker,
  WearableBrandId,
  WorkoutRecord,
} from '../types/health';
import {
  buildHooperWellness,
  computeWorkoutStrainContribution,
  createEmptyDailyRecord,
} from '../utils/biometricsEngine';

interface NativeHealthConnectDay {
  date: string;
  steps: number;
  activeCaloriesKcal: number;
  restingHrBpm?: number;
  overnightHrvMs?: number;
  spo2Pct?: number;
  zone1Min: number;
  zone2Min: number;
  zone3Min: number;
  zone4Min: number;
  zone5Min: number;
  sleepBedtimeIso?: string;
  sleepWakeIso?: string;
  deepMin: number;
  remMin: number;
  lightMin: number;
  awakeMin: number;
  hourlyHr: number[];
  workouts: {
    id: string;
    title: string;
    startTime: string;
    durationMin: number;
    exerciseType: number;
    source: string;
  }[];
}

interface HealthConnectNativePlugin {
  checkAvailability(): Promise<{
    available: boolean;
    sdkStatus: number;
    statusLabel: string;
    grantedCount: number;
    totalRequested: number;
  }>;
  requestPermissions(): Promise<{ granted: boolean; grantedCount: number; totalRequested: number }>;
  openHealthConnectSettings(): Promise<{ opened: boolean }>;
  readBiometricsBundle(opts: { daysBack: number; maxHrBpm: number }): Promise<{
    syncedAt: string;
    grantedCount: number;
    totalRequested: number;
    rawRecordCount: number;
    sourcePackages: string[];
    days: NativeHealthConnectDay[];
  }>;
}

const NativeHealthConnect = registerPlugin<HealthConnectNativePlugin>('HealthConnect');

export interface WearablePreset {
  id: WearableBrandId;
  name: string;
  ecosystem: string;
  transport: ConnectedDevice['transport'];
  supportsOvernightHrv: boolean;
  setupSteps: string[];
  badgeText: string;
}

export const WEARABLE_PRESETS: WearablePreset[] = [
  {
    id: 'redmi_watch_5_lite',
    name: 'Redmi Watch 5 Lite',
    ecosystem: 'Xiaomi Mi Fitness → Android Health Connect',
    transport: 'health_connect_mi_fitness',
    supportsOvernightHrv: false,
    badgeText: 'Z-Score RHR + Sleep Proxy',
    setupSteps: [
      'Open Xiaomi Mi Fitness and sync your Redmi Watch 5 Lite so today’s sleep & HR are up to date.',
      'In Mi Fitness, go to Profile → Third-party Data → Health Connect and switch Sync ON.',
      'Return here and tap "Connect & Grant Permissions", then allow all read toggles in Android Health Connect.',
      'Tap "Sync Health Connect Now" to pull Steps, RHR, HR Zones, Sleep Stages, SpO2, and Workouts.',
    ],
  },
  {
    id: 'amazfit_zepp',
    name: 'Amazfit (Zepp)',
    ecosystem: 'Zepp App → Android Health Connect',
    transport: 'health_connect_zepp',
    supportsOvernightHrv: true,
    badgeText: 'Native Overnight HRV',
    setupSteps: [
      'Open Zepp App → Profile → Add Accounts → Health Connect.',
      'Allow Sleep, HRV, Resting HR, SpO2, and Workout sync.',
      'Return to AETHER and tap "Sync Health Connect Now".',
    ],
  },
  {
    id: 'fitbit_pixel',
    name: 'Pixel Watch / Fitbit',
    ecosystem: 'Google Health Connect Native',
    transport: 'health_connect_google',
    supportsOvernightHrv: true,
    badgeText: 'Native Overnight HRV',
    setupSteps: [
      'Open Fitbit App → Settings → Manage Connected Apps → Health Connect.',
      'Enable write permissions across biometric categories, then tap Sync in AETHER.',
    ],
  },
  {
    id: 'samsung_galaxy',
    name: 'Samsung Galaxy Watch',
    ecosystem: 'Samsung Health → Health Connect',
    transport: 'health_connect_samsung',
    supportsOvernightHrv: true,
    badgeText: 'Native Overnight HRV',
    setupSteps: [
      'Open Samsung Health → Settings → Health Connect → Allow all permissions.',
      'Tap "Sync Health Connect Now" in AETHER.',
    ],
  },
  {
    id: 'apple_watch',
    name: 'Apple Watch',
    ecosystem: 'Apple Health JSON/CSV Export',
    transport: 'apple_health_export',
    supportsOvernightHrv: true,
    badgeText: 'Offline File Importer',
    setupSteps: [
      'Export daily metrics as JSON or CSV and import via the Offline File Importer below.',
    ],
  },
  {
    id: 'ble_generic',
    name: 'Direct BLE HR Strap',
    ecosystem: 'Web Bluetooth (0x180D / 0x180F)',
    transport: 'web_bluetooth_ble',
    supportsOvernightHrv: true,
    badgeText: 'Live BPM, RR & Battery',
    setupSteps: [
      'Enable Heart Rate Broadcast on your BLE strap or watch, then tap "Scan & Pair BLE Sensor" below.',
    ],
  },
];

export const DEFAULT_HABIT_DEFINITIONS: HabitDefinition[] = [
  { id: 'magnesium', label: 'Magnesium Glycinate', category: 'recovery', expectedDirection: 'positive' },
  { id: 'sunlight', label: 'Morning Sunlight (15m)', category: 'sleep', expectedDirection: 'positive' },
  { id: 'caffeine_cutoff', label: 'Caffeine Cutoff < 2 PM', category: 'sleep', expectedDirection: 'positive' },
  { id: 'hydration_3l', label: 'Hydration ≥ 3.0L', category: 'nutrition', expectedDirection: 'positive' },
  { id: 'stretching', label: 'Mobility / Stretching', category: 'recovery', expectedDirection: 'positive' },
  { id: 'late_meal', label: 'Late Meal > 10 PM', category: 'nutrition', expectedDirection: 'negative' },
  { id: 'screen_bed', label: 'Screen in Bed', category: 'sleep', expectedDirection: 'negative' },
  { id: 'high_stress', label: 'High Exam / Work Stress', category: 'lifestyle', expectedDirection: 'negative' },
];

export const LAB_BIOMARKER_TEMPLATES: Omit<LabBiomarker, 'id' | 'value' | 'testedDate'>[] = [
  { name: 'Vitamin D3 (25-OH)', category: 'vitamins', unit: 'ng/mL', optimalMin: 45, optimalMax: 70, normalMin: 30, normalMax: 100 },
  { name: 'Vitamin B12', category: 'vitamins', unit: 'pg/mL', optimalMin: 500, optimalMax: 900, normalMin: 232, normalMax: 1245 },
  { name: 'Hemoglobin', category: 'hematology', unit: 'g/dL', optimalMin: 14.0, optimalMax: 16.5, normalMin: 13.0, normalMax: 17.5 },
  { name: 'Ferritin', category: 'hematology', unit: 'ng/mL', optimalMin: 70, optimalMax: 150, normalMin: 30, normalMax: 400 },
  { name: 'Fasting Glucose', category: 'metabolic', unit: 'mg/dL', optimalMin: 72, optimalMax: 88, normalMin: 65, normalMax: 99 },
  { name: 'LDL Cholesterol', category: 'lipids', unit: 'mg/dL', optimalMin: 50, optimalMax: 90, normalMin: 0, normalMax: 130 },
  { name: 'HDL Cholesterol', category: 'lipids', unit: 'mg/dL', optimalMin: 55, optimalMax: 85, normalMin: 40, normalMax: 100 },
  { name: 'hs-CRP', category: 'inflammation', unit: 'mg/L', optimalMin: 0, optimalMax: 0.8, normalMin: 0, normalMax: 3.0 },
];

export const DEMO_LAB_BIOMARKERS: LabBiomarker[] = [
  { id: 'demo_d3', name: 'Vitamin D3 (25-OH)', category: 'vitamins', value: 38, unit: 'ng/mL', optimalMin: 45, optimalMax: 70, normalMin: 30, normalMax: 100, testedDate: '2026-10-14', notes: 'Demo preview entry' },
  { id: 'demo_b12', name: 'Vitamin B12', category: 'vitamins', value: 610, unit: 'pg/mL', optimalMin: 500, optimalMax: 900, normalMin: 232, normalMax: 1245, testedDate: '2026-10-14', notes: 'Demo preview entry' },
  { id: 'demo_hb', name: 'Hemoglobin', category: 'hematology', value: 15.1, unit: 'g/dL', optimalMin: 14.0, optimalMax: 16.5, normalMin: 13.0, normalMax: 17.5, testedDate: '2026-10-14', notes: 'Demo preview entry' },
  { id: 'demo_glu', name: 'Fasting Glucose', category: 'metabolic', value: 84, unit: 'mg/dL', optimalMin: 72, optimalMax: 88, normalMin: 65, normalMax: 99, testedDate: '2026-10-14', notes: 'Demo preview entry' },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Strictly in-memory preview dataset ONLY if user flips Preview Demo Mode ON. */
export function generateDemoBiometricHistory(
  days: number = 35,
  includeOvernightHrv: boolean = false
): DailyBiometricRecord[] {
  const rand = mulberry32(20261127);
  const records: DailyBiometricRecord[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  let prevHabits: string[] = ['magnesium', 'sunlight', 'caffeine_cutoff'];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const isToday = i === 0;

    const hadMag = prevHabits.includes('magnesium');
    const hadLateMeal = prevHabits.includes('late_meal');
    const hadScreenBed = prevHabits.includes('screen_bed');
    const hadStress = prevHabits.includes('high_stress');

    const baseRhr = 55 - ((days - 1 - i) / Math.max(1, days - 1)) * 1.4;
    const restingHrBpm = Math.round(
      Math.max(46, Math.min(72, baseRhr + (hadLateMeal ? 3.2 : 0) + (hadStress ? 2.2 : 0) - (hadMag ? 1.8 : 0) + (rand() - 0.5) * 3))
    );
    const overnightHrvMs = includeOvernightHrv
      ? Math.round(Math.max(35, Math.min(110, 68 + (hadMag ? 7 : 0) - (hadLateMeal ? 8 : 0) + (rand() - 0.5) * 10)))
      : null;

    const totalSleepMin = Math.round(Math.max(345, Math.min(525, 452 - (hadScreenBed ? 26 : 0) + (rand() - 0.5) * 44)));
    const awakeMin = Math.round(16 + (hadScreenBed ? 12 : 0) + rand() * 12);
    const timeInBedMin = totalSleepMin + awakeMin;
    const deepMin = Math.round(totalSleepMin * (0.2 + (hadMag ? 0.032 : 0) - (hadLateMeal ? 0.025 : 0)));
    const remMin = Math.round(totalSleepMin * 0.22);
    const lightMin = Math.max(60, totalSleepMin - deepMin - remMin);

    const wakeDate = new Date(d);
    wakeDate.setHours(6, 40 + Math.round((rand() - 0.5) * 24), 0, 0);
    const bedDate = new Date(wakeDate.getTime() - timeInBedMin * 60000);

    const workouts: WorkoutRecord[] = [];
    if (isToday || rand() > 0.38) {
      const wDate = new Date(d);
      wDate.setHours(8, 15, 0, 0);
      const zones = isToday
        ? { zone1: 12, zone2: 20, zone3: 14, zone4: 6, zone5: 1 }
        : { zone1: 8, zone2: 18, zone3: 15, zone4: 7, zone5: 2 };
      const musc = isToday ? 52 : rand() > 0.5 ? 44 : 10;
      workouts.push({
        id: `demo_wk_${dateStr}`,
        date: dateStr,
        timestampIso: wDate.toISOString(),
        title: isToday ? 'Demo Upper Bodyweight & Core' : rand() > 0.5 ? 'Demo Mountain Bike Climb' : 'Demo Football Match',
        category: isToday ? 'strength' : 'cardio',
        durationMin: 48,
        avgHrBpm: 134,
        maxHrBpm: 172,
        activeCaloriesKcal: 420,
        hrZones: zones,
        sessionRpe: isToday ? 8 : 7,
        muscularLoadPoints: musc,
        computedStrainContribution: computeWorkoutStrainContribution(zones, musc, 48, 8),
        source: 'Demo Preview',
      });
    }

    const habitsLogged: string[] = isToday
      ? ['magnesium', 'sunlight', 'caffeine_cutoff', 'hydration_3l']
      : DEFAULT_HABIT_DEFINITIONS.filter((h) => {
          if (h.id === 'magnesium' || h.id === 'sunlight' || h.id === 'caffeine_cutoff') return rand() > 0.45;
          if (h.id === 'late_meal' || h.id === 'screen_bed') return rand() > 0.55;
          return rand() > 0.6;
        }).map((h) => h.id);

    const wellness = buildHooperWellness(
      totalSleepMin >= 440 ? 6 : 4,
      hadLateMeal ? 4 : 6,
      hadStress ? 5 : 2,
      workouts.length > 0 ? 3 : 2
    );

    const hourlySeries: HourlyBiometricPoint[] = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}:00`,
      hrBpm: h < 6 ? restingHrBpm : Math.round(restingHrBpm + 16 + rand() * 24),
      strainCumulative: Number(Math.min(14.2, h * 0.58).toFixed(1)),
      stressIndex: h < 6 ? 15 : Math.round(25 + rand() * 35),
    }));

    records.push({
      date: dateStr,
      restingHrBpm,
      overnightHrvMs,
      spo2Pct: Number((97.2 + rand() * 2.1).toFixed(1)),
      steps: Math.round(7200 + rand() * 4500),
      activeCaloriesKcal: Math.round(420 + rand() * 360),
      vo2MaxEstimate: Number((48.2 + (rand() - 0.5) * 0.8).toFixed(1)),
      sleep: {
        id: `demo_slp_${dateStr}`,
        date: dateStr,
        bedtimeIso: bedDate.toISOString(),
        wakeTimeIso: wakeDate.toISOString(),
        timeInBedMin,
        totalSleepMin,
        stages: { awakeMin, lightMin, deepMin, remMin },
        efficiencyPct: Number(((totalSleepMin / timeInBedMin) * 100).toFixed(1)),
        source: 'Demo Preview',
      },
      wellness,
      daytimeHrZones: { zone1: 28, zone2: 10, zone3: 2, zone4: 0, zone5: 0 },
      workouts,
      meals: isToday
        ? [
            {
              id: 'demo_m1',
              date: dateStr,
              timestampIso: new Date(new Date(d).setHours(9, 0, 0, 0)).toISOString(),
              name: 'Demo Breakfast Eggs & Bread',
              mealType: 'breakfast',
              calories: 440,
              proteinG: 26,
              carbsG: 46,
              fatG: 16,
            },
          ]
        : [],
      hydration: { waterMl: isToday ? 1500 : 2500, caffeineMg: isToday ? 60 : 100 },
      habitsLogged,
      hourlySeries,
      dataOrigin: 'demo',
    });

    prevHabits = habitsLogged;
  }
  return records;
}

export interface HealthConnectSyncResult {
  success: boolean;
  needsNativeApp?: boolean;
  summary: string;
  diagnostics: HealthConnectDiagnostics;
  syncedRecords?: DailyBiometricRecord[];
  highestObservedHr?: number;
}

export class HealthConnectManager {
  static isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  static async checkStatus(): Promise<HealthConnectDiagnostics> {
    if (!this.isNativeAndroid()) {
      return {
        sdkAvailable: false,
        statusLabel: 'WEB_BROWSER',
        grantedCount: 0,
        totalRequested: 8,
        lastRawRecordCount: 0,
        detectedSources: [],
      };
    }
    try {
      const status = await NativeHealthConnect.checkAvailability();
      return {
        sdkAvailable: status.available,
        statusLabel: status.statusLabel,
        grantedCount: status.grantedCount ?? 0,
        totalRequested: status.totalRequested ?? 8,
        lastRawRecordCount: 0,
        detectedSources: [],
      };
    } catch (err) {
      return {
        sdkAvailable: false,
        statusLabel: 'ERROR',
        grantedCount: 0,
        totalRequested: 8,
        lastRawRecordCount: 0,
        detectedSources: [],
        lastError: (err as Error).message,
      };
    }
  }

  static async openSettings(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      await NativeHealthConnect.openHealthConnectSettings();
      return true;
    } catch {
      return false;
    }
  }

  static async requestPermissionsAndSync(
    maxHrBpm: number,
    existingRecords: DailyBiometricRecord[]
  ): Promise<HealthConnectSyncResult> {
    if (!this.isNativeAndroid()) {
      return {
        success: false,
        needsNativeApp: true,
        summary: 'Android Health Connect runs inside the installed Android APK. In a browser, use BLE Pairing, File Import, or Manual Logging.',
        diagnostics: {
          sdkAvailable: false,
          statusLabel: 'WEB_BROWSER',
          grantedCount: 0,
          totalRequested: 8,
          lastRawRecordCount: 0,
          detectedSources: [],
        },
      };
    }

    try {
      const avail = await NativeHealthConnect.checkAvailability();
      if (!avail.available) {
        return {
          success: false,
          summary: 'Health Connect is unavailable or needs an update on this Android device.',
          diagnostics: {
            sdkAvailable: false,
            statusLabel: avail.statusLabel,
            grantedCount: 0,
            totalRequested: avail.totalRequested,
            lastRawRecordCount: 0,
            detectedSources: [],
          },
        };
      }

      if (avail.grantedCount === 0) {
        const perm = await NativeHealthConnect.requestPermissions();
        if (!perm.granted) {
          return {
            success: false,
            summary: 'Permissions were not granted. Allow read access in Health Connect to sync your watch.',
            diagnostics: {
              sdkAvailable: true,
              statusLabel: 'PERMISSIONS_DENIED',
              grantedCount: perm.grantedCount,
              totalRequested: perm.totalRequested,
              lastRawRecordCount: 0,
              detectedSources: [],
            },
          };
        }
      }

      const bundle = await NativeHealthConnect.readBiometricsBundle({ daysBack: 30, maxHrBpm });
      const existingByDate = new Map(existingRecords.map((r) => [r.date, r]));
      let highestObservedHr = 0;

      for (const hcDay of bundle.days) {
        const base = existingByDate.get(hcDay.date) ?? createEmptyDailyRecord(hcDay.date, 'health_connect');
        const totalSleepMin = hcDay.deepMin + hcDay.remMin + hcDay.lightMin;
        const timeInBedMin = totalSleepMin + hcDay.awakeMin;

        const sleepObj =
          totalSleepMin > 0
            ? {
                id: `hc_slp_${hcDay.date}`,
                date: hcDay.date,
                bedtimeIso: hcDay.sleepBedtimeIso ?? null,
                wakeTimeIso: hcDay.sleepWakeIso ?? null,
                timeInBedMin,
                totalSleepMin,
                stages: {
                  awakeMin: hcDay.awakeMin,
                  lightMin: hcDay.lightMin,
                  deepMin: hcDay.deepMin,
                  remMin: hcDay.remMin,
                },
                efficiencyPct: Number(((totalSleepMin / Math.max(1, timeInBedMin)) * 100).toFixed(1)),
                source: 'Android Health Connect',
              }
            : base.sleep;

        const manualWorkouts = base.workouts.filter((w) => !w.id.startsWith('hc_ex_'));
        const hcWorkouts: WorkoutRecord[] = hcDay.workouts.map((ex) => {
          const z = {
            zone1: Math.round(ex.durationMin * 0.2),
            zone2: Math.round(ex.durationMin * 0.35),
            zone3: Math.round(ex.durationMin * 0.3),
            zone4: Math.round(ex.durationMin * 0.12),
            zone5: Math.round(ex.durationMin * 0.03),
          };
          return {
            id: ex.id,
            date: hcDay.date,
            timestampIso: ex.startTime,
            title: ex.title,
            category: 'cardio',
            durationMin: ex.durationMin,
            avgHrBpm: 0,
            maxHrBpm: 0,
            activeCaloriesKcal: Math.round(ex.durationMin * 7),
            hrZones: z,
            muscularLoadPoints: 0,
            computedStrainContribution: computeWorkoutStrainContribution(z, 0, ex.durationMin),
            source: `Health Connect (${ex.source})`,
          };
        });

        const hourlySeries: HourlyBiometricPoint[] = (hcDay.hourlyHr || [])
          .map((bpm, hour) => {
            if (bpm > highestObservedHr && bpm <= 218) highestObservedHr = bpm;
            return { hour, label: `${String(hour).padStart(2, '0')}:00`, hrBpm: bpm, strainCumulative: 0, stressIndex: 0 };
          })
          .filter((p) => p.hrBpm > 0);

        existingByDate.set(hcDay.date, {
          ...base,
          restingHrBpm: hcDay.restingHrBpm ?? base.restingHrBpm,
          overnightHrvMs: hcDay.overnightHrvMs !== undefined ? Math.round(hcDay.overnightHrvMs) : base.overnightHrvMs,
          spo2Pct: hcDay.spo2Pct !== undefined ? Number(hcDay.spo2Pct.toFixed(1)) : base.spo2Pct,
          steps: hcDay.steps > 0 ? hcDay.steps : base.steps,
          activeCaloriesKcal: hcDay.activeCaloriesKcal > 0 ? hcDay.activeCaloriesKcal : base.activeCaloriesKcal,
          sleep: sleepObj,
          daytimeHrZones: {
            zone1: hcDay.zone1Min,
            zone2: hcDay.zone2Min,
            zone3: hcDay.zone3Min,
            zone4: hcDay.zone4Min,
            zone5: hcDay.zone5Min,
          },
          workouts: [...hcWorkouts, ...manualWorkouts],
          hourlySeries: hourlySeries.length > 0 ? hourlySeries : base.hourlySeries,
          dataOrigin: 'health_connect',
        });
      }

      const merged = Array.from(existingByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
      const sourcesText =
        bundle.sourcePackages.length > 0
          ? `Detected: ${bundle.sourcePackages.join(', ')}`
          : 'No watch data written to Health Connect yet (open Mi Fitness and sync first).';

      return {
        success: true,
        summary:
          bundle.days.length > 0
            ? `Synced ${bundle.days.length} days (${bundle.rawRecordCount} real records). ${sourcesText}`
            : `Connected (${bundle.grantedCount}/${bundle.totalRequested} channels), 0 watch records found yet. Sync Mi Fitness → Health Connect first.`,
        diagnostics: {
          sdkAvailable: true,
          statusLabel: 'CONNECTED',
          grantedCount: bundle.grantedCount,
          totalRequested: bundle.totalRequested,
          lastRawRecordCount: bundle.rawRecordCount,
          detectedSources: bundle.sourcePackages,
        },
        syncedRecords: merged,
        highestObservedHr: highestObservedHr >= 165 ? highestObservedHr : undefined,
      };
    } catch (err) {
      return {
        success: false,
        summary: `Health Connect error: ${(err as Error).message}`,
        diagnostics: {
          sdkAvailable: true,
          statusLabel: 'SYNC_ERROR',
          grantedCount: 0,
          totalRequested: 8,
          lastRawRecordCount: 0,
          detectedSources: [],
          lastError: (err as Error).message,
        },
      };
    }
  }
}

export interface BleLiveTelemetry {
  deviceName: string;
  bpm: number;
  rrIntervalMs?: number;
  batteryPct?: number;
}

export async function scanAndConnectBleHeartRate(
  onTelemetry: (data: BleLiveTelemetry) => void
): Promise<{ success: boolean; deviceName?: string; error?: string; disconnect?: () => void }> {
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestDevice: (options: Record<string, unknown>) => Promise<{
        name?: string;
        gatt?: {
          connect: () => Promise<{
            disconnect: () => void;
            getPrimaryService: (service: number | string) => Promise<{
              getCharacteristic: (char: number | string) => Promise<{
                readValue: () => Promise<DataView>;
                startNotifications: () => Promise<void>;
                addEventListener: (event: string, cb: (ev: Event) => void) => void;
              }>;
            }>;
          }>;
        };
      }>;
    };
  };

  if (!nav.bluetooth) {
    return {
      success: false,
      error: 'Web Bluetooth (0x180D) is unavailable in this WebView. Use Android Health Connect for Redmi Watch 5 Lite.',
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      filters: [{ services: ['heart_rate'] }],
      optionalServices: ['battery_service'],
    });
    if (!device.gatt) return { success: false, error: 'Selected BLE device exposes no GATT server.' };
    const server = await device.gatt.connect();
    const deviceName = device.name || 'BLE Heart Rate Sensor';

    let batteryPct: number | undefined;
    try {
      const battService = await server.getPrimaryService(0x180f);
      const battChar = await battService.getCharacteristic(0x2a19);
      const battVal = await battChar.readValue();
      batteryPct = battVal.getUint8(0);
    } catch {
      // Optional
    }

    const hrService = await server.getPrimaryService(0x180d);
    const hrChar = await hrService.getCharacteristic(0x2a37);
    await hrChar.startNotifications();
    hrChar.addEventListener('characteristicvaluechanged', (event: Event) => {
      const target = event.target as unknown as { value: DataView };
      const value = target.value;
      const flags = value.getUint8(0);
      const is16Bit = (flags & 0x01) !== 0;
      const hasEnergy = (flags & 0x08) !== 0;
      const hasRr = (flags & 0x10) !== 0;
      let offset = 1;
      const bpm = is16Bit ? value.getUint16(offset, true) : value.getUint8(offset);
      offset += is16Bit ? 2 : 1;
      if (hasEnergy) offset += 2;
      let rrIntervalMs: number | undefined;
      if (hasRr && value.byteLength >= offset + 2) {
        rrIntervalMs = Math.round((value.getUint16(offset, true) / 1024) * 1000);
      }
      onTelemetry({ deviceName, bpm, rrIntervalMs, batteryPct });
    });
    return { success: true, deviceName, disconnect: () => server.disconnect() };
  } catch (err) {
    return { success: false, error: (err as Error).message || 'BLE pairing canceled.' };
  }
}

export interface ImportedHealthRow {
  date: string;
  restingHrBpm?: number;
  overnightHrvMs?: number | null;
  spo2Pct?: number;
  steps?: number;
  activeCaloriesKcal?: number;
  deepMin?: number;
  remMin?: number;
  lightMin?: number;
  awakeMin?: number;
}

export function parseHealthExportFile(
  fileText: string,
  fileName: string
): { rows: ImportedHealthRow[]; error?: string } {
  try {
    const trimmed = fileText.trim();
    if (fileName.toLowerCase().endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : parsed.records || parsed.data || [parsed];
      const rows: ImportedHealthRow[] = arr
        .filter((item: Record<string, unknown>) => item && typeof item.date === 'string')
        .map((item: Record<string, unknown>) => ({
          date: String(item.date).slice(0, 10),
          restingHrBpm: item.restingHrBpm != null ? Number(item.restingHrBpm) : undefined,
          overnightHrvMs:
            item.overnightHrvMs === null
              ? null
              : item.overnightHrvMs != null
                ? Number(item.overnightHrvMs)
                : undefined,
          spo2Pct: item.spo2Pct != null ? Number(item.spo2Pct) : undefined,
          steps: item.steps != null ? Number(item.steps) : undefined,
          activeCaloriesKcal: item.activeCaloriesKcal != null ? Number(item.activeCaloriesKcal) : undefined,
          deepMin: item.deepMin != null ? Number(item.deepMin) : undefined,
          remMin: item.remMin != null ? Number(item.remMin) : undefined,
          lightMin: item.lightMin != null ? Number(item.lightMin) : undefined,
          awakeMin: item.awakeMin != null ? Number(item.awakeMin) : undefined,
        }));
      if (rows.length === 0) return { rows: [], error: 'No valid records with a "date" field found.' };
      return { rows };
    }

    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return { rows: [], error: 'CSV requires a header row and at least one data row.' };
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: ImportedHealthRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const getVal = (name: string) => {
        const idx = headers.indexOf(name.toLowerCase());
        return idx >= 0 && cols[idx] !== '' ? cols[idx] : undefined;
      };
      const dateVal = getVal('date');
      if (!dateVal) continue;
      rows.push({
        date: dateVal.slice(0, 10),
        restingHrBpm: getVal('restinghrbpm') ? Number(getVal('restinghrbpm')) : undefined,
        overnightHrvMs: getVal('overnighthrvms') ? Number(getVal('overnighthrvms')) : undefined,
        spo2Pct: getVal('spo2pct') ? Number(getVal('spo2pct')) : undefined,
        steps: getVal('steps') ? Number(getVal('steps')) : undefined,
        deepMin: getVal('deepmin') ? Number(getVal('deepmin')) : undefined,
        remMin: getVal('remmin') ? Number(getVal('remmin')) : undefined,
        lightMin: getVal('lightmin') ? Number(getVal('lightmin')) : undefined,
        awakeMin: getVal('awakemin') ? Number(getVal('awakemin')) : undefined,
      });
    }
    if (rows.length === 0) return { rows: [], error: 'No valid CSV rows found.' };
    return { rows };
  } catch (err) {
    return { rows: [], error: `Parse error: ${(err as Error).message}` };
  }
}
