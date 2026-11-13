import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppPersistedState,
  BinStatus,
  CollectionRecord,
  DetectionLogEntry,
  Dustbin,
  LinearRegressionResult,
  LogEventType,
  MLPrediction,
  ModelMetrics,
  RandomForestModel,
  SensorReading,
  SimulationSettings,
  SmartAlert,
  TrainingSample,
  getRuleBasedGroundTruthStatus,
} from '../types';
import { evaluateBinAlert, playAlertChime } from '../services/alertService';
import {
  TrainingConfig,
  generateSyntheticDataset,
  trainRandomForestAsync,
} from '../services/modelTraining';
import { predictBinFullTime } from '../services/predictionService';
import {
  appendHistoryPoint,
  evaluateBinSnapshot,
  syncWasteObjectsWithFill,
} from '../services/simulationEngine';
import {
  clearAppState,
  createDefaultAppState,
  loadAppState,
  saveAppState,
  validateAndSanitizeState,
} from '../services/storageService';
import { clampFill, generateId } from '../utils/formatters';

export interface DerivedBinTelemetry {
  bin: Dustbin;
  sensor: SensorReading;
  mlPrediction: MLPrediction | null;
  effectiveStatus: BinStatus;
  prediction: LinearRegressionResult;
}

interface TrainingProgressState {
  isTraining: boolean;
  completedTrees: number;
  totalTrees: number;
  error: string | null;
}

interface SmartWasteContextValue {
  state: AppPersistedState;
  telemetryByBinId: Record<string, DerivedBinTelemetry>;
  selectedBinTelemetry: DerivedBinTelemetry;
  trainingProgress: TrainingProgressState;
  selectBin: (binId: string) => void;
  addWasteToBin: (binId: string, deltaPercent: number, eventType?: LogEventType) => void;
  removeWasteFromBin: (binId: string, deltaPercent: number) => void;
  emptyBin: (binId: string, asCollection?: boolean, notes?: string) => void;
  resetBin: (binId: string) => void;
  updateBinConfig: (
    binId: string,
    updates: Partial<Pick<Dustbin, 'name' | 'location' | 'binHeightCm' | 'autoSimEnabled' | 'autoSimSpeed'>>
  ) => void;
  addNewBin: (input: {
    code: string;
    name: string;
    location: string;
    binHeightCm: number;
    initialFill?: number;
  }) => void;
  removeBin: (binId: string) => void;
  updateSettings: (updates: Partial<SimulationSettings>) => void;
  resolveAlert: (alertId: string) => void;
  clearResolvedAlerts: () => void;
  clearHistoryLogs: () => void;
  regenerateDataset: (sampleCount: number) => void;
  trainModel: (config: TrainingConfig) => Promise<void>;
  unloadModel: () => void;
  exportAppDataJson: () => string;
  importAppDataJson: (jsonText: string) => { ok: boolean; error?: string };
  factoryResetApp: () => void;
}

const SmartWasteContext = createContext<SmartWasteContextValue | null>(null);

export const SmartWasteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppPersistedState>(() => loadAppState());
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgressState>({
    isTraining: false,
    completedTrees: 0,
    totalTrees: 0,
    error: null,
  });

  // Save debounced / safely on state changes
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveAppState(state);
    }, 250);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state]);

  // Helper to apply a fill update + sensor snapshot + ML classification + alert check + log
  const applyBinFillUpdate = useCallback(
    (
      prev: AppPersistedState,
      binId: string,
      nextFillRaw: number,
      eventType: LogEventType,
      options?: { isCollection?: boolean; collectionNotes?: string; isReset?: boolean }
    ): AppPersistedState => {
      const targetIndex = prev.dustbins.findIndex((b) => b.id === binId);
      if (targetIndex === -1) return prev;

      const oldBin = prev.dustbins[targetIndex];
      const clampedNextFill = clampFill(nextFillRaw);
      const now = Date.now();

      const updatedBinDraft: Dustbin = {
        ...oldBin,
        previousFillPercentage: oldBin.fillPercentage,
        fillPercentage: clampedNextFill,
        lastUpdated: now,
        lastResetAt: options?.isReset || options?.isCollection ? now : oldBin.lastResetAt,
        wasteItems: syncWasteObjectsWithFill(oldBin.wasteItems, clampedNextFill),
      };

      const { sensor, prediction, historyPoint } = evaluateBinSnapshot(
        updatedBinDraft,
        prev.trainedModel,
        prev.settings.sensorNoiseEnabled,
        prev.settings.noiseLevelCm
      );

      const nextHistory =
        options?.isReset || options?.isCollection
          ? [historyPoint]
          : appendHistoryPoint(
              oldBin.fillHistory,
              historyPoint,
              prev.settings.maxHistoryPoints
            );

      const binWithHistory: Dustbin = {
        ...updatedBinDraft,
        fillHistory: nextHistory,
      };

      // Status used for alert routing: prefer trained ML prediction if active, else physical threshold
      const effectiveStatus = prediction
        ? prediction.status
        : getRuleBasedGroundTruthStatus(clampedNextFill);

      const { newAlert, updatedLastAlertStatus } = evaluateBinAlert(
        binWithHistory,
        effectiveStatus,
        prev.alerts
      );

      if (newAlert && prev.settings.alertSoundEnabled) {
        playAlertChime(newAlert.severity);
      }

      const finalBin: Dustbin = {
        ...binWithHistory,
        lastAlertStatus: options?.isCollection || options?.isReset ? null : updatedLastAlertStatus,
      };

      const nextDustbins = [...prev.dustbins];
      nextDustbins[targetIndex] = finalBin;

      // Resolve open alerts for this bin if collected/reset or dropped below NEARLY_FULL
      let nextAlerts = prev.alerts;
      if (options?.isCollection || options?.isReset || effectiveStatus === 'EMPTY' || effectiveStatus === 'HALF_FILLED') {
        nextAlerts = prev.alerts.map((a) =>
          a.binId === binId && !a.resolved
            ? { ...a, resolved: true, resolvedAt: now }
            : a
        );
      }
      if (newAlert) {
        nextAlerts = [newAlert, ...nextAlerts].slice(0, 200);
      }

      let nextCollections = prev.collections;
      if (options?.isCollection) {
        const activeAlert = prev.alerts.find((a) => a.binId === binId && !a.resolved);
        const record: CollectionRecord = {
          id: generateId('col'),
          binId: oldBin.id,
          binCode: oldBin.code,
          binName: oldBin.name,
          location: oldBin.location,
          fillAtCollection: oldBin.fillPercentage,
          alertTimestamp: activeAlert ? activeAlert.timestamp : null,
          collectedAt: now,
          notes: options.collectionNotes || 'Routine smart bin collection dispatch',
        };
        nextCollections = [record, ...prev.collections].slice(0, 250);
      }

      const regression = predictBinFullTime(finalBin);
      const logEntry: DetectionLogEntry = {
        id: generateId('log'),
        binId: finalBin.id,
        binCode: finalBin.code,
        binName: finalBin.name,
        timestamp: now,
        fillPercentage: finalBin.fillPercentage,
        ultrasonicDistanceCm: sensor.measuredDistanceCm,
        mlClassification: prediction ? prediction.status : null,
        mlConfidence: prediction ? prediction.confidence : null,
        predictionEtaHours: regression.hoursRemaining,
        alertStatus: effectiveStatus,
        eventType,
      };

      const nextLogs = [logEntry, ...prev.logs].slice(0, 400);

      return {
        ...prev,
        dustbins: nextDustbins,
        alerts: nextAlerts,
        collections: nextCollections,
        logs: nextLogs,
      };
    },
    []
  );

  // Automatic simulation tick loop
  useEffect(() => {
    if (!state.settings.globalRunning || state.settings.simulationMode !== 'AUTO') {
      return;
    }

    const intervalMs = Math.max(400, Math.min(5000, state.settings.tickIntervalMs));
    const timer = window.setInterval(() => {
      setState((prev) => {
        if (!prev.settings.globalRunning || prev.settings.simulationMode !== 'AUTO') {
          return prev;
        }

        // Advance any bin that is either the selected bin or has autoSimEnabled (or all bins gently if selected)
        let workingState = prev;
        const dtSec = intervalMs / 1000;

        for (const bin of prev.dustbins) {
          const shouldAdvance = bin.id === prev.selectedBinId || bin.autoSimEnabled;
          if (!shouldAdvance) continue;
          if (bin.fillPercentage >= 100) continue;

          const jitter = 0.7 + Math.random() * 0.6;
          const delta = bin.autoSimSpeed * dtSec * jitter;
          const nextFill = Math.min(100, bin.fillPercentage + delta);
          workingState = applyBinFillUpdate(workingState, bin.id, nextFill, 'SIMULATION');
        }

        return workingState;
      });
    }, intervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    state.settings.globalRunning,
    state.settings.simulationMode,
    state.settings.tickIntervalMs,
    applyBinFillUpdate,
  ]);

  const selectBin = useCallback((binId: string) => {
    setState((prev) => {
      if (!prev.dustbins.some((b) => b.id === binId)) return prev;
      return { ...prev, selectedBinId: binId };
    });
  }, []);

  const addWasteToBin = useCallback(
    (binId: string, deltaPercent: number, eventType: LogEventType = 'MANUAL_ADD') => {
      if (!Number.isFinite(deltaPercent) || deltaPercent <= 0) return;
      setState((prev) => {
        const bin = prev.dustbins.find((b) => b.id === binId);
        if (!bin) return prev;
        return applyBinFillUpdate(prev, binId, bin.fillPercentage + deltaPercent, eventType);
      });
    },
    [applyBinFillUpdate]
  );

  const removeWasteFromBin = useCallback(
    (binId: string, deltaPercent: number) => {
      if (!Number.isFinite(deltaPercent) || deltaPercent <= 0) return;
      setState((prev) => {
        const bin = prev.dustbins.find((b) => b.id === binId);
        if (!bin) return prev;
        return applyBinFillUpdate(prev, binId, bin.fillPercentage - deltaPercent, 'MANUAL_REMOVE');
      });
    },
    [applyBinFillUpdate]
  );

  const emptyBin = useCallback(
    (binId: string, asCollection = false, notes?: string) => {
      setState((prev) =>
        applyBinFillUpdate(prev, binId, 0, asCollection ? 'COLLECTION' : 'MANUAL_REMOVE', {
          isCollection: asCollection,
          collectionNotes: notes,
          isReset: !asCollection,
        })
      );
    },
    [applyBinFillUpdate]
  );

  const resetBin = useCallback(
    (binId: string) => {
      setState((prev) =>
        applyBinFillUpdate(prev, binId, 0, 'MANUAL_REMOVE', { isReset: true })
      );
    },
    [applyBinFillUpdate]
  );

  const updateBinConfig = useCallback(
    (
      binId: string,
      updates: Partial<
        Pick<Dustbin, 'name' | 'location' | 'binHeightCm' | 'autoSimEnabled' | 'autoSimSpeed'>
      >
    ) => {
      setState((prev) => ({
        ...prev,
        dustbins: prev.dustbins.map((b) => {
          if (b.id !== binId) return b;
          const nextHeight =
            typeof updates.binHeightCm === 'number' && Number.isFinite(updates.binHeightCm)
              ? Math.max(30, Math.min(300, Math.round(updates.binHeightCm)))
              : b.binHeightCm;
          const nextSpeed =
            typeof updates.autoSimSpeed === 'number' && Number.isFinite(updates.autoSimSpeed)
              ? Math.max(0.2, Math.min(20, Number(updates.autoSimSpeed.toFixed(1))))
              : b.autoSimSpeed;
          return {
            ...b,
            name: updates.name !== undefined ? updates.name.trim() || b.name : b.name,
            location:
              updates.location !== undefined ? updates.location.trim() || b.location : b.location,
            binHeightCm: nextHeight,
            autoSimEnabled:
              updates.autoSimEnabled !== undefined ? updates.autoSimEnabled : b.autoSimEnabled,
            autoSimSpeed: nextSpeed,
          };
        }),
      }));
    },
    []
  );

  const addNewBin = useCallback(
    (input: {
      code: string;
      name: string;
      location: string;
      binHeightCm: number;
      initialFill?: number;
    }) => {
      setState((prev) => {
        const now = Date.now();
        const fill = clampFill(input.initialFill ?? 0);
        const height = Math.max(30, Math.min(300, Math.round(input.binHeightCm || 100)));
        const wasteHeight = Number(((height * fill) / 100).toFixed(2));
        const dist = Number((height - wasteHeight).toFixed(2));

        const newBin: Dustbin = {
          id: generateId('bin'),
          code: input.code.trim().toUpperCase() || `BIN-00${prev.dustbins.length + 1}`,
          name: input.name.trim() || 'New Smart Bin',
          location: input.location.trim() || 'Zone A',
          binHeightCm: height,
          fillPercentage: fill,
          previousFillPercentage: fill,
          lastUpdated: now,
          lastResetAt: now,
          fillHistory: [
            {
              timestamp: now,
              fillPercentage: fill,
              distanceCm: dist,
              wasteHeightCm: wasteHeight,
              rawNoisyDistanceCm: dist,
              mlStatus: null,
              confidence: null,
            },
          ],
          autoSimEnabled: false,
          autoSimSpeed: 1.5,
          wasteItems: syncWasteObjectsWithFill([], fill),
          lastAlertStatus: null,
        };

        return {
          ...prev,
          dustbins: [...prev.dustbins, newBin],
          selectedBinId: newBin.id,
        };
      });
    },
    []
  );

  const removeBin = useCallback((binId: string) => {
    setState((prev) => {
      if (prev.dustbins.length <= 1) return prev; // Keep at least 1 active bin
      const remaining = prev.dustbins.filter((b) => b.id !== binId);
      const nextSelected =
        prev.selectedBinId === binId ? remaining[0].id : prev.selectedBinId;
      return {
        ...prev,
        dustbins: remaining,
        selectedBinId: nextSelected,
      };
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<SimulationSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...updates,
      },
    }));
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    const now = Date.now();
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.map((a) =>
        a.id === alertId ? { ...a, resolved: true, resolvedAt: now } : a
      ),
    }));
  }, []);

  const clearResolvedAlerts = useCallback(() => {
    setState((prev) => ({
      ...prev,
      alerts: prev.alerts.filter((a) => !a.resolved),
    }));
  }, []);

  const clearHistoryLogs = useCallback(() => {
    setState((prev) => ({
      ...prev,
      logs: [],
    }));
  }, []);

  const regenerateDataset = useCallback((sampleCount: number) => {
    const dataset = generateSyntheticDataset(sampleCount);
    setState((prev) => ({
      ...prev,
      trainingDataset: dataset,
    }));
  }, []);

  const trainModel = useCallback(
    async (config: TrainingConfig) => {
      setTrainingProgress({
        isTraining: true,
        completedTrees: 0,
        totalTrees: config.numTrees,
        error: null,
      });

      try {
        const dataset: TrainingSample[] =
          state.trainingDataset.length >= 20
            ? state.trainingDataset
            : generateSyntheticDataset(600);

        const { model, metrics }: { model: RandomForestModel; metrics: ModelMetrics } =
          await trainRandomForestAsync(dataset, config, (done, total) => {
            setTrainingProgress({
              isTraining: true,
              completedTrees: done,
              totalTrees: total,
              error: null,
            });
          });

        setState((prev) => ({
          ...prev,
          trainingDataset: dataset,
          trainedModel: model,
          modelMetrics: metrics,
        }));

        setTrainingProgress({
          isTraining: false,
          completedTrees: config.numTrees,
          totalTrees: config.numTrees,
          error: null,
        });
      } catch (err) {
        setTrainingProgress({
          isTraining: false,
          completedTrees: 0,
          totalTrees: 0,
          error: err instanceof Error ? err.message : 'Failed to train Random Forest model.',
        });
      }
    },
    [state.trainingDataset]
  );

  const unloadModel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      trainedModel: null,
      modelMetrics: null,
    }));
  }, []);

  const exportAppDataJson = useCallback(() => {
    return JSON.stringify(state, null, 2);
  }, [state]);

  const importAppDataJson = useCallback((jsonText: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonText);
      const validated = validateAndSanitizeState(parsed);
      if (!validated) {
        return {
          ok: false,
          error: 'Invalid application data schema. Please provide a valid EcoPulse JSON backup.',
        };
      }
      setState(validated);
      saveAppState(validated);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Malformed JSON file. Unable to parse.' };
    }
  }, []);

  const factoryResetApp = useCallback(() => {
    clearAppState();
    const fresh = createDefaultAppState();
    setState(fresh);
    saveAppState(fresh);
  }, []);

  // Derive telemetry for all bins cleanly via useMemo
  const telemetryByBinId = useMemo(() => {
    const map: Record<string, DerivedBinTelemetry> = {};
    for (const bin of state.dustbins) {
      const { sensor, prediction } = evaluateBinSnapshot(
        bin,
        state.trainedModel,
        state.settings.sensorNoiseEnabled,
        state.settings.noiseLevelCm
      );
      const effectiveStatus = prediction
        ? prediction.status
        : getRuleBasedGroundTruthStatus(bin.fillPercentage);
      const regression = predictBinFullTime(bin);
      map[bin.id] = {
        bin,
        sensor,
        mlPrediction: prediction,
        effectiveStatus,
        prediction: regression,
      };
    }
    return map;
  }, [
    state.dustbins,
    state.trainedModel,
    state.settings.sensorNoiseEnabled,
    state.settings.noiseLevelCm,
  ]);

  const selectedBinTelemetry = useMemo(() => {
    return (
      telemetryByBinId[state.selectedBinId] ||
      telemetryByBinId[state.dustbins[0]?.id]
    );
  }, [telemetryByBinId, state.selectedBinId, state.dustbins]);

  const value: SmartWasteContextValue = {
    state,
    telemetryByBinId,
    selectedBinTelemetry,
    trainingProgress,
    selectBin,
    addWasteToBin,
    removeWasteFromBin,
    emptyBin,
    resetBin,
    updateBinConfig,
    addNewBin,
    removeBin,
    updateSettings,
    resolveAlert,
    clearResolvedAlerts,
    clearHistoryLogs,
    regenerateDataset,
    trainModel,
    unloadModel,
    exportAppDataJson,
    importAppDataJson,
    factoryResetApp,
  };

  return <SmartWasteContext.Provider value={value}>{children}</SmartWasteContext.Provider>;
};

export function useSmartWasteSystem(): SmartWasteContextValue {
  const ctx = useContext(SmartWasteContext);
  if (!ctx) {
    throw new Error('useSmartWasteSystem must be used inside SmartWasteProvider');
  }
  return ctx;
}
