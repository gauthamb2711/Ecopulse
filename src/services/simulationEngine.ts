import {
  Dustbin,
  FillHistoryPoint,
  MLPrediction,
  RandomForestModel,
  SensorReading,
  WasteItemType,
  WasteObject,
} from '../types';
import { clampFill, generateId } from '../utils/formatters';
import { extractBinMLFeatures } from './modelTraining';
import { predictWithRandomForest } from './randomForest';
import { simulateUltrasonicReading } from './ultrasonicSensor';

const WASTE_TYPES: WasteItemType[] = ['paper', 'bottle', 'can', 'organic', 'cardboard'];

/**
 * Generates visual waste objects distributed up to the current fill percentage.
 */
export function syncWasteObjectsWithFill(
  existing: WasteObject[],
  targetFillPercentage: number
): WasteObject[] {
  const clamped = clampFill(targetFillPercentage);
  if (clamped <= 0.5) return [];

  // Keep objects whose level is <= current fill
  const retained = existing.filter((item) => item.level <= clamped);

  // Target density: ~1 item per 2.2% fill (up to ~45 visual objects inside the cutaway)
  const targetCount = Math.min(46, Math.max(1, Math.round(clamped / 2.2)));

  if (retained.length >= targetCount) {
    return retained.slice(0, targetCount);
  }

  const maxExistingLevel = retained.reduce((max, item) => Math.max(max, item.level), 0);
  const next = [...retained];

  while (next.length < targetCount) {
    const progress = next.length / Math.max(1, targetCount);
    const minLevel = Math.min(clamped, maxExistingLevel * 0.6);
    const level = Number(
      Math.max(1.5, Math.min(clamped, minLevel + progress * (clamped - minLevel) + (Math.random() - 0.5) * 4)).toFixed(1)
    );
    next.push({
      id: generateId('waste'),
      type: WASTE_TYPES[Math.floor(Math.random() * WASTE_TYPES.length)],
      x: Number((10 + Math.random() * 80).toFixed(1)),
      level,
      rotation: Math.round((Math.random() - 0.5) * 58),
      scale: Number((0.82 + Math.random() * 0.36).toFixed(2)),
    });
  }

  return next.sort((a, b) => a.level - b.level);
}

/**
 * Computes live sensor reading, ML prediction (if trained), and history point for a bin.
 */
export function evaluateBinSnapshot(
  bin: Dustbin,
  trainedModel: RandomForestModel | null,
  noiseEnabled: boolean,
  noiseLevelCm: number
): {
  sensor: SensorReading;
  prediction: MLPrediction | null;
  historyPoint: FillHistoryPoint;
} {
  const sensor = simulateUltrasonicReading(bin, noiseEnabled, noiseLevelCm);
  const features = extractBinMLFeatures(bin, sensor);
  const prediction = predictWithRandomForest(trainedModel, features);

  const historyPoint: FillHistoryPoint = {
    timestamp: sensor.timestamp,
    fillPercentage: bin.fillPercentage,
    distanceCm: sensor.trueDistanceCm,
    wasteHeightCm: sensor.wasteHeightCm,
    rawNoisyDistanceCm: sensor.measuredDistanceCm,
    mlStatus: prediction ? prediction.status : null,
    confidence: prediction ? prediction.confidence : null,
  };

  return { sensor, prediction, historyPoint };
}

/**
 * Appends a history point while capping length to maxHistoryPoints.
 */
export function appendHistoryPoint(
  history: FillHistoryPoint[],
  point: FillHistoryPoint,
  maxPoints: number
): FillHistoryPoint[] {
  const next = [...history, point];
  if (next.length > maxPoints) {
    return next.slice(next.length - maxPoints);
  }
  return next;
}
