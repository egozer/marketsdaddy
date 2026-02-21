"use client";

import { useEffect, useMemo, useRef, type MouseEvent, type PointerEvent } from "react";
import * as THREE from "three";

import { TRACKED_PROFILES, USD_PROFILE } from "@/lib/config/currencies";
import { PULSE_THRESHOLD_PERCENT } from "@/lib/config/runtime";
import type { ArcRenderDatum } from "@/lib/globe/arc-layer";
import { latLonToVector3 } from "@/lib/globe/geo";
import { GlobeScene, type GlobeMarkerDatum } from "@/lib/globe/globe-scene";
import { clamp } from "@/lib/metrics/math";
import type { ProcessedCurrencyMetric } from "@/types/fx";

const COLORS = {
  strengthening: new THREE.Color("#4dd599"),
  weakening: new THREE.Color("#ff6f91"),
  neutral: new THREE.Color("#8f9db5")
};

interface MoneyWarpGlobeProps {
  metrics: ProcessedCurrencyMetric[];
  stressScore: number;
  reducedMotion?: boolean;
  onHoverCurrency?: (payload: { currency: string; x: number; y: number } | null) => void;
  onSelectCurrency?: (currency: string) => void;
}

export const MoneyWarpGlobe = ({
  metrics,
  stressScore,
  reducedMotion = false,
  onHoverCurrency,
  onSelectCurrency
}: MoneyWarpGlobeProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const globeRef = useRef<GlobeScene | null>(null);

  const endpointMap = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    for (const profile of TRACKED_PROFILES) {
      map.set(profile.currency, latLonToVector3(profile.lat, profile.lon, 1.01));
    }
    return map;
  }, []);

  const origin = useMemo(() => latLonToVector3(USD_PROFILE.lat, USD_PROFILE.lon, 1.01), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const globe = new GlobeScene(canvas);
    globeRef.current = globe;

    let raf = 0;
    const loop = (time: number): void => {
      globe.render(time);
      raf = requestAnimationFrame(loop);
    };

    const onResize = (): void => globe.resize();

    window.addEventListener("resize", onResize);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      globe.dispose();
      globeRef.current = null;
    };
  }, []);

  useEffect(() => {
    globeRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    const globe = globeRef.current;

    if (!globe) {
      return;
    }

    if (metrics.length === 0) {
      globe.setArcs([]);
      return;
    }

    const maxVolatility = Math.max(0.000001, ...metrics.map((metric) => metric.volatility));

    const arcs: ArcRenderDatum[] = metrics
      .map((metric) => {
        const endpoint = endpointMap.get(metric.currency);
        if (!endpoint) {
          return null;
        }

        const volatilityFactor = clamp(metric.volatility / maxVolatility, 0, 1);
        const strengthMagnitude = Math.abs(metric.percentChange);

        const color =
          strengthMagnitude < 0.03
            ? COLORS.neutral
            : metric.percentChange < 0
              ? COLORS.strengthening
              : COLORS.weakening;

        const pulse =
          strengthMagnitude > PULSE_THRESHOLD_PERCENT
            ? clamp(strengthMagnitude / PULSE_THRESHOLD_PERCENT - 1, 0, 3)
            : 0;

        return {
          start: origin,
          end: endpoint,
          color,
          thickness: 0.003 + volatilityFactor * 0.016,
          pulse,
          opacity: 0.48 + volatilityFactor * 0.45,
          elevation: 0.09 + volatilityFactor * 0.45
        } satisfies ArcRenderDatum;
      })
      .filter((entry): entry is ArcRenderDatum => entry !== null);

    globe.setArcs(arcs);

    const markers: GlobeMarkerDatum[] = metrics
      .map((metric) => {
        const endpoint = endpointMap.get(metric.currency);
        if (!endpoint) {
          return null;
        }

        const magnitude = clamp(Math.abs(metric.percentChange), 0, 3);
        const color =
          magnitude < 0.03
            ? COLORS.neutral
            : metric.percentChange < 0
              ? COLORS.strengthening
              : COLORS.weakening;

        return {
          currency: metric.currency,
          position: endpoint,
          color,
          size: 0.9 + magnitude * 0.15
        } satisfies GlobeMarkerDatum;
      })
      .filter((entry): entry is GlobeMarkerDatum => entry !== null);

    globe.setMarkers(markers);
  }, [endpointMap, metrics, origin]);

  useEffect(() => {
    globeRef.current?.setStress(stressScore);
  }, [stressScore]);

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>): void => {
    if (!onHoverCurrency || !globeRef.current) {
      return;
    }

    const currency = globeRef.current.pickCurrency(event.clientX, event.clientY);
    if (!currency) {
      onHoverCurrency(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    onHoverCurrency({
      currency,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    });
  };

  const handlePointerLeave = (): void => {
    onHoverCurrency?.(null);
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>): void => {
    if (!onSelectCurrency || !globeRef.current) {
      return;
    }

    const currency = globeRef.current.pickCurrency(event.clientX, event.clientY);
    if (currency) {
      onSelectCurrency(currency);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="globe-canvas"
      aria-label="Live currency movement globe"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    />
  );
};
