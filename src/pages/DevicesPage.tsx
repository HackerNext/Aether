import React, { useRef, useState } from 'react';
import {
  Activity,
  Bluetooth,
  Download,
  ExternalLink,
  FileUp,
  RefreshCw,
  Watch,
} from 'lucide-react';
import { ConnectedDevice, WearableBrandId } from '../types/health';
import {
  BleLiveTelemetry,
  HealthConnectManager,
  ImportedHealthRow,
  parseHealthExportFile,
  scanAndConnectBleHeartRate,
  WEARABLE_PRESETS,
} from '../services/healthConnectBridge';
import { PageShell } from '../components/PageShell';

interface DevicesPageProps {
  device: ConnectedDevice;
  isSyncing: boolean;
  syncStatusMessage: string;
  onSelectWearable: (brandId: WearableBrandId) => void;
  onSyncHealthConnect: () => void;
  onUpdateBleTelemetry: (telemetry: BleLiveTelemetry) => void;
  onImportRows: (rows: ImportedHealthRow[]) => void;
  onExportBackup: () => void;
  onBack: () => void;
  onOpenDocs: () => void;
}

export const DevicesPage: React.FC<DevicesPageProps> = ({
  device,
  isSyncing,
  syncStatusMessage,
  onSelectWearable,
  onSyncHealthConnect,
  onUpdateBleTelemetry,
  onImportRows,
  onExportBackup,
  onBack,
  onOpenDocs,
}) => {
  const [bleMsg, setBleMsg] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isNative = HealthConnectManager.isNativeAndroid();
  const hc = device.healthConnect;
  const activePreset = WEARABLE_PRESETS.find((p) => p.id === device.id) ?? WEARABLE_PRESETS[0];

  const handleBle = async () => {
    setBleMsg('Scanning BLE GATT 0x180D / 0x180F…');
    const res = await scanAndConnectBleHeartRate((t) => {
      onUpdateBleTelemetry(t);
      setBleMsg(`Connected to ${t.deviceName} (${t.bpm} bpm)`);
    });
    if (!res.success) setBleMsg(res.error || 'BLE scan canceled.');
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const { rows, error } = parseHealthExportFile(text, file.name);
    if (error) setImportMsg(error);
    else {
      onImportRows(rows);
      setImportMsg(`Imported ${rows.length} daily records from ${file.name}.`);
    }
    e.target.value = '';
  };

  return (
    <PageShell
      title="Watch & Health Connect"
      subtitle="3-Tier Universal Ingestion"
      onBack={onBack}
      onOpenDocs={onOpenDocs}
    >
      {/* Tier 1: Android Health Connect Live Bridge */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Android Health Connect</h2>
              <p className="text-xs text-slate-400">SDK 1.1.0 Stable · Aggregation + Safe Sync</p>
            </div>
          </div>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
              device.connected
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {device.connected ? 'Connected' : isNative ? 'Not Connected' : 'Web Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-white/[0.06] bg-[#080B10] p-3.5 text-xs">
          <div>
            <p className="text-[10px] uppercase text-slate-500">Runtime</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {isNative ? `Android (${hc.statusLabel})` : 'Browser'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Permissions</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {hc.grantedCount} / {hc.totalRequested} channels
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Last Sync</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">
              {device.lastSyncedIso
                ? new Date(device.lastSyncedIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Never'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">Real Records</p>
            <p className="tabular-mono mt-0.5 font-semibold text-slate-200">{hc.lastRawRecordCount}</p>
          </div>
          {hc.detectedSources.length > 0 && (
            <div className="col-span-2 border-t border-white/[0.06] pt-2">
              <p className="text-[10px] uppercase text-slate-500">Detected Data Sources</p>
              <p className="tabular-mono mt-0.5 text-[11px] text-emerald-300">{hc.detectedSources.join(', ')}</p>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onSyncHealthConnect}
            disabled={isSyncing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-bold text-obsidian shadow-emeraldGlow disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>
              {isSyncing
                ? 'Syncing Health Connect…'
                : device.connected
                  ? 'Sync Health Connect Now'
                  : 'Connect & Grant Permissions'}
            </span>
          </button>

          {isNative && (
            <button
              type="button"
              onClick={() => HealthConnectManager.openSettings()}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.04] py-3 text-xs font-semibold text-slate-200"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Android Health Connect Settings</span>
            </button>
          )}
        </div>

        {syncStatusMessage && (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-xs leading-relaxed text-slate-200">
            {syncStatusMessage}
          </p>
        )}
      </section>

      {/* Watch Model & Setup Checklist */}
      <section className="aether-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Watch className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">Select Wearable & Setup Path</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {WEARABLE_PRESETS.map((p) => {
            const active = p.id === device.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectWearable(p.id)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-white'
                    : 'border-white/[0.08] bg-[#080B10] text-slate-300'
                }`}
              >
                <p className="text-xs font-semibold">{p.name}</p>
                <p className="mt-0.5 text-[10px] text-slate-400">{p.badgeText}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-[#080B10] p-4">
          <p className="text-xs font-semibold text-slate-200">{activePreset.ecosystem}</p>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-400">
            {activePreset.setupSteps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* Tier 2 BLE + Tier 3 File Import / Backup */}
      <section className="aether-card rounded-3xl p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bluetooth className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Direct BLE & Offline Backups</h2>
          </div>
          {device.liveBleBpm && (
            <span className="tabular-mono rounded-full border border-rose-500/30 bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-300">
              {device.liveBleBpm} bpm
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleBle}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/35 bg-cyan-500/15 py-3 text-xs font-semibold text-cyan-200"
        >
          <Bluetooth className="h-4 w-4" />
          Scan & Pair BLE HR Strap (0x180D)
        </button>
        {bleMsg && <p className="text-xs text-slate-400">{bleMsg}</p>}

        <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFile} className="hidden" />
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-400/35 bg-indigo-500/15 py-3 text-xs font-semibold text-indigo-200"
          >
            <FileUp className="h-4 w-4" />
            Import JSON/CSV
          </button>
          <button
            type="button"
            onClick={onExportBackup}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-white/[0.04] py-3 text-xs font-semibold text-slate-200"
          >
            <Download className="h-4 w-4" />
            Export Backup
          </button>
        </div>
        {importMsg && <p className="text-xs text-indigo-300">{importMsg}</p>}
      </section>
    </PageShell>
  );
};
