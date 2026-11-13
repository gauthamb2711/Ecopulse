import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Layers,
  Radio,
  ShieldAlert,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  DistributionDatum,
  FillHistoryAreaChart,
  FleetFillBarChart,
  StatusDistributionChart,
} from '../components/Charts/WasteCharts';
import { AlertPanel } from '../components/AlertPanel';
import { StatusCard } from '../components/StatusCard';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { BIN_STATUS_LIST, STATUS_META } from '../types';
import { formatDateTime, formatDurationFromHours, formatShortTime } from '../utils/formatters';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    telemetryByBinId,
    selectedBinTelemetry,
    resolveAlert,
    trainModel,
    trainingProgress,
  } = useSmartWasteSystem();

  const allTelemetry = useMemo(
    () => state.dustbins.map((b) => telemetryByBinId[b.id]).filter(Boolean),
    [state.dustbins, telemetryByBinId]
  );

  const countsByStatus = useMemo(() => {
    const counts = {
      EMPTY: 0,
      HALF_FILLED: 0,
      NEARLY_FULL: 0,
      COMPLETELY_FULL: 0,
    };
    for (const item of allTelemetry) {
      counts[item.effectiveStatus]++;
    }
    return counts;
  }, [allTelemetry]);

  const activeAlerts = useMemo(
    () => state.alerts.filter((a) => !a.resolved),
    [state.alerts]
  );

  const mostFilled = useMemo(() => {
    if (allTelemetry.length === 0) return null;
    return [...allTelemetry].sort((a, b) => b.bin.fillPercentage - a.bin.fillPercentage)[0];
  }, [allTelemetry]);

  const immediateCollectionBins = useMemo(
    () =>
      allTelemetry
        .filter((t) => t.effectiveStatus === 'COMPLETELY_FULL')
        .sort((a, b) => b.bin.fillPercentage - a.bin.fillPercentage),
    [allTelemetry]
  );

  const distributionData: DistributionDatum[] = BIN_STATUS_LIST.map((key) => ({
    key,
    status: STATUS_META[key].shortLabel,
    count: countsByStatus[key],
  }));

  const fleetComparisonData = allTelemetry.map((t) => ({
    code: t.bin.code,
    fillPercentage: Number(t.bin.fillPercentage.toFixed(1)),
    distanceCm: t.sensor.measuredDistanceCm,
    status: t.effectiveStatus,
  }));

  const selectedHistoryData = (selectedBinTelemetry?.bin.fillHistory || []).map((pt) => ({
    time: formatShortTime(pt.timestamp),
    fillPercentage: pt.fillPercentage,
    distanceCm: pt.distanceCm,
  }));

  const latestLog = state.logs[0] || null;
  const activePredictions = allTelemetry
    .filter((t) => t.prediction.status === 'PREDICTING' && t.prediction.hoursRemaining !== null)
    .sort((a, b) => (a.prediction.hoursRemaining ?? 999) - (b.prediction.hoursRemaining ?? 999));

  return (
    <div className="space-y-6">
      {/* Critical Warning Banner if any bin is completely full */}
      {immediateCollectionBins.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <h2 className="text-sm font-semibold text-red-200">
                Immediate Collection Required ({immediateCollectionBins.length} Bin
                {immediateCollectionBins.length > 1 ? 's' : ''} at Critical Capacity)
              </h2>
              <p className="mt-0.5 text-xs text-red-200/80">
                {immediateCollectionBins
                  .map((t) => `${t.bin.code} (${t.bin.location} · ${t.bin.fillPercentage.toFixed(1)}%)`)
                  .join(' / ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/collection')}
            className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-400 whitespace-nowrap shrink-0"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Dispatch Collection</span>
          </button>
        </div>
      )}

      {/* 6 Summary KPI Cards */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatusCard
          label="Total Dustbins"
          value={state.dustbins.length}
          subtext="Simulated IoT nodes"
          icon={Layers}
          accentClass="text-slate-100"
          onClick={() => navigate('/dustbins')}
        />
        <StatusCard
          label="Empty"
          value={countsByStatus.EMPTY}
          subtext="0–25% · No action"
          icon={CheckCircle2}
          accentClass="text-emerald-400"
        />
        <StatusCard
          label="Half-Filled"
          value={countsByStatus.HALF_FILLED}
          subtext="26–50% · Monitoring"
          icon={Trash2}
          accentClass="text-blue-400"
        />
        <StatusCard
          label="Nearly Full"
          value={countsByStatus.NEARLY_FULL}
          subtext="51–90% · Plan pickup"
          icon={AlertTriangle}
          accentClass="text-amber-400"
        />
        <StatusCard
          label="Completely Full"
          value={countsByStatus.COMPLETELY_FULL}
          subtext="91–100% · Urgent"
          icon={ShieldAlert}
          accentClass="text-red-400"
          onClick={() => navigate('/collection')}
        />
        <StatusCard
          label="Active Alerts"
          value={activeAlerts.length}
          subtext="Unresolved in-app"
          icon={Bell}
          accentClass={activeAlerts.length > 0 ? 'text-amber-400' : 'text-emerald-400'}
          onClick={() => navigate('/alerts')}
        />
      </section>

      {/* Primary Charts Row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Dustbin Fill-Level Distribution
              </h2>
              <p className="text-xs text-slate-400">
                Current fleet breakdown across ML/threshold bands
              </p>
            </div>
          </div>
          <StatusDistributionChart data={distributionData} />
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Fleet Capacity Comparison
              </h2>
              <p className="text-xs text-slate-400">
                Live simulated fill percentage per dustbin
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/simulator')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 whitespace-nowrap"
            >
              Open Live Simulator
            </button>
          </div>
          <FleetFillBarChart data={fleetComparisonData} />
        </div>
      </section>

      {/* Secondary Row: Fill History + Telemetry & ML Status */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Fill Percentage History — {selectedBinTelemetry?.bin.code}
              </h2>
              <p className="text-xs text-slate-400">
                {selectedBinTelemetry?.bin.name} ({selectedBinTelemetry?.bin.location})
              </p>
            </div>
            <span className="font-mono text-xs text-cyan-400 tabular-nums">
              {selectedBinTelemetry?.bin.fillHistory.length || 0} samples
            </span>
          </div>
          <FillHistoryAreaChart
            data={selectedHistoryData}
            accentHex={
              selectedBinTelemetry
                ? STATUS_META[selectedBinTelemetry.effectiveStatus].hex
                : '#06B6D4'
            }
          />
        </div>

        {/* Live Telemetry & ML Status Summary */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              Live Sensor & Machine Learning State
            </h2>
            <p className="text-xs text-slate-400">
              Real-time state derived from simulator and browser Random Forest
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Trash2 className="h-3.5 w-3.5 text-amber-400" />
                Most-Filled Dustbin
              </span>
              <span className="font-mono text-xs font-semibold text-slate-100 tabular-nums">
                {mostFilled
                  ? `${mostFilled.bin.code} · ${mostFilled.bin.fillPercentage.toFixed(1)}%`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Radio className="h-3.5 w-3.5 text-cyan-400" />
                Latest Simulated Sensor
              </span>
              <span className="font-mono text-xs font-semibold text-cyan-300 tabular-nums">
                {selectedBinTelemetry
                  ? `${selectedBinTelemetry.sensor.measuredDistanceCm.toFixed(1)} cm (${selectedBinTelemetry.bin.code})`
                  : '—'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <BrainCircuit className="h-3.5 w-3.5 text-emerald-400" />
                Random Forest Model
              </span>
              {state.trainedModel ? (
                <span className="font-mono text-xs font-semibold text-emerald-400 tabular-nums">
                  TRAINED · {state.modelMetrics?.accuracy.toFixed(1)}% Acc ({state.trainedModel.numTrees} trees)
                </span>
              ) : (
                <span className="font-mono text-xs font-semibold text-amber-400">
                  MODEL NOT TRAINED
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pb-1">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                Latest ML Prediction
              </span>
              {selectedBinTelemetry?.mlPrediction ? (
                <span
                  className={`font-mono text-xs font-semibold tabular-nums ${
                    STATUS_META[selectedBinTelemetry.mlPrediction.status].textColor
                  }`}
                >
                  {STATUS_META[selectedBinTelemetry.mlPrediction.status].label} (
                  {selectedBinTelemetry.mlPrediction.confidence.toFixed(1)}%)
                </span>
              ) : (
                <span className="font-mono text-xs text-slate-400">
                  MODEL NOT TRAINED
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!state.trainedModel ? (
              <button
                type="button"
                disabled={trainingProgress.isTraining}
                onClick={() => trainModel({ numTrees: 15, maxDepth: 8, minSamplesSplit: 2 })}
                className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap"
              >
                {trainingProgress.isTraining
                  ? `Training (${trainingProgress.completedTrees}/${trainingProgress.totalTrees})...`
                  : 'Train Random Forest Model'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/ml-lab')}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap"
              >
                Inspect ML Lab Metrics
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/predictions')}
              className="rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap"
            >
              Capacity Forecast
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Row: Predicted Capacity Trends & Collection Activity + Recent Alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Predicted Capacity Trends & Collection Activity
              </h2>
              <p className="text-xs text-slate-400">
                Linear regression ETA and recent dispatch log
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {activePredictions.length > 0 ? (
              activePredictions.slice(0, 4).map((t) => (
                <div
                  key={t.bin.id}
                  onClick={() => navigate(`/dustbins/${t.bin.id}`)}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-800/80 bg-[#0B111E] px-3.5 py-2.5 transition-colors hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-200">
                      {t.bin.code} · {t.bin.location}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      +{t.prediction.slopePerHour.toFixed(1)}%/hr · Fill{' '}
                      {t.bin.fillPercentage.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs font-semibold text-amber-400 tabular-nums shrink-0">
                    Full in {formatDurationFromHours(t.prediction.hoursRemaining)}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-800/80 bg-[#0B111E] px-4 py-5 text-center text-xs text-slate-400">
                No active upward filling trends detected yet. Run Auto-Fill or add waste to compute ETA.
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Completed Collections</span>
              <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                {state.collections.length}
              </span>
            </div>
            {latestLog && (
              <p className="mt-1 text-[11px] text-slate-500">
                Last telemetry event: {latestLog.binCode} ({latestLog.eventType}) at{' '}
                {formatDateTime(latestLog.timestamp)}
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Recent Simulated Alerts</h2>
              <p className="text-xs text-slate-400">
                In-app threshold & classification notifications
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/alerts')}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
            >
              View All Alerts
            </button>
          </div>
          <AlertPanel alerts={state.alerts} onResolve={resolveAlert} maxItems={4} />
        </div>
      </section>
    </div>
  );
};
