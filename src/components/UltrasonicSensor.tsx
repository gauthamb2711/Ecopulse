import React from 'react';
import { SensorReading } from '../types';

interface UltrasonicSensorProps {
  reading: SensorReading;
  noiseEnabled: boolean;
}

export const UltrasonicSensor: React.FC<UltrasonicSensorProps> = ({ reading, noiseEnabled }) => {
  const airGapRatio = reading.binHeightCm > 0 ? reading.measuredDistanceCm / reading.binHeightCm : 1;
  const targetX = 88 + Math.max(12, Math.min(184, airGapRatio * 184));

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            HC-SR04 Ultrasonic Transducer Physics
          </h3>
          <p className="text-xs text-slate-400">
            {reading.sensorName} · Status: {reading.status}
          </p>
        </div>
        <div className="font-mono text-xs text-cyan-400 tabular-nums">
          Echo Pulse: {reading.echoDurationUs.toLocaleString()} µs
        </div>
      </div>

      {/* Horizontal Acoustic Wave Propagation Diagram */}
      <div className="my-4 overflow-hidden rounded-lg border border-slate-800/80 bg-[#090E1A] p-3">
        <svg viewBox="0 0 320 120" className="h-32 w-full" role="img" aria-label="HC-SR04 acoustic wave propagation">
          {/* HC-SR04 PCB mounted on left */}
          <rect x="14" y="24" width="22" height="72" rx="3" fill="#0369A1" stroke="#38BDF8" strokeWidth="1.2" />
          <circle cx="25" cy="44" r="10" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.2" />
          <circle cx="25" cy="44" r="6" fill="#0F172A" />
          <circle cx="25" cy="76" r="10" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.2" />
          <circle cx="25" cy="76" r="6" fill="#0F172A" />
          <text x="10" y="18" fill="#94A3B8" fontSize="8" fontFamily="JetBrains Mono, monospace">
            TX / RX
          </text>

          {/* Acoustic cone */}
          <polygon
            points={`36,44 ${targetX},26 ${targetX},94 36,76`}
            fill="#06B6D4"
            fillOpacity="0.08"
          />

          {/* Travelling wave pulses */}
          {[0.25, 0.55, 0.85].map((t, idx) => {
            const x = 42 + (targetX - 48) * t;
            const spread = 12 + t * 18;
            return (
              <path
                key={idx}
                d={`M${x},${60 - spread} Q${x + 8},60 ${x},${60 + spread}`}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="1.6"
                strokeOpacity={1 - t * 0.4}
                strokeLinecap="round"
              />
            );
          })}

          {/* Reflected wave */}
          <path
            d={`M${targetX - 18},48 Q${targetX - 24},60 ${targetX - 18},72`}
            fill="none"
            stroke="#10B981"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />

          {/* Waste surface barrier */}
          <rect x={targetX} y="16" width="14" height="88" rx="2" fill="#F59E0B" fillOpacity="0.28" stroke="#F59E0B" strokeWidth="1.4" />
          <text
            x={targetX + 7}
            y="114"
            textAnchor="middle"
            fill="#FBBF24"
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
          >
            Waste Surface
          </text>

          {/* Distance ruler */}
          <line x1="36" y1="108" x2={targetX} y2="108" stroke="#22D3EE" strokeWidth="1.2" />
          <text
            x={(36 + targetX) / 2}
            y="103"
            textAnchor="middle"
            fill="#22D3EE"
            fontSize="9"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
          >
            d = {reading.measuredDistanceCm.toFixed(1)} cm
          </text>
        </svg>
      </div>

      {/* Numeric Telemetry Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800/80 bg-[#0B111E] px-3 py-2.5">
          <div className="text-[11px] text-slate-400">Measured Distance</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-cyan-400 tabular-nums">
            {reading.measuredDistanceCm.toFixed(2)} cm
          </div>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0B111E] px-3 py-2.5">
          <div className="text-[11px] text-slate-400">True Distance</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-slate-200 tabular-nums">
            {reading.trueDistanceCm.toFixed(2)} cm
          </div>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0B111E] px-3 py-2.5">
          <div className="text-[11px] text-slate-400">Waste Height</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-slate-200 tabular-nums">
            {reading.wasteHeightCm.toFixed(2)} cm
          </div>
        </div>
        <div className="rounded-lg border border-slate-800/80 bg-[#0B111E] px-3 py-2.5">
          <div className="text-[11px] text-slate-400">Noise Delta</div>
          <div className="mt-0.5 font-mono text-sm font-semibold text-slate-300 tabular-nums">
            {noiseEnabled
              ? `${reading.noiseDeltaCm >= 0 ? '+' : ''}${reading.noiseDeltaCm.toFixed(2)} cm`
              : 'Disabled (0.00)'}
          </div>
        </div>
      </div>
    </div>
  );
};
