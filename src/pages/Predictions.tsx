import React from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { RegressionTrendChart } from '../components/Charts/WasteCharts';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { STATUS_META } from '../types';
import { formatDateTime, formatDurationFromHours } from '../utils/formatters';

export const Predictions: React.FC = () => {
  const { state, telemetryByBinId, selectedBinTelemetry, selectBin } =
    useSmartWasteSystem();

  if (!selectedBinTelemetry) return null;

  const { bin, prediction, effectiveStatus } = selectedBinTelemetry;

  return (
    <div className="space-y-6">
      {/* Bin Selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#0F172A] p-4">
        <span className="mr-1 text-xs font-medium text-slate-400">Forecasting Bin:</span>
        {state.dustbins.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => selectBin(b.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              b.id === bin.id
                ? 'bg-cyan-500 text-slate-950'
                : 'border border-slate-800 bg-[#0B111E] text-slate-300 hover:border-slate-700'
            }`}
          >
            {b.code} · {b.fillPercentage.toFixed(0)}%
          </button>
        ))}
      </div>

      {/* Main Forecast Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              Linear Regression Forecast — {bin.code}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {bin.name} · {bin.location}
          </p>

          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-4">
              <div className="text-xs text-slate-400">Estimated Time to 100%</div>
              {prediction.status === 'PREDICTING' ? (
                <>
                  <div className="mt-1 font-mono text-2xl font-bold text-amber-400 tabular-nums">
                    {formatDurationFromHours(prediction.hoursRemaining)}
                  </div>
                  <div className="mt-1 text-xs text-slate-300">
                    Expected full at{' '}
                    <span className="font-mono font-semibold text-slate-100">
                      {prediction.expectedFullTimestamp
                        ? formatDateTime(prediction.expectedFullTimestamp)
                        : '—'}
                    </span>
                  </div>
                </>
              ) : (
                <div
                  className={`mt-1.5 text-sm font-semibold ${
                    prediction.status === 'ALREADY_FULL' ? 'text-red-400' : 'text-slate-200'
                  }`}
                >
                  {prediction.message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-slate-400">Current Fill</div>
                <div className={`mt-1 font-mono text-base font-bold tabular-nums ${STATUS_META[effectiveStatus].textColor}`}>
                  {bin.fillPercentage.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-slate-400">Filling Rate</div>
                <div className="mt-1 font-mono text-base font-bold text-slate-100 tabular-nums">
                  {prediction.slopePerHour > 0
                    ? `+${prediction.slopePerHour.toFixed(1)}%/hr`
                    : `${prediction.slopePerHour.toFixed(1)}%/hr`}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-slate-400">Speed Class</div>
                <div className="mt-1 font-mono text-sm font-semibold text-cyan-300">
                  {prediction.rateCategory}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-slate-400">R² Fit Score</div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-200 tabular-nums">
                  {prediction.rSquared.toFixed(3)}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Computed from {bin.fillHistory.length} historical fill readings using Ordinary Least Squares regression.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-8">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Historical Fill Curve & Linear Extrapolation
              </h3>
              <p className="text-xs text-slate-400">
                Solid cyan curve shows recorded simulated fill levels; dashed amber line projects trajectory to 100%
              </p>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-xs text-slate-400 tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              <span>{bin.fillHistory.length} points</span>
            </span>
          </div>
          <RegressionTrendChart data={prediction.chartPoints} />
        </div>
      </div>

      {/* Fleet Forecast Summary Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Fleet Capacity Predictions Overview
          </h3>
        </div>
        <table className="w-full min-w-[740px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-4 py-2.5">Dustbin</th>
              <th className="px-4 py-2.5 text-right">Current Fill</th>
              <th className="px-4 py-2.5 text-right">Fill Rate</th>
              <th className="px-4 py-2.5">Trend</th>
              <th className="px-4 py-2.5 text-right">Est. Remaining</th>
              <th className="px-4 py-2.5">Prediction Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {state.dustbins.map((b) => {
              const t = telemetryByBinId[b.id];
              if (!t) return null;
              const p = t.prediction;
              return (
                <tr
                  key={b.id}
                  onClick={() => selectBin(b.id)}
                  className="cursor-pointer hover:bg-slate-800/35"
                >
                  <td className="px-4 py-3 font-medium text-slate-200">
                    <span className="font-mono text-cyan-400">{b.code}</span> · {b.location}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100 tabular-nums">
                    {b.fillPercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300 tabular-nums">
                    {p.slopePerHour > 0 ? `+${p.slopePerHour.toFixed(1)}%/hr` : '0.0%/hr'}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-300">{p.rateCategory}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-amber-400 tabular-nums">
                    {p.status === 'PREDICTING'
                      ? formatDurationFromHours(p.hoursRemaining)
                      : p.status === 'ALREADY_FULL'
                      ? 'Immediate'
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{p.message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
