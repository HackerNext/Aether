import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  BatteryMedium,
  BookOpen,
  ChevronRight,
  Compass,
  FlaskConical,
  Gauge,
  HeartHandshake,
  HeartPulse,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Watch,
} from 'lucide-react';
import {
  ActiveTab,
  AetherAppState,
  DailyBiometricRecord,
  DedicatedPageId,
  HabitDefinition,
  HooperWellnessLog,
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
  computeDailyStrain,
  computeFitnessAge,
  computeHabitCorrelations,
  computeSleepDebtPlan,
  computeUncoupledEwmaWorkload,
  createEmptyDailyRecord,
  formatMinutesToHm,
  getEffectiveMaxHr,
  getTodayDateStr,
} from './utils/biometricsEngine';
import {
  askAetherCoach,
  BiometricContextBundle,
  generateGeminiBriefing,
  generateOfflineMorningBriefing,
} from './services/aiCoachService';
import { RadialGauges } from './components/RadialGauges';
import { AICoachDrawer } from './components/AICoachDrawer';
import { LogSubTab, ManualVitalsPayload, QuickLogHub } from './components/QuickLogHub';
import { RecoveryPage } from './pages/RecoveryPage';
import { StrainPage } from './pages/StrainPage';
import { SleepPage } from './pages/SleepPage';
import { FitnessAgePage } from './pages/FitnessAgePage';
import { HabitsLabPage } from './pages/HabitsLabPage';
import { TrendsPage } from './pages/TrendsPage';
import { DevicesPage } from './pages/DevicesPage';
import { LabVaultPage } from './pages/LabVaultPage';
import { SettingsPage } from './pages/SettingsPage';
import { ScienceDocsPage } from './pages/ScienceDocsPage';

function createCleanInitialState(): AetherAppState {
  const redmi = WEARABLE_PRESETS[0];
  return {
    profile: {
      name: 'User',
      chronologicalAge: 20,
      observedMaxHrBpm: null,
      bodyWeightKg: 59,
      personalSleepNeedMin: 450, // 7h 30m sensible default (auto-calibrates via Hooper check-in)
      autoCalibrateSleepNeed: true,
      targetWakeTime: '06:45',
      dailyWaterGoalMl: 3000,
      dailyCalorieGoal: 2300,
      cooper12MinMeters: null,
      fiveKmTimeSeconds: null,
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
        id: 'welcome_v3',
        role: 'assistant',
        content:
          'AETHER v3.0 starts clean with zero fake data. Connect Android Health Connect in System → Watch, or complete a 15-second Morning Wellness check-in in Log.',
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
  const [activePage, setActivePage] = useState<DedicatedPageId>(null);
  const [logSubTab, setLogSubTab] = useState<LogSubTab>('wellness');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);

  useEffect(() => {
    saveAetherState(state);
  }, [state]);

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

  // Scroll to top cleanly whenever opening a dedicated page or switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activePage, activeTab]);

  const demoRecords = useMemo(
    () =>
      state.demoSimulatorEnabled
        ? generateDemoBiometricHistory(35, state.device.capabilities.overnightHrv === 'active')
        : [],
    [state.demoSimulatorEnabled, state.device.capabilities.overnightHrv]
  );

  const activeRecords = state.demoSimulatorEnabled ? demoRecords : state.records;
  const activeBiomarkers = state.demoSimulatorEnabled ? DEMO_LAB_BIOMARKERS : state.labBiomarkers;
  const todayStr = getTodayDateStr();
  const today: DailyBiometricRecord | null = useMemo(() => {
    if (activeRecords.length === 0) return null;
    return activeRecords.find((r) => r.date === todayStr) ?? activeRecords[activeRecords.length - 1];
  }, [activeRecords, todayStr]);

  const recovery = useMemo(
    () => computeAdaptiveRecovery(activeRecords, state.profile),
    [activeRecords, state.profile]
  );
  const strain = useMemo(() => computeDailyStrain(today, recovery.score), [today, recovery.score]);
  const sleepPlan = useMemo(
    () => computeSleepDebtPlan(activeRecords, state.profile),
    [activeRecords, state.profile]
  );
  const ewma = useMemo(() => computeUncoupledEwmaWorkload(activeRecords), [activeRecords]);
  const fitnessAge = useMemo(
    () => computeFitnessAge(activeRecords, state.profile, 30),
    [activeRecords, state.profile]
  );
  const correlations = useMemo(
    () => computeHabitCorrelations(activeRecords, state.habitDefinitions, state.profile),
    [activeRecords, state.habitDefinitions, state.profile]
  );

  const aiContext: BiometricContextBundle = useMemo(
    () => ({
      profile: state.profile,
      device: state.device,
      today,
      recovery,
      strain,
      sleepPlan,
      ewma,
      fitnessAge,
      correlations,
    }),
    [state.profile, state.device, today, recovery, strain, sleepPlan, ewma, fitnessAge, correlations]
  );

  const [briefing, setBriefing] = useState<MorningBriefing>(() =>
    generateOfflineMorningBriefing(aiContext)
  );

  useEffect(() => {
    if (briefing.generatedBy !== 'gemini') {
      setBriefing(generateOfflineMorningBriefing(aiContext));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recovery.score, strain.score, ewma.ratio, state.demoSimulatorEnabled, activeRecords.length]);

  const openLogSection = (sub: LogSubTab) => {
    setActivePage(null);
    setLogSubTab(sub);
    setActiveTab('log');
  };

  const mutateTodayReal = (updater: (rec: DailyBiometricRecord) => DailyBiometricRecord) => {
    setState((prev) => {
      const dateKey = getTodayDateStr();
      const idx = prev.records.findIndex((r) => r.date === dateKey);
      const next = [...prev.records];
      if (idx >= 0) next[idx] = updater(next[idx]);
      else {
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
        getEffectiveMaxHr(state.profile),
        state.records
      );
      setSyncMessage(res.summary);
      setState((prev) => {
        const curMax = getEffectiveMaxHr(prev.profile);
        const updatedObservedMax =
          res.highestObservedHr && res.highestObservedHr > curMax
            ? res.highestObservedHr
            : prev.profile.observedMaxHrBpm;
        return {
          ...prev,
          demoSimulatorEnabled: res.success ? false : prev.demoSimulatorEnabled,
          profile: { ...prev.profile, observedMaxHrBpm: updatedObservedMax },
          device: {
            ...prev.device,
            connected: res.success,
            lastSyncedIso: res.success ? new Date().toISOString() : prev.device.lastSyncedIso,
            healthConnect: res.diagnostics,
          },
          records: res.success && res.syncedRecords ? res.syncedRecords : prev.records,
        };
      });
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

  const handleBleTelemetry = (t: BleLiveTelemetry) => {
    setState((prev) => ({
      ...prev,
      device: {
        ...prev.device,
        connected: true,
        name: t.deviceName,
        transport: 'web_bluetooth_ble',
        liveBleBpm: t.bpm,
        liveBleRrMs: t.rrIntervalMs,
        batteryPct: t.batteryPct ?? prev.device.batteryPct,
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
    a.download = `aether-v3-backup-${getTodayDateStr()}.json`;
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
                stages: { awakeMin: payload.awakeMin, lightMin, deepMin: payload.deepMin, remMin: payload.remMin },
                source: 'Manual Entry',
              }
            : rec.sleep,
      };
    });
  };

  const handleLogWorkout = (workout: WorkoutRecord) => {
    // Auto-update Observed Peak HR if a genuine higher peak is logged
    if (workout.maxHrBpm > getEffectiveMaxHr(state.profile) && workout.maxHrBpm <= 220) {
      setState((prev) => ({ ...prev, profile: { ...prev.profile, observedMaxHrBpm: workout.maxHrBpm } }));
    }
    mutateTodayReal((rec) => ({
      ...rec,
      workouts: [workout, ...rec.workouts],
      activeCaloriesKcal: rec.activeCaloriesKcal + workout.activeCaloriesKcal,
    }));
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
    setState((prev) => ({
      ...prev,
      coachHistory: [
        ...prev.coachHistory,
        { id: `u_${Date.now()}`, role: 'user', content: question, timestampIso: new Date().toISOString() },
      ],
    }));
    const reply = await askAetherCoach(question, aiContext);
    setState((prev) => ({
      ...prev,
      coachHistory: [
        ...prev.coachHistory,
        { id: `a_${Date.now()}`, role: 'assistant', content: reply, timestampIso: new Date().toISOString() },
      ],
    }));
  };

  // ========= DEDICATED FULL-SCREEN PAGES (Zero Bottom-Bar Clutter or Overlap!) =========
  if (activePage === 'recovery') {
    return (
      <RecoveryPage
        today={today}
        recovery={recovery}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
        onOpenWellnessLog={() => openLogSection('wellness')}
        onOpenDevices={() => setActivePage('devices')}
      />
    );
  }
  if (activePage === 'strain') {
    return (
      <StrainPage
        today={today}
        profile={state.profile}
        strain={strain}
        ewma={ewma}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
        onOpenTrainingLog={() => openLogSection('training')}
        onDeleteWorkout={(id) =>
          mutateTodayReal((rec) => ({ ...rec, workouts: rec.workouts.filter((w) => w.id !== id) }))
        }
      />
    );
  }
  if (activePage === 'sleep') {
    return (
      <SleepPage
        today={today}
        sleepPlan={sleepPlan}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
        onOpenSettings={() => setActivePage('settings')}
        onOpenVitalsLog={() => openLogSection('vitals_food')}
      />
    );
  }
  if (activePage === 'fitness_age') {
    return (
      <FitnessAgePage
        fitnessAge={fitnessAge}
        profile={state.profile}
        onUpdateProfile={(patch) => setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
      />
    );
  }
  if (activePage === 'habits_lab') {
    return (
      <HabitsLabPage
        correlations={correlations}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
        onOpenHabitLog={() => openLogSection('habits')}
      />
    );
  }
  if (activePage === 'trends') {
    return (
      <TrendsPage
        records={activeRecords}
        profile={state.profile}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
        onOpenDevices={() => setActivePage('devices')}
      />
    );
  }
  if (activePage === 'devices') {
    return (
      <DevicesPage
        device={state.device}
        isSyncing={isSyncing}
        syncStatusMessage={syncMessage}
        onSelectWearable={handleSelectWearable}
        onSyncHealthConnect={handleSyncHealthConnect}
        onUpdateBleTelemetry={handleBleTelemetry}
        onImportRows={handleImportRows}
        onExportBackup={handleExportBackup}
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
      />
    );
  }
  if (activePage === 'lab_vault') {
    return (
      <LabVaultPage
        biomarkers={activeBiomarkers}
        isDemoMode={state.demoSimulatorEnabled}
        onAddBiomarker={(m: LabBiomarker) =>
          setState((prev) => ({ ...prev, labBiomarkers: [m, ...prev.labBiomarkers] }))
        }
        onDeleteBiomarker={(id: string) =>
          setState((prev) => ({ ...prev, labBiomarkers: prev.labBiomarkers.filter((b) => b.id !== id) }))
        }
        onBack={() => setActivePage(null)}
        onOpenDocs={() => setActivePage('science_docs')}
      />
    );
  }
  if (activePage === 'settings') {
    return (
      <SettingsPage
        profile={state.profile}
        demoSimulatorEnabled={state.demoSimulatorEnabled}
        onUpdateProfile={(patch: Partial<UserProfile>) =>
          setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }))
        }
        onToggleDemo={(enabled) => setState((prev) => ({ ...prev, demoSimulatorEnabled: enabled }))}
        onResetAllData={() => {
          clearAetherState();
          setState(createCleanInitialState());
          setSyncMessage('All local data cleared.');
        }}
        onBack={() => setActivePage(null)}
      />
    );
  }
  if (activePage === 'science_docs') {
    return <ScienceDocsPage onBack={() => setActivePage(null)} />;
  }

  // ========= MAIN 4-TAB SHELL (Clean, Minimal, Zero Clutter) =========
  const statusText = state.demoSimulatorEnabled
    ? 'DEMO PREVIEW · Viewing Sample Data'
    : state.device.connected
      ? `${state.device.name} · ${formatSyncAgo(state.device.lastSyncedIso)}`
      : 'No Watch Connected · Tap to Connect';

  const unlockedHabitsCount = correlations.filter((c) => c.unlocked).length;

  return (
    <div className="min-h-screen bg-[#07090D] text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-52 bg-gradient-to-b from-emerald-500/[0.05] via-cyan-500/[0.02] to-transparent" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-4 pb-28 safe-top">
        {/* Minimal Brand Header + Honest Connection Status Pill */}
        <header className="mb-5 pt-2 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2.5">
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
            onClick={() => (state.device.connected ? handleSyncHealthConnect() : setActivePage('devices'))}
            className={`aether-card flex w-full items-center justify-between rounded-full px-4 py-2.5 text-left transition active:scale-[0.99] ${
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
              {state.device.connected && state.device.batteryPct !== null && (
                <span className="tabular-mono inline-flex items-center gap-1 text-xs text-emerald-300">
                  <BatteryMedium className="h-3.5 w-3.5" />
                  {state.device.batteryPct}%
                </span>
              )}
              {state.device.connected ? (
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </button>
        </header>

        <main className="animate-page flex-1 space-y-4">
          {/* TAB 1: TODAY — Clean, Spacious, Interactive Command Center */}
          {activeTab === 'today' && (
            <>
              <RadialGauges
                recovery={recovery}
                strain={strain}
                sleepPlan={sleepPlan}
                hasAnyData={activeRecords.length > 0}
                onOpenPage={setActivePage}
              />

              {/* Perception Override Alert if triggered */}
              {recovery.perceptionOverrideActive && recovery.perceptionOverrideReason && (
                <button
                  type="button"
                  onClick={() => setActivePage('recovery')}
                  className="flex w-full items-start gap-3 rounded-3xl border border-amber-400/40 bg-amber-500/10 p-4 text-left"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-amber-300">Perception Override Active</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-amber-100/90 line-clamp-2">
                      {recovery.perceptionOverrideReason}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                </button>
              )}

              {/* 15-Second Morning Hooper Wellness Banner */}
              <button
                type="button"
                onClick={() => openLogSection('wellness')}
                className="aether-card flex w-full items-center justify-between gap-3 rounded-3xl px-4 py-3.5 text-left transition hover:border-emerald-400/35 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {today?.wellness ? 'Morning Wellness Checked In' : '15-Second Morning Check-In'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {today?.wellness
                        ? `Score ${today.wellness.wellnessScore}/100 · Soreness ${today.wellness.soreness}/7 · Stress ${today.wellness.stress}/7`
                        : 'Log Sleep Quality, Energy, Stress & Soreness'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
              </button>

              {/* Clean Section Directory List (Each row opens its own dedicated page!) */}
              <section className="aether-card divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
                {(
                  [
                    {
                      page: 'recovery' as const,
                      icon: HeartPulse,
                      iconCls: 'bg-emerald-500/15 text-emerald-400',
                      title: 'Recovery & RHR Z-Score',
                      sub: recovery.swcLabel,
                      val: today?.restingHrBpm ? `${today.restingHrBpm} bpm` : '--',
                    },
                    {
                      page: 'strain' as const,
                      icon: Gauge,
                      iconCls: 'bg-cyan-500/15 text-cyan-400',
                      title: 'Dual Strain & EWMA Load',
                      sub: `Cardio ${strain.cardioScore} · Muscular ${strain.muscularScore} · ${ewma.statusLabel}`,
                      val: ewma.ratio !== null ? `${ewma.ratio}` : `${strain.score.toFixed(1)}`,
                    },
                    {
                      page: 'sleep' as const,
                      icon: Moon,
                      iconCls: 'bg-indigo-500/15 text-indigo-400',
                      title: 'Sleep & 7-Day Regularity',
                      sub: `Bedtime ${sleepPlan.recommendedBedtime} · Need ${formatMinutesToHm(sleepPlan.personalBaselineNeedMin)}`,
                      val: sleepPlan.regularityScorePct !== null ? `${sleepPlan.regularityScorePct}%` : '--',
                    },
                    {
                      page: 'fitness_age' as const,
                      icon: Award,
                      iconCls: 'bg-amber-500/15 text-amber-400',
                      title: 'Cardio & Sleep Fitness Age',
                      sub: fitnessAge.vo2MaxUsed ? `VO2 Max ${fitnessAge.vo2MaxUsed} mL/kg/min` : 'Calibrate via 12-min / 5K run',
                      val: fitnessAge.fitnessAge !== null ? `${fitnessAge.fitnessAge}y` : '--',
                    },
                  ] as const
                ).map((row) => {
                  const Icon = row.icon;
                  return (
                    <button
                      key={row.page}
                      type="button"
                      onClick={() => setActivePage(row.page)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.iconCls}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white">{row.title}</p>
                          <p className="truncate text-[11px] text-slate-400">{row.sub}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="tabular-mono text-xs font-bold text-slate-100">{row.val}</span>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </section>

              <AICoachDrawer
                briefing={briefing}
                isRefreshingBriefing={isRefreshingBriefing}
                onRefreshBriefing={handleRefreshBriefing}
                chatHistory={state.coachHistory}
                onSendQuestion={handleAskCoach}
                hasGeminiKey={Boolean(state.profile.geminiApiKey.trim())}
              />
            </>
          )}

          {/* TAB 2: BIOLOGY — Clean 2-Column Dedicated Page Directory */}
          {activeTab === 'biology' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">Biology Hub</h1>
                <p className="text-xs text-slate-400">Tap any module to open its dedicated full-screen page</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      page: 'recovery' as const,
                      icon: HeartPulse,
                      accent: 'text-emerald-400 bg-emerald-500/15',
                      title: 'Recovery & SWC',
                      val: recovery.score !== null ? `${recovery.score}%` : '--',
                      sub: recovery.rhrZScore !== null ? `RHR ${recovery.rhrZScore >= 0 ? '+' : ''}${recovery.rhrZScore}σ` : 'Z-Score band',
                    },
                    {
                      page: 'strain' as const,
                      icon: Activity,
                      accent: 'text-cyan-400 bg-cyan-500/15',
                      title: 'EWMA & Strain',
                      val: ewma.ratio !== null ? `${ewma.ratio}` : `${strain.score.toFixed(1)}`,
                      sub: ewma.monotonyAlert ? 'Monotony >2.0' : ewma.statusLabel,
                    },
                    {
                      page: 'sleep' as const,
                      icon: Moon,
                      accent: 'text-indigo-400 bg-indigo-500/15',
                      title: 'Sleep Regularity',
                      val: sleepPlan.regularityScorePct !== null ? `${sleepPlan.regularityScorePct}%` : '--',
                      sub: `Bed ${sleepPlan.recommendedBedtime}`,
                    },
                    {
                      page: 'fitness_age' as const,
                      icon: Award,
                      accent: 'text-amber-400 bg-amber-500/15',
                      title: 'Fitness Age',
                      val: fitnessAge.fitnessAge !== null ? `${fitnessAge.fitnessAge}y` : '--',
                      sub: fitnessAge.vo2MaxUsed ? `VO2 ${fitnessAge.vo2MaxUsed}` : 'Run calibrator',
                    },
                    {
                      page: 'habits_lab' as const,
                      icon: Sparkles,
                      accent: 'text-emerald-400 bg-emerald-500/15',
                      title: 'Habit Impact Lab',
                      val: `${unlockedHabitsCount}`,
                      sub: `Unlocked (95% CI)`,
                    },
                    {
                      page: 'trends' as const,
                      icon: BarChart3,
                      accent: 'text-cyan-400 bg-cyan-500/15',
                      title: 'Trend Graphs',
                      val: `${activeRecords.length}d`,
                      sub: '7D · 30D · 90D',
                    },
                  ] as const
                ).map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.page}
                      type="button"
                      onClick={() => setActivePage(card.page)}
                      className="aether-card flex flex-col justify-between rounded-3xl p-4 text-left transition hover:border-white/20 active:scale-[0.97]"
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-slate-200">{card.title}</p>
                        <p className="tabular-mono mt-1 text-2xl font-bold text-white">{card.val}</p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-400">{card.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActivePage('science_docs')}
                className="aether-card flex w-full items-center justify-between rounded-3xl p-4 text-left transition hover:border-emerald-400/35"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">How Every Metric Is Calculated</p>
                    <p className="text-[11px] text-slate-400">Read the plain-English science & methods guide</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          )}

          {/* TAB 3: LOG — Clean 4-Section Action Hub */}
          {activeTab === 'log' && (
            <QuickLogHub
              key={logSubTab}
              initialSubTab={logSubTab}
              today={today}
              profile={state.profile}
              habitDefinitions={state.habitDefinitions}
              onSaveWellness={(log: HooperWellnessLog) =>
                mutateTodayReal((rec) => ({ ...rec, wellness: log }))
              }
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
                    { id, label, category, expectedDirection: 'neutral' },
                  ],
                }));
                mutateTodayReal((rec) => ({ ...rec, habitsLogged: [...rec.habitsLogged, id] }));
              }}
              onLogWorkout={handleLogWorkout}
              onLogMeal={(meal: MealRecord) =>
                mutateTodayReal((rec) => ({ ...rec, meals: [meal, ...rec.meals] }))
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

          {/* TAB 4: SYSTEM — Clean Apple/Oura-Style Grouped Menu (Zero Cramped Dumped Settings!) */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">System & Vault</h1>
                <p className="text-xs text-slate-400">Devices, offline blood labs, calibration & documentation</p>
              </div>

              <section className="aether-card divide-y divide-white/[0.06] overflow-hidden rounded-3xl">
                {(
                  [
                    {
                      page: 'devices' as const,
                      icon: Watch,
                      iconCls: 'bg-emerald-500/15 text-emerald-400',
                      title: 'Watch & Health Connect',
                      sub: `${state.device.name} · SDK 1.1.0 Bridge`,
                      badge: state.device.connected ? 'Connected' : 'Setup',
                    },
                    {
                      page: 'lab_vault' as const,
                      icon: FlaskConical,
                      iconCls: 'bg-indigo-500/15 text-indigo-400',
                      title: 'Offline Medical & Lab Vault',
                      sub: 'Blood biomarkers & optimal athletic ranges',
                      badge: `${activeBiomarkers.length} labs`,
                    },
                    {
                      page: 'settings' as const,
                      icon: SlidersHorizontal,
                      iconCls: 'bg-cyan-500/15 text-cyan-400',
                      title: 'Profile & Calibration',
                      sub: `Max HR ${getEffectiveMaxHr(state.profile)} · Sleep Need ${formatMinutesToHm(state.profile.personalSleepNeedMin)}`,
                      badge: 'Edit',
                    },
                    {
                      page: 'science_docs' as const,
                      icon: BookOpen,
                      iconCls: 'bg-amber-500/15 text-amber-400',
                      title: 'Science & Methodology Guide',
                      sub: 'Plain-English docs for every score & graph',
                      badge: '9 Chapters',
                    },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.page}
                      type="button"
                      onClick={() => setActivePage(item.page)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-white/[0.03]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.iconCls}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{item.title}</p>
                          <p className="truncate text-xs text-slate-400">{item.sub}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="tabular-mono rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          {item.badge}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </section>

              {/* Compact Demo Preview Switch Card */}
              <div className="aether-card flex items-center justify-between rounded-3xl px-4 py-3.5">
                <div className="pr-3">
                  <p className="text-xs font-semibold text-amber-200">Preview Demo Data</p>
                  <p className="text-[11px] text-slate-400">
                    Off by default · Safe in-memory preview of all charts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) => ({ ...prev, demoSimulatorEnabled: !prev.demoSimulatorEnabled }))
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    state.demoSimulatorEnabled ? 'bg-amber-400' : 'bg-slate-700'
                  }`}
                  aria-label="Toggle Demo Preview"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      state.demoSimulatorEnabled ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Strict 4-Tab Floating Glass Bottom Bar (Only shown on top-level tabs — never overlaps dedicated pages!) */}
      <nav
        aria-label="Primary Navigation"
        className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2"
      >
        <div className="aether-glass-elevated grid grid-cols-4 items-center rounded-full p-1.5 shadow-glass">
          {(
            [
              { id: 'today', label: 'Today', icon: Compass },
              { id: 'biology', label: 'Biology', icon: TrendingUp },
              { id: 'log', label: 'Log', icon: Plus },
              { id: 'system', label: 'System', icon: Settings },
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
    </div>
  );
}
