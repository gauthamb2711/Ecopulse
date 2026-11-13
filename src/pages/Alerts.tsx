import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import { AlertPanel } from '../components/AlertPanel';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { playAlertChime } from '../services/alertService';

export const Alerts: React.FC = () => {
  const { state, resolveAlert, clearResolvedAlerts, updateSettings } =
    useSmartWasteSystem();

  const [filterMode, setFilterMode] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const filteredAlerts = useMemo(() => {
    if (filterMode === 'ACTIVE') return state.alerts.filter((a) => !a.resolved);
    if (filterMode === 'RESOLVED') return state.alerts.filter((a) => a.resolved);
    return state.alerts;
  }, [state.alerts, filterMode]);

  const activeCount = state.alerts.filter((a) => !a.resolved).length;
  const resolvedCount = state.alerts.length - activeCount;

  return (
    <div className="space-y-6">
      {/* Alert Controls & Sound Toggle */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0F172A] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              In-App Simulated Alert Centre
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Alerts trigger automatically when simulated bins enter Nearly Full (51–90%) or Completely Full (91–100%). No external SMS or WhatsApp messages are sent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !state.settings.alertSoundEnabled;
              updateSettings({ alertSoundEnabled: next });
              if (next) playAlertChime('WARNING');
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              state.settings.alertSoundEnabled
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-slate-800 text-slate-300'
            }`}
          >
            {state.settings.alertSoundEnabled ? (
              <Volume2 className="h-3.5 w-3.5" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span>Sound {state.settings.alertSoundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={clearResolvedAlerts}
            disabled={resolvedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            <span>Clear Resolved ({resolvedCount})</span>
          </button>
        </div>
      </div>

      {/* Filter Segmented Bar */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-[#0F172A] p-1 w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('ALL')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filterMode === 'ALL'
              ? 'bg-slate-800 text-slate-100'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Alerts ({state.alerts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('ACTIVE')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filterMode === 'ACTIVE'
              ? 'bg-amber-500/20 text-amber-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('RESOLVED')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            filterMode === 'RESOLVED'
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Alert History List */}
      <AlertPanel
        alerts={filteredAlerts}
        onResolve={resolveAlert}
        maxItems={100}
        emptyMessage="No alerts match the selected filter."
      />
    </div>
  );
};
