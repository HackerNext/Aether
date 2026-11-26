import React, { useRef, useState } from 'react';
import {
  Activity,
  Bluetooth,
  Download,
  ExternalLink,
  FileUp,
  KeyRound,
  RefreshCw,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Watch,
} from 'lucide-react';
import { ConnectedDevice, UserProfile, WearableBrandId } from '../types/health';
import {
  BleLiveTelemetry,
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
  onSelectWearable: (brandId: WearableBrandId) => void;
  onSyncHealthConnect: () => void;
  onToggleDemoSimulator: (enabled: boolean) => void;
  onUpdateBleTelemetry: (telemetry: BleLiveTelemetry) => void;
  onImportRows: (rows: ImportedHealthRow[]) => void;
  onExportBackup: () => void;
  onUpdateProfile: (patch: Partial<UserProfile>) => void;
  onResetAllData: () => void;
}

export const DeviceSyncWizard: React.FC<DeviceSyncWizardProps> = ({
  device,
  profile,
  demoSimulatorEnabled,
  isSyncing,
  syncStatusMessage,
  onSelectWearable,
  onSyncHealthConnect,
  onToggleDemoSimulator,
  onUpdateBleTelemetry,
  onImportRows,
  onExportBackup,
  onUpdateProfile,
  onResetAllData,
}) => {
  const [bleMessage, setBleMessage] = useState('');
  const [importFeedback, setImportFeedback] = useState('');
  const [geminiDraft, setGeminiDraft] = useState(profile.geminiApiKey);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = WEARABLE_PRESETS.find((p) => p.id === device.id) ?? WEARABLE_PRESETS[0];
  const isNativeAndroid = HealthConnectManager.isNativeAndroid();
  const hc = device.healthConnect;

  const handleRealBleScan = async () => {
    setBleMessage('Scanning BLE GATT 0x180D / 0x180F…');
    const res = await scanAndConnectBleHeartRate((telemetry) => {
      onUpdateBleTelemetry(telemetry);
      setBleMessage(`Live BLE stream connected: ${telemetry.deviceName}`);
    });
    if (!res.success) {
      setBleMessage(res.error || 'BLE scan canceled.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, error } = parseHealthExportFile(text, file.name);
    if (error) setImportFeedback(error);
    else {
      onImportRows(rows);
      setImportFeedback(`Imported ${rows.length} daily records from ${file.name}.`);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      {/* SECTION 1: Android Health Connect Live Bridge & Diagnostics */}
      <div className="aether-glass space-y-3.5 rounded-3xl p-4 shadow-glass">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Android Health Connect Bridge</h3>
              <p className="text-xs text-slate-400">SDK 1.1.0 Stable • Android 14 / 15 / 16 System Module</p>
            </div>
          </div>
          <span
            className={`tabular-mono rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              device.connected
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {device.connected ? 'Connected' : isNativeAndroid ? 'Not Connected' : 'Web Preview'}
          </span>
        </div>

        {/* Live Diagnostics Grid */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.07] bg-[#080B10] p-3 text-xs">
          <div>
            <p className="text-[10px] uppercase text-slate-500">Runtime</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {isNativeAndroid ? `Android Native (${hc.statusLabel})` : 'Web Browser'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Permissions Granted</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {hc.grantedCount} / {hc.totalRequested} channels
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Last Sync</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {device.lastSyncedIso ? new Date(device.lastSyncedIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Real Records Pulled</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">{hc.lastRawRecordCount}</p>
          </div>
          {hc.detectedSources.length > 0 && (
            <div className="col-span-2 border-t border-white/[0.06] pt-2">
              <p className="text-[10px] uppercase text-slate-500">Detected Health Connect Apps</p>
              <p className="tabular-mono mt-0.5 text-[11px] text-emerald-300">
                {hc.detectedSources.join(', ')}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onSyncHealthConnect}
          disabled={isSyncing}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-xs font-bold text-obsidian shadow-emeraldGlow disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing
              ? 'Syncing Health Connect…'
              : device.connected
                ? 'Sync Health Connect Now'
                : 'Connect & Grant Health Connect Permissions'}
          </span>
        </button>

        {isNativeAndroid && (
          <button
            type="button"
            onClick={() => HealthConnectManager.openSettings()}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Open Android Health Connect Settings</span>
          </button>
        )}

        {syncStatusMessage && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-slate-200">
            {syncStatusMessage}
          </div>
        )}
      </div>

      {/* SECTION 2: Wearable Profile & Setup Guide */}
      <div className="aether-glass space-y-3 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2">
          <Watch className="h-4 w-4 text-cyan-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Wearable Setup Guide</h3>
            <p className="text-xs text-slate-400">Choose your watch to match calibration mode</p>
          </div>
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
                    : 'border-white/[0.08] bg-white/[0.025] text-slate-300'
                }`}
              >
                <p className="text-xs font-semibold leading-tight">{preset.name}</p>
                <p className="mt-1 text-[10px] text-slate-400">{preset.badgeText}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
          <p className="text-xs font-semibold text-slate-200">Path: {activePreset.ecosystem}</p>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-400">
            {activePreset.setupSteps.map((st, idx) => (
              <li key={idx}>{st}</li>
            ))}
          </ol>
        </div>
      </div>

      {/* SECTION 3: Direct BLE Scanner + Offline Import / Backup */}
      <div className="aether-glass space-y-3 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bluetooth className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Direct BLE & Offline Files</h3>
          </div>
          {device.liveBleBpm && (
            <span className="tabular-mono rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300">
              {device.liveBleBpm} bpm
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRealBleScan}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/35 bg-cyan-500/15 py-2.5 text-xs font-semibold text-cyan-200"
        >
          <Bluetooth className="h-4 w-4" />
          Scan & Pair Real BLE HR Strap (0x180D)
        </button>
        {bleMessage && <p className="text-xs text-slate-400">{bleMessage}</p>}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-indigo-400/35 bg-indigo-500/15 py-2.5 text-xs font-semibold text-indigo-200"
          >
            <FileUp className="h-3.5 w-3.5" />
            Import JSON/CSV
          </button>
          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.05] py-2.5 text-xs font-semibold text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export Backup
          </button>
        </div>
        {importFeedback && <p className="text-xs text-indigo-300">{importFeedback}</p>}
      </div>

      {/* SECTION 4: Profile, AI Key & Optional Demo Mode Preview */}
      <div className="aether-glass space-y-3.5 rounded-3xl p-4 shadow-glass">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Profile, AI & Demo Preview</h3>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[11px] text-slate-400">Age</label>
            <input
              type="number"
              min={15}
              max={95}
              value={profile.chronologicalAge}
              onChange={(e) => {
                const age = Math.max(15, Number(e.target.value));
                onUpdateProfile({ chronologicalAge: age, maxHrBpm: 220 - age });
              }}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Weight (kg)</label>
            <input
              type="number"
              min={30}
              max={200}
              value={profile.bodyWeightKg}
              onChange={(e) => onUpdateProfile({ bodyWeightKg: Math.max(30, Number(e.target.value)) })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white"
            />
          </div>
          <div>
            <label className="text-[11px] text-slate-400">Wake Time</label>
            <input
              type="time"
              value={profile.targetWakeTime}
              onChange={(e) => onUpdateProfile({ targetWakeTime: e.target.value })}
              className="tabular-mono mt-1 w-full rounded-xl border border-white/10 bg-[#07090D] px-2 py-2 text-xs text-white"
            />
          </div>
        </div>

        <div>
          <label className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <KeyRound className="h-3 w-3" /> Optional Gemini API Key (Local Only)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="password"
              value={geminiDraft}
              onChange={(e) => setGeminiDraft(e.target.value)}
              placeholder="Leave blank for offline AI coach"
              className="flex-1 rounded-xl border border-white/10 bg-[#07090D] px-3 py-2 text-xs text-white placeholder-slate-500"
            />
            <button
              type="button"
              onClick={() => onUpdateProfile({ geminiApiKey: geminiDraft.trim() })}
              className="rounded-xl bg-white/10 px-3.5 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>

        {/* Explicit Optional Demo Mode Toggle (OFF by default, never overwrites real data!) */}
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-3">
          <div className="pr-3">
            <p className="text-xs font-semibold text-amber-200">Preview Demo Data (Optional)</p>
            <p className="text-[11px] text-slate-400">
              Temporarily previews sample charts without touching your real data. Always OFF by default.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleDemoSimulator(!demoSimulatorEnabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              demoSimulatorEnabled ? 'bg-amber-400' : 'bg-slate-700'
            }`}
            aria-label="Toggle Demo Preview Mode"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                demoSimulatorEnabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={onResetAllData}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-xs font-semibold text-rose-300"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Clear All Local AETHER Data
        </button>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
          <span>100% on-device storage (`aether_os_v2::`) • Package `com.aetheros.biometrics`</span>
        </div>
      </div>
    </div>
  );
};
