import React, { useMemo, useState } from 'react';
import { BrainCircuit, Play, RefreshCw, Trash2 } from 'lucide-react';
import { ClassDistributionChart } from '../components/Charts/WasteCharts';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { getClassDistribution } from '../services/modelTraining';
import { predictWithRandomForest } from '../services/randomForest';
import { BIN_STATUS_LIST, MLFeatures, STATUS_META } from '../types';
import { formatDateTime } from '../utils/formatters';

export const MachineLearningLab: React.FC = () => {
  const {
    state,
    trainingProgress,
    regenerateDataset,
    trainModel,
    unloadModel,
  } = useSmartWasteSystem();

  const [sampleCount, setSampleCount] = useState<number>(state.trainingDataset.length || 600);
  const [numTrees, setNumTrees] = useState<number>(15);
  const [maxDepth, setMaxDepth] = useState<number>(8);

  // Interactive Inference Sandbox state
  const [testFill, setTestFill] = useState<number>(64);
  const [testBinHeight, setTestBinHeight] = useState<number>(100);
  const [testRate, setTestRate] = useState<number>(8.5);
  const [testNoise, setTestNoise] = useState<number>(0.4);

  const classCounts = useMemo(
    () => getClassDistribution(state.trainingDataset),
    [state.trainingDataset]
  );

  const previewSamples = useMemo(
    () => state.trainingDataset.slice(0, 8),
    [state.trainingDataset]
  );

  const sandboxFeatures: MLFeatures = useMemo(() => {
    const wasteHeight = Number(((testBinHeight * testFill) / 100).toFixed(2));
    const ultrasonicDistance = Number(
      Math.max(0, Math.min(testBinHeight, testBinHeight - wasteHeight + testNoise)).toFixed(2)
    );
    return {
      ultrasonicDistance,
      fillPercentage: testFill,
      wasteHeight,
      recentFillRate: testRate,
      previousFillLevel: Math.max(0, testFill - 4),
      sensorVariation: testNoise,
    };
  }, [testBinHeight, testFill, testRate, testNoise]);

  const sandboxPrediction = useMemo(
    () => predictWithRandomForest(state.trainedModel, sandboxFeatures),
    [state.trainedModel, sandboxFeatures]
  );

  const metrics = state.modelMetrics;

  const handleTrain = async () => {
    await trainModel({
      numTrees,
      maxDepth,
      minSamplesSplit: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Synthetic Dataset & Training Controls Header */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                Synthetic Simulator Training Dataset
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Generated strictly from simulated HC-SR04 sensor equations + noise (not real-world hardware logs). Split 75% train / 25% validation.
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-cyan-400 tabular-nums">
              {state.trainingDataset.length} Samples
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-300">
              Sample Count:
              <select
                value={sampleCount}
                onChange={(e) => setSampleCount(Number(e.target.value))}
                className="ml-2 rounded-lg border border-slate-700 bg-[#0B111E] px-2.5 py-1.5 font-mono text-xs text-slate-100"
              >
                <option value={240}>240</option>
                <option value={600}>600</option>
                <option value={1200}>1,200</option>
                <option value={2000}>2,000</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => regenerateDataset(sampleCount)}
              disabled={trainingProgress.isTraining}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerate Synthetic Dataset</span>
            </button>
          </div>

          <div className="mt-4">
            <ClassDistributionChart counts={classCounts} />
          </div>
        </div>

        {/* Random Forest Hyperparameters & Training Execution */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Random Forest Classifier
                </h2>
              </div>
              <span
                className={`font-mono text-xs font-semibold ${
                  state.trainedModel ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {state.trainedModel ? 'MODEL TRAINED' : 'MODEL NOT TRAINED'}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Pure TypeScript CART decision trees with bootstrap sampling, random feature subsets (mtry = 2), and majority voting.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Number of Decision Trees</span>
                  <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                    {numTrees} trees
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={numTrees}
                  onChange={(e) => setNumTrees(Number(e.target.value))}
                  disabled={trainingProgress.isTraining}
                  className="mt-1.5 w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Max Tree Depth</span>
                  <span className="font-mono font-semibold text-cyan-400 tabular-nums">
                    Depth {maxDepth}
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(Number(e.target.value))}
                  disabled={trainingProgress.isTraining}
                  className="mt-1.5 w-full accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Training Progress & Actions */}
          <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
            {trainingProgress.isTraining && (
              <div>
                <div className="flex justify-between text-xs text-cyan-300">
                  <span>Constructing decision trees...</span>
                  <span className="font-mono tabular-nums">
                    {trainingProgress.completedTrees} / {trainingProgress.totalTrees}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{
                      width: `${
                        trainingProgress.totalTrees > 0
                          ? (trainingProgress.completedTrees / trainingProgress.totalTrees) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {trainingProgress.error && (
              <p className="text-xs text-red-400">{trainingProgress.error}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTrain}
                disabled={trainingProgress.isTraining}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:opacity-50 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                <span>
                  {trainingProgress.isTraining
                    ? 'Training Model...'
                    : state.trainedModel
                    ? 'Retrain Random Forest'
                    : 'Train Random Forest'}
                </span>
              </button>
              {state.trainedModel && (
                <button
                  type="button"
                  onClick={unloadModel}
                  disabled={trainingProgress.isTraining}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-700 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Unload Model</span>
                </button>
              )}
            </div>

            {state.trainedModel && (
              <p className="text-[11px] text-slate-400">
                Active Model: {state.trainedModel.numTrees} trees · Max depth{' '}
                {state.trainedModel.maxDepth} · Trained{' '}
                {formatDateTime(state.trainedModel.trainedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Validation Evaluation Metrics & Confusion Matrix */}
      {state.trainedModel && metrics ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Metrics & Per-Class Scores */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-6">
            <h3 className="text-sm font-semibold text-slate-100">
              Held-Out Validation Evaluation ({metrics.valCount} unseen samples)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Trained on {metrics.trainCount} samples · Evaluated on {metrics.valCount} samples
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Accuracy</div>
                <div className="mt-1 font-mono text-lg font-bold text-emerald-400 tabular-nums">
                  {metrics.accuracy.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Macro Precision</div>
                <div className="mt-1 font-mono text-lg font-bold text-cyan-400 tabular-nums">
                  {metrics.macroPrecision.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Macro Recall</div>
                <div className="mt-1 font-mono text-lg font-bold text-blue-400 tabular-nums">
                  {metrics.macroRecall.toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
                <div className="text-[11px] text-slate-400">Macro F1</div>
                <div className="mt-1 font-mono text-lg font-bold text-amber-400 tabular-nums">
                  {metrics.macroF1.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-3">Class</th>
                    <th className="py-2 px-3 text-right">Precision</th>
                    <th className="py-2 px-3 text-right">Recall</th>
                    <th className="py-2 px-3 text-right">F1-Score</th>
                    <th className="py-2 pl-3 text-right">Support</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {BIN_STATUS_LIST.map((cls) => {
                    const row = metrics.perClass[cls];
                    return (
                      <tr key={cls}>
                        <td className={`py-2 pr-3 font-sans font-semibold ${STATUS_META[cls].textColor}`}>
                          {STATUS_META[cls].label}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-200">{row.precision.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-200">{row.recall.toFixed(1)}%</td>
                        <td className="py-2 px-3 text-right text-slate-200">{row.f1.toFixed(1)}%</td>
                        <td className="py-2 pl-3 text-right text-slate-400">{row.support}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4x4 Confusion Matrix */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-6">
            <h3 className="text-sm font-semibold text-slate-100">
              Validation Confusion Matrix (Actual vs. Predicted)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Rows represent true synthetic labels; columns represent Random Forest predictions
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2 text-left">Actual \ Pred</th>
                    {BIN_STATUS_LIST.map((cls) => (
                      <th key={cls} className="py-2 px-2 font-medium">
                        {STATUS_META[cls].shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
                  {BIN_STATUS_LIST.map((trueCls, rIdx) => (
                    <tr key={trueCls}>
                      <td className={`py-2.5 pr-2 text-left font-sans font-semibold ${STATUS_META[trueCls].textColor}`}>
                        {STATUS_META[trueCls].shortLabel}
                      </td>
                      {BIN_STATUS_LIST.map((predCls, cIdx) => {
                        const val = metrics.confusionMatrix[rIdx]?.[cIdx] ?? 0;
                        const isDiag = rIdx === cIdx;
                        return (
                          <td
                            key={predCls}
                            className={`py-2.5 px-2 font-semibold ${
                              isDiag
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : val > 0
                                ? 'bg-red-500/10 text-red-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">
          <div className="font-mono text-xs font-bold">MODEL NOT TRAINED</div>
          <p className="mt-1 text-xs text-amber-100/85">
            Click "Train Random Forest" above to construct the decision trees on the synthetic dataset and compute validation accuracy, confusion matrix, precision, recall, and F1-score.
          </p>
        </div>
      )}

      {/* Live Interactive Inference Sandbox + Dataset Preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-slate-100">
            Test Single-Sample Inference
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            Pass custom feature values directly into the trained Random Forest ensemble
          </p>

          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between">
                <span className="text-slate-300">Fill Percentage</span>
                <span className="font-mono text-cyan-400 tabular-nums">{testFill}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={testFill}
                onChange={(e) => setTestFill(Number(e.target.value))}
                className="mt-1 w-full accent-cyan-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-slate-400">Bin Height (cm)</span>
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={testBinHeight}
                  onChange={(e) => setTestBinHeight(Number(e.target.value) || 100)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-2.5 py-1.5 font-mono text-xs text-slate-100"
                />
              </label>
              <label className="block">
                <span className="text-slate-400">Rate (%/hr)</span>
                <input
                  type="number"
                  step="0.5"
                  value={testRate}
                  onChange={(e) => setTestRate(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-2.5 py-1.5 font-mono text-xs text-slate-100"
                />
              </label>
              <label className="block">
                <span className="text-slate-400">Noise (cm)</span>
                <input
                  type="number"
                  step="0.2"
                  min="-3"
                  max="3"
                  value={testNoise}
                  onChange={(e) => setTestNoise(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-2.5 py-1.5 font-mono text-xs text-slate-100"
                />
              </label>
            </div>

            <div className="rounded-lg border border-slate-800 bg-[#0B111E] p-3">
              {sandboxPrediction ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400">Predicted Class</div>
                    <div className={`text-base font-bold ${STATUS_META[sandboxPrediction.status].textColor}`}>
                      {STATUS_META[sandboxPrediction.status].label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Ensemble Confidence</div>
                    <div className="font-mono text-base font-bold text-slate-100 tabular-nums">
                      {sandboxPrediction.confidence.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-xs text-amber-400">
                  MODEL NOT TRAINED — Train model to run inference
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Synthetic Training Dataset Preview Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-7">
          <h3 className="text-sm font-semibold text-slate-100">
            Synthetic Dataset Preview (First 8 of {state.trainingDataset.length} Rows)
          </h3>
          <p className="mt-0.5 text-xs text-slate-400">
            6 extracted features per sample used for decision tree splits
          </p>
          <table className="mt-3 w-full min-w-[540px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 px-2 text-right">Dist (cm)</th>
                <th className="py-2 px-2 text-right">Fill (%)</th>
                <th className="py-2 px-2 text-right">Waste (cm)</th>
                <th className="py-2 px-2 text-right">Rate (%/hr)</th>
                <th className="py-2 px-2 text-right">Noise (cm)</th>
                <th className="py-2 pl-2">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono tabular-nums">
              {previewSamples.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-2 text-slate-500">{s.id}</td>
                  <td className="py-2 px-2 text-right text-cyan-300">
                    {s.features.ultrasonicDistance.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-200">
                    {s.features.fillPercentage.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">
                    {s.features.wasteHeight.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-300">
                    {s.features.recentFillRate.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {s.features.sensorVariation.toFixed(2)}
                  </td>
                  <td className={`py-2 pl-2 font-sans font-semibold ${STATUS_META[s.label].textColor}`}>
                    {STATUS_META[s.label].shortLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
