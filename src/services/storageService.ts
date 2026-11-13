import {
  AppPersistedState,
  CollectionRecord,
  DetectionLogEntry,
  Dustbin,
  FillHistoryPoint,
  SimulationSettings,
  SmartAlert,
  getRuleBasedGroundTruthStatus,
} from '../types';
import { generateId } from '../utils/formatters';
import { generateSyntheticDataset } from './modelTraining';
import { syncWasteObjectsWithFill } from './simulationEngine';

const STORAGE_KEY = 'ecopulse_smart_dustbin_state_v1';

export const DEFAULT_SETTINGS: SimulationSettings = {
  simulationMode: 'MANUAL',
  globalRunning: false,
  tickIntervalMs: 1200,
  sensorNoiseEnabled: true,
  noiseLevelCm: 1.2,
  alertSoundEnabled: false,
  maxHistoryPoints: 80,
};

function createSeededHistory(
  binHeightCm: number,
  endFill: number,
  pointsCount: number,
  hourlyGrowthPct: number,
  now: number
): FillHistoryPoint[] {
  const history: FillHistoryPoint[] = [];
  const stepMs = 8 * 60_000; // 8-minute intervals backwards
  for (let i = pointsCount - 1; i >= 0; i--) {
    const t = now - i * stepMs;
    const hoursBack = (i * stepMs) / 3_600_000;
    const fill = Number(Math.max(0, Math.min(100, endFill - hoursBack * hourlyGrowthPct)).toFixed(1));
    const wasteHeightCm = Number(((binHeightCm * fill) / 100).toFixed(2));
    const distanceCm = Number((binHeightCm - wasteHeightCm).toFixed(2));
    history.push({
      timestamp: t,
      fillPercentage: fill,
      distanceCm,
      wasteHeightCm,
      rawNoisyDistanceCm: distanceCm,
      mlStatus: null,
      confidence: null,
    });
  }
  return history;
}

export function createDefaultDustbins(): Dustbin[] {
  const now = Date.now();
  const specs: {
    id: string;
    code: string;
    name: string;
    location: string;
    binHeightCm: number;
    fillPercentage: number;
    hourlyRate: number;
    autoSimSpeed: number;
  }[] = [
    {
      id: 'bin-001',
      code: 'BIN-001',
      name: 'Main Entrance Bin',
      location: 'Main Entrance',
      binHeightCm: 100,
      fillPercentage: 18,
      hourlyRate: 4.5,
      autoSimSpeed: 1.2,
    },
    {
      id: 'bin-002',
      code: 'BIN-002',
      name: 'Food Court Central',
      location: 'Food Court',
      binHeightCm: 110,
      fillPercentage: 76,
      hourlyRate: 14.2,
      autoSimSpeed: 2.0,
    },
    {
      id: 'bin-003',
      code: 'BIN-003',
      name: 'Library Atrium Bin',
      location: 'Library',
      binHeightCm: 100,
      fillPercentage: 38,
      hourlyRate: 6.4,
      autoSimSpeed: 1.0,
    },
    {
      id: 'bin-004',
      code: 'BIN-004',
      name: 'Parking Bay North',
      location: 'Parking Area',
      binHeightCm: 120,
      fillPercentage: 94,
      hourlyRate: 11.5,
      autoSimSpeed: 1.6,
    },
    {
      id: 'bin-005',
      code: 'BIN-005',
      name: 'Botanical Garden Bin',
      location: 'Garden',
      binHeightCm: 90,
      fillPercentage: 12,
      hourlyRate: 2.8,
      autoSimSpeed: 0.8,
    },
  ];

  return specs.map((spec) => {
    const history = createSeededHistory(
      spec.binHeightCm,
      spec.fillPercentage,
      8,
      spec.hourlyRate,
      now
    );
    const prev = history.length >= 2 ? history[history.length - 2].fillPercentage : spec.fillPercentage;
    const status = getRuleBasedGroundTruthStatus(spec.fillPercentage);
    return {
      id: spec.id,
      code: spec.code,
      name: spec.name,
      location: spec.location,
      binHeightCm: spec.binHeightCm,
      fillPercentage: spec.fillPercentage,
      previousFillPercentage: prev,
      lastUpdated: now,
      lastResetAt: now - 2 * 3_600_000,
      fillHistory: history,
      autoSimEnabled: false,
      autoSimSpeed: spec.autoSimSpeed,
      wasteItems: syncWasteObjectsWithFill([], spec.fillPercentage),
      lastAlertStatus: status === 'NEARLY_FULL' || status === 'COMPLETELY_FULL' ? status : null,
    };
  });
}

function createInitialAlerts(bins: Dustbin[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  for (const bin of bins) {
    const status = getRuleBasedGroundTruthStatus(bin.fillPercentage);
    if (status === 'COMPLETELY_FULL') {
      alerts.push({
        id: generateId('alert'),
        binId: bin.id,
        binCode: bin.code,
        binName: bin.name,
        location: bin.location,
        status,
        severity: 'CRITICAL',
        message: `${bin.code} (${bin.location}) reached ${bin.fillPercentage.toFixed(1)}% capacity. Immediate collection required.`,
        fillPercentage: bin.fillPercentage,
        timestamp: bin.lastUpdated - 180_000,
        resolved: false,
        resolvedAt: null,
      });
    } else if (status === 'NEARLY_FULL') {
      alerts.push({
        id: generateId('alert'),
        binId: bin.id,
        binCode: bin.code,
        binName: bin.name,
        location: bin.location,
        status,
        severity: 'WARNING',
        message: `${bin.code} (${bin.location}) reached ${bin.fillPercentage.toFixed(1)}% capacity. Collection planning recommended.`,
        fillPercentage: bin.fillPercentage,
        timestamp: bin.lastUpdated - 420_000,
        resolved: false,
        resolvedAt: null,
      });
    }
  }
  return alerts;
}

function createInitialLogs(bins: Dustbin[]): DetectionLogEntry[] {
  return bins.map((bin) => {
    const wasteHeight = (bin.binHeightCm * bin.fillPercentage) / 100;
    const distanceCm = Number((bin.binHeightCm - wasteHeight).toFixed(2));
    return {
      id: generateId('log'),
      binId: bin.id,
      binCode: bin.code,
      binName: bin.name,
      timestamp: bin.lastUpdated,
      fillPercentage: bin.fillPercentage,
      ultrasonicDistanceCm: distanceCm,
      mlClassification: null,
      mlConfidence: null,
      predictionEtaHours: null,
      alertStatus: getRuleBasedGroundTruthStatus(bin.fillPercentage),
      eventType: 'SIMULATION',
    };
  });
}

export function createDefaultAppState(): AppPersistedState {
  const dustbins = createDefaultDustbins();
  const alerts = createInitialAlerts(dustbins);
  const logs = createInitialLogs(dustbins);
  const collections: CollectionRecord[] = [];
  const trainingDataset = generateSyntheticDataset(600);

  return {
    version: 1,
    dustbins,
    selectedBinId: dustbins[0].id,
    settings: { ...DEFAULT_SETTINGS },
    alerts,
    collections,
    logs,
    trainedModel: null,
    modelMetrics: null,
    trainingDataset,
  };
}

export function validateAndSanitizeState(raw: unknown): AppPersistedState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Partial<AppPersistedState>;

  if (!Array.isArray(obj.dustbins) || obj.dustbins.length === 0) return null;

  const validBins: Dustbin[] = [];
  for (const item of obj.dustbins) {
    if (!item || typeof item !== 'object') continue;
    const b = item as Partial<Dustbin>;
    if (typeof b.id !== 'string' || typeof b.code !== 'string' || typeof b.name !== 'string') {
      continue;
    }
    const fillPercentage =
      typeof b.fillPercentage === 'number' && Number.isFinite(b.fillPercentage)
        ? Math.max(0, Math.min(100, b.fillPercentage))
        : 0;
    const binHeightCm =
      typeof b.binHeightCm === 'number' && Number.isFinite(b.binHeightCm)
        ? Math.max(20, Math.min(300, b.binHeightCm))
        : 100;

    validBins.push({
      id: b.id,
      code: b.code,
      name: b.name,
      location: typeof b.location === 'string' ? b.location : 'Unspecified',
      binHeightCm,
      fillPercentage,
      previousFillPercentage:
        typeof b.previousFillPercentage === 'number' ? b.previousFillPercentage : fillPercentage,
      lastUpdated: typeof b.lastUpdated === 'number' ? b.lastUpdated : Date.now(),
      lastResetAt: typeof b.lastResetAt === 'number' ? b.lastResetAt : Date.now() - 3600_000,
      fillHistory: Array.isArray(b.fillHistory) ? b.fillHistory.slice(-120) : [],
      autoSimEnabled: Boolean(b.autoSimEnabled),
      autoSimSpeed: typeof b.autoSimSpeed === 'number' ? Math.max(0.2, Math.min(20, b.autoSimSpeed)) : 1.5,
      wasteItems: Array.isArray(b.wasteItems)
        ? b.wasteItems
        : syncWasteObjectsWithFill([], fillPercentage),
      lastAlertStatus: b.lastAlertStatus ?? null,
    });
  }

  if (validBins.length === 0) return null;

  const selectedBinId =
    typeof obj.selectedBinId === 'string' && validBins.some((b) => b.id === obj.selectedBinId)
      ? obj.selectedBinId
      : validBins[0].id;

  const settings: SimulationSettings = {
    ...DEFAULT_SETTINGS,
    ...(obj.settings && typeof obj.settings === 'object' ? obj.settings : {}),
  };

  return {
    version: 1,
    dustbins: validBins,
    selectedBinId,
    settings,
    alerts: Array.isArray(obj.alerts) ? obj.alerts : [],
    collections: Array.isArray(obj.collections) ? obj.collections : [],
    logs: Array.isArray(obj.logs) ? obj.logs : [],
    trainedModel:
      obj.trainedModel &&
      typeof obj.trainedModel === 'object' &&
      Array.isArray(obj.trainedModel.trees) &&
      obj.trainedModel.trees.length > 0
        ? obj.trainedModel
        : null,
    modelMetrics:
      obj.modelMetrics && typeof obj.modelMetrics === 'object' ? obj.modelMetrics : null,
    trainingDataset:
      Array.isArray(obj.trainingDataset) && obj.trainingDataset.length >= 20
        ? obj.trainingDataset
        : generateSyntheticDataset(600),
  };
}

export function loadAppState(): AppPersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultAppState();
    const parsed = JSON.parse(raw);
    const validated = validateAndSanitizeState(parsed);
    return validated ?? createDefaultAppState();
  } catch {
    return createDefaultAppState();
  }
}

export function saveAppState(state: AppPersistedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearAppState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage error
  }
}
