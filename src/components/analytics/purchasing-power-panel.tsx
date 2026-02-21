"use client";

import Image from "next/image";
import { useMemo } from "react";

import type { ProcessedCurrencyMetric, PurchasingPowerObject } from "@/types/fx";

interface PurchasingPowerPanelProps {
  rows: PurchasingPowerObject[];
  metrics: ProcessedCurrencyMetric[];
}

const formatConverted = (value: number, currency: string): string =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 0 : value >= 10 ? 2 : 4
  }).format(value)} ${currency.toUpperCase()}`;

const insightFor = (relativeVsMedianPercent: number): string => {
  if (relativeVsMedianPercent > 35) {
    return "USD purchasing power is materially above median here.";
  }

  if (relativeVsMedianPercent < -25) {
    return "USD purchasing power sits below median in this market.";
  }

  return "USD purchasing power is near the global midpoint.";
};

export const PurchasingPowerPanel = ({ rows, metrics }: PurchasingPowerPanelProps): JSX.Element => {
  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.currency, metric])), [metrics]);

  const sorted = useMemo(() => {
    const cloned = [...rows];

    cloned.sort((a, b) => {
      const strengthA = metricMap.get(a.currency)?.strengthScore ?? 0;
      const strengthB = metricMap.get(b.currency)?.strengthScore ?? 0;
      return strengthB - strengthA;
    });

    return cloned.map((row, index) => ({ ...row, rank: index + 1 }));
  }, [metricMap, rows]);

  return (
    <section className="ppp-panel" id="ppp-experiment" aria-label="Purchasing power rankings">
      <div className="ppp-card-row" role="list" aria-label="Purchasing power country cards">
        {sorted.slice(0, 8).map((row) => (
          <article className="ppp-card" role="listitem" key={`ppp-card-${row.currency}`}>
            <header>
              <Image
                src={`https://flagcdn.com/w80/${row.flagCode}.png`}
                alt={`${row.country} flag`}
                width={24}
                height={16}
              />
              <strong>{row.country}</strong>
            </header>
            <p className="mono">{formatConverted(row.convertedValue, row.currency)}</p>
            <p>Real Value Index {row.realValueIndex.toFixed(4)}</p>
            <small>{insightFor(row.relativeVsMedianPercent)}</small>
          </article>
        ))}
      </div>

      <div className="ppp-table-wrap">
        <table className="ppp-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Country</th>
              <th>Converted</th>
              <th>RealValueIndex</th>
              <th>Strength</th>
              <th>vs Median</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const strength = metricMap.get(row.currency)?.strengthScore ?? 0;

              return (
                <tr key={`ppp-row-${row.currency}`}>
                  <td>{row.rank}</td>
                  <td className="country-cell">
                    <Image
                      src={`https://flagcdn.com/w40/${row.flagCode}.png`}
                      alt={`${row.country} flag`}
                      width={20}
                      height={14}
                    />
                    <span>{row.country}</span>
                  </td>
                  <td className="mono">{formatConverted(row.convertedValue, row.currency)}</td>
                  <td className="mono">{row.realValueIndex.toFixed(4)}</td>
                  <td className={`mono ${strength >= 0 ? "positive" : "negative"}`}>{strength.toFixed(1)}</td>
                  <td className={`mono ${row.relativeVsMedianPercent >= 0 ? "positive" : "negative"}`}>
                    {row.relativeVsMedianPercent >= 0 ? "+" : ""}
                    {row.relativeVsMedianPercent.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
