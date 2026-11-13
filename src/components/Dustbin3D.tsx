import React from 'react';
import {
  BinStatus,
  Dustbin,
  MLPrediction,
  STATUS_META,
  SensorReading,
  WasteObject,
} from '../types';

interface Dustbin3DProps {
  bin: Dustbin;
  sensor: SensorReading;
  effectiveStatus: BinStatus;
  mlPrediction: MLPrediction | null;
  compact?: boolean;
}

const renderWasteSprite = (item: WasteObject, chamberBottomY: number, chamberHeight: number) => {
  // Position item inside the waste column: level 0% -> bottom, level 100% -> top
  const yPos = chamberBottomY - (item.level / 100) * chamberHeight + 6;
  const xPos = 64 + (item.x / 100) * 152;
  const transform = `translate(${xPos.toFixed(1)}, ${yPos.toFixed(1)}) rotate(${item.rotation}) scale(${item.scale})`;

  switch (item.type) {
    case 'bottle':
      return (
        <g key={item.id} transform={transform}>
          <rect x="-6" y="-11" width="12" height="19" rx="3" fill="#38BDF8" fillOpacity="0.82" stroke="#BAE6FD" strokeWidth="0.9" />
          <rect x="-3" y="-15" width="6" height="4" rx="1" fill="#0284C7" />
          <rect x="-6" y="-4" width="12" height="5" fill="#E0F2FE" fillOpacity="0.45" />
        </g>
      );
    case 'can':
      return (
        <g key={item.id} transform={transform}>
          <rect x="-7" y="-9" width="14" height="16" rx="2" fill="#94A3B8" stroke="#E2E8F0" strokeWidth="0.9" />
          <rect x="-7" y="-3" width="14" height="6" fill="#EF4444" fillOpacity="0.75" />
          <ellipse cx="0" cy="-9" rx="7" ry="1.8" fill="#CBD5E1" />
        </g>
      );
    case 'paper':
      return (
        <g key={item.id} transform={transform}>
          <path
            d="M-8,-6 L-2,-9 L6,-7 L9,1 L4,8 L-5,7 L-9,1 Z"
            fill="#F1F5F9"
            fillOpacity="0.88"
            stroke="#CBD5E1"
            strokeWidth="0.9"
          />
          <path d="M-4,-3 L3,-1 M-3,2 L4,3" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      );
    case 'organic':
      return (
        <g key={item.id} transform={transform}>
          <path
            d="M-7,-4 C-7,-9 7,-9 7,-4 C7,2 4,7 0,7 C-4,7 -7,2 -7,-4 Z"
            fill="#84CC16"
            fillOpacity="0.8"
            stroke="#BEF264"
            strokeWidth="0.8"
          />
          <path d="M0,-8 L2,-12" stroke="#A16207" strokeWidth="1.3" strokeLinecap="round" />
        </g>
      );
    case 'cardboard':
    default:
      return (
        <g key={item.id} transform={transform}>
          <rect x="-9" y="-6" width="18" height="12" rx="1.5" fill="#B45309" fillOpacity="0.85" stroke="#F59E0B" strokeWidth="0.8" />
          <line x1="-9" y1="0" x2="9" y2="0" stroke="#78350F" strokeWidth="0.8" />
        </g>
      );
  }
};

export const Dustbin3D: React.FC<Dustbin3DProps> = ({
  bin,
  sensor,
  effectiveStatus,
  mlPrediction,
  compact = false,
}) => {
  const statusMeta = STATUS_META[effectiveStatus];
  const fill = Math.max(0, Math.min(100, bin.fillPercentage));
  const isFull = effectiveStatus === 'COMPLETELY_FULL';

  // Chamber SVG coordinates
  const chamberTopY = 92;
  const chamberBottomY = 342;
  const chamberHeight = chamberBottomY - chamberTopY; // 250px
  const wastePixelHeight = (fill / 100) * chamberHeight;
  const wasteSurfaceY = chamberBottomY - wastePixelHeight;

  // Sensor emitter sits at y = 84; ultrasonic waves travel down to wasteSurfaceY
  const sensorEmitterY = 86;
  const waveTravelPx = Math.max(16, wasteSurfaceY - sensorEmitterY - 6);

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-xl border bg-[#0F172A] p-4 transition-colors ${
        isFull ? 'border-red-500/60 shadow-[0_0_28px_rgba(239,68,68,0.12)]' : 'border-slate-800'
      }`}
    >
      {/* Top assembly label */}
      <div className="flex w-full items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400">{bin.code}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="truncate text-sm font-semibold text-slate-100">{bin.name}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {bin.location} · Height {bin.binHeightCm} cm · HC-SR04 (Simulated)
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-xs font-semibold ${statusMeta.textColor}`}>
            {statusMeta.label}
          </div>
          <div className="font-mono text-[11px] text-slate-400 tabular-nums">
            {mlPrediction ? `ML ${mlPrediction.confidence.toFixed(1)}%` : 'Model not trained'}
          </div>
        </div>
      </div>

      {/* Main 3D-Perspective Cutaway SVG */}
      <div className={`relative w-full flex items-center justify-center ${compact ? 'my-2' : 'my-3'}`}>
        <svg
          viewBox="0 0 340 390"
          className={compact ? 'h-72 w-full max-w-[290px]' : 'h-[370px] w-full max-w-[340px]'}
          role="img"
          aria-label={`Simulated 3D cutaway view of ${bin.name} at ${fill.toFixed(1)}% fill`}
        >
          <defs>
            {/* Metallic dark bin body gradient */}
            <linearGradient id={`bin-body-${bin.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1E293B" />
              <stop offset="18%" stopColor="#334155" />
              <stop offset="82%" stopColor="#1E293B" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>

            {/* Lid gradient */}
            <linearGradient id={`bin-lid-${bin.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1E293B" />
            </linearGradient>

            {/* Interior chamber dark gradient */}
            <linearGradient id={`chamber-bg-${bin.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#090E1A" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>

            {/* Waste column status tint */}
            <linearGradient id={`waste-fill-${bin.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={statusMeta.hex} stopOpacity="0.48" />
              <stop offset="35%" stopColor="#1E293B" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.98" />
            </linearGradient>

            {/* Cutaway acrylic glass reflection */}
            <linearGradient id={`glass-sheen-${bin.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.08" />
              <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.01" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.04" />
            </linearGradient>

            {/* Clip path for interior waste cutaway */}
            <clipPath id={`chamber-clip-${bin.id}`}>
              <rect x="60" y={chamberTopY} width="160" height={chamberHeight} rx="6" />
            </clipPath>
          </defs>

          {/* Floor shadow */}
          <ellipse cx="148" cy="364" rx="102" ry="12" fill="#020617" fillOpacity="0.7" />

          {/* 3D Side Perspective Panel (Right depth face) */}
          <polygon
            points="232,74 260,64 250,348 224,356"
            fill="#0F172A"
            stroke="#334155"
            strokeWidth="1.2"
          />

          {/* Main Front Outer Bin Chassis */}
          <path
            d="M44,74 L232,74 L224,356 Q224,362 216,362 L60,362 Q52,362 52,356 Z"
            fill={`url(#bin-body-${bin.id})`}
            stroke="#475569"
            strokeWidth="1.4"
          />

          {/* Top Rim Collar */}
          <path
            d="M36,64 L240,64 L264,56 L62,56 Z"
            fill="#334155"
            stroke="#64748B"
            strokeWidth="1"
          />

          {/* Hinged Smart Lid (3D bevelled top) */}
          <path
            d="M38,44 Q140,32 242,44 L264,38 Q154,26 62,38 Z"
            fill="#475569"
            stroke="#64748B"
            strokeWidth="1"
          />
          <rect
            x="38"
            y="44"
            width="204"
            height="20"
            rx="4"
            fill={`url(#bin-lid-${bin.id})`}
            stroke="#64748B"
            strokeWidth="1.1"
          />

          {/* Lid Status LED Strip */}
          <rect
            x="102"
            y="51"
            width="76"
            height="5"
            rx="2.5"
            fill={statusMeta.hex}
            fillOpacity={isFull ? '1' : '0.88'}
          />
          {isFull && (
            <rect
              x="98"
              y="48"
              width="84"
              height="11"
              rx="5"
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.4"
              opacity="0.7"
            >
              <animate attributeName="opacity" values="0.9;0.15;0.9" dur="1.1s" repeatCount="indefinite" />
            </rect>
          )}

          {/* Cutaway Inspection Window Interior */}
          <rect
            x="60"
            y={chamberTopY}
            width="160"
            height={chamberHeight}
            rx="6"
            fill={`url(#chamber-bg-${bin.id})`}
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Threshold reference lines inside cutaway */}
          {[
            { pct: 90, label: '90%', color: '#EF4444' },
            { pct: 50, label: '50%', color: '#F59E0B' },
            { pct: 25, label: '25%', color: '#3B82F6' },
          ].map((mark) => {
            const yMark = chamberBottomY - (mark.pct / 100) * chamberHeight;
            return (
              <g key={mark.pct} opacity="0.45">
                <line
                  x1="62"
                  y1={yMark}
                  x2="218"
                  y2={yMark}
                  stroke={mark.color}
                  strokeWidth="0.9"
                  strokeDasharray="3 3"
                />
                <text
                  x="65"
                  y={yMark - 3}
                  fill={mark.color}
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {mark.label}
                </text>
              </g>
            );
          })}

          {/* Clipped Waste Fill Column + Waste Objects */}
          <g clipPath={`url(#chamber-clip-${bin.id})`}>
            {/* Animated waste mass column */}
            <rect
              x="60"
              y={wasteSurfaceY}
              width="160"
              height={Math.max(0, wastePixelHeight + 4)}
              fill={`url(#waste-fill-${bin.id})`}
              style={{ transition: 'y 320ms cubic-bezier(0.16, 1, 0.3, 1), height 320ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />

            {/* Waste objects layered inside */}
            {bin.wasteItems.map((item) => renderWasteSprite(item, chamberBottomY, chamberHeight))}

            {/* Top Waste Surface Meniscus Line */}
            {fill > 0.5 && (
              <g
                style={{
                  transform: `translateY(${wasteSurfaceY}px)`,
                  transition: 'transform 320ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <line
                  x1="60"
                  y1="0"
                  x2="220"
                  y2="0"
                  stroke={statusMeta.hex}
                  strokeWidth="2"
                />
                <line
                  x1="60"
                  y1="2"
                  x2="220"
                  y2="2"
                  stroke="#FFFFFF"
                  strokeOpacity="0.22"
                  strokeWidth="1"
                />
              </g>
            )}

            {/* Ultrasonic Signal Waves travelling from HC-SR04 down to waste surface */}
            <g
              style={{
                ['--wave-travel' as string]: `${waveTravelPx}px`,
              }}
            >
              {/* Cone guides */}
              <polygon
                points={`130,${sensorEmitterY} 150,${sensorEmitterY} ${176},${wasteSurfaceY} ${104},${wasteSurfaceY}`}
                fill="#06B6D4"
                fillOpacity="0.06"
              />
              {/* Downward Tx pulse waves */}
              <path
                d={`M124,${sensorEmitterY + 4} Q140,${sensorEmitterY + 12} 156,${sensorEmitterY + 4}`}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="animate-wave-down"
              />
              <path
                d={`M128,${sensorEmitterY + 4} Q140,${sensorEmitterY + 10} 152,${sensorEmitterY + 4}`}
                fill="none"
                stroke="#22D3EE"
                strokeWidth="1.4"
                strokeLinecap="round"
                className="animate-wave-down"
                style={{ animationDelay: '0.6s' }}
              />
              {/* Upward Echo Rx reflection wave */}
              <path
                d={`M124,${sensorEmitterY + 4} Q140,${sensorEmitterY - 4} 156,${sensorEmitterY + 4}`}
                fill="none"
                stroke="#34D399"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                strokeLinecap="round"
                className="animate-wave-up"
              />
            </g>
          </g>

          {/* HC-SR04 Ultrasonic Sensor Module mounted under the lid */}
          <g transform="translate(110, 68)">
            {/* Blue PCB */}
            <rect x="0" y="0" width="60" height="16" rx="2.5" fill="#0369A1" stroke="#38BDF8" strokeWidth="1" />
            {/* Left & Right Transducer Barrels */}
            <circle cx="15" cy="9" r="7.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="15" cy="9" r="4.5" fill="#0F172A" />
            <circle cx="45" cy="9" r="7.5" fill="#CBD5E1" stroke="#64748B" strokeWidth="1.2" />
            <circle cx="45" cy="9" r="4.5" fill="#0F172A" />
            {/* Crystal oscillator */}
            <rect x="25" y="3" width="10" height="4" rx="1" fill="#E2E8F0" />
            <text
              x="30"
              y="14.5"
              textAnchor="middle"
              fill="#E0F2FE"
              fontSize="5.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              HC-SR04
            </text>
          </g>

          {/* Acrylic Glass Sheen Overlay */}
          <rect
            x="60"
            y={chamberTopY}
            width="160"
            height={chamberHeight}
            rx="6"
            fill={`url(#glass-sheen-${bin.id})`}
            stroke="#475569"
            strokeWidth="1.2"
            pointerEvents="none"
          />

          {/* Right-side Distance & Waste Height Callout Brackets */}
          {/* Sensor Air-Gap Distance Span */}
          {wasteSurfaceY - chamberTopY > 14 && (
            <g>
              <line x1="274" y1={chamberTopY} x2="274" y2={wasteSurfaceY} stroke="#22D3EE" strokeWidth="1.3" />
              <line x1="269" y1={chamberTopY} x2="279" y2={chamberTopY} stroke="#22D3EE" strokeWidth="1.3" />
              <line x1="269" y1={wasteSurfaceY} x2="279" y2={wasteSurfaceY} stroke="#22D3EE" strokeWidth="1.3" />
              <text
                x="282"
                y={(chamberTopY + wasteSurfaceY) / 2 - 2}
                fill="#22D3EE"
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                DIST
              </text>
              <text
                x="282"
                y={(chamberTopY + wasteSurfaceY) / 2 + 9}
                fill="#E2E8F0"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                {sensor.measuredDistanceCm.toFixed(1)}cm
              </text>
            </g>
          )}

          {/* Waste Height Span */}
          {chamberBottomY - wasteSurfaceY > 14 && (
            <g>
              <line x1="274" y1={wasteSurfaceY} x2="274" y2={chamberBottomY} stroke={statusMeta.hex} strokeWidth="1.3" />
              <line x1="269" y1={wasteSurfaceY} x2="279" y2={wasteSurfaceY} stroke={statusMeta.hex} strokeWidth="1.3" />
              <line x1="269" y1={chamberBottomY} x2="279" y2={chamberBottomY} stroke={statusMeta.hex} strokeWidth="1.3" />
              <text
                x="282"
                y={(wasteSurfaceY + chamberBottomY) / 2 - 2}
                fill={statusMeta.hex}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
              >
                WASTE
              </text>
              <text
                x="282"
                y={(wasteSurfaceY + chamberBottomY) / 2 + 9}
                fill="#E2E8F0"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                {sensor.wasteHeightCm.toFixed(1)}cm
              </text>
            </g>
          )}

          {/* Left-side Depth Ruler (0 cm at top, Bin Height at bottom) */}
          <g fill="#64748B" fontSize="8.5" fontFamily="JetBrains Mono, monospace" textAnchor="end">
            <text x="53" y={chamberTopY + 4}>0cm</text>
            <text x="53" y={chamberTopY + chamberHeight * 0.5 + 3}>
              {Math.round(bin.binHeightCm * 0.5)}cm
            </text>
            <text x="53" y={chamberBottomY}>
              {bin.binHeightCm}cm
            </text>
          </g>
        </svg>
      </div>

      {/* Bottom Live Telemetry Readout Strip */}
      <div className="grid w-full grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-center">
        <div>
          <div className="text-[11px] text-slate-400">Fill Level</div>
          <div className={`font-mono text-base font-bold tabular-nums ${statusMeta.textColor}`}>
            {fill.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Sensor Distance</div>
          <div className="font-mono text-base font-bold text-cyan-400 tabular-nums">
            {sensor.measuredDistanceCm.toFixed(1)} cm
          </div>
        </div>
        <div>
          <div className="text-[11px] text-slate-400">Waste Height</div>
          <div className="font-mono text-base font-bold text-slate-100 tabular-nums">
            {sensor.wasteHeightCm.toFixed(1)} cm
          </div>
        </div>
      </div>
    </div>
  );
};
