import { BinStatus } from '../types';

export function clampFill(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatShortTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDurationFromHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours) || hours < 0) return '—';
  if (hours < 1 / 60) {
    const secs = Math.max(1, Math.round(hours * 3600));
    return `${secs}s`;
  }
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins}m`;
  }
  const wholeHours = Math.floor(hours);
  const mins = Math.round((hours - wholeHours) * 60);
  if (wholeHours >= 24) {
    const days = Math.floor(wholeHours / 24);
    const remHours = wholeHours % 24;
    return `${days}d ${remHours}h`;
  }
  return mins > 0 ? `${wholeHours}h ${mins}m` : `${wholeHours}h`;
}

export function generateId(prefix = 'id'): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function statusToCsvLabel(status: BinStatus | null): string {
  if (!status) return 'MODEL NOT TRAINED';
  return status;
}
