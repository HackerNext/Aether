import React, { useEffect, useMemo, useState } from 'react';
import {
  BatteryMedium,
  Compass,
  Plus,
  RefreshCw,
  Shield,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import {
  ActiveTab,
  AetherAppState,
  DailyBiometricRecord,
  DrilldownMetricType,
  HabitDefinition,
  LabBiomarker,
  MealRecord,
  MorningBriefing,
  UserProfile,
  WearableBrandId,
  WorkoutRecord,
} from './types/health';
import { clearAetherState, loadAetherState, saveAetherState } from './services/storageService';
import {
  BleLiveTelemetry,
  DEFAULT_HABIT_DEFINITIONS,
  DEMO_LAB_BIOMARKERS,
  generateDemoBiometricHistory,
  HealthConnectManager,
  ImportedHealthRow,
  WEARABLE_PRESETS,
} from './services/healthConnectBridge';
import {
  computeAdaptiveRecovery,
  computeBiologicalAge,
  computeCardioLoadAcwr,
  computeDailyStrain,
  computeHabitCorrelations,
  computeSleepDebtPlan,
  createEmptyDailyRecord,
  getTodayDateStr,
} from './utils/biometricsEngine';
import {
  askAetherCoach,
  BiometricContextBundle,
  generateGeminiBriefing,
  generateOfflineMorningBriefing,
} from './services/aiCoachService';
import { RadialGauges } from './components/RadialGauges';
import { DetailedFeatureSections } from './components/DetailedFeatureSections';
import { MetricDrilldownSheet } from './components/MetricDrilldownSheet';
import { AICoachDrawer } from './components/AICoachDrawer';
import { TimelineFeed } from './components/TimelineFeed';
import { ScrubbableCharts } from './components/ScrubbableCharts';
import { HabitCorrelations } from './components/HabitCorrelations';
import { QuickLogHub } from './components/QuickLogHub';
import { DeviceSyncWizard } from './components/DeviceSyncWizard';
import { LabVault } from './components/LabVault';
import { ManualVitalsPayload } from './components/ManualVitalsLogger';

function createCleanInitialState(): AetherAppState {
  const redmi = WEARABLE_PRESETS[0];
  return {
    profile: {
      name: 'User',
      chronologicalAge: 20,
      maxHrBpm: 200,
      bodyWeightKg: 59,
      targetWakeTime: '06:45',
      dailyWaterGoalMl: 3000,
      dailyCalorieGoal: 2300,
      geminiApiKey: '',
    },
    device: {
      id: redmi.id,
      name: redmi.name,
      ecosystem: redmi.ecosystem,
      transport: redmi.transport,
      connected: false,
      batteryPct: null,
      lastSyncedIso: null,
      capabilities: {
        heartRate: 'active',
        sleepStages: 'active',
        spo2: 'active',
        overnightHrv: 'proxy_mode',
        stepsAndCalories: 'active',
      },
      healthConnect: {
        sdkAvailable: false,
        statusLabel: 'NOT_CHECKED',
        grantedCount: 0,
        totalRequested: 8,
        lastRawRecordCount: 0,
        detectedSources: [],
      },
    },
    demoSimulatorEnabled: false,
    records: [],
    habitDefinitions: DEFAULT_HABIT_DEFINITIONS,
    labBiomarkers: [],
    coachHistory: [
      {
        id: 'welcome_clean',
        role: 'assistant',
        content:
          'AETHER starts clean with zero fake data. Connect Android Health Connect in the Vault tab (for Redmi Watch 5 Lite / Mi Fitness) or log your own vitals, habits, and workouts in + Log.',
        timestampIso: new Date().toISOString(),
      },
    ],
  };
}

function formatSyncAgo(iso: string | null): string {
  if (!iso) return 'Not synced';
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin === 0) return 'Synced just now';
  if (diffMin < 60) return `Synced ${diffMin}m ago`;
  return `Synced ${Math.floor(diffMin / 60)}h ago`;
}

export default function App() {
  const [state, setState] = useState<AetherAppState>(() => loadAetherState() ?? createCleanInitialState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [drilldownMetric, setDrilldownMetric] = useState<DrilldownMetricType>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);

  // Persist real user state cleanly inside aether_os_v2::
  useEffect(() => {
    saveAetherState(state);
  }, [state]);

  // Check real Android Health Connect availability on launch (never fakes connected!)
  useEffect(() => {
    HealthConnectManager.checkStatus().then((diag) => {
      setState((prev) => ({
        ...prev,
        device: {
          ...prev.device,
          connected: diag.sdkAvailable && diag.grantedCount > 0 ? prev.device.connected : false,
          healthConnect: {
            ...prev.device.healthConnect,
            sdkAvailable: diag.sdkAvailable,
            statusLabel: diag.statusLabel,
            grantedCount: diag.grantedCount,
            totalRequested: diag.totalRequested,
          },
        },
      }));
    });
  }, []);

  // Optional Demo Preview data is kept strictly in memory — NEVER pollutes real saved records or Lab Vault!
  const demoRecords = useMemo(
    () =>
      state.demoSimulatorEnabled
        ? generateDemoBiometricHistory(30, state.device.capabilities.overnightHrv === 'active')
        : [],
    [state.demoSimulatorEnabled, state.device.capabilities.overnightHrv]
  );

  const activeRecords = state.demoSimulatorEnabled ? demoRecords : state.records;
  const activeBiomarkers = state.demoSimulatorEnabled ? DEMO_LAB_BIOMARKERS : state.labBiomarkers;
  const todayStr = getTodayDateStr();
  const today: DailyBiometricRecord | null = useMemo(() => {
    if (activeRecords.length === 0) return null;
    const exact = activeRecords.find((r) => r.date === todayStr);
    return exact ?? activeRecords[activeRecords.length - 1];
  }, [activeRecords, todayStr]);

  const recovery = useMemo(() => computeAdaptiveRecovery(activeRecords), [activeRecords]);
  const strain = useMemo(() => computeDailyStrain(today, recovery.score), [today, recovery.score]);
  const sleepPlan = useMemo(
    () => computeSleepDebtPlan(activeRecords, state.profile.targetWakeTime),
    [activeRecords, state.profile.targetWakeTime]
  );
  const acwr = useMemo(() => computeCardioLoadAcwr(activeRecords), [activeRecords]);
  const bioAge = useMemo(
    () => computeBiologicalAge(activeRecords, state.profile, 30),
    [activeRecords, state.profile]
  );
  const correlations = useMemo(
    () => computeHabitCorrelations(activeRecords, state.habitDefinitions),
    [activeRecords, state.habitDefinitions]
  );

  const aiContext: BiometricContextBundle = useMemo(
    () => ({
      profile: state.profile,
      device: state.device,
      today,
      recovery,
      strain,
      sleepPlan,
      acwr,
      bioAge,
      topCorrelations: correlations,
    }),
    [state.profile, state.device, today, recovery, strain, sleepPlan, acwr, bioAge, correlations]
  );

  const [briefing, setBriefing] = useState<MorningBriefing>(() =>
    generateOfflineMorningBriefing(aiContext)
  );

  useEffect(() => {
    if (briefing.generatedBy !== 'gemini') {
      setBriefing(generateOfflineMorningBriefing(aiContext));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recovery.score, strain.score, sleepPlan.rolling7dDebtMin, state.demoSimulatorEnabled, activeRecords.length]);

  const mutateTodayReal = (updater: (rec: DailyBiometricRecord) => DailyBiometricRecord) => {
    setState((prev) => {
      const dateKey = getTodayDateStr();
      const idx = prev.records.findIndex((r) => r.date === dateKey);
      const next = [...prev.records];
      if (idx >= 0) {
        next[idx] = updater(next[idx]);
      } else {
        next.push(updater(createEmptyDailyRecord(dateKey, 'manual')));
        next.sort((a, b) => a.date.localeCompare(b.date));
      }
      return { ...prev, demoSimulatorEnabled: false, records: next };
    });
  };

  const handleSyncHealthConnect = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const res = await HealthConnectManager.requestPermissionsAndSync(
        state.profile.maxHrBpm,
        state.records
      );
      setSyncMessage(res.summary);
      setState((prev) => ({
        ...prev,
        demoSimulatorEnabled: res.success ? false : prev.demoSimulatorEnabled,
        device: {
          ...prev.device,
          connected: res.success,
          lastSyncedIso: res.success ? new Date().toISOString() : prev.device.lastSyncedIso,
          healthConnect: res.diagnostics,
        },
        records: res.success && res.syncedRecords ? res.syncedRecords : prev.records,
      }));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectWearable = (brandId: WearableBrandId) => {
    const preset = WEARABLE_PRESETS.find((p) => p.id === brandId);
    if (!preset) return;
    setState((prev) => ({
      ...prev,
      device: {
        ...prev.device,
        id: preset.id,
        name: preset.name,
        ecosystem: preset.ecosystem,
        transport: preset.transport,
        capabilities: {
          ...prev.device.capabilities,
          overnightHrv: preset.supportsOvernightHrv ? 'active' : 'proxy_mode',
        },
      },
    }));
  };

  const handleBleTelemetry = (telemetry: BleLiveTelemetry) => {
    setState((prev) => ({
      ...prev,
      device: {
        ...prev.device,
        connected: true,
        name: telemetry.deviceName,
        transport: 'web_bluetooth_ble',
        liveBleBpm: telemetry.bpm,
        liveBleRrMs: telemetry.rrIntervalMs,
        batteryPct: telemetry.batteryPct ?? prev.device.batteryPct,
        lastSyncedIso: new Date().toISOString(),
      },
    }));
  };

  const handleImportRows = (rows: ImportedHealthRow[]) => {
    setState((prev) => {
      const map = new Map(prev.records.map((r) => [r.date, r]));
      for (const row of rows) {
        const existing = map.get(row.date) ?? createEmptyDailyRecord(row.date, 'imported');
        const deepMin = row.deepMin ?? existing.sleep?.stages.deepMin ?? 0;
        const remMin = row.remMin ?? existing.sleep?.stages.remMin ?? 0;
        const lightMin = row.lightMin ?? existing.sleep?.stages.lightMin ?? 0;
        const awakeMin = row.awakeMin ?? existing.sleep?.stages.awakeMin ?? 0;
        const totalSleepMin = deepMin + remMin + lightMin;
        const timeInBedMin = totalSleepMin + awakeMin;

        map.set(row.date, {
          ...existing,
          restingHrBpm: row.restingHrBpm ?? existing.restingHrBpm,
          overnightHrvMs: row.overnightHrvMs !== undefined ? row.overnightHrvMs : existing.overnightHrvMs,
          spo2Pct: row.spo2Pct ?? existing.spo2Pct,
          steps: row.steps ?? existing.steps,
          activeCaloriesKcal: row.activeCaloriesKcal ?? existing.activeCaloriesKcal,
          sleep:
            totalSleepMin > 0
              ? {
                  id: `imp_slp_${row.date}`,
                  date: row.date,
                  bedtimeIso: null,
                  wakeTimeIso: null,
                  totalSleepMin,
                  timeInBedMin,
                  efficiencyPct: Number(((totalSleepMin / Math.max(1, timeInBedMin)) * 100).toFixed(1)),
                  stages: { awakeMin, lightMin, deepMin, remMin },
                  source: 'Imported File',
                }
              : existing.sleep,
          dataOrigin: 'imported',
        });
      }
      return {
        ...prev,
        demoSimulatorEnabled: false,
        records: Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  };

  const handleExportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-backup-${getTodayDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveManualVitals = (payload: ManualVitalsPayload) => {
    mutateTodayReal((rec) => {
      const totalSleepMin = Math.round(payload.sleepHours * 60);
      const lightMin = Math.max(0, totalSleepMin - payload.deepMin - payload.remMin);
      const timeInBedMin = totalSleepMin + payload.awakeMin;
      return {
        ...rec,
        restingHrBpm: payload.restingHrBpm ?? rec.restingHrBpm,
        spo2Pct: payload.spo2Pct ?? rec.spo2Pct,
        steps: payload.steps > 0 ? payload.steps : rec.steps,
        sleep:
          totalSleepMin > 0
            ? {
                id: `man_slp_${rec.date}`,
                date: rec.date,
                bedtimeIso: null,
                wakeTimeIso: null,
                totalSleepMin,
                timeInBedMin,
                efficiencyPct: Number(((totalSleepMin / Math.max(1, timeInBedMin)) * 100).toFixed(1)),
                stages: {
                  awakeMin: payload.awakeMin,
                  lightMin,
                  deepMin: payload.deepMin,
                  remMin: payload.remMin,
                },
                source: 'Manual Entry',
              }
            : rec.sleep,
      };
    });
  };

  const handleRefreshBriefing = async () => {
    setIsRefreshingBriefing(true);
    try {
      setBriefing(await generateGeminiBriefing(aiContext));
    } finally {
      setIsRefreshingBriefing(false);
    }
  };

  const handleAskCoach = async (question: string) => {
    const userMsg = {
      id: `u_${Date.now()}`,
      role: 'user' as const,
      content: question,
      timestampIso: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, coachHistory: [...prev.coachHistory, userMsg] }));
    const reply = await askAetherCoach(question, aiContext);
    setState((prev) => ({
      ...prev,
      coachHistory: [
        ...prev.coachHistory,
        { id: `a_${Date.now()}`, role: 'assistant', content: reply, timestampIso: new Date().toISOString() },
      ],
    }));
  };

  const statusText = state.demoSimulatorEnabled
    ? 'DEMO MODE • Viewing Sample Data'
    : state.device.connected
      ? `${state.device.name} • ${formatSyncAgo(state.device.lastSyncedIso)}`
      : 'No Wearable Connected • Tap to Connect Health Connect';

  return (
    <div className="min-h-screen bg-[#07090D] text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-gradient-to-b from-emerald-500/[0.06] via-cyan-500/[0.02] to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-4 pb-28 pt-4">
        {/* Top Header & 100% Honest Connection Status Pill */}
        <header className="mb-4 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-emeraldGlow" />
              </div>
              <span className="text-sm font-bold tracking-[0.22em] text-white">AETHER</span>
            </div>
            <span className="tabular-mono text-xs text-slate-400">
              {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => (state.device.connected ? handleSyncHealthConnect() : setActiveTab('devices'))}
            className={`aether-glass flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left transition active:scale-[0.99] ${
              state.demoSimulatorEnabled
                ? 'border-amber-400/40 bg-amber-500/10'
                : state.device.connected
                  ? 'border-emerald-500/25'
                  : 'border-white/10'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              {state.demoSimulatorEnabled ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              ) : state.device.connected ? (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              ) : (
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-500" />
              )}
              <span className="truncate text-xs font-medium text-slate-200">{statusText}</span>
            </div>

            <div className="ml-2 flex shrink-0 items-center gap-2 text-slate-400">
              {/* Battery % is ONLY shown if a real BLE sensor reports 0x180F battery! */}
              {state.device.connected && state.device.batteryPct !== null && (
                <span className="tabular-mono inline-flex items-center gap-1 text-xs text-emerald-300">
                  <BatteryMedium className="h-3.5 w-3.5" />
                  {state.device.batteryPct}%
                </span>
              )}
              {state.device.connected && (
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              )}
            </div>
          </button>
        </header>

        <main className="flex-1 space-y-5">
          {activeTab === 'today' && (
            <>
              <RadialGauges
                recovery={recovery}
                strain={strain}
                sleepPlan={sleepPlan}
                hasAnyData={activeRecords.length > 0}
                onSelectMetric={setDrilldownMetric}
              />

              <DetailedFeatureSections
                today={today}
                recovery={recovery}
                strain={strain}
                sleepPlan={sleepPlan}
                acwr={acwr}
                bioAge={bioAge}
                onSelectMetric={setDrilldownMetric}
                onGoToVault={() => setActiveTab('devices')}
                onGoToLog={() => setActiveTab('log')}
              />

              <AICoachDrawer
                briefing={briefing}
                isRefreshingBriefing={isRefreshingBriefing}
                onRefreshBriefing={handleRefreshBriefing}
                chatHistory={state.coachHistory}
                onSendQuestion={handleAskCoach}
                hasGeminiKey={Boolean(state.profile.geminiApiKey.trim())}
              />

              <TimelineFeed
                today={today}
                habitDefinitions={state.habitDefinitions}
                dailyWaterGoalMl={state.profile.dailyWaterGoalMl}
                onDeleteWorkout={(id) =>
                  mutateTodayReal((rec) => ({
                    ...rec,
                    workouts: rec.workouts.filter((w) => w.id !== id),
                  }))
                }
                onDeleteMeal={(id) =>
                  mutateTodayReal((rec) => ({
                    ...rec,
                    meals: rec.meals.filter((m) => m.id !== id),
                  }))
                }
                onGoToLog={() => setActiveTab('log')}
              />
            </>
          )}

          {activeTab === 'biology' && (
            <div className="space-y-5">
              <ScrubbableCharts
                records={activeRecords}
                profile={state.profile}
                onGoToVault={() => setActiveTab('devices')}
              />
              <HabitCorrelations correlations={correlations} />
            </div>
          )}

          {activeTab === 'log' && (
            <QuickLogHub
              today={today}
              profile={state.profile}
              habitDefinitions={state.habitDefinitions}
              onToggleHabit={(habitId) =>
                mutateTodayReal((rec) => ({
                  ...rec,
                  habitsLogged: rec.habitsLogged.includes(habitId)
                    ? rec.habitsLogged.filter((id) => id !== habitId)
                    : [...rec.habitsLogged, habitId],
                }))
              }
              onAddCustomHabit={(label, category) => {
                const id = `custom_${Date.now()}`;
                setState((prev) => ({
                  ...prev,
                  habitDefinitions: [
                    ...prev.habitDefinitions,
                    { id, label, category, icon: 'Sparkles', expectedDirection: 'neutral' },
                  ],
                }));
                mutateTodayReal((rec) => ({ ...rec, habitsLogged: [...rec.habitsLogged, id] }));
              }}
              onLogWorkout={(workout) =>
                mutateTodayReal((rec) => ({
                  ...rec,
                  workouts: [workout, ...rec.workouts],
                  activeCaloriesKcal: rec.activeCaloriesKcal + workout.activeCaloriesKcal,
                }))
              }
              onLogMeal={(meal) =>
                mutateTodayReal((rec) => ({
                  ...rec,
                  meals: [meal, ...rec.meals],
                }))
              }
              onAddWater={(ml) =>
                mutateTodayReal((rec) => ({
                  ...rec,
                  hydration: { ...rec.hydration, waterMl: rec.hydration.waterMl + ml },
                }))
              }
              onAddCaffeine={(mg) =>
                mutateTodayReal((rec) => ({
                  ...rec,
                  hydration: {
                    ...rec.hydration,
                    caffeineMg: rec.hydration.caffeineMg + mg,
                    lastCaffeineIso: new Date().toISOString(),
                  },
                }))
              }
              onSaveManualVitals={handleSaveManualVitals}
            />
          )}

          {activeTab === 'devices' && (
            <div className="space-y-5">
              <DeviceSyncWizard
                device={state.device}
                profile={state.profile}
                demoSimulatorEnabled={state.demoSimulatorEnabled}
                isSyncing={isSyncing}
                syncStatusMessage={syncMessage}
                onSelectWearable={handleSelectWearable}
                onSyncHealthConnect={handleSyncHealthConnect}
                onToggleDemoSimulator={(enabled) =>
                  setState((prev) => ({ ...prev, demoSimulatorEnabled: enabled }))
                }
                onUpdateBleTelemetry={handleBleTelemetry}
                onImportRows={handleImportRows}
                onExportBackup={handleExportBackup}
                onUpdateProfile={(patch: Partial<UserProfile>) =>
                  setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))
                }
                onResetAllData={() => {
                  clearAetherState();
                  setState(createCleanInitialState());
                  setSyncMessage('All local data cleared.');
                }}
              />

              <LabVault
                biomarkers={activeBiomarkers}
                isDemoMode={state.demoSimulatorEnabled}
                onAddBiomarker={(marker: LabBiomarker) =>
                  setState((prev) => ({
                    ...prev,
                    labBiomarkers: [marker, ...prev.labBiomarkers],
                  }))
                }
                onDeleteBiomarker={(id: string) =>
                  setState((prev) => ({
                    ...prev,
                    labBiomarkers: prev.labBiomarkers.filter((b) => b.id !== id),
                  }))
                }
              />
            </div>
          )}
        </main>
      </div>

      {/* Strict 4-Tab Floating Glass Bottom Bar */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[408px] -translate-x-1/2"
      >
        <div className="aether-glass-elevated grid grid-cols-4 items-center rounded-full p-1.5 shadow-glass">
          {(
            [
              { id: 'today', label: 'Today', icon: Compass },
              { id: 'biology', label: 'Biology', icon: TrendingUp },
              { id: 'log', label: '+ Log', icon: Plus },
              { id: 'devices', label: 'Vault', icon: Shield },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const isLog = item.id === 'log';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-full py-2 transition active:scale-95 ${
                  active
                    ? isLog
                      ? 'bg-emerald-500 font-bold text-obsidian'
                      : 'bg-white/10 font-semibold text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${active && !isLog ? 'text-emerald-400' : ''}`} />
                <span className="text-[10px] tracking-wide">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <MetricDrilldownSheet
        metric={drilldownMetric}
        onClose={() => setDrilldownMetric(null)}
        today={today}
        recovery={recovery}
        strain={strain}
        sleepPlan={sleepPlan}
        acwr={acwr}
        bioAge={bioAge}
      />
    </div>
  );
}
