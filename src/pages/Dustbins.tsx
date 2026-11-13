import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, ExternalLink, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useSmartWasteSystem } from '../hooks/useSmartWasteSystem';
import { STATUS_META } from '../types';
import { formatDurationFromHours } from '../utils/formatters';

export const Dustbins: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    telemetryByBinId,
    selectBin,
    addNewBin,
    updateBinConfig,
    resetBin,
    removeBin,
  } = useSmartWasteSystem();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBinId, setEditingBinId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formHeight, setFormHeight] = useState('100');
  const [formFill, setFormFill] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddModal = () => {
    const nextNum = state.dustbins.length + 1;
    setFormCode(`BIN-${String(nextNum).padStart(3, '0')}`);
    setFormName('');
    setFormLocation('');
    setFormHeight('100');
    setFormFill('0');
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (binId: string) => {
    const bin = state.dustbins.find((b) => b.id === binId);
    if (!bin) return;
    setFormName(bin.name);
    setFormLocation(bin.location);
    setFormHeight(String(bin.binHeightCm));
    setFormError(null);
    setEditingBinId(binId);
  };

  const handleCreateBin = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(formHeight);
    const f = Number(formFill);
    if (!formName.trim() || !formLocation.trim()) {
      setFormError('Bin name and location are required.');
      return;
    }
    if (!Number.isFinite(h) || h < 30 || h > 300) {
      setFormError('Bin height must be between 30 and 300 cm.');
      return;
    }
    if (!Number.isFinite(f) || f < 0 || f > 100) {
      setFormError('Initial fill must be between 0 and 100%.');
      return;
    }

    addNewBin({
      code: formCode,
      name: formName,
      location: formLocation,
      binHeightCm: h,
      initialFill: f,
    });
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBinId) return;
    const h = Number(formHeight);
    if (!formName.trim() || !formLocation.trim()) {
      setFormError('Bin name and location are required.');
      return;
    }
    if (!Number.isFinite(h) || h < 30 || h > 300) {
      setFormError('Bin height must be between 30 and 300 cm.');
      return;
    }

    updateBinConfig(editingBinId, {
      name: formName,
      location: formLocation,
      binHeightCm: h,
    });
    setEditingBinId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">
            Smart Dustbin Fleet ({state.dustbins.length} Simulated Nodes)
          </h2>
          <p className="text-xs text-slate-400">
            Independent ultrasonic telemetry, ML classification, and fill-level history per bin
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-cyan-400 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Simulated Dustbin</span>
        </button>
      </div>

      {/* Fleet Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0F172A]">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs font-medium text-slate-400">
              <th className="px-4 py-3">Bin ID & Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Fill Level</th>
              <th className="px-4 py-3 text-right">Sensor Distance</th>
              <th className="px-4 py-3">ML Classification</th>
              <th className="px-4 py-3 text-right">Predicted Full</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {state.dustbins.map((bin) => {
              const t = telemetryByBinId[bin.id];
              if (!t) return null;
              const statusMeta = STATUS_META[t.effectiveStatus];
              const isSelected = state.selectedBinId === bin.id;

              return (
                <tr
                  key={bin.id}
                  className={`transition-colors hover:bg-slate-800/35 ${
                    isSelected ? 'bg-cyan-500/[0.04]' : ''
                  }`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-cyan-400">
                        {bin.code}
                      </span>
                      <span className="font-medium text-slate-100">{bin.name}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      Height {bin.binHeightCm} cm
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-300">{bin.location}</td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`font-mono text-xs font-bold tabular-nums ${statusMeta.textColor}`}>
                        {bin.fillPercentage.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${bin.fillPercentage}%`,
                            backgroundColor: statusMeta.hex,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-cyan-300 tabular-nums">
                    {t.sensor.measuredDistanceCm.toFixed(1)} cm
                  </td>
                  <td className="px-4 py-3.5">
                    {t.mlPrediction ? (
                      <div>
                        <span className={`text-xs font-semibold ${STATUS_META[t.mlPrediction.status].textColor}`}>
                          {STATUS_META[t.mlPrediction.status].label}
                        </span>
                        <div className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {t.mlPrediction.confidence.toFixed(1)}% conf
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-amber-400">
                        MODEL NOT TRAINED
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-300 tabular-nums">
                    {t.prediction.status === 'PREDICTING'
                      ? formatDurationFromHours(t.prediction.hoursRemaining)
                      : t.prediction.status === 'ALREADY_FULL'
                      ? 'Immediate'
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          selectBin(bin.id);
                          navigate('/simulator');
                        }}
                        className="rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap"
                      >
                        Simulate
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/dustbins/${bin.id}`)}
                        title="View Details"
                        className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(bin.id)}
                        title="Edit Bin"
                        className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => resetBin(bin.id)}
                        title="Reset Bin to 0%"
                        className="rounded-md border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:bg-slate-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={state.dustbins.length <= 1}
                        onClick={() => setConfirmDeleteId(bin.id)}
                        title="Remove Bin"
                        className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Bin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0F172A] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Add Simulated Dustbin</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Bin Code</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Bin Name</label>
                <input
                  type="text"
                  placeholder="e.g., Transit Hub East"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Location</label>
                <input
                  type="text"
                  placeholder="e.g., North Concourse"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Height (cm)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={formHeight}
                    onChange={(e) => setFormHeight(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Initial Fill (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formFill}
                    onChange={(e) => setFormFill(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Create Dustbin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bin Modal */}
      {editingBinId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-[#0F172A] p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Edit Dustbin Configuration</h3>
              <button
                type="button"
                onClick={() => setEditingBinId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Bin Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Location</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Calibrated Bin Height (cm)
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={formHeight}
                  onChange={(e) => setFormHeight(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0B111E] px-3 py-2 font-mono text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBinId(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-[#0F172A] p-6">
            <h3 className="text-base font-semibold text-slate-100">Remove Simulated Dustbin?</h3>
            <p className="mt-2 text-xs text-slate-400">
              This removes the selected simulated bin and its local telemetry curve. Existing historical logs remain preserved.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  removeBin(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-400"
              >
                Remove Bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
