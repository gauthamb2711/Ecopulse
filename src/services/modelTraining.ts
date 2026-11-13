import {
  BIN_STATUS_LIST,
  BinStatus,
  Dustbin,
  MLFeatures,
  ModelMetrics,
  RandomForestModel,
  SensorReading,
  TrainingSample,
  getRuleBasedGroundTruthStatus,
} from '../types';
import {
  ML_FEATURE_KEYS,
  bootstrapSample,
  buildDecisionTree,
  encodeTrainingSamples,
  evaluateRandomForest,
} from './randomForest';

/**
 * Generates a clearly labeled synthetic training dataset simulated from
 * physical HC-SR04 sensor equations + realistic noise variations.
 * This is synthetic simulator data, not physical hardware telemetry.
 */
export function generateSyntheticDataset(sampleCount = 600): TrainingSample[] {
  const safeCount = Math.max(80, Math.min(3000, Math.round(sampleCount)));
  const samples: TrainingSample[] = [];

  // Allocate balanced representation across the 4 status bands
  // EMPTY (0-25), HALF_FILLED (26-50), NEARLY_FULL (51-90), COMPLETELY_FULL (91-100)
  const bands: { min: number; max: number; weight: number }[] = [
    { min: 0, max: 25, weight: 0.25 },
    { min: 25.1, max: 50, weight: 0.25 },
    { min: 50.1, max: 90, weight: 0.28 },
    { min: 90.1, max: 100, weight: 0.22 },
  ];

  let idCounter = 1;
  for (let bIdx = 0; bIdx < bands.length; bIdx++) {
    const band = bands[bIdx];
    const countForBand =
      bIdx === bands.length - 1
        ? safeCount - samples.length
        : Math.round(safeCount * band.weight);

    for (let i = 0; i < countForBand; i++) {
      const binHeight = 60 + Math.random() * 90; // 60cm to 150cm bin heights
      const trueFill = Number(
        (band.min + Math.random() * (band.max - band.min)).toFixed(2)
      );
      const wasteHeight = Number(((binHeight * trueFill) / 100).toFixed(2));
      const trueDistance = binHeight - wasteHeight;

      // Simulated ultrasonic sensor noise (-2.0 cm to +2.0 cm)
      const sensorVariation = Number(((Math.random() - 0.5) * 3.6).toFixed(2));
      const noisyDistance = Number(
        Math.max(0, Math.min(binHeight, trueDistance + sensorVariation)).toFixed(2)
      );

      // Estimate fill % derived from noisy sensor reading (realistic edge noise)
      const measuredFillFromSensor = Number(
        Math.max(
          0,
          Math.min(100, ((binHeight - noisyDistance) / binHeight) * 100)
        ).toFixed(2)
      );

      const recentFillRate = Number((Math.random() * 35 - 2).toFixed(2));
      const previousFillLevel = Number(
        Math.max(0, Math.min(100, trueFill - Math.random() * 12)).toFixed(2)
      );

      const label: BinStatus = getRuleBasedGroundTruthStatus(trueFill);

      samples.push({
        id: idCounter++,
        features: {
          ultrasonicDistance: noisyDistance,
          fillPercentage: measuredFillFromSensor,
          wasteHeight: Number((binHeight - noisyDistance).toFixed(2)),
          recentFillRate,
          previousFillLevel,
          sensorVariation,
        },
        label,
      });
    }
  }

  // Shuffle deterministically-fairly with Fisher-Yates
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }

  return samples;
}

export function getClassDistribution(samples: TrainingSample[]): Record<BinStatus, number> {
  const counts: Record<BinStatus, number> = {
    EMPTY: 0,
    HALF_FILLED: 0,
    NEARLY_FULL: 0,
    COMPLETELY_FULL: 0,
  };
  for (const s of samples) {
    counts[s.label]++;
  }
  return counts;
}

/**
 * Splits samples into stratified train/validation sets (75% / 25%)
 * so validation metrics reflect generalization on unseen samples.
 */
function stratifiedSplit(
  samples: TrainingSample[],
  valRatio = 0.25
): { train: TrainingSample[]; val: TrainingSample[] } {
  const byClass: Record<BinStatus, TrainingSample[]> = {
    EMPTY: [],
    HALF_FILLED: [],
    NEARLY_FULL: [],
    COMPLETELY_FULL: [],
  };

  for (const s of samples) {
    byClass[s.label].push(s);
  }

  const train: TrainingSample[] = [];
  const val: TrainingSample[] = [];

  for (const cls of BIN_STATUS_LIST) {
    const group = [...byClass[cls]];
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [group[i], group[j]] = [group[j], group[i]];
    }
    const splitIdx = Math.max(1, Math.floor(group.length * (1 - valRatio)));
    train.push(...group.slice(0, splitIdx));
    val.push(...group.slice(splitIdx));
  }

  return { train, val };
}

export interface TrainingConfig {
  numTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
}

function nextFrameYield(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 16);
  });
}

/**
 * Trains the Random Forest classifier asynchronously tree-by-tree,
 * reporting real progress back to the UI without freezing the browser thread.
 */
export async function trainRandomForestAsync(
  dataset: TrainingSample[],
  config: TrainingConfig,
  onProgress?: (completedTrees: number, totalTrees: number) => void
): Promise<{ model: RandomForestModel; metrics: ModelMetrics }> {
  if (!dataset || dataset.length < 20) {
    throw new Error('Dataset must contain at least 20 synthetic samples to train.');
  }

  const numTrees = Math.max(3, Math.min(40, Math.round(config.numTrees)));
  const maxDepth = Math.max(2, Math.min(14, Math.round(config.maxDepth)));
  const minSamplesSplit = Math.max(2, Math.min(10, Math.round(config.minSamplesSplit)));

  const { train, val } = stratifiedSplit(dataset, 0.25);
  const encodedTrain = encodeTrainingSamples(train);
  const mtry = Math.max(2, Math.floor(Math.sqrt(ML_FEATURE_KEYS.length)));

  const trees = [];
  for (let t = 0; t < numTrees; t++) {
    const boot = bootstrapSample(encodedTrain);
    const tree = buildDecisionTree(boot, 0, maxDepth, minSamplesSplit, mtry);
    trees.push(tree);
    if (onProgress) {
      onProgress(t + 1, numTrees);
    }
    await nextFrameYield();
  }

  const model: RandomForestModel = {
    version: 1,
    numTrees,
    maxDepth,
    minSamplesSplit,
    featureNames: [...ML_FEATURE_KEYS],
    trees,
    trainedAt: Date.now(),
    datasetSize: dataset.length,
  };

  const metrics = evaluateRandomForest(model, val, train.length);
  return { model, metrics };
}

/**
 * Extracts ML inference features directly from a simulated bin + ultrasonic reading.
 */
export function extractBinMLFeatures(
  bin: Dustbin,
  sensor: SensorReading
): MLFeatures {
  // Compute recent fill rate (% per hour) from last few history points if available
  let recentFillRate = 0;
  const hist = bin.fillHistory;
  if (hist.length >= 2) {
    const recent = hist.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const dtHours = (last.timestamp - first.timestamp) / 3_600_000;
    if (dtHours > 0.0001) {
      recentFillRate = Number(
        Math.max(-50, Math.min(100, (last.fillPercentage - first.fillPercentage) / dtHours)).toFixed(2)
      );
    }
  }

  const measuredFill = Number(
    Math.max(
      0,
      Math.min(100, ((sensor.binHeightCm - sensor.measuredDistanceCm) / sensor.binHeightCm) * 100)
    ).toFixed(2)
  );

  return {
    ultrasonicDistance: sensor.measuredDistanceCm,
    fillPercentage: measuredFill,
    wasteHeight: Number((sensor.binHeightCm - sensor.measuredDistanceCm).toFixed(2)),
    recentFillRate,
    previousFillLevel: bin.previousFillPercentage,
    sensorVariation: sensor.noiseDeltaCm,
  };
}
