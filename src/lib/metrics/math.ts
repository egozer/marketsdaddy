export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
};

export const calculateEMA = (previousEma: number, currentValue: number, alpha: number): number =>
  alpha * currentValue + (1 - alpha) * previousEma;

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
};

export const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const mean = calculateMean(values);
  const variance =
    values.reduce((acc, value) => acc + (value - mean) * (value - mean), 0) / values.length;

  return Math.sqrt(variance);
};

export const calculateVolatility = (returns: number[]): number => calculateStdDev(returns);

export const zScore = (value: number, mean: number, stdDev: number): number => {
  if (stdDev === 0) {
    return 0;
  }

  return (value - mean) / stdDev;
};

export const normalizeToRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  if (inMax === inMin) {
    return (outMin + outMax) / 2;
  }

  const normalized = (value - inMin) / (inMax - inMin);
  return outMin + normalized * (outMax - outMin);
};

export const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
  }

  return sorted[midpoint];
};
