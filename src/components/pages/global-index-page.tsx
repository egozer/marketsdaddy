"use client";

import { useMemo, useState } from "react";

import { StressGauge } from "@/components/common/stress-gauge";
import { TRACKED_PROFILES } from "@/lib/config/currencies";
import { clamp } from "@/lib/metrics/math";
import { useFxStore } from "@/store/useFxStore";

type WindowFilter = "5m" | "30m" | "24h";
type RegionFilter = "All" | "Americas" | "Europe" | "Asia Pacific" | "Middle East & Africa";

const regionByCurrency = new Map(TRACKED_PROFILES.map((profile) => [profile.currency, profile.region]));

export const GlobalIndexPage = (): JSX.Element => {
  const metrics = useFxStore((state) => state.metrics);
  const stress = useFxStore((state) => state.stress);

  const [windowFilter, setWindowFilter] = useState<WindowFilter>("5m");
  const [regionFilter, setRegionFilter] = useState<RegionFilter>("All");

  const windowFactor = windowFilter === "5m" ? 1 : windowFilter === "30m" ? 0.82 : 0.64;

  const ranked = useMemo(() => {
    return metrics
      .filter((metric) => {
        if (regionFilter === "All") {
          return true;
        }

        return regionByCurrency.get(metric.currency) === regionFilter;
      })
      .map((metric) => {
        const composite = clamp(metric.strengthScore * windowFactor + metric.volatility * 22, -100, 100);
        return {
          ...metric,
          composite
        };
      })
      .sort((a, b) => b.composite - a.composite);
  }, [metrics, regionFilter, windowFactor]);

  return (
    <main className="fluxa-page subpage">
      <section className="subpage-header">
        <p className="micro">Global Strength Index</p>
        <h1>Cross-currency pressure map</h1>
        <p>Monitor relative strength concentration with region and window controls.</p>
      </section>

      <section className="index-layout">
        <StressGauge score={stress.score} level={stress.level} />

        <article className="index-card">
          <div className="filter-row">
            <label>
              Time Window
              <select value={windowFilter} onChange={(event) => setWindowFilter(event.target.value as WindowFilter)}>
                <option value="5m">5m</option>
                <option value="30m">30m</option>
                <option value="24h">24h proxy</option>
              </select>
            </label>

            <label>
              Region
              <select value={regionFilter} onChange={(event) => setRegionFilter(event.target.value as RegionFilter)}>
                <option value="All">All</option>
                <option value="Americas">Americas</option>
                <option value="Europe">Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="Middle East & Africa">Middle East & Africa</option>
              </select>
            </label>
          </div>

          <ul className="ranking-bars" aria-label="Animated ranking bars">
            {ranked.map((metric) => (
              <li key={`bar-${metric.currency}`}>
                <span className="mono">{metric.currency.toUpperCase()}</span>
                <div className="bar-track">
                  <div
                    className={`bar-fill ${metric.composite >= 0 ? "positive" : "negative"}`}
                    style={{ width: `${Math.abs(metric.composite)}%` }}
                  />
                </div>
                <strong className="mono">{metric.composite.toFixed(1)}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
};
