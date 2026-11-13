import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { SmartAlert } from '../types';
import { formatDateTime } from '../utils/formatters';

interface AlertPanelProps {
  alerts: SmartAlert[];
  onResolve?: (alertId: string) => void;
  maxItems?: number;
  emptyMessage?: string;
}

export const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts,
  onResolve,
  maxItems = 6,
  emptyMessage = 'No active alerts in the simulated waste network.',
}) => {
  const visible = alerts.slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0F172A] px-6 py-10 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-400/80" />
        <p className="mt-2 text-sm font-medium text-slate-200">All Clear</p>
        <p className="mt-1 text-xs text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-[#0F172A]">
      {visible.map((alert) => {
        const Icon =
          alert.severity === 'CRITICAL'
            ? ShieldAlert
            : alert.severity === 'WARNING'
            ? AlertTriangle
            : Info;
        const iconColor =
          alert.severity === 'CRITICAL'
            ? 'text-red-400'
            : alert.severity === 'WARNING'
            ? 'text-amber-400'
            : 'text-blue-400';

        return (
          <div
            key={alert.id}
            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3 min-w-0">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-semibold ${iconColor}`}>{alert.severity}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono text-slate-200">{alert.binCode}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="text-slate-400">{alert.location}</span>
                  <span className="text-slate-600" aria-hidden="true">·</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {formatDateTime(alert.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-200">{alert.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {alert.resolved ? (
                <span className="text-xs font-medium text-emerald-400">Resolved</span>
              ) : (
                onResolve && (
                  <button
                    type="button"
                    onClick={() => onResolve(alert.id)}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap shrink-0"
                  >
                    Mark Resolved
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
