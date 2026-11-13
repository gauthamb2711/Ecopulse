import React, { useState } from 'react';
import { Radio, Sliders, Volume2 } from 'lucide-react';
import { UltrasonicSensor } from '../components/UltrasonicSensor';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';

export const SensorSimulator: React.FC = () => {
  const {
    state,
    telemetryByBinId,
    selectedBinTelemetry,
    selectBin,
    updateBinConfig,
    updateSettings,
    addWasteToBin,
    removeWasteFromBin,
  } = useSmartWasteSystem();

  const [sampleTick, setSampleTick] = useState(0);

  if (!selectedBinTelemetry) return null;

  const { bin, sensor } = selectedBinTelemetry;

  const handleHeightChange = (nextHeight: number) => {
    const clamped = Math.max(30, Math.min(300, Math.round(nextHeight)));
    updateBinConfig(bin.id, { binHeightCm: clamped });
  };

  const handleTestFillJump = (targetPct: number) => {
    const diff = targetPct - bin.fillPercentage;
    if (diff > 0) {
      addWasteToBin(bin.id, diff, 'SENSOR_TICK');
    } else if (diff < 0) {
      removeWasteFromBin(bin.id, Math.abs(diff));
    }
  };

  return (
    <div className="space-y-6">
      {/* Explicit Simulation Notice */}
      <div className="flex flex-col gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Radio className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">
              Simulated HC-SR04 Ultrasonic Sensor Environment
            </h2>
            <p className="mt-0.5 text-xs text-cyan-100/80">
              All distance, echo pulse duration, and noise readings are mathematically simulated in software. No physical ultrasonic hardware is attached.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSampleTick((c) => c + 1)}
          className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3.5 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30 whitespace-nowrap shrink-0"
        >
          Sample Pulse (#{sampleTick + 1})
        </button>
      </div>

      {/* Bin Selector */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#0F172A] p-4">
        <span className="mr-1 text-xs font-medium text-slate-400">Calibrating Sensor On:</span>
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
            {b.code} ({b.binHeightCm} cm)
          </button>
        ))}
      </div>

      {/* Main Split: Live Physics Diagram + Calibration Panel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <UltrasonicSensor
            reading={sensor}
            noiseEnabled={state.settings.sensorNoiseEnabled}
          />

          {/* Formula Reference Card */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <h3 className="text-sm font-semibold text-slate-100">
              HC-SR04 Distance Calculation Model
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3 font-mono text-xs">
                <div className="text-slate-400">1. Waste Height Formula</div>
                <div className="mt-1 text-slate-200">
                  Waste Height = Bin Height × (Fill % / 100)
                </div>
                <div className="mt-1.5 text-emerald-400 tabular-nums">
                  = {bin.binHeightCm} × ({bin.fillPercentage.toFixed(1)} / 100) ={' '}
                  {sensor.wasteHeightCm.toFixed(2)} cm
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3 font-mono text-xs">
                <div className="text-slate-400">2. Sensor Air-Gap Distance</div>
                <div className="mt-1 text-slate-200">
                  Distance = Bin Height − Waste Height
                </div>
                <div className="mt-1.5 text-cyan-400 tabular-nums">
                  = {bin.binHeightCm} − {sensor.wasteHeightCm.toFixed(2)} ={' '}
                  {sensor.trueDistanceCm.toFixed(2)} cm
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calibration Panel */}
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Sensor & Bin Calibration Panel
            </h3>
          </div>

          <div className="mt-4 space-y-5">
            {/* Bin Height Calibration */}
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">
                  Simulated Bin Height ({bin.code})
                </span>
                <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                  {bin.binHeightCm} cm
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="220"
                step="5"
                value={bin.binHeightCm}
                onChange={(e) => handleHeightChange(Number(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[60, 100, 120, 150].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleHeightChange(preset)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                      bin.binHeightCm === preset
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset} cm
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Fill Test Presets */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Test Fill Level Calibration</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {bin.fillPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleTestFillJump(pct)}
                    className="rounded-md border border-slate-700 bg-slate-800/80 py-1.5 font-mono text-xs text-slate-200 hover:bg-slate-700"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Sensor Noise Simulation */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Realistic Sensor Noise Simulation
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Adds Gaussian measurement jitter without altering true fill %
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({
                      sensorNoiseEnabled: !state.settings.sensorNoiseEnabled,
                    })
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    state.settings.sensorNoiseEnabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {state.settings.sensorNoiseEnabled ? 'Noise ON' : 'Noise OFF'}
                </button>
              </div>

              {state.settings.sensorNoiseEnabled && (
                <div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Max Noise Amplitude</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      ±{state.settings.noiseLevelCm.toFixed(1)} cm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.5"
                    step="0.1"
                    value={state.settings.noiseLevelCm}
                    onChange={(e) =>
                      updateSettings({ noiseLevelCm: Number(e.target.value) })
                    }
                    className="mt-1.5 w-full accent-cyan-400"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* All Fleet Sensors Matrix */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">
            Fleet Ultrasonic Sensor Telemetry (Simulated)
          </h3>
          <span className="flex items-center gap-1.5 font-mono text-xs text-emerald-400">
            <Volume2 className="h-3.5 w-3.5" />
            <span>40 kHz Ultrasonic Simulation</span>
          </span>
        </div>
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="px-4 py-2.5">Bin</th>
              <th className="px-4 py-2.5">Sensor</th>
              <th className="px-4 py-2.5 text-right">Height</th>
              <th className="px-4 py-2.5 text-right">Fill %</th>
              <th className="px-4 py-2.5 text-right">Waste Height</th>
              <th className="px-4 py-2.5 text-right">Measured Distance</th>
              <th className="px-4 py-2.5 text-right">Echo Pulse</th>
              <th className="px-4 py-2.5">State</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
            {state.dustbins.map((b) => {
              const t = telemetryByBinId[b.id];
              if (!t) return null;
              return (
                <tr key={b.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-2.5 font-sans font-medium text-slate-200">
                    {b.code} · {b.location}
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">{t.sensor.sensorName}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300">{b.binHeightCm} cm</td>
                  <td className="px-4 py-2.5 text-right text-slate-100">
                    {b.fillPercentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-300">
                    {t.sensor.wasteHeightCm.toFixed(1)} cm
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-cyan-400">
                    {t.sensor.measuredDistanceCm.toFixed(2)} cm
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-400">
                    {t.sensor.echoDurationUs} µs
                  </td>
                  <td className="px-4 py-2.5 text-emerald-400">{t.sensor.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
