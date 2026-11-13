import React, { useMemo } from 'react';
import { CheckCircle2, ShieldAlert, Truck } from 'lucide-react';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { STATUS_META } from '../types';
import { formatDateTime, formatDurationFromHours } from '../utils/formatters';

export const Collection: React.FC = () => {
  const { state, telemetryByBinId, emptyBin } = useSmartWasteSystem();

  const dispatchQueue = useMemo(() => {
    return state.dustbins
      .map((bin) => {
        const t = telemetryByBinId[bin.id];
        if (!t) return null;
        const openAlert = state.alerts.find((a) => a.binId === bin.id && !a.resolved);
        const priorityRank =
          t.effectiveStatus === 'COMPLETELY_FULL'
            ? 3
            : t.effectiveStatus === 'NEARLY_FULL'
            ? 2
            : bin.fillPercentage > 0
            ? 1
            : 0;
        return { telemetry: t, openAlert, priorityRank };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.priorityRank > 0)
      .sort((a, b) => {
        if (b.priorityRank !== a.priorityRank) return b.priorityRank - a.priorityRank;
        return b.telemetry.bin.fillPercentage - a.telemetry.bin.fillPercentage;
      });
  }, [state.dustbins, telemetryByBinId, state.alerts]);

  const urgentBinsCount = dispatchQueue.filter((d) => d.priorityRank >= 2).length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0F172A] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Waste Collection Dispatch Queue
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {urgentBinsCount} bin{urgentBinsCount === 1 ? '' : 's'} prioritized for immediate or planned collection. Marking a bin collected resets fill to 0%, updates sensor distance, and logs the event.
            </p>
          </div>
        </div>
        <div className="font-mono text-xs text-slate-300 tabular-nums shrink-0">
          Total Collected Events: <span className="font-bold text-emerald-400">{state.collections.length}</span>
        </div>
      </div>

      {/* Collection Queue Table */}
      {dispatchQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-[#0F172A] py-12 text-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
          <p className="mt-3 text-sm font-semibold text-slate-100">All Bins Empty</p>
          <p className="mt-1 text-xs text-slate-400">
            No dustbins currently contain waste requiring collection.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Dustbin & Location</th>
                <th className="px-4 py-3 text-right">Current Fill</th>
                <th className="px-4 py-3 text-right">Sensor Distance</th>
                <th className="px-4 py-3">Alert Generated</th>
                <th className="px-4 py-3">Urgency / ETA</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {dispatchQueue.map(({ telemetry, openAlert, priorityRank }) => {
                const { bin, sensor, effectiveStatus, prediction } = telemetry;
                const statusMeta = STATUS_META[effectiveStatus];
                const priorityLabel =
                  priorityRank === 3
                    ? 'CRITICAL'
                    : priorityRank === 2
                    ? 'HIGH'
                    : 'ROUTINE';
                const priorityColor =
                  priorityRank === 3
                    ? 'text-red-400'
                    : priorityRank === 2
                    ? 'text-amber-400'
                    : 'text-slate-400';

                return (
                  <tr key={bin.id} className="hover:bg-slate-800/35">
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 font-mono font-semibold ${priorityColor}`}>
                        {priorityRank === 3 && <ShieldAlert className="h-3.5 w-3.5" />}
                        <span>{priorityLabel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-100">
                        <span className="font-mono text-cyan-400">{bin.code}</span> · {bin.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{bin.location}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold tabular-nums">
                      <span className={statusMeta.textColor}>{bin.fillPercentage.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-cyan-300 tabular-nums">
                      {sensor.measuredDistanceCm.toFixed(1)} cm
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300 tabular-nums">
                      {openAlert ? formatDateTime(openAlert.timestamp) : 'No active alert'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {effectiveStatus === 'COMPLETELY_FULL'
                        ? 'Immediate collection required'
                        : effectiveStatus === 'NEARLY_FULL'
                        ? prediction.status === 'PREDICTING'
                          ? `Plan pickup (Full in ${formatDurationFromHours(prediction.hoursRemaining)})`
                          : 'Collection planning recommended'
                        : 'Normal monitoring'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          emptyBin(
                            bin.id,
                            true,
                            `Collected at ${bin.fillPercentage.toFixed(1)}% (${statusMeta.label})`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 whitespace-nowrap"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Mark Collected</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Collection History Records */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Completed Collection Records ({state.collections.length})
          </h3>
        </div>
        {state.collections.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-400">
            No collections completed yet. Click "Mark Collected" on any bin above to record a dispatch.
          </div>
        ) : (
          <table className="w-full min-w-[680px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-2.5">Collected Time</th>
                <th className="px-4 py-2.5">Dustbin</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5 text-right">Fill at Collection</th>
                <th className="px-4 py-2.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {state.collections.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-mono text-slate-300 tabular-nums">
                    {formatDateTime(rec.collectedAt)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-100">
                    <span className="font-mono text-cyan-400">{rec.binCode}</span> · {rec.binName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{rec.location}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-emerald-400 tabular-nums">
                    {rec.fillAtCollection.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{rec.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
