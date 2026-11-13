import React, { useState } from 'react';
import {
  BrainCircuit,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Shuffle,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Dustbin3D } from '../components/Dustbin3D';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { BIN_STATUS_LIST, STATUS_META } from '../types';
import { formatDateTime, formatDurationFromHours } from '../utils/formatters';

export const Simulator: React.FC = () => {
  const {
    state,
    selectedBinTelemetry,
    selectBin,
    addWasteToBin,
    removeWasteFromBin,
    emptyBin,
    resetBin,
    updateBinConfig,
    updateSettings,
    trainModel,
    trainingProgress,
  } = useSmartWasteSystem();

  const [customPct, setCustomPct] = useState<string>('12');
  const [inputError, setInputError] = useState<string | null>(null);

  if (!selectedBinTelemetry) {
    return (
      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-8 text-center text-sm text-slate-400">
        No simulated dustbins available. Add a dustbin in All Dustbins.
      </div>
    );
  }

  const { bin, sensor, mlPrediction, effectiveStatus, prediction } = selectedBinTelemetry;
  const statusMeta = STATUS_META[effectiveStatus];
  const isAutoMode = state.settings.simulationMode === 'AUTO';
  const isSimRunning = isAutoMode && state.settings.globalRunning;

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(customPct);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
      setInputError('Enter a valid percentage between 0.1 and 100.');
      return;
    }
    setInputError(null);
    addWasteToBin(bin.id, parsed, 'MANUAL_ADD');
  };

  const handleRandomAdd = () => {
    const randomDelta = Number((4 + Math.random() * 18).toFixed(1));
    addWasteToBin(bin.id, randomDelta, 'MANUAL_ADD');
  };

  return (
    <div className="space-y-6">
      {/* Top Bin Selector & Mode Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-[#0F172A] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-medium text-slate-400">Active Bin:</span>
          {state.dustbins.map((b) => {
            const active = b.id === bin.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBin(b.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-800 bg-[#0B111E] text-slate-300 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                {b.code} · {b.fillPercentage.toFixed(0)}%
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-800 bg-[#0B111E] p-1">
            <button
              type="button"
              onClick={() => updateSettings({ simulationMode: 'MANUAL', globalRunning: false })}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                !isAutoMode
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Mode
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ simulationMode: 'AUTO' })}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                isAutoMode
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Automatic Mode
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Simulator Workspace */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: 3D Interactive Smart Dustbin Centerpiece */}
        <div className="xl:col-span-5">
          <Dustbin3D
            bin={bin}
            sensor={sensor}
            effectiveStatus={effectiveStatus}
            mlPrediction={mlPrediction}
          />
        </div>

        {/* Right: Interactive Controls + Live Sensor & ML Readouts */}
        <div className="space-y-5 xl:col-span-7">
          {/* A. ADD WASTE + B. REMOVE WASTE */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Add Waste Controls */}
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Add Waste</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Simulate depositing items (clamped 0–100%)
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={bin.fillPercentage >= 100}
                    onClick={() => addWasteToBin(bin.id, 5, 'MANUAL_ADD')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Small (+5%)</span>
                  </button>
                  <button
                    type="button"
                    disabled={bin.fillPercentage >= 100}
                    onClick={() => addWasteToBin(bin.id, 15, 'MANUAL_ADD')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 text-blue-400" />
                    <span>Medium (+15%)</span>
                  </button>
                  <button
                    type="button"
                    disabled={bin.fillPercentage >= 100}
                    onClick={() => addWasteToBin(bin.id, 30, 'MANUAL_ADD')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-100 transition-colors hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
                  >
                    <Plus className="h-3.5 w-3.5 text-amber-400" />
                    <span>Large (+30%)</span>
                  </button>
                  <button
                    type="button"
                    disabled={bin.fillPercentage >= 100}
                    onClick={handleRandomAdd}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25 disabled:opacity-40 whitespace-nowrap"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Random Waste</span>
                  </button>
                </div>

                {/* Custom Percentage Form */}
                <form onSubmit={handleCustomAdd} className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.5"
                    max="100"
                    step="0.5"
                    value={customPct}
                    onChange={(e) => setCustomPct(e.target.value)}
                    aria-label="Custom waste percentage"
                    className="w-24 rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none tabular-nums"
                  />
                  <button
                    type="submit"
                    disabled={bin.fillPercentage >= 100}
                    className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40 whitespace-nowrap"
                  >
                    Add Custom %
                  </button>
                </form>
                {inputError && <p className="mt-1.5 text-xs text-red-400">{inputError}</p>}
              </div>

              {/* Remove Waste & Simulation Controls */}
              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">Remove Waste</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Partial removal or complete bin evacuation
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={bin.fillPercentage <= 0}
                      onClick={() => removeWasteFromBin(bin.id, 10)}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
                    >
                      Remove 10%
                    </button>
                    <button
                      type="button"
                      disabled={bin.fillPercentage <= 0}
                      onClick={() => removeWasteFromBin(bin.id, 25)}
                      className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
                    >
                      Remove 25%
                    </button>
                    <button
                      type="button"
                      disabled={bin.fillPercentage <= 0}
                      onClick={() => emptyBin(bin.id, false)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/25 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Empty Bin</span>
                    </button>
                  </div>
                </div>

                {/* C. Simulation Controls */}
                <div className="border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      Simulation Loop
                    </span>
                    <span className="font-mono text-xs text-cyan-400 tabular-nums">
                      Speed: {bin.autoSimSpeed.toFixed(1)}%/s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="10"
                    step="0.2"
                    value={bin.autoSimSpeed}
                    onChange={(e) =>
                      updateBinConfig(bin.id, { autoSimSpeed: Number(e.target.value) })
                    }
                    aria-label="Filling speed percentage per second"
                    className="mt-2 w-full accent-cyan-400"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({ simulationMode: 'AUTO', globalRunning: true })
                      }
                      disabled={isSimRunning}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Start</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSettings({ globalRunning: false })}
                      disabled={!isSimRunning}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      <span>Pause</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => resetBin(bin.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 whitespace-nowrap"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset Bin</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Live HC-SR04 Ultrasonic Sensor Telemetry */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-slate-100">
                  {sensor.sensorName}
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-400">
                {sensor.status}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Measured Distance</div>
                <div className="mt-1 font-mono text-lg font-bold text-cyan-400 tabular-nums">
                  {sensor.measuredDistanceCm.toFixed(1)} cm
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Bin Height</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {sensor.binHeightCm} cm
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Waste Height</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-100 tabular-nums">
                  {sensor.wasteHeightCm.toFixed(1)} cm
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Fill Percentage</div>
                <div className={`mt-1 font-mono text-lg font-bold tabular-nums ${statusMeta.textColor}`}>
                  {bin.fillPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Live ML Classification + Linear Regression Prediction */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Random Forest Classification */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-slate-100">
                    ML Status Classification
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-400">Random Forest</span>
              </div>

              {mlPrediction ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-bold ${STATUS_META[mlPrediction.status].textColor}`}>
                      {STATUS_META[mlPrediction.status].label}
                    </span>
                    <span className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                      {mlPrediction.confidence.toFixed(1)}% confidence
                    </span>
                  </div>

                  {/* Class probability bars */}
                  <div className="space-y-1.5">
                    {BIN_STATUS_LIST.map((cls) => {
                      const pct = Math.round((mlPrediction.probabilities[cls] || 0) * 100);
                      return (
                        <div key={cls} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">{STATUS_META[cls].label}</span>
                            <span className="font-mono text-slate-300 tabular-nums">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: STATUS_META[cls].hex,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Guidance: {STATUS_META[mlPrediction.status].alertGuidance} · Predicted{' '}
                    {formatDateTime(mlPrediction.predictedAt)}
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <div className="font-mono text-xs font-semibold text-amber-300">
                      MODEL NOT TRAINED
                    </div>
                    <p className="mt-1 text-xs text-slate-300">
                      Train the Random Forest classifier on the synthetic dataset to activate live ML predictions.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={trainingProgress.isTraining}
                    onClick={() => trainModel({ numTrees: 15, maxDepth: 8, minSamplesSplit: 2 })}
                    className="w-full rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {trainingProgress.isTraining
                      ? `Training Trees (${trainingProgress.completedTrees}/${trainingProgress.totalTrees})...`
                      : 'Train Random Forest Now'}
                  </button>
                </div>
              )}
            </div>

            {/* Linear Regression Full-Bin Prediction */}
            <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-slate-100">
                    Full-Bin Prediction
                  </h2>
                </div>
                <span className="font-mono text-[11px] text-slate-400">Linear Regression</span>
              </div>

              <div className="mt-4 space-y-3">
                {prediction.status === 'PREDICTING' ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-xl font-bold text-amber-400 tabular-nums">
                        {formatDurationFromHours(prediction.hoursRemaining)}
                      </span>
                      <span className="font-mono text-xs text-slate-300 tabular-nums">
                        +{prediction.slopePerHour.toFixed(1)}%/hr
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{prediction.message}</p>
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3 text-xs">
                      <div>
                        <span className="text-slate-400">Expected Full</span>
                        <div className="font-mono font-semibold text-slate-200 tabular-nums">
                          {prediction.expectedFullTimestamp
                            ? formatDateTime(prediction.expectedFullTimestamp)
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Fit Quality (R²)</span>
                        <div className="font-mono font-semibold text-slate-200 tabular-nums">
                          {prediction.rSquared.toFixed(3)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3.5">
                    <div
                      className={`text-xs font-semibold ${
                        prediction.status === 'ALREADY_FULL' ? 'text-red-400' : 'text-slate-200'
                      }`}
                    >
                      {prediction.message}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {prediction.status === 'INSUFFICIENT_DATA'
                        ? 'Add waste or run Auto-Fill across multiple timestamps to build regression history.'
                        : prediction.status === 'NOT_FILLING'
                        ? `Current slope: ${prediction.slopePerHour.toFixed(2)}%/hr (non-increasing).`
                        : 'Mark bin as collected or empty the bin to reset.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
