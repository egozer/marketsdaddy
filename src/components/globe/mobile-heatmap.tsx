"use client";

import { TRACKED_PROFILES } from "@/lib/config/currencies";
import { clamp } from "@/lib/metrics/math";
import type { ProcessedCurrencyMetric } from "@/types/fx";

interface MobileHeatmapProps {
  metrics: ProcessedCurrencyMetric[];
  selectedCurrency: string | null;
  onSelectCurrency: (currency: string) => void;
}

const toProjection = (lat: number, lon: number): { x: number; y: number } => ({
  x: ((lon + 180) / 360) * 100,
  y: ((90 - lat) / 180) * 100
});

const toColor = (value: number): string => {
  if (Math.abs(value) < 0.03) {
    return "#9CA3AF";
  }

  return value < 0 ? "#22FF88" : "#FF4D4D";
};

export const MobileHeatmap = ({
  metrics,
  selectedCurrency,
  onSelectCurrency
}: MobileHeatmapProps): JSX.Element => {
  const metricMap = new Map(metrics.map((metric) => [metric.currency, metric]));

  const points = TRACKED_PROFILES
    .map((profile) => {
      const metric = metricMap.get(profile.currency);
      if (!metric) {
        return null;
      }

      const position = toProjection(profile.lat, profile.lon);
      return {
        currency: profile.currency,
        country: profile.country,
        ...position,
        radius: 1.5 + clamp(metric.volatility, 0, 3) * 0.8,
        color: toColor(metric.percentChange)
      };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);

  return (
    <div className="mobile-heatmap" aria-label="2D currency heatmap projection">
      <svg viewBox="0 0 100 50" className="heatmap-svg" role="img">
        <rect x="0" y="0" width="100" height="50" fill="rgba(17,24,39,0.75)" />
        <path
          d="M5 15 C20 5 35 5 50 12 C70 20 85 16 95 10 L95 45 L5 45 Z"
          fill="rgba(156,163,175,0.16)"
        />
        {points.map((point) => (
          <circle key={point.currency} cx={point.x} cy={point.y / 2} r={point.radius} fill={point.color} />
        ))}
      </svg>

      <div className="swipe-country-list" aria-label="Swipe country selection">
        {points.map((point) => (
          <button
            type="button"
            key={`chip-${point.currency}`}
            className={selectedCurrency === point.currency ? "active" : ""}
            onClick={() => onSelectCurrency(point.currency)}
          >
            {point.country}
          </button>
        ))}
      </div>
    </div>
  );
};
