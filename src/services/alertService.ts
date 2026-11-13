import { AlertSeverity, BinStatus, Dustbin, SmartAlert } from '../types';
import { generateId } from '../utils/formatters';

export function getAlertSeverityForStatus(status: BinStatus): AlertSeverity {
  if (status === 'COMPLETELY_FULL') return 'CRITICAL';
  if (status === 'NEARLY_FULL') return 'WARNING';
  return 'INFO';
}

export function getAlertMessageForStatus(bin: Dustbin, status: BinStatus): string {
  switch (status) {
    case 'COMPLETELY_FULL':
      return `${bin.code} (${bin.location}) reached ${bin.fillPercentage.toFixed(1)}% capacity. Immediate collection required.`;
    case 'NEARLY_FULL':
      return `${bin.code} (${bin.location}) reached ${bin.fillPercentage.toFixed(1)}% capacity. Collection planning recommended.`;
    case 'HALF_FILLED':
      return `${bin.code} (${bin.location}) is at ${bin.fillPercentage.toFixed(1)}% capacity. Normal monitoring.`;
    case 'EMPTY':
    default:
      return `${bin.code} (${bin.location}) is at ${bin.fillPercentage.toFixed(1)}% capacity. No collection required.`;
  }
}

/**
 * Evaluates whether a meaningful status change occurred that warrants generating
 * a new in-app alert, preventing duplicate alerts on every simulation frame.
 */
export function evaluateBinAlert(
  bin: Dustbin,
  effectiveStatus: BinStatus,
  existingAlerts: SmartAlert[]
): { newAlert: SmartAlert | null; updatedLastAlertStatus: BinStatus } {
  const prevAlertStatus = bin.lastAlertStatus;

  // Only emit automatic in-app collection alerts for NEARLY_FULL and COMPLETELY_FULL
  // when entering that state for the first time or escalating.
  const isAlertWorthy =
    effectiveStatus === 'NEARLY_FULL' || effectiveStatus === 'COMPLETELY_FULL';

  if (!isAlertWorthy) {
    return {
      newAlert: null,
      updatedLastAlertStatus: effectiveStatus,
    };
  }

  // Already alerted for this exact status without dropping back down
  if (prevAlertStatus === effectiveStatus) {
    return {
      newAlert: null,
      updatedLastAlertStatus: effectiveStatus,
    };
  }

  // Also check if an unresolved alert of the exact same bin & status already exists
  const hasActiveSameAlert = existingAlerts.some(
    (a) => a.binId === bin.id && a.status === effectiveStatus && !a.resolved
  );
  if (hasActiveSameAlert) {
    return {
      newAlert: null,
      updatedLastAlertStatus: effectiveStatus,
    };
  }

  const alert: SmartAlert = {
    id: generateId('alert'),
    binId: bin.id,
    binCode: bin.code,
    binName: bin.name,
    location: bin.location,
    status: effectiveStatus,
    severity: getAlertSeverityForStatus(effectiveStatus),
    message: getAlertMessageForStatus(bin, effectiveStatus),
    fillPercentage: bin.fillPercentage,
    timestamp: Date.now(),
    resolved: false,
    resolvedAt: null,
  };

  return {
    newAlert: alert,
    updatedLastAlertStatus: effectiveStatus,
  };
}

let audioCtx: AudioContext | null = null;

/**
 * Synthesizes a clean subtle in-app alert chime using browser Web Audio API.
 */
export function playAlertChime(severity: AlertSeverity): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = severity === 'CRITICAL' ? 'triangle' : 'sine';
    const baseFreq = severity === 'CRITICAL' ? 880 : 587.33;

    osc.frequency.setValueAtTime(baseFreq, now);
    if (severity === 'CRITICAL') {
      osc.frequency.setValueAtTime(659.25, now + 0.14);
      osc.frequency.setValueAtTime(880, now + 0.28);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (severity === 'CRITICAL' ? 0.45 : 0.25));

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + (severity === 'CRITICAL' ? 0.48 : 0.28));
  } catch {
    // Ignore audio context restrictions if browser blocks autoplay
  }
}
