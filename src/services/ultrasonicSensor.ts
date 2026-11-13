import { Dustbin, SensorReading } from '../types';

/**
 * Generates realistic Gaussian noise using Box-Muller transform,
 * clamped to ±maxDeviationCm.
 */
function sampleBoundedGaussianNoise(stdDevCm: number): number {
  if (stdDevCm <= 0) return 0;
  const u1 = Math.max(1e-7, Math.random());
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const raw = z0 * (stdDevCm * 0.5);
  return Math.max(-stdDevCm, Math.min(stdDevCm, raw));
}

/**
 * Simulates an HC-SR04 Ultrasonic Sensor mounted at the top of a dustbin.
 *
 * Formulas:
 *   Waste Height = Bin Height * (Fill Percentage / 100)
 *   True Sensor Distance = Bin Height - Waste Height
 *
 * Optional realistic sensor noise affects only the measured distance reading,
 * never altering the underlying simulated fill percentage.
 */
export function simulateUltrasonicReading(
  bin: Pick<Dustbin, 'id' | 'binHeightCm' | 'fillPercentage'>,
  noiseEnabled: boolean,
  noiseLevelCm: number
): SensorReading {
  const safeHeight = Math.max(20, Math.min(300, bin.binHeightCm || 100));
  const safeFill = Math.max(0, Math.min(100, bin.fillPercentage || 0));

  const wasteHeightCm = Number(((safeHeight * safeFill) / 100).toFixed(2));
  const trueDistanceCm = Number((safeHeight - wasteHeightCm).toFixed(2));

  const noiseDelta = noiseEnabled ? sampleBoundedGaussianNoise(noiseLevelCm) : 0;
  const measuredDistanceCm = Number(
    Math.max(0, Math.min(safeHeight, trueDistanceCm + noiseDelta)).toFixed(2)
  );
  const actualDelta = Number((measuredDistanceCm - trueDistanceCm).toFixed(2));

  // Speed of sound in air at ~20°C is 343 m/s = 0.0343 cm/µs
  // Echo duration (µs) = (2 * distance_cm) / 0.0343
  const echoDurationUs = Math.round((measuredDistanceCm * 2) / 0.0343);

  return {
    binId: bin.id,
    sensorName: 'HC-SR04 (SIMULATED)',
    status: 'SIMULATED / ACTIVE',
    binHeightCm: safeHeight,
    fillPercentage: safeFill,
    wasteHeightCm,
    trueDistanceCm,
    measuredDistanceCm,
    noiseDeltaCm: actualDelta,
    echoDurationUs,
    timestamp: Date.now(),
  };
}
