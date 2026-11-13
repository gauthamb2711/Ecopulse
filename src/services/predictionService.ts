import { Dustbin, LinearRegressionResult, RegressionChartPoint } from '../types';
import { formatShortTime } from '../utils/formatters';
import { fitOrdinaryLeastSquares } from './linearRegression';

/**
 * Uses actual historical fill readings & timestamps of a dustbin
 * to predict when it will reach 100% capacity via Linear Regression.
 */
export function predictBinFullTime(bin: Dustbin): LinearRegressionResult {
  const currentFill = bin.fillPercentage;
  const now = Date.now();

  if (currentFill >= 99.5) {
    const recentPts: RegressionChartPoint[] = bin.fillHistory.slice(-15).map((pt) => ({
      timestamp: pt.timestamp,
      label: formatShortTime(pt.timestamp),
      actualFill: pt.fillPercentage,
    }));
    return {
      status: 'ALREADY_FULL',
      slopePerHour: 0,
      intercept: 100,
      rSquared: 1,
      hoursRemaining: 0,
      minutesRemaining: 0,
      expectedFullTimestamp: now,
      rateCategory: 'NONE',
      message: 'Collection required immediately.',
      chartPoints: recentPts,
    };
  }

  // Use up to last 20 historical points since last reset
  const history = bin.fillHistory
    .filter((pt) => pt.timestamp >= bin.lastResetAt)
    .slice(-20);

  if (history.length < 3) {
    return {
      status: 'INSUFFICIENT_DATA',
      slopePerHour: 0,
      intercept: currentFill,
      rSquared: 0,
      hoursRemaining: null,
      minutesRemaining: null,
      expectedFullTimestamp: null,
      rateCategory: 'NONE',
      message: 'Collecting more data to generate a reliable prediction.',
      chartPoints: history.map((pt) => ({
        timestamp: pt.timestamp,
        label: formatShortTime(pt.timestamp),
        actualFill: pt.fillPercentage,
      })),
    };
  }

  const t0 = history[0].timestamp;
  const tLast = history[history.length - 1].timestamp;
  const spanMs = tLast - t0;

  if (spanMs < 1500) {
    return {
      status: 'INSUFFICIENT_DATA',
      slopePerHour: 0,
      intercept: currentFill,
      rSquared: 0,
      hoursRemaining: null,
      minutesRemaining: null,
      expectedFullTimestamp: null,
      rateCategory: 'NONE',
      message: 'Collecting more data to generate a reliable prediction.',
      chartPoints: history.map((pt) => ({
        timestamp: pt.timestamp,
        label: formatShortTime(pt.timestamp),
        actualFill: pt.fillPercentage,
      })),
    };
  }

  // Convert timestamps to relative hours from t0
  const olsPoints = history.map((pt) => ({
    x: (pt.timestamp - t0) / 3_600_000,
    y: pt.fillPercentage,
  }));

  const fit = fitOrdinaryLeastSquares(olsPoints);
  if (!fit) {
    return {
      status: 'INSUFFICIENT_DATA',
      slopePerHour: 0,
      intercept: currentFill,
      rSquared: 0,
      hoursRemaining: null,
      minutesRemaining: null,
      expectedFullTimestamp: null,
      rateCategory: 'NONE',
      message: 'Collecting more data to generate a reliable prediction.',
      chartPoints: history.map((pt) => ({
        timestamp: pt.timestamp,
        label: formatShortTime(pt.timestamp),
        actualFill: pt.fillPercentage,
      })),
    };
  }

  const slopePerHour = Number(fit.slope.toFixed(2));

  if (slopePerHour <= 0.05) {
    return {
      status: 'NOT_FILLING',
      slopePerHour,
      intercept: Number(fit.intercept.toFixed(2)),
      rSquared: fit.rSquared,
      hoursRemaining: null,
      minutesRemaining: null,
      expectedFullTimestamp: null,
      rateCategory: 'NONE',
      message: 'No active filling trend detected.',
      chartPoints: history.map((pt, idx) => ({
        timestamp: pt.timestamp,
        label: formatShortTime(pt.timestamp),
        actualFill: pt.fillPercentage,
        projectedFill: Number(
          Math.max(0, Math.min(100, fit.slope * olsPoints[idx].x + fit.intercept)).toFixed(1)
        ),
      })),
    };
  }

  // Estimate remaining time from current fill level using OLS slope
  const rawHoursRemaining = Math.max(0, (100 - currentFill) / slopePerHour);
  const hoursRemaining = Number(rawHoursRemaining.toFixed(2));
  const minutesRemaining = Math.round(rawHoursRemaining * 60);
  const expectedFullTimestamp = Math.round(now + rawHoursRemaining * 3_600_000);

  let rateCategory: 'SLOW' | 'MODERATE' | 'FAST' = 'SLOW';
  if (slopePerHour >= 20) {
    rateCategory = 'FAST';
  } else if (slopePerHour >= 5) {
    rateCategory = 'MODERATE';
  }

  // Build combined chart series: historical actuals + OLS fit + future projection up to 100%
  const chartPoints: RegressionChartPoint[] = history.map((pt, idx) => ({
    timestamp: pt.timestamp,
    label: formatShortTime(pt.timestamp),
    actualFill: pt.fillPercentage,
    projectedFill: Number(
      Math.max(0, Math.min(100, fit.slope * olsPoints[idx].x + fit.intercept)).toFixed(1)
    ),
  }));

  // Anchor projection cleanly from current fill point forward in 4 steps to 100%
  const steps = 4;
  const remainingMs = Math.min(expectedFullTimestamp - now, 72 * 3_600_000); // cap visual projection window at 72h if very slow
  const projectedEndFill =
    expectedFullTimestamp - now > 72 * 3_600_000
      ? Math.min(100, currentFill + slopePerHour * 72)
      : 100;

  for (let s = 1; s <= steps; s++) {
    const frac = s / steps;
    const tFuture = Math.round(now + remainingMs * frac);
    const fFuture = Number(
      Math.min(100, currentFill + (projectedEndFill - currentFill) * frac).toFixed(1)
    );
    chartPoints.push({
      timestamp: tFuture,
      label: formatShortTime(tFuture),
      projectedFill: fFuture,
    });
  }

  const speedLabel =
    rateCategory === 'FAST'
      ? 'Filling rapidly'
      : rateCategory === 'MODERATE'
      ? 'Filling steadily'
      : 'Filling slowly';

  return {
    status: 'PREDICTING',
    slopePerHour,
    intercept: Number(fit.intercept.toFixed(2)),
    rSquared: fit.rSquared,
    hoursRemaining,
    minutesRemaining,
    expectedFullTimestamp,
    rateCategory,
    message: `${speedLabel} (+${slopePerHour.toFixed(1)}%/hr).`,
    chartPoints,
  };
}
