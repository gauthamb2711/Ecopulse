import {
  BIN_STATUS_LIST,
  BinStatus,
  MLFeatures,
  MLPrediction,
  ModelMetrics,
  RandomForestModel,
  TrainingSample,
  TreeNode,
} from '../types';

export const ML_FEATURE_KEYS: (keyof MLFeatures)[] = [
  'ultrasonicDistance',
  'fillPercentage',
  'wasteHeight',
  'recentFillRate',
  'previousFillLevel',
  'sensorVariation',
];

export const ML_FEATURE_LABELS: Record<keyof MLFeatures, string> = {
  ultrasonicDistance: 'Ultrasonic Distance (cm)',
  fillPercentage: 'Fill Percentage (%)',
  wasteHeight: 'Waste Height (cm)',
  recentFillRate: 'Recent Fill Rate (%/hr)',
  previousFillLevel: 'Previous Fill Level (%)',
  sensorVariation: 'Sensor Noise Delta (cm)',
};

export function featuresToVector(features: MLFeatures): number[] {
  return [
    features.ultrasonicDistance,
    features.fillPercentage,
    features.wasteHeight,
    features.recentFillRate,
    features.previousFillLevel,
    features.sensorVariation,
  ];
}

function emptyClassCounts(): Record<BinStatus, number> {
  return {
    EMPTY: 0,
    HALF_FILLED: 0,
    NEARLY_FULL: 0,
    COMPLETELY_FULL: 0,
  };
}

function countLabels(samples: { vector: number[]; label: BinStatus }[]): Record<BinStatus, number> {
  const counts = emptyClassCounts();
  for (const s of samples) {
    counts[s.label]++;
  }
  return counts;
}

function majorityClass(counts: Record<BinStatus, number>): BinStatus {
  let best: BinStatus = 'EMPTY';
  let bestCount = -1;
  for (const label of BIN_STATUS_LIST) {
    if (counts[label] > bestCount) {
      bestCount = counts[label];
      best = label;
    }
  }
  return best;
}

function giniImpurity(counts: Record<BinStatus, number>, total: number): number {
  if (total <= 0) return 0;
  let sumSq = 0;
  for (const label of BIN_STATUS_LIST) {
    const p = counts[label] / total;
    sumSq += p * p;
  }
  return 1 - sumSq;
}

function pickRandomFeatureIndices(totalFeatures: number, mtry: number): number[] {
  const indices = Array.from({ length: totalFeatures }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, mtry);
}

interface EncodedSample {
  vector: number[];
  label: BinStatus;
}

/**
 * Finds the optimal feature + threshold split among a random subset of features
 * using Gini impurity reduction.
 */
function findBestSplit(
  samples: EncodedSample[],
  mtry: number
): {
  featureIndex: number;
  threshold: number;
  left: EncodedSample[];
  right: EncodedSample[];
  gain: number;
} | null {
  const n = samples.length;
  if (n < 2) return null;

  const parentCounts = countLabels(samples);
  const parentGini = giniImpurity(parentCounts, n);
  if (parentGini === 0) return null;

  const candidateFeatures = pickRandomFeatureIndices(ML_FEATURE_KEYS.length, mtry);
  let bestGain = 0;
  let bestFeature = -1;
  let bestThreshold = 0;

  for (const fIdx of candidateFeatures) {
    // Sort samples along candidate feature to scan thresholds efficiently
    const sorted = [...samples].sort((a, b) => a.vector[fIdx] - b.vector[fIdx]);
    const leftCounts = emptyClassCounts();
    const rightCounts = { ...parentCounts };

    for (let i = 0; i < n - 1; i++) {
      const lbl = sorted[i].label;
      leftCounts[lbl]++;
      rightCounts[lbl]--;

      const valCurr = sorted[i].vector[fIdx];
      const valNext = sorted[i + 1].vector[fIdx];
      // Skip identical adjacent values to prevent invalid splits
      if (valCurr === valNext) continue;

      const leftSize = i + 1;
      const rightSize = n - leftSize;
      const weightedGini =
        (leftSize / n) * giniImpurity(leftCounts, leftSize) +
        (rightSize / n) * giniImpurity(rightCounts, rightSize);
      const gain = parentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = fIdx;
        bestThreshold = (valCurr + valNext) / 2;
      }
    }
  }

  if (bestFeature === -1 || bestGain <= 1e-6) return null;

  const left: EncodedSample[] = [];
  const right: EncodedSample[] = [];
  for (const s of samples) {
    if (s.vector[bestFeature] <= bestThreshold) {
      left.push(s);
    } else {
      right.push(s);
    }
  }

  if (left.length === 0 || right.length === 0) return null;

  return { featureIndex: bestFeature, threshold: bestThreshold, left, right, gain: bestGain };
}

/**
 * Recursively constructs a CART decision tree on a bootstrap sample.
 */
export function buildDecisionTree(
  samples: EncodedSample[],
  depth: number,
  maxDepth: number,
  minSamplesSplit: number,
  mtry: number
): TreeNode {
  const counts = countLabels(samples);
  const predicted = majorityClass(counts);

  if (
    depth >= maxDepth ||
    samples.length < minSamplesSplit ||
    giniImpurity(counts, samples.length) === 0
  ) {
    return {
      isLeaf: true,
      classCounts: counts,
      predictedClass: predicted,
    };
  }

  const split = findBestSplit(samples, mtry);
  if (!split) {
    return {
      isLeaf: true,
      classCounts: counts,
      predictedClass: predicted,
    };
  }

  return {
    isLeaf: false,
    featureIndex: split.featureIndex,
    threshold: Number(split.threshold.toFixed(4)),
    left: buildDecisionTree(split.left, depth + 1, maxDepth, minSamplesSplit, mtry),
    right: buildDecisionTree(split.right, depth + 1, maxDepth, minSamplesSplit, mtry),
  };
}

/**
 * Draws a bootstrap sample (sampling with replacement) of size N.
 */
export function bootstrapSample(samples: EncodedSample[]): EncodedSample[] {
  const n = samples.length;
  const out: EncodedSample[] = new Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = samples[Math.floor(Math.random() * n)];
  }
  return out;
}

export function encodeTrainingSamples(samples: TrainingSample[]): EncodedSample[] {
  return samples.map((s) => ({
    vector: featuresToVector(s.features),
    label: s.label,
  }));
}

function predictTree(node: TreeNode, vector: number[]): { label: BinStatus; probs: Record<BinStatus, number> } {
  let current = node;
  while (!current.isLeaf) {
    const fIdx = current.featureIndex ?? 0;
    const thr = current.threshold ?? 0;
    if (vector[fIdx] <= thr) {
      if (!current.left) break;
      current = current.left;
    } else {
      if (!current.right) break;
      current = current.right;
    }
  }

  const counts = current.classCounts ?? emptyClassCounts();
  const total = BIN_STATUS_LIST.reduce((acc, k) => acc + (counts[k] || 0), 0);
  const probs = emptyClassCounts();
  if (total > 0) {
    for (const k of BIN_STATUS_LIST) {
      probs[k] = (counts[k] || 0) / total;
    }
  } else {
    const fallback = current.predictedClass ?? 'EMPTY';
    probs[fallback] = 1;
  }

  return {
    label: current.predictedClass ?? majorityClass(counts),
    probs,
  };
}

/**
 * Runs genuine ensemble prediction across all decision trees in the trained Random Forest.
 * Returns null if the model is not trained.
 */
export function predictWithRandomForest(
  model: RandomForestModel | null,
  features: MLFeatures
): MLPrediction | null {
  if (!model || !model.trees || model.trees.length === 0) {
    return null;
  }

  const vector = featuresToVector(features);
  const voteCounts = emptyClassCounts();
  const probSums = emptyClassCounts();

  for (const tree of model.trees) {
    const { label, probs } = predictTree(tree, vector);
    voteCounts[label]++;
    for (const cls of BIN_STATUS_LIST) {
      probSums[cls] += probs[cls];
    }
  }

  const numTrees = model.trees.length;
  const probabilities = emptyClassCounts();
  for (const cls of BIN_STATUS_LIST) {
    probabilities[cls] = Number((probSums[cls] / numTrees).toFixed(4));
  }

  // Majority vote across all trees
  const predictedStatus = majorityClass(voteCounts);
  // Confidence blends vote agreement with average leaf probability
  const voteRatio = voteCounts[predictedStatus] / numTrees;
  const avgProb = probabilities[predictedStatus];
  const confidence = Number((((voteRatio * 0.65) + (avgProb * 0.35)) * 100).toFixed(1));

  return {
    status: predictedStatus,
    confidence: Math.min(99.9, Math.max(0, confidence)),
    probabilities,
    predictedAt: Date.now(),
    features,
  };
}

/**
 * Evaluates a trained Random Forest model on a held-out validation dataset,
 * computing real confusion matrix, accuracy, precision, recall, and F1-score.
 */
export function evaluateRandomForest(
  model: RandomForestModel,
  validationSamples: TrainingSample[],
  trainCount: number
): ModelMetrics {
  const numClasses = BIN_STATUS_LIST.length;
  const confusionMatrix: number[][] = Array.from({ length: numClasses }, () =>
    new Array(numClasses).fill(0)
  );

  let correct = 0;

  for (const sample of validationSamples) {
    const prediction = predictWithRandomForest(model, sample.features);
    const predLabel = prediction ? prediction.status : 'EMPTY';
    const trueIdx = BIN_STATUS_LIST.indexOf(sample.label);
    const predIdx = BIN_STATUS_LIST.indexOf(predLabel);
    if (trueIdx !== -1 && predIdx !== -1) {
      confusionMatrix[trueIdx][predIdx]++;
      if (trueIdx === predIdx) correct++;
    }
  }

  const totalVal = validationSamples.length;
  const accuracy = totalVal > 0 ? Number(((correct / totalVal) * 100).toFixed(2)) : 0;

  const perClass = {} as Record<BinStatus, { precision: number; recall: number; f1: number; support: number }>;
  let precisionSum = 0;
  let recallSum = 0;
  let f1Sum = 0;
  let activeClasses = 0;

  for (let c = 0; c < numClasses; c++) {
    const label = BIN_STATUS_LIST[c];
    const tp = confusionMatrix[c][c];

    let fp = 0;
    let fn = 0;
    let support = 0;
    for (let i = 0; i < numClasses; i++) {
      support += confusionMatrix[c][i];
      if (i !== c) {
        fp += confusionMatrix[i][c];
        fn += confusionMatrix[c][i];
      }
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perClass[label] = {
      precision: Number((precision * 100).toFixed(1)),
      recall: Number((recall * 100).toFixed(1)),
      f1: Number((f1 * 100).toFixed(1)),
      support,
    };

    if (support > 0) {
      precisionSum += precision;
      recallSum += recall;
      f1Sum += f1;
      activeClasses++;
    }
  }

  const denom = Math.max(1, activeClasses);

  return {
    accuracy,
    confusionMatrix,
    labels: [...BIN_STATUS_LIST],
    perClass,
    macroPrecision: Number(((precisionSum / denom) * 100).toFixed(1)),
    macroRecall: Number(((recallSum / denom) * 100).toFixed(1)),
    macroF1: Number(((f1Sum / denom) * 100).toFixed(1)),
    trainCount,
    valCount: totalVal,
    numTrees: model.numTrees,
    maxDepth: model.maxDepth,
    trainedAt: model.trainedAt,
  };
}
