import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, RotateCcw, Truck } from 'lucide-react';
import { AlertPanel } from '../components/AlertPanel';
import {
  FillHistoryAreaChart,
  RegressionTrendChart,
} from '../components/Charts/WasteCharts';
import { Dustbin3D } from '../components/Dustbin3D';
import { UltrasonicSensor } from '../components/UltrasonicSensor';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { STATUS_META } from '../types';
import { formatDurationFromHours, formatShortTime } from '../utils/formatters';

export const DustbinDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    state,
    telemetryByBinId,
    addWasteToBin,
    emptyBin,
    resetBin,
    resolveAlert,
    selectBin,
  } = useSmartWasteSystem();

  const telemetry = id ? telemetryByBinId[id] : undefined;

  if (!telemetry) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-8 text-center">
        <p className="text-sm font-medium text-slate-200">Dustbin not found.</p>
        <button
          type="button"
          onClick={() => navigate('/dustbins')}
          className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950"
        >
          Back to All Dustbins
        </button>
      </div>
    );
  }

  const { bin, sensor, mlPrediction, effectiveStatus, prediction } = telemetry;
  const statusMeta = STATUS_META[effectiveStatus];
  const binAlerts = state.alerts.filter((a) => a.binId === bin.id);
  const historyData = bin.fillHistory.map((pt) => ({
    time: formatShortTime(pt.timestamp),
    fillPercentage: pt.fillPercentage,
    distanceCm: pt.distanceCm,
  }));

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dustbins')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Dustbins</span>
          </button>
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {bin.code} · {bin.name}
            </h2>
            <p className="text-xs text-slate-400">
              {bin.location} · Height {bin.binHeightCm} cm ·{' '}
              <span className={statusMeta.textColor}>{statusMeta.label}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addWasteToBin(bin.id, 10, 'MANUAL_ADD')}
            disabled={bin.fillPercentage >= 100}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add 10%</span>
          </button>
          <button
            type="button"
            onClick={() => emptyBin(bin.id, true, 'Dispatched from Dustbin Details')}
            disabled={bin.fillPercentage <= 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Mark Collected</span>
          </button>
          <button
            type="button"
            onClick={() => resetBin(bin.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={() => {
              selectBin(bin.id);
              navigate('/simulator');
            }}
            className="rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Open in Simulator
          </button>
        </div>
      </div>

      {/* Top Split: Cutaway Visual + Ultrasonic Physics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <Dustbin3D
            bin={bin}
            sensor={sensor}
            effectiveStatus={effectiveStatus}
            mlPrediction={mlPrediction}
            compact
          />
        </div>
        <div className="space-y-5 xl:col-span-7">
          <UltrasonicSensor
            reading={sensor}
            noiseEnabled={state.settings.sensorNoiseEnabled}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
              <div className="text-xs text-slate-400">ML Classification</div>
              <div className="mt-1 text-sm font-semibold text-slate-100">
                {mlPrediction ? STATUS_META[mlPrediction.status].label : 'MODEL NOT TRAINED'}
              </div>
              <div className="mt-0.5 font-mono text-xs text-slate-400 tabular-nums">
                {mlPrediction ? `${mlPrediction.confidence.toFixed(1)}% confidence` : 'Train in ML Lab'}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
              <div className="text-xs text-slate-400">Fill Rate (OLS)</div>
              <div className="mt-1 font-mono text-sm font-semibold text-amber-400 tabular-nums">
                {prediction.slopePerHour > 0
                  ? `+${prediction.slopePerHour.toFixed(1)}%/hr`
                  : '0.0%/hr'}
              </div>
              <div className="mt-0.5 text-xs text-slate-400">{prediction.rateCategory} trend</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
              <div className="text-xs text-slate-400">Time to 100%</div>
              <div className="mt-1 font-mono text-sm font-semibold text-cyan-400 tabular-nums">
                {prediction.status === 'PREDICTING'
                  ? formatDurationFromHours(prediction.hoursRemaining)
                  : prediction.status === 'ALREADY_FULL'
                  ? 'Immediate'
                  : '—'}
              </div>
              <div className="mt-0.5 text-xs text-slate-400 truncate">{prediction.message}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">Fill Percentage History</h3>
          <FillHistoryAreaChart data={historyData} accentHex={statusMeta.hex} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-100">
            Linear Regression Capacity Projection
          </h3>
          <RegressionTrendChart data={prediction.chartPoints} />
        </div>
      </div>

      {/* Bin Alert History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-100">
          Alert History for {bin.code}
        </h3>
        <AlertPanel
          alerts={binAlerts}
          onResolve={resolveAlert}
          emptyMessage={`No alerts recorded for ${bin.code}.`}
        />
      </div>
    </div>
  );
};
