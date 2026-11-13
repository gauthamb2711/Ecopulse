import React, { useMemo, useState } from 'react';
import { Download, Printer, Search, Trash2 } from 'lucide-react';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { BIN_STATUS_LIST, BinStatus, STATUS_META } from '../types';
import {
  formatDateTime,
  formatDurationFromHours,
  statusToCsvLabel,
} from '../utils/formatters';

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const Reports: React.FC = () => {
  const { state, clearHistoryLogs } = useSmartWasteSystem();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBinFilter, setSelectedBinFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | BinStatus>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'ALL' | 'LAST_HOUR' | 'TODAY'>('ALL');
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const q = searchTerm.trim().toLowerCase();

    return state.logs.filter((entry) => {
      if (selectedBinFilter !== 'ALL' && entry.binId !== selectedBinFilter) return false;
      if (selectedStatusFilter !== 'ALL' && entry.alertStatus !== selectedStatusFilter) {
        return false;
      }
      if (dateRangeFilter === 'LAST_HOUR' && now - entry.timestamp > 3_600_000) {
        return false;
      }
      if (dateRangeFilter === 'TODAY' && entry.timestamp < startOfToday.getTime()) {
        return false;
      }
      if (q) {
        const hay = `${entry.binCode} ${entry.binName} ${entry.eventType} ${entry.alertStatus}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.logs, searchTerm, selectedBinFilter, selectedStatusFilter, dateRangeFilter]);

  const handleExportCsv = () => {
    const headers = [
      'Timestamp',
      'Dustbin ID',
      'Dustbin Name',
      'Event Type',
      'Fill Percentage (%)',
      'Ultrasonic Distance (cm)',
      'ML Classification',
      'ML Confidence (%)',
      'Predicted Full ETA (hrs)',
      'Alert Status',
    ];

    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.binCode,
      log.binName,
      log.eventType,
      log.fillPercentage.toFixed(1),
      log.ultrasonicDistanceCm.toFixed(2),
      statusToCsvLabel(log.mlClassification),
      log.mlConfidence !== null ? log.mlConfidence.toFixed(1) : 'N/A',
      log.predictionEtaHours !== null ? log.predictionEtaHours.toFixed(2) : 'N/A',
      log.alertStatus,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ecopulse-telemetry-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filter & Export Toolbar */}
      <div className="no-print flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0F172A] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search bin or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-52 rounded-lg border border-slate-700 bg-[#0B111E] py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <select
              value={selectedBinFilter}
              onChange={(e) => setSelectedBinFilter(e.target.value)}
              aria-label="Filter by dustbin"
              className="rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Dustbins</option>
              {state.dustbins.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {b.location}
                </option>
              ))}
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value as 'ALL' | BinStatus)}
              aria-label="Filter by status"
              className="rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Statuses</option>
              {BIN_STATUS_LIST.map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) =>
                setDateRangeFilter(e.target.value as 'ALL' | 'LAST_HOUR' | 'TODAY')
              }
              aria-label="Filter by date range"
              className="rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-1.5 text-xs text-slate-200"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="LAST_HOUR">Last 60 Minutes</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40 whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Report</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={state.logs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-40 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-mono font-semibold text-slate-200">{filteredLogs.length}</span> of{' '}
          <span className="font-mono text-slate-300">{state.logs.length}</span> telemetry records ·{' '}
          <span className="font-mono text-emerald-400">{state.collections.length}</span> collection events
        </div>
      </div>

      {/* Telemetry History Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
        {filteredLogs.length === 0 ? (
          <div className="px-4 py-12 text-center text-xs text-slate-400">
            No history records match the active filters.
          </div>
        ) : (
          <table className="w-full min-w-[840px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Dustbin</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3 text-right">Fill %</th>
                <th className="px-4 py-3 text-right">Distance</th>
                <th className="px-4 py-3">ML Classification</th>
                <th className="px-4 py-3 text-right">Pred. ETA</th>
                <th className="px-4 py-3">Alert Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
              {filteredLogs.slice(0, 150).map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 text-slate-300">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-200">
                    <span className="font-mono text-cyan-400">{log.binCode}</span> · {log.binName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-400">{log.eventType}</td>
                  <td className="px-4 py-2.5 text-right text-slate-100">
                    {log.fillPercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-cyan-300">
                    {log.ultrasonicDistanceCm.toFixed(1)} cm
                  </td>
                  <td className="px-4 py-2.5 font-sans">
                    {log.mlClassification ? (
                      <span className={STATUS_META[log.mlClassification].textColor}>
                        {STATUS_META[log.mlClassification].label} ({log.mlConfidence?.toFixed(0)}%)
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500">NOT TRAINED</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-300">
                    {log.predictionEtaHours !== null
                      ? formatDurationFromHours(log.predictionEtaHours)
                      : '—'}
                  </td>
                  <td className={`px-4 py-2.5 font-sans font-semibold ${STATUS_META[log.alertStatus].textColor}`}>
                    {STATUS_META[log.alertStatus].shortLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Clear History Confirmation Modal */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0F172A] p-6">
            <h3 className="text-base font-semibold text-slate-100">Clear Telemetry History?</h3>
            <p className="mt-2 text-xs text-slate-400">
              This permanently clears all {state.logs.length} local detection history logs from browser storage. Current bin fill states will remain intact.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearHistoryLogs();
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
