export interface OLSFit {
  slope: number;
  intercept: number;
  rSquared: number;
}

/**
 * Ordinary Least Squares (OLS) simple linear regression: y = slope * x + intercept.
 */
export function fitOrdinaryLeastSquares(points: { x: number; y: number }[]): OLSFit | null {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denom = sumXX - n * meanX * meanX;
  if (Math.abs(denom) < 1e-12) return null;

  const slope = (sumXY - n * meanX * meanY) / denom;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - predicted) ** 2;
  }

  const rSquared = ssTot > 1e-9 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 1;

  return {
    slope,
    intercept,
    rSquared: Number(rSquared.toFixed(4)),
  };
}
