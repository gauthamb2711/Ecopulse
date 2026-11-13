import React, { useRef, useState } from 'react';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';

export const Settings: React.FC = () => {
  const {
    state,
    updateSettings,
    exportAppDataJson,
    importAppDataJson,
    factoryResetApp,
  } = useSmartWasteSystem();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);

  const handleDownloadBackup = () => {
    const json = exportAppDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecopulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = importAppDataJson(content);
      if (result.ok) {
        setImportStatus({
          type: 'success',
          text: 'Application state imported and validated successfully.',
        });
      } else {
        setImportStatus({
          type: 'error',
          text: result.error || 'Import failed.',
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({ type: 'error', text: 'Unable to read the selected file.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Simulation & Sensor Preferences */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Simulation & Sensor Configuration
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Settings are persisted locally in browser LocalStorage.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-300">Auto-Simulation Tick Interval</span>
              <span className="font-mono text-cyan-400 tabular-nums">
                {state.settings.tickIntervalMs} ms
              </span>
            </div>
            <input
              type="range"
              min="400"
              max="3500"
              step="100"
              value={state.settings.tickIntervalMs}
              onChange={(e) =>
                updateSettings({ tickIntervalMs: Number(e.target.value) })
              }
              className="mt-2 w-full accent-cyan-400"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div>
              <div className="text-xs font-medium text-slate-200">
                Simulate HC-SR04 Ultrasonic Noise
              </div>
              <p className="text-[11px] text-slate-400">
                Adds bounded Gaussian jitter to distance measurements
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  sensorNoiseEnabled: !state.settings.sensorNoiseEnabled,
                })
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                state.settings.sensorNoiseEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {state.settings.sensorNoiseEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800 pt-4">
            <div>
              <div className="text-xs font-medium text-slate-200">In-App Alert Audio Chime</div>
              <p className="text-[11px] text-slate-400">
                Synthesizes a browser tone when a bin hits Nearly Full or Completely Full
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSettings({
                  alertSoundEnabled: !state.settings.alertSoundEnabled,
                })
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                state.settings.alertSoundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {state.settings.alertSoundEnabled ? 'Sound ON' : 'Sound OFF'}
            </button>
          </div>
        </div>

        {/* LocalStorage Data Export, Import & Factory Reset */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Local Data Backup & Recovery
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Export or import dustbins, trained Random Forest weights, history logs, and alerts as JSON.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Application Data (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import Application Data (.json)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileImport}
              className="hidden"
            />
          </div>

          {importStatus && (
            <div
              className={`rounded-lg border px-3.5 py-2.5 text-xs ${
                importStatus.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-red-500/30 bg-red-500/10 text-red-300'
              }`}
            >
              {importStatus.text}
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <div className="text-xs font-medium text-slate-200">Reset All Application State</div>
            <p className="mt-1 text-xs text-slate-400">
              Clears LocalStorage and restores the 5 default simulated bins (BIN-001 to BIN-005).
            </p>
            <button
              type="button"
              onClick={() => setConfirmFactoryReset(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/25"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Factory Reset Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirm Factory Reset Modal */}
      {confirmFactoryReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0F172A] p-6">
            <h3 className="text-base font-semibold text-slate-100">Reset All Local Data?</h3>
            <p className="mt-2 text-xs text-slate-400">
              All custom bins, trained ML models, history logs, alerts, and collection records will be reset to initial factory defaults.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmFactoryReset(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  factoryResetApp();
                  setConfirmFactoryReset(false);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
