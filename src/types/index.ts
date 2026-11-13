export type BinStatus = 'EMPTY' | 'HALF_FILLED' | 'NEARLY_FULL' | 'COMPLETELY_FULL';

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type WasteItemType = 'paper' | 'bottle' | 'can' | 'organic' | 'cardboard';

export interface WasteObject {
  id: string;
  type: WasteItemType;
  /** Horizontal position across bin interior (8..92%) */
  x: number;
  /** Vertical level threshold where this item appears (0..100%) */
  level: number;
  rotation: number;
  scale: number;
}

export interface FillHistoryPoint {
  timestamp: number;
  fillPercentage: number;
  distanceCm: number;
  wasteHeightCm: number;
  rawNoisyDistanceCm: number;
  mlStatus: BinStatus | null;
  confidence: number | null;
}

export interface Dustbin {
  id: string;
  code: string;
  name: string;
  location: string;
  binHeightCm: number;
  fillPercentage: number;
  previousFillPercentage: number;
  lastUpdated: number;
  lastResetAt: number;
  fillHistory: FillHistoryPoint[];
  autoSimEnabled: boolean;
  autoSimSpeed: number; // % per second when auto-filling
  wasteItems: WasteObject[];
  lastAlertStatus: BinStatus | null;
}

export interface SensorReading {
  binId: string;
  sensorName: 'HC-SR04 (SIMULATED)';
  status: 'SIMULATED / ACTIVE';
  binHeightCm: number;
  fillPercentage: number;
  wasteHeightCm: number;
  trueDistanceCm: number;
  measuredDistanceCm: number;
  noiseDeltaCm: number;
  echoDurationUs: number;
  timestamp: number;
}

export interface MLFeatures {
  ultrasonicDistance: number;
  fillPercentage: number;
  wasteHeight: number;
  recentFillRate: number;
  previousFillLevel: number;
  sensorVariation: number;
}

export interface TrainingSample {
  id: number;
  features: MLFeatures;
  label: BinStatus;
}

export interface TreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  classCounts?: Record<BinStatus, number>;
  predictedClass?: BinStatus;
}

export interface RandomForestModel {
  version: number;
  numTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
  featureNames: (keyof MLFeatures)[];
  trees: TreeNode[];
  trainedAt: number;
  datasetSize: number;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelMetrics {
  accuracy: number;
  confusionMatrix: number[][];
  labels: BinStatus[];
  perClass: Record<BinStatus, ClassMetrics>;
  macroPrecision: number;
  macroRecall: number;
  macroF1: number;
  trainCount: number;
  valCount: number;
  numTrees: number;
  maxDepth: number;
  trainedAt: number;
}

export interface MLPrediction {
  status: BinStatus;
  confidence: number;
  probabilities: Record<BinStatus, number>;
  predictedAt: number;
  features: MLFeatures;
}

export interface RegressionChartPoint {
  timestamp: number;
  label: string;
  actualFill?: number;
  projectedFill?: number;
}

export interface LinearRegressionResult {
  status: 'INSUFFICIENT_DATA' | 'NOT_FILLING' | 'ALREADY_FULL' | 'PREDICTING';
  slopePerHour: number;
  intercept: number;
  rSquared: number;
  hoursRemaining: number | null;
  minutesRemaining: number | null;
  expectedFullTimestamp: number | null;
  rateCategory: 'SLOW' | 'MODERATE' | 'FAST' | 'NONE';
  message: string;
  chartPoints: RegressionChartPoint[];
}

export interface SmartAlert {
  id: string;
  binId: string;
  binCode: string;
  binName: string;
  location: string;
  status: BinStatus;
  severity: AlertSeverity;
  message: string;
  fillPercentage: number;
  timestamp: number;
  resolved: boolean;
  resolvedAt: number | null;
}

export interface CollectionRecord {
  id: string;
  binId: string;
  binCode: string;
  binName: string;
  location: string;
  fillAtCollection: number;
  alertTimestamp: number | null;
  collectedAt: number;
  notes: string;
}

export type LogEventType =
  | 'SENSOR_TICK'
  | 'MANUAL_ADD'
  | 'MANUAL_REMOVE'
  | 'COLLECTION'
  | 'SIMULATION';

export interface DetectionLogEntry {
  id: string;
  binId: string;
  binCode: string;
  binName: string;
  timestamp: number;
  fillPercentage: number;
  ultrasonicDistanceCm: number;
  mlClassification: BinStatus | null;
  mlConfidence: number | null;
  predictionEtaHours: number | null;
  alertStatus: BinStatus;
  eventType: LogEventType;
}

export interface SimulationSettings {
  simulationMode: 'AUTO' | 'MANUAL';
  globalRunning: boolean;
  tickIntervalMs: number;
  sensorNoiseEnabled: boolean;
  noiseLevelCm: number;
  alertSoundEnabled: boolean;
  maxHistoryPoints: number;
}

export interface AppPersistedState {
  version: number;
  dustbins: Dustbin[];
  selectedBinId: string;
  settings: SimulationSettings;
  alerts: SmartAlert[];
  collections: CollectionRecord[];
  logs: DetectionLogEntry[];
  trainedModel: RandomForestModel | null;
  modelMetrics: ModelMetrics | null;
  trainingDataset: TrainingSample[];
}

export const BIN_STATUS_LIST: BinStatus[] = [
  'EMPTY',
  'HALF_FILLED',
  'NEARLY_FULL',
  'COMPLETELY_FULL',
];

export const STATUS_META: Record<
  BinStatus,
  {
    label: string;
    shortLabel: string;
    rangeLabel: string;
    alertGuidance: string;
    textColor: string;
    bgTint: string;
    borderColor: string;
    hex: string;
  }
> = {
  EMPTY: {
    label: 'Empty',
    shortLabel: 'Empty',
    rangeLabel: '0–25%',
    alertGuidance: 'No collection required.',
    textColor: 'text-emerald-400',
    bgTint: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    hex: '#10B981',
  },
  HALF_FILLED: {
    label: 'Half-Filled',
    shortLabel: 'Half-Filled',
    rangeLabel: '26–50%',
    alertGuidance: 'Normal monitoring.',
    textColor: 'text-blue-400',
    bgTint: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    hex: '#3B82F6',
  },
  NEARLY_FULL: {
    label: 'Nearly Full',
    shortLabel: 'Nearly Full',
    rangeLabel: '51–90%',
    alertGuidance: 'Collection planning recommended.',
    textColor: 'text-amber-400',
    bgTint: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    hex: '#F59E0B',
  },
  COMPLETELY_FULL: {
    label: 'Completely Full',
    shortLabel: 'Completely Full',
    rangeLabel: '91–100%',
    alertGuidance: 'Immediate collection required.',
    textColor: 'text-red-400',
    bgTint: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    hex: '#EF4444',
  },
};

export function getRuleBasedGroundTruthStatus(fillPercentage: number): BinStatus {
  const clamped = Math.max(0, Math.min(100, fillPercentage));
  if (clamped <= 25) return 'EMPTY';
  if (clamped <= 50) return 'HALF_FILLED';
  if (clamped <= 90) return 'NEARLY_FULL';
  return 'COMPLETELY_FULL';
}
