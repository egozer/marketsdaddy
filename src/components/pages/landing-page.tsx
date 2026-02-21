"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { PurchasingPowerPanel } from "@/components/analytics/purchasing-power-panel";
import { AnimatedNumber } from "@/components/common/animated-number";
import { LoadingGlobe } from "@/components/common/loading-globe";
import { Sparkline } from "@/components/common/sparkline";
import { StrengthGauge } from "@/components/common/strength-gauge";
import { MobileHeatmap } from "@/components/globe/mobile-heatmap";
import { MoneyWarpGlobe } from "@/components/globe/money-warp-globe";
import { TRACKED_PROFILES } from "@/lib/config/currencies";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { useReducedMotion } from "@/lib/ui/use-reduced-motion";
import { useFxStore } from "@/store/useFxStore";

const formatRate = (value: number): string => value.toFixed(value > 10 ? 2 : value > 1 ? 4 : 6);
const formatPercent = (value: number): string => `${value >= 0 ? "+" : ""}${value.toFixed(3)}%`;

export const LandingPage = (): JSX.Element => {
  const metrics = useFxStore((state) => state.metrics);
  const stress = useFxStore((state) => state.stress);
  const snapshots = useFxStore((state) => state.snapshots);
  const purchasingPower = useFxStore((state) => state.purchasingPower);
  const status = useFxStore((state) => state.status);

  const reducedMotion = useReducedMotion();
  const isMobile = useMediaQuery("(max-width: 820px)");

  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ currency: string; x: number; y: number } | null>(null);
  const [heroFade, setHeroFade] = useState(0);

  const heroRef = useRef<HTMLElement | null>(null);

  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.currency, metric])), [metrics]);

  useEffect(() => {
    if (!selectedCurrency && metrics[0]) {
      setSelectedCurrency(metrics[0].currency);
    }
  }, [metrics, selectedCurrency]);

  useEffect(() => {
    const onScroll = (): void => {
      const node = heroRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height * 0.9)));
      setHeroFade(progress);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tickerMetrics = metrics.slice(0, 14);

  const selectedMetric = selectedCurrency ? metricMap.get(selectedCurrency) ?? null : null;
  const selectedProfile = selectedCurrency
    ? TRACKED_PROFILES.find((profile) => profile.currency === selectedCurrency) ?? null
    : null;

  const sparklineValues = useMemo(() => {
    if (!selectedCurrency) {
      return [];
    }

    return snapshots
      .map((snapshot) => snapshot.rates[selectedCurrency])
      .filter((value): value is number => typeof value === "number")
      .slice(-60);
  }, [selectedCurrency, snapshots]);

  const move24hProxy =
    sparklineValues.length > 1 && sparklineValues[0] !== 0
      ? ((sparklineValues[sparklineValues.length - 1] - sparklineValues[0]) / sparklineValues[0]) * 100
      : 0;

  const hoveredMetric = hovered ? metricMap.get(hovered.currency) ?? null : null;

  return (
    <main className="fluxa-page">
      <section ref={heroRef} className="hero-section" style={{ "--hero-fade": heroFade } as CSSProperties}>
        <div className="hero-bg-shell">
          {!isMobile ? (
            <MoneyWarpGlobe
              metrics={metrics}
              stressScore={stress.score}
              reducedMotion={reducedMotion}
              onHoverCurrency={setHovered}
              onSelectCurrency={setSelectedCurrency}
            />
          ) : (
            <MobileHeatmap
              metrics={metrics}
              selectedCurrency={selectedCurrency}
              onSelectCurrency={setSelectedCurrency}
            />
          )}

          {hovered && hoveredMetric ? (
            <aside className="arc-tooltip" style={{ left: hovered.x + 14, top: hovered.y + 14 }}>
              <strong>{hovered.currency.toUpperCase()}</strong>
              <span>Rate {formatRate(hoveredMetric.rate)}</span>
              <span>{formatPercent(hoveredMetric.percentChange)}</span>
              <span>Vol {hoveredMetric.volatility.toFixed(4)}</span>
              <span>Strength {hoveredMetric.strengthScore.toFixed(1)}</span>
            </aside>
          ) : null}
        </div>

        <div className="hero-content">
          <p className="hero-kicker">Currency in motion.</p>
          <h1>1 USD is moving</h1>
          <p>Money is not static. It moves.</p>

          <div className="hero-actions">
            <Link href="/replay" className="btn-primary">Open Replay</Link>
            <Link href="/method" className="btn-ghost">Methodology</Link>
          </div>

          <div className="ticker-row" role="list" aria-label="Live multi-currency ticker">
            {tickerMetrics.map((metric) => (
              <button
                key={`ticker-${metric.currency}`}
                type="button"
                role="listitem"
                className={`ticker-item ${selectedCurrency === metric.currency ? "active" : ""}`}
                onClick={() => setSelectedCurrency(metric.currency)}
              >
                <strong>{metric.currency.toUpperCase()}</strong>
                <AnimatedNumber value={metric.rate} formatter={formatRate} className="mono" />
                <AnimatedNumber value={metric.percentChange} formatter={formatPercent} className="mono" />
              </button>
            ))}
          </div>
        </div>

        <aside className="hero-stress-card">
          <span>Global Stress Index</span>
          <strong>{stress.level}</strong>
          <p>{stress.score.toFixed(1)}</p>
        </aside>

        {metrics.length === 0 || status === "idle" ? <LoadingGlobe /> : null}

        <aside className={`detail-panel ${selectedMetric ? "open" : ""}`}>
          {selectedMetric && selectedProfile ? (
            <>
              <header>
                <Image
                  src={`https://flagcdn.com/w80/${selectedProfile.flagCode}.png`}
                  alt={`${selectedProfile.country} flag`}
                  width={28}
                  height={20}
                />
                <div>
                  <h3>{selectedProfile.country}</h3>
                  <p>{selectedMetric.currency.toUpperCase()}</p>
                </div>
              </header>
              <dl>
                <div>
                  <dt>Rate</dt>
                  <dd className="mono">{formatRate(selectedMetric.rate)}</dd>
                </div>
                <div>
                  <dt>24h movement</dt>
                  <dd className={`mono ${move24hProxy >= 0 ? "positive" : "negative"}`}>
                    {formatPercent(move24hProxy)}
                  </dd>
                </div>
                <div>
                  <dt>Volatility</dt>
                  <dd className="mono">{selectedMetric.volatility.toFixed(5)}</dd>
                </div>
              </dl>

              <StrengthGauge value={selectedMetric.strengthScore} label="Strength score" />

              <div className="mini-chart mono">
                <Sparkline values={sparklineValues} width={280} height={74} />
              </div>
            </>
          ) : null}
        </aside>
      </section>

      <section className="ppp-section" id="ppp-section">
        <header className="section-head">
          <h2>What can $1 buy right now?</h2>
          <p>Purchasing power normalization across tracked countries.</p>
        </header>

        <PurchasingPowerPanel rows={purchasingPower} metrics={metrics} />
      </section>
    </main>
  );
};
