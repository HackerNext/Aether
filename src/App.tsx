import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BatteryMedium,
  ChevronRight,
  Compass,
  Plus,
  RefreshCw,
  Shield,
  TrendingUp,
} from 'lucide-react';
import {
  ActiveTab,
  AetherAppState,
  DrilldownMetricType,
  HabitDefinition,
  LabBiomarker,
  MealRecord,
  MorningBriefing,
  UserProfile,
  WearableBrandId,
  WorkoutRecord,
} from './types/health';
import {
  clearAetherState,
  loadAetherState,
  saveAetherState,
} from './services/storageService';
import {
  BleLiveTelemetry,
  DEFAULT_HABIT_DEFINITIONS,
  DEFAULT_LAB_BIOMARKERS,
  generateRealisticBiometricHistory,
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
  formatMinutesToHm,
} from './utils/biometricsEngine';
import {
  askAetherCoach,
  BiometricContextBundle,
  generateGeminiBriefing,
  generateOfflineMorningBriefing,
} from './services/aiCoachService';
import { RadialGauges } from './components/RadialGauges';
import { MetricDrilldownSheet } from './components/MetricDrilldownSheet';
import { AICoachDrawer } from './components/AICoachDrawer';
import { TimelineFeed } from './components/TimelineFeed';
import { ScrubbableCharts } from './components/ScrubbableCharts';
import { HabitCorrelations } from './components/HabitCorrelations';
import { QuickLogHub } from './components/QuickLogHub';
import { DeviceSyncWizard } from './components/DeviceSyncWizard';
import { LabVault } from './components/LabVault';

function createInitialState(): AetherAppState {
  const redmi = WEARABLE_PRESETS[0];
  return {
    profile: {
      name: 'Athlete',
      chronologicalAge: 27,
      maxHrBpm: 193,
      bodyWeightKg: 74,
      targetWakeTime: '06:45',
      dailyWaterGoalMl: 3000,
      dailyCalorieGoal: 2450,
      geminiApiKey: '',
    },
    device: {
      id: redmi.id,
      name: redmi.name,
      ecosystem: redmi.ecosystem,
      transport: redmi.transport,
      connected: true,
      batteryPct: 84,
      lastSyncedIso: new Date(Date.now() - 4 * 60000).toISOString(),
      capabilities: {
        heartRate: 'active',
        sleepStages: 'active',
        spo2: 'active',
        overnightHrv: 'proxy_mode',
        stepsAndCalories: 'active',
      },
    },
    demoSimulatorEnabled: true,
    records: generateRealisticBiometricHistory(90, false),
    habitDefinitions: DEFAULT_HABIT_DEFINITIONS,
    labBiomarkers: DEFAULT_LAB_BIOMARKERS,
    coachHistory: [
      {
        id: 'welcome_msg',
        role: 'assistant',
        content:
          'AETHER telemetry online. Ask me about today’s training strain target, sleep debt payback, Redmi Watch 5 Lite proxy calibration, or your top habit correlations.',
        timestampIso: new Date().toISOString(),
      },
    ],
  };
}

function formatSyncAgo(iso: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin === 0) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default function App() {
  const [state, setState] = useState<AetherAppState>(() => loadAetherState() ?? createInitialState());
  const [activeTab, setActiveTab] = useState<ActiveTab>('today');
  const [drilldownMetric, setDrilldownMetric] = useState<DrilldownMetricType>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [isRefreshingBriefing, setIsRefreshingBriefing] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  // Persist every change cleanly inside isolated `aether_os_v1::` namespace
  useEffect(() => {
    saveAetherState(state);
  }, [state]);

  // Capture Android Chrome PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const today = state.records[state.records.length - 1];

  const recovery = useMemo(() => computeAdaptiveRecovery(state.records), [state.records]);
  const strain = useMemo(
    () => computeDailyStrain(today, recovery.score),
    [today, recovery.score]
  );
  const sleepPlan = useMemo(
    () => computeSleepDebtPlan(state.records, state.profile.targetWakeTime),
    [state.records, state.profile.targetWakeTime]
  );
  const acwr = useMemo(() => computeCardioLoadAcwr(state.records), [state.records]);
  const bioAge = useMemo(
    () => computeBiologicalAge(state.records, state.profile, 30),
    [state.records, state.profile]
  );
  const correlations = useMemo(
    () => computeHabitCorrelations(state.records, state.habitDefinitions),
    [state.records, state.habitDefinitions]
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

  // Keep offline briefing fresh whenever core scores shift
  useEffect(() => {
    if (briefing.generatedBy !== 'gemini') {
      setBriefing(generateOfflineMorningBriefing(aiContext));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recovery.score, strain.score, sleepPlan.rolling7dDebtMin, state.device.id]);

  const mutateToday = (updater: (rec: typeof today) => typeof today) => {
    setState((prev) => {
      const nextRecords = [...prev.records];
      const idx = nextRecords.length - 1;
      nextRecords[idx] = updater(nextRecords[idx]);
      return { ...prev, records: nextRecords };
    });
  };

  const handleSyncHealthConnect = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await HealthConnectManager.syncNow(state.device, today);
      setSyncMessage(res.summary);
      if (res.success && res.updatedTodayPatch) {
        setState((prev) => {
          const nextRecords = [...prev.records];
          const lastIdx = nextRecords.length - 1;
          nextRecords[lastIdx] = {
            ...nextRecords[lastIdx],
            ...res.updatedTodayPatch,
          };
          return {
            ...prev,
            device: {
              ...prev.device,
              lastSyncedIso: new Date().toISOString(),
            },
            records: nextRecords,
          };
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectWearable = (brandId: WearableBrandId) => {
    const preset = WEARABLE_PRESETS.find((p) => p.id === brandId);
    if (!preset) return;
    setState((prev) => {
      const nextRecords = prev.records.map((rec, i) => ({
        ...rec,
        overnightHrvMs: preset.supportsOvernightHrv
          ? rec.overnightHrvMs ?? Math.round(62 + Math.sin(i * 0.45) * 11)
          : null,
      }));
      return {
        ...prev,
        device: {
          ...prev.device,
          id: preset.id,
          name: preset.name,
          ecosystem: preset.ecosystem,
          transport: preset.transport,
          lastSyncedIso: new Date().toISOString(),
          capabilities: {
            ...prev.device.capabilities,
            overnightHrv: preset.supportsOvernightHrv ? 'active' : 'proxy_mode',
          },
        },
        records: nextRecords,
      };
    });
  };

  const handleBleTelemetry = (telemetry: BleLiveTelemetry) => {
    setState((prev) => ({
      ...prev,
      device: {
        ...prev.device,
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
        const existing = map.get(row.date);
        if (existing) {
          const deepMin = row.deepMin ?? existing.sleep.stages.deepMin;
          const remMin = row.remMin ?? existing.sleep.stages.remMin;
          const lightMin = row.lightMin ?? existing.sleep.stages.lightMin;
          const awakeMin = row.awakeMin ?? existing.sleep.stages.awakeMin;
          const totalSleepMin = deepMin + remMin + lightMin;
          const timeInBedMin = totalSleepMin + awakeMin;
          map.set(row.date, {
            ...existing,
            restingHrBpm: row.restingHrBpm ?? existing.restingHrBpm,
            overnightHrvMs:
              row.overnightHrvMs !== undefined ? row.overnightHrvMs : existing.overnightHrvMs,
            spo2Pct: row.spo2Pct ?? existing.spo2Pct,
            steps: row.steps ?? existing.steps,
            activeCaloriesKcal: row.activeCaloriesKcal ?? existing.activeCaloriesKcal,
            sleep: {
              ...existing.sleep,
              totalSleepMin,
              timeInBedMin,
              efficiencyPct: Number(((totalSleepMin / Math.max(1, timeInBedMin)) * 100).toFixed(1)),
              stages: { awakeMin, lightMin, deepMin, remMin },
              source: 'Imported Health Export',
            },
          });
        }
      }
      return {
        ...prev,
        records: Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date)),
      };
    });
  };

  const handleRefreshBriefing = async () => {
    setIsRefreshingBriefing(true);
    try {
      const fresh = await generateGeminiBriefing(aiContext);
      setBriefing(fresh);
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
    const botMsg = {
      id: `a_${Date.now()}`,
      role: 'assistant' as const,
      content: reply,
      timestampIso: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, coachHistory: [...prev.coachHistory, botMsg] }));
  };

  const handleToggleHabit = (habitId: string) => {
    mutateToday((rec) => {
      const exists = rec.habitsLogged.includes(habitId);
      return {
        ...rec,
        habitsLogged: exists
          ? rec.habitsLogged.filter((id) => id !== habitId)
          : [...rec.habitsLogged, habitId],
      };
    });
  };

  const handleAddCustomHabit = (label: string, category: HabitDefinition['category']) => {
    const id = `custom_${Date.now()}`;
    setState((prev) => {
      const nextRecords = [...prev.records];
      const last = nextRecords.length - 1;
      nextRecords[last] = {
        ...nextRecords[last],
        habitsLogged: [...nextRecords[last].habitsLogged, id],
      };
      return {
        ...prev,
        habitDefinitions: [
          ...prev.habitDefinitions,
          { id, label, category, icon: 'Sparkles', expectedDirection: 'neutral' },
        ],
        records: nextRecords,
      };
    });
  };

  const handleLogWorkout = (workout: WorkoutRecord) => {
    mutateToday((rec) => ({
      ...rec,
      workouts: [workout, ...rec.workouts],
      activeCaloriesKcal: rec.activeCaloriesKcal + workout.activeCaloriesKcal,
    }));
  };

  const handleLogMeal = (meal: MealRecord) => {
    mutateToday((rec) => ({
      ...rec,
      meals: [meal, ...rec.meals],
    }));
  };

  const handleAddWater = (ml: number) => {
    mutateToday((rec) => ({
      ...rec,
      hydration: { ...rec.hydration, waterMl: rec.hydration.waterMl + ml },
    }));
  };

  const handleAddCaffeine = (mg: number) => {
    mutateToday((rec) => ({
      ...rec,
      hydration: {
        ...rec.hydration,
        caffeineMg: rec.hydration.caffeineMg + mg,
        lastCaffeineIso: new Date().toISOString(),
      },
    }));
  };

  const handleTriggerPwaInstall = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    setDeferredInstallPrompt(null);
  };

  return (
    <div className="min-h-screen bg-[#07090D] text-slate-100">
      {/* Subtle Ambient Top Horizon Glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-gradient-to-b from-emerald-500/[0.06] via-cyan-500/[0.02] to-transparent" />

      {/* Mobile-First Centered Operating System Shell (optimized 360px–430px & clean desktop frame) */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-4 pb-28 pt-4">
        {/* Top Brand Header & Connected Wearable Status Pill */}
        <header className="mb-4 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-500/10">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-emeraldGlow" />
              </div>
              <span className="text-sm font-bold tracking-[0.22em] text-white">AETHER</span>
            </div>
            <span className="tabular-mono text-[11px] text-slate-400">
              {new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Live Wearable Status Pill */}
          <button
            type="button"
            onClick={handleSyncHealthConnect}
            className="aether-glass flex w-full items-center justify-between rounded-full px-3.5 py-2 text-left transition hover:border-white/15 active:scale-[0.99]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <span className="truncate text-[11px] font-medium text-slate-200">
                {state.device.name} • Synced {formatSyncAgo(state.device.lastSyncedIso)} via{' '}
                {state.device.transport === 'web_bluetooth_ble' ? 'BLE' : 'Health Connect'}
              </span>
            </div>
            <div className="ml-2 flex shrink-0 items-center gap-2 text-slate-400">
              <span className="tabular-mono inline-flex items-center gap-1 text-[11px] text-slate-300">
                <BatteryMedium className="h-3.5 w-3.5 text-emerald-400" />
                {state.device.batteryPct}%
              </span>
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
            </div>
          </button>
        </header>

        {/* Active Tab Viewport */}
        <main className="flex-1 space-y-4">
          {activeTab === 'today' && (
            <>
              {/* 3 Futuristic Radial Telemetry Gauges */}
              <RadialGauges
                recovery={recovery}
                strain={strain}
                sleepPlan={sleepPlan}
                onSelectMetric={setDrilldownMetric}
              />

              {/* Anti-Clutter 2-Metric Preview Cards Grid (max 2 metrics/card, tap to drill down) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDrilldownMetric('sleep_debt')}
                  className="aether-glass group rounded-3xl p-3.5 text-left transition hover:border-indigo-400/35 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                      Sleep Planner
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white" />
                  </div>
                  <p className="tabular-mono mt-2 text-lg font-bold text-white">
                    {sleepPlan.recommendedBedtime}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bedtime • Debt{' '}
                    <span className="tabular-mono text-indigo-300">
                      {formatMinutesToHm(sleepPlan.rolling7dDebtMin)}
                    </span>
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDrilldownMetric('acwr')}
                  className="aether-glass group rounded-3xl p-3.5 text-left transition hover:border-emerald-400/35 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Cardio ACWR
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white" />
                  </div>
                  <p className="tabular-mono mt-2 text-lg font-bold text-white">{acwr.ratio}</p>
                  <p className="truncate text-[11px]" style={{ color: acwr.colorHex }}>
                    {acwr.statusLabel}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDrilldownMetric('rhr')}
                  className="aether-glass group rounded-3xl p-3.5 text-left transition hover:border-cyan-400/35 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      Resting HR
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white" />
                  </div>
                  <p className="tabular-mono mt-2 text-lg font-bold text-white">
                    {today.restingHrBpm}{' '}
                    <span className="text-xs font-normal text-slate-400">bpm</span>
                  </p>
                  <p className="tabular-mono text-[11px] text-slate-400">
                    {recovery.rhrDeltaBpm >= 0 ? '+' : ''}
                    {recovery.rhrDeltaBpm} vs {recovery.rhrBaseline30d} avg
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDrilldownMetric('bio_age')}
                  className="aether-glass group rounded-3xl p-3.5 text-left transition hover:border-emerald-400/35 active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Bio Age
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-white" />
                  </div>
                  <p className="tabular-mono mt-2 text-lg font-bold text-white">
                    {bioAge.biologicalAge}{' '}
                    <span className="text-xs font-normal text-slate-400">yrs</span>
                  </p>
                  <p className="tabular-mono text-[11px] text-emerald-300">
                    Pace {bioAge.healthspanPace}x ({bioAge.deltaYears >= 0 ? '+' : ''}
                    {bioAge.deltaYears}y)
                  </p>
                </button>
              </div>

              {/* Aether AI Morning Briefing & Interactive Coach */}
              <AICoachDrawer
                briefing={briefing}
                isRefreshingBriefing={isRefreshingBriefing}
                onRefreshBriefing={handleRefreshBriefing}
                chatHistory={state.coachHistory}
                onSendQuestion={handleAskCoach}
                hasGeminiKey={Boolean(state.profile.geminiApiKey.trim())}
              />

              {/* Chronological Feed */}
              <TimelineFeed
                today={today}
                habitDefinitions={state.habitDefinitions}
                onDeleteWorkout={(id) =>
                  mutateToday((rec) => ({
                    ...rec,
                    workouts: rec.workouts.filter((w) => w.id !== id),
                  }))
                }
                onDeleteMeal={(id) =>
                  mutateToday((rec) => ({
                    ...rec,
                    meals: rec.meals.filter((m) => m.id !== id),
                  }))
                }
              />
            </>
          )}

          {activeTab === 'biology' && (
            <div className="space-y-6">
              <ScrubbableCharts records={state.records} profile={state.profile} />
              <HabitCorrelations correlations={correlations} />
            </div>
          )}

          {activeTab === 'log' && (
            <QuickLogHub
              today={today}
              profile={state.profile}
              habitDefinitions={state.habitDefinitions}
              onToggleHabit={handleToggleHabit}
              onAddCustomHabit={handleAddCustomHabit}
              onLogWorkout={handleLogWorkout}
              onLogMeal={handleLogMeal}
              onAddWater={handleAddWater}
              onAddCaffeine={handleAddCaffeine}
            />
          )}

          {activeTab === 'devices' && (
            <div className="space-y-6">
              <DeviceSyncWizard
                device={state.device}
                profile={state.profile}
                demoSimulatorEnabled={state.demoSimulatorEnabled}
                isSyncing={isSyncing}
                syncStatusMessage={syncMessage}
                canInstallPwa={Boolean(deferredInstallPrompt)}
                onTriggerPwaInstall={handleTriggerPwaInstall}
                onSelectWearable={handleSelectWearable}
                onSyncHealthConnect={handleSyncHealthConnect}
                onToggleDemoSimulator={(enabled) =>
                  setState((prev) => ({ ...prev, demoSimulatorEnabled: enabled }))
                }
                onUpdateBleTelemetry={handleBleTelemetry}
                onImportRows={handleImportRows}
                onUpdateProfile={(patch: Partial<UserProfile>) =>
                  setState((prev) => ({
                    ...prev,
                    profile: { ...prev.profile, ...patch },
                  }))
                }
                onResetAllData={() => {
                  clearAetherState();
                  setState(createInitialState());
                }}
              />

              <LabVault
                biomarkers={state.labBiomarkers}
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

      {/* Strict 4-Tab Floating Glass Bottom Navigation Bar */}
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
                      ? 'bg-emerald-500 text-obsidian font-bold'
                      : 'bg-white/10 text-white font-semibold'
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

      {/* Tap-Any-Card Drill-Down Bottom Sheet */}
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
