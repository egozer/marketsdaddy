"use client";

import { useCallback, useEffect, useRef } from "react";

import { COUNTRY_PROFILES, TRACKED_CURRENCIES } from "@/lib/config/currencies";
import {
  ANOMALY_CLAMP_PERCENT,
  EMA_ALPHA,
  POLL_INTERVAL_MS,
  ROLLING_WINDOW_SIZE,
  WORKER_INTERPOLATION_TICK_MS
} from "@/lib/config/runtime";
import { fetchHistoricalSnapshots } from "@/lib/fx/historical";
import { FxPoller } from "@/lib/fx/poller";
import { computeMetrics, type MetricsEngineOptions, type MetricsEngineState } from "@/lib/metrics/engine";
import { computePurchasingPower } from "@/lib/purchasing-power/calc";
import { useFxStore } from "@/store/useFxStore";
import type { FxSnapshot, ReplayConfig } from "@/types/fx";
import type { WorkerOutboundMessage } from "@/types/worker";

const METRICS_OPTIONS: MetricsEngineOptions = {
  currencies: TRACKED_CURRENCIES,
  rollingWindowSize: ROLLING_WINDOW_SIZE,
  emaAlpha: EMA_ALPHA,
  anomalyClampPercent: ANOMALY_CLAMP_PERCENT
};

const buildRatesFromMetrics = (metrics: ReturnType<typeof useFxStore.getState>["metrics"]): Record<string, number> => {
  const rates: Record<string, number> = {
    usd: 1
  };

  for (const metric of metrics) {
    rates[metric.currency] = metric.rate;
  }

  return rates;
};

const publishMetrics = (
  metrics: ReturnType<typeof useFxStore.getState>["metrics"],
  stress: ReturnType<typeof useFxStore.getState>["stress"],
  unchanged: boolean
): void => {
  useFxStore.getState().setWorkerMetrics(metrics, stress, unchanged);

  const rates = buildRatesFromMetrics(metrics);
  const purchasingPower = computePurchasingPower(COUNTRY_PROFILES, rates);
  useFxStore.getState().setPurchasingPower(purchasingPower);
};

export interface FxEngineController {
  startReplay: (config: ReplayConfig) => Promise<void>;
  stopReplay: () => void;
  seekReplay: (index: number) => void;
  getReplayDates: () => string[];
}

export const useFxEngine = (): FxEngineController => {
  const pollerRef = useRef<FxPoller | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const replayActiveRef = useRef(false);
  const replaySnapshotsRef = useRef<FxSnapshot[]>([]);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mainThreadStateRef = useRef<MetricsEngineState>({
    snapshots: [],
    emaByCurrency: {}
  });

  const clearReplayTimer = useCallback((): void => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  }, []);

  const pushMainThreadSnapshot = useCallback((snapshot: FxSnapshot): void => {
    const state = mainThreadStateRef.current;
    state.snapshots.push(snapshot);
    if (state.snapshots.length > ROLLING_WINDOW_SIZE) {
      state.snapshots.splice(0, state.snapshots.length - ROLLING_WINDOW_SIZE);
    }
  }, []);

  const emitMainThreadMetrics = useCallback((unchanged: boolean): void => {
    const state = mainThreadStateRef.current;
    const { metrics, stress } = computeMetrics(state, METRICS_OPTIONS, 1);
    publishMetrics(metrics, stress, unchanged);
    useFxStore.getState().setStatus(replayActiveRef.current ? "replay" : "live");
  }, []);

  const processSnapshot = useCallback(
    (snapshot: FxSnapshot, unchanged: boolean): void => {
      useFxStore.getState().upsertSnapshot(snapshot);

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "snapshot",
          snapshot,
          unchanged
        });
        return;
      }

      if (!unchanged) {
        pushMainThreadSnapshot(snapshot);
      }

      emitMainThreadMetrics(unchanged);
    },
    [emitMainThreadMetrics, pushMainThreadSnapshot]
  );

  useEffect(() => {
    try {
      const worker = new Worker(new URL("../../workers/metrics.worker.ts", import.meta.url), {
        type: "module"
      });
      workerRef.current = worker;

      worker.postMessage({
        type: "init",
        currencies: TRACKED_CURRENCIES,
        rollingWindowSize: ROLLING_WINDOW_SIZE,
        emaAlpha: EMA_ALPHA,
        anomalyClampPercent: ANOMALY_CLAMP_PERCENT,
        interpolationTickMs: WORKER_INTERPOLATION_TICK_MS,
        interpolationDurationMs: POLL_INTERVAL_MS
      });

      worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>) => {
        const data = event.data;

        if (data.type === "metrics") {
          publishMetrics(data.payload.metrics, data.payload.stress, data.payload.unchanged);
          return;
        }

        if (data.type === "status") {
          useFxStore.getState().setStatus(data.status);

          if (data.status === "live" && replayActiveRef.current) {
            replayActiveRef.current = false;
            useFxStore.getState().setReplayConfig(null);
            useFxStore.getState().setReplayProgress({ currentIndex: 0, total: 0, date: null });
            replaySnapshotsRef.current = [];
            pollerRef.current?.start();
          }
          return;
        }

        if (data.type === "replayProgress") {
          useFxStore.getState().setReplayProgress({
            currentIndex: data.currentIndex,
            total: data.total,
            date: data.date
          });
          return;
        }

        if (data.type === "error") {
          useFxStore.getState().setError(data.message);
        }
      };

      worker.onerror = () => {
        workerRef.current = null;
      };

      worker.onmessageerror = () => {
        workerRef.current = null;
      };
    } catch {
      workerRef.current = null;
    }

    const poller = new FxPoller({
      currencies: TRACKED_CURRENCIES,
      intervalMs: POLL_INTERVAL_MS,
      windowSize: ROLLING_WINDOW_SIZE,
      onSnapshot: (snapshot, unchanged) => {
        useFxStore.getState().setError(null);
        processSnapshot(snapshot, unchanged);
      },
      onError: (error) => {
        useFxStore.getState().setError(error.message);
      }
    });

    pollerRef.current = poller;
    poller.start();

    return () => {
      clearReplayTimer();
      poller.stop();
      workerRef.current?.postMessage({ type: "dispose" });
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [clearReplayTimer, processSnapshot]);

  const startReplay = useCallback(
    async (config: ReplayConfig) => {
      useFxStore.getState().setReplayConfig(config);
      useFxStore.getState().setStatus("replay");
      useFxStore.getState().setError(null);

      pollerRef.current?.stop();
      clearReplayTimer();

      const snapshots = await fetchHistoricalSnapshots(
        TRACKED_CURRENCIES,
        config.startDate,
        config.endDate
      );

      if (snapshots.length < 2) {
        useFxStore.getState().setError("Not enough historical points for replay.");
        useFxStore.getState().setReplayConfig(null);
        useFxStore.getState().setStatus("live");
        pollerRef.current?.start();
        return;
      }

      replaySnapshotsRef.current = snapshots;
      replayActiveRef.current = true;
      useFxStore.getState().setReplayProgress({
        currentIndex: 0,
        total: snapshots.length,
        date: snapshots[0]?.date ?? null
      });

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "startReplay",
          snapshots,
          speed: config.speed
        });
        return;
      }

      let cursor = 0;
      const intervalMs = Math.max(80, Math.round(1000 / Math.max(0.1, config.speed)));

      const runTick = (): void => {
        const snapshot = snapshots[cursor];
        if (!snapshot) {
          clearReplayTimer();
          replayActiveRef.current = false;
          useFxStore.getState().setReplayConfig(null);
          useFxStore.getState().setStatus("live");
          useFxStore.getState().setReplayProgress({ currentIndex: 0, total: 0, date: null });
          pollerRef.current?.start();
          return;
        }

        processSnapshot(snapshot, false);
        useFxStore.getState().setReplayProgress({
          currentIndex: cursor + 1,
          total: snapshots.length,
          date: snapshot.date
        });

        cursor += 1;
      };

      runTick();
      replayTimerRef.current = setInterval(runTick, intervalMs);
    },
    [clearReplayTimer, processSnapshot]
  );

  const stopReplay = useCallback(() => {
    clearReplayTimer();
    replayActiveRef.current = false;
    replaySnapshotsRef.current = [];

    workerRef.current?.postMessage({
      type: "stopReplay"
    });

    useFxStore.getState().setReplayConfig(null);
    useFxStore.getState().setReplayProgress({ currentIndex: 0, total: 0, date: null });
    useFxStore.getState().setStatus("live");
    pollerRef.current?.start();
  }, [clearReplayTimer]);

  const seekReplay = useCallback(
    (index: number) => {
      const snapshot = replaySnapshotsRef.current[index];
      if (!snapshot || replaySnapshotsRef.current.length === 0) {
        return;
      }

      pollerRef.current?.stop();
      replayActiveRef.current = true;
      clearReplayTimer();

      if (workerRef.current) {
        workerRef.current.postMessage({
          type: "seekReplay",
          snapshot,
          index,
          total: replaySnapshotsRef.current.length
        });
      } else {
        processSnapshot(snapshot, false);
        useFxStore.getState().setStatus("replay");
        useFxStore.getState().setReplayProgress({
          currentIndex: index + 1,
          total: replaySnapshotsRef.current.length,
          date: snapshot.date
        });
      }
    },
    [clearReplayTimer, processSnapshot]
  );

  const getReplayDates = useCallback((): string[] => replaySnapshotsRef.current.map((snapshot) => snapshot.date), []);

  return {
    startReplay,
    stopReplay,
    seekReplay,
    getReplayDates
  };
};
