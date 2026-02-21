import { describe, expect, it } from "vitest";

import { calculateEMA, calculateVolatility, zScore } from "@/lib/metrics/math";

describe("metrics math", () => {
  it("calculates volatility as standard deviation of returns", () => {
    const returns = [0.5, -0.25, 1.0, -0.75, 0.25];
    const volatility = calculateVolatility(returns);

    expect(volatility).toBeCloseTo(0.6074, 4);
  });

  it("calculates EMA with alpha weighting", () => {
    const previousEma = 0.2;
    const currentValue = 1.0;
    const alpha = 0.3;

    const ema = calculateEMA(previousEma, currentValue, alpha);
    expect(ema).toBeCloseTo(0.44, 8);
  });

  it("calculates z-score from mean and std dev", () => {
    const score = zScore(1.8, 1.2, 0.3);
    expect(score).toBeCloseTo(2, 8);
  });
});
