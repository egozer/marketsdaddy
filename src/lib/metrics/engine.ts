import type { FxSnapshot, GlobalStress, ProcessedCurrencyMetric } from "@/types/fx";
import {
  calculateEMA,
  calculateMean,
  calculatePercentChange,
  calculateVolatility,
  calculateStdDev,
  clamp,
  lerp,
  normalizeToRange,
  zScore
} from "@/lib/metrics/math";

export interface MetricsEngineOptions {
  currencies: string[];
  rollingWindowSize: number;
  emaAlpha: number;
  anomalyClampPercent: number;
}

export interface MetricsEngineState {
  snapshots: FxSnapshot[];
  emaByCurrency: Record<string, number>;
}

export interface ComputedMetricsResult {
  metrics: ProcessedCurrencyMetric[];
  stress: GlobalStress;
}

const getRate = (snapshot: FxSnapshot | undefined, currency: string): number | null => {
  if (!snapshot) {
    return null;
  }

  const rate = snapshot.rates[currency];
  return typeof rate === "number" ? rate : null;
};

const getRollingReturns = (
  snapshots: FxSnapshot[],
  currency: string,
  rollingWindowSize: number
): number[] => {
  if (snapshots.length < 2) {
    return [];
  }

  const returns: number[] = [];
  const maxSamples = Math.min(snapshots.length - 1, rollingWindowSize - 1);
  const start = snapshots.length - (maxSamples + 1);

  for (let i = start + 1; i < snapshots.length; i += 1) {
    const prev = getRate(snapshots[i - 1], currency);
    const curr = getRate(snapshots[i], currency);

    if (prev === null || curr === null || prev === 0) {
      continue;
    }

    returns.push(calculatePercentChange(curr, prev));
  }

  return returns;
};

export const computeMetrics = (
  state: MetricsEngineState,
  options: MetricsEngineOptions,
  interpolationProgress: number
): ComputedMetricsResult => {
  const snapshots = state.snapshots;
  const prevSnapshot = snapshots[snapshots.length - 2] ?? snapshots[snapshots.length - 1];
  const currentSnapshot = snapshots[snapshots.length - 1];

  if (!prevSnapshot || !currentSnapshot) {
    return {
      metrics: [],
      stress: {
        score: 0,
        level: "Low"
      }
    };
  }

  const metricsDraft: ProcessedCurrencyMetric[] = [];

  for (const currency of options.currencies) {
    const prevRate = getRate(prevSnapshot, currency);
    const currentRate = getRate(currentSnapshot, currency);

    if (prevRate === null || currentRate === null) {
      continue;
    }

    const interpolatedRate = lerp(prevRate, currentRate, interpolationProgress);
    const delta = interpolatedRate - prevRate;
    const rawPercent = calculatePercentChange(interpolatedRate, prevRate);
    const percentChange = clamp(rawPercent, -options.anomalyClampPercent, options.anomalyClampPercent);

    const rollingReturns = getRollingReturns(snapshots, currency, options.rollingWindowSize);
    const volatility = calculateVolatility(rollingReturns);

    const prevEma = state.emaByCurrency[currency] ?? 0;
    const emaDelta = calculateEMA(prevEma, delta, options.emaAlpha);
    state.emaByCurrency[currency] = emaDelta;

    metricsDraft.push({
      currency,
      rate: interpolatedRate,
      delta,
      percentChange,
      volatility,
      emaDelta,
      strengthScore: 0,
      rank: 0
    });
  }

  const returnsForZ = metricsDraft.map((metric) => metric.percentChange);
  const meanReturn = calculateMean(returnsForZ);
  const stdReturn = calculateStdDev(returnsForZ);

  for (const metric of metricsDraft) {
    const z = zScore(metric.percentChange, meanReturn, stdReturn);
    metric.strengthScore = normalizeToRange(clamp(z, -3, 3), -3, 3, -100, 100);
  }

  const ranked = [...metricsDraft].sort((a, b) => b.strengthScore - a.strengthScore);
  for (let i = 0; i < ranked.length; i += 1) {
    ranked[i].rank = i + 1;
  }

  const volatilities = ranked.map((metric) => metric.volatility);
  const maxVol = Math.max(0.00001, ...volatilities);
  const normalizedVolMean =
    volatilities.reduce((acc, volatility) => acc + clamp(volatility / maxVol, 0, 1), 0) /
    Math.max(1, volatilities.length);
  const stressScore = normalizedVolMean * 100;

  const stress: GlobalStress = {
    score: stressScore,
    level: stressScore < 35 ? "Low" : stressScore < 70 ? "Moderate" : "High"
  };

  return {
    metrics: ranked,
    stress
  };
};
