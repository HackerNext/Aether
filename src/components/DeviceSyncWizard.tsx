import React, { useEffect, useRef, useState } from 'react';
import {
  Bluetooth,
  CheckCircle2,
  Cpu,
  Download,
  FileUp,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Shield,
  Smartphone,
  Watch,
} from 'lucide-react';
import { ConnectedDevice, UserProfile, WearableBrandId } from '../types/health';
import {
  BleLiveTelemetry,
  buildSampleExportJson,
  HealthConnectManager,
  ImportedHealthRow,
  parseHealthExportFile,
  scanAndConnectBleHeartRate,
  WEARABLE_PRESETS,
} from '../services/healthConnectBridge';

interface DeviceSyncWizardProps {
  device: ConnectedDevice;
  profile: UserProfile;
  demoSimulatorEnabled: boolean;
  isSyncing: boolean;
  syncStatusMessage: string;
  canInstallPwa: boolean;
  onTriggerPwaInstall: () => void;
  onSelectWearable: (brandId: WearableBrandId) => void;
  onSyncHealthConnect: () => void;
  onToggleDemoSimulator: (enabled: boolean) => void;
  onUpdateBleTelemetry: (telemetry: BleLiveTelemetry) => void;
  onImportRows: (rows: ImportedHealthRow[]) => void;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onResetAllData: () => void;
}

export const DeviceSyncWizard: React.FC<DeviceSyncWizardProps> = ({
  device,
  profile,
  demoSimulatorEnabled,
  isSyncing,
  syncStatusMessage,
  canInstallPwa,
  onTriggerPwaInstall,
  onSelectWearable,
  onSyncHealthConnect,
  onToggleDemoSimulator,
  onUpdateBleTelemetry,
  onImportRows,
  onUpdateProfile,
  onResetAllData,
}) => {
  const [bleMessage, setBleMessage] = useState<string>('');
  const [bleSimActive, setBleSimActive] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string>('');
  const [geminiDraft, setGeminiDraft] = useState(profile.geminiApiKey);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset =
    WEARABLE_PRESETS.find((p) => p.id === device.id) ?? WEARABLE_PRESETS[0];

  // Optional simulated BLE strap heartbeat stream for instant testing on any device
  useEffect(() => {
    if (!bleSimActive) return;
    const timer = window.setInterval(() => {
      const bpm = 64 + Math.round(Math.sin(Date.now() / 1600) * 5 + Math.random() * 3);
      const rrIntervalMs = Math.round(60000 / bpm + (Math.random() - 0.5) * 28);
      onUpdateBleTelemetry({
        deviceName: `${device.name} (Simulated BLE)`,
        bpm,
        rrIntervalMs,
        batteryPct: device.batteryPct,
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [bleSimActive, device.name, device.batteryPct, onUpdateBleTelemetry]);

  const handleRealBleScan = async () => {
    setBleMessage('Scanning BLE GATT 0x180D / 0x180F…');
    const res = await scanAndConnectBleHeartRate((telemetry) => {
      onUpdateBleTelemetry(telemetry);
      setBleMessage(`Live BLE stream from ${telemetry.deviceName}`);
    });
    if (!res.success) {
      setBleMessage(res.error || 'BLE scan failed.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, error } = parseHealthExportFile(text, file.name);
    if (error) {
      setImportFeedback(error);
    } else {
      onImportRows(rows);
      setImportFeedback(`Imported ${rows.length} daily records from ${file.name}. Biometrics recalibrated.`);
    }
    e.target.value = '';
  };

  const downloadSampleJson = () => {
    const blob = new Blob([buildSampleExportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aether-mi-fitness-sample.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isNativeHc = HealthConnectManager.isNativeCapacitorBridgeAvailable();

  return (
    <div className="space-y-4">
      {/* Wearable Picker & Setup Wizard */}
      <div className="aether-glass space-y-3.5 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Watch className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Wearable Connection Manager</h3>
          </div>
          <span className="tabular-mono rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            {isNativeHc ? 'Native Android HC' : 'PWA Bridge'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WEARABLE_PRESETS.map((preset) => {
            const selected = preset.id === device.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectWearable(preset.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  selected
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-white'
                    : 'border-white/[0.07] bg-white/[0.025] text-slate-300 hover:border-white/15'
                }`}
              >
                <p className="text-xs font-semibold leading-tight">{preset.name}</p>
                <p className="mt-1 text-[10px] text-slate-400 line-clamp-1">{preset.badgeText}</p>
              </button>
            );
          })}
        </div>

        {/* Exact Sensor Capability Flags */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#080B10] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Sensor Capability Matrix — {device.name}
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-slate-400">HR Stream</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-slate-400">Sleep Stages</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-slate-400">SpO2</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2.5 py-1.5">
              <span className="text-slate-400">Overnight HRV</span>
              <span
                className={`font-semibold ${
                  device.capabilities.overnightHrv === 'active'
                    ? 'text-emerald-400'
                    : 'text-amber-300'
                }`}
              >
                {device.capabilities.overnightHrv === 'active' ? 'Active' : 'Proxy Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Step-by-Step Bridge Instructions */}
        <div className="space-y-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-[11px] font-semibold text-slate-200">
            Setup Path: {activePreset.ecosystem}
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-slate-400">
            {activePreset.setupSteps.map((st, idx) => (
              <li key={idx}>{st}</li>
            ))}
          </ol>
        </div>

        {/* Tier 1: One-Tap Health Connect / Mi Fitness Sync */}
        <button
          type="button"
          onClick={onSyncHealthConnect}
          disabled={isSyncing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-obsidian shadow-emeraldGlow transition hover:bg-emerald-400 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing Health Connect…' : 'Sync Health Connect / Mi Fitness'}</span>
        </button>

        {syncStatusMessage && (
          <p className="text-center text-[11px] text-emerald-300">{syncStatusMessage}</p>
        )}

        {/* Smart Demo / Live Sensor Simulator Toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5">
          <div>
            <p className="text-xs font-medium text-white">Smart Demo / Live Sensor Simulator</p>
            <p className="text-[10px] text-slate-400">
              Streams realistic telemetry & 90-day baselines automatically
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleDemoSimulator(!demoSimulatorEnabled)}
            className={`relative h-6 w-11 rounded-full transition ${
              demoSimulatorEnabled ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
            aria-label="Toggle Smart Demo Simulator"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                demoSimulatorEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tier 2: Direct Web Bluetooth (BLE) Scanner */}
      <div className="aether-glass space-y-3 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bluetooth className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Direct BLE Scanner (0x180D / 0x180F)</h3>
          </div>
          {device.liveBleBpm && (
            <span className="tabular-mono rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-semibold text-rose-300">
              {device.liveBleBpm} bpm
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRealBleScan}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/15 py-2.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25"
          >
            <Bluetooth className="h-3.5 w-3.5" />
            Pair Real BLE
          </button>
          <button
            type="button"
            onClick={() => setBleSimActive((v) => !v)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition ${
              bleSimActive
                ? 'border-rose-400/40 bg-rose-500/15 text-rose-300'
                : 'border-white/10 bg-white/[0.04] text-slate-300 hover:text-white'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            {bleSimActive ? 'Stop Sim Stream' : 'Simulate BLE'}
          </button>
        </div>

        {device.liveBleBpm && (
          <div className="tabular-mono flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#080B10] px-3 py-2 text-[11px] text-slate-300">
            <span>Live HR: {device.liveBleBpm} bpm</span>
            <span>RR-Interval: {device.liveBleRrMs ?? '--'} ms</span>
          </div>
        )}
        {bleMessage && <p className="text-[11px] text-slate-400">{bleMessage}</p>}
      </div>

      {/* Tier 3: Fallback File / JSON / CSV Importer */}
      <div className="aether-glass space-y-3 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2">
          <FileUp className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">Offline Export Importer (JSON / CSV)</h3>
        </div>
        <p className="text-xs text-slate-400">
          Backfill Mi Fitness, Zepp, Apple Health, or Health Connect export files offline.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-2.5 text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <FileUp className="h-3.5 w-3.5" />
            Import File
          </button>
          <button
            type="button"
            onClick={downloadSampleJson}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Sample JSON
          </button>
        </div>
        {importFeedback && <p className="text-[11px] text-indigo-300">{importFeedback}</p>}
      </div>

      {/* Profile, Gemini API Key & Isolated PWA Install */}
      <div className="aether-glass space-y-3 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">AI Coach & Phone Install</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">
              Target Wake Time
            </label>
            <input
              type="time"
              value={profile.targetWakeTime}
              onChange={(e) => onUpdateProfile({ targetWakeTime: e.target.value })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-slate-400">
              Chronological Age
            </label>
            <input
              type="number"
              min={16}
              max={95}
              value={profile.chronologicalAge}
              onChange={(e) =>
                onUpdateProfile({ chronologicalAge: Math.max(16, Number(e.target.value)) })
              }
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-slate-400">
            Optional Gemini API Key (Stored Locally Only)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="password"
              value={geminiDraft}
              onChange={(e) => setGeminiDraft(e.target.value)}
              placeholder="AIza… (leave blank for Offline AI Engine)"
              className="flex-1 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => onUpdateProfile({ geminiApiKey: geminiDraft.trim() })}
              className="rounded-xl bg-white/10 px-3 text-xs font-semibold text-white hover:bg-white/20"
            >
              Save
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
            <Shield className="h-3.5 w-3.5" />
            <span>Isolated Standalone Phone App</span>
          </div>
          <p className="mt-1 leading-relaxed text-slate-400">
            Scoped manifest ID (<span className="tabular-mono text-slate-200">com.aetheros.biometric.pwa.v1</span>),
            isolated storage prefix (<span className="tabular-mono text-slate-200">aether_os_v1::</span>), and
            relative SW scope (<span className="tabular-mono text-slate-200">./</span>) guarantee AETHER installs
            separately from any other GitHub Pages app.
          </p>
          {canInstallPwa && (
            <button
              type="button"
              onClick={onTriggerPwaInstall}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-obsidian"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Install AETHER on Phone
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onResetAllData}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Local AETHER Demo Telemetry
        </button>
      </div>
    </div>
  );
};
