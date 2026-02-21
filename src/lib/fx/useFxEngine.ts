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
import { computePurchasingPower } from "@/lib/purchasing-power/calc";
import { useFxStore } from "@/store/useFxStore";
import type { FxSnapshot, ReplayConfig } from "@/types/fx";
import type { WorkerOutboundMessage } from "@/types/worker";

const buildRatesFromMetrics = (metrics: ReturnType<typeof useFxStore.getState>["metrics"]): Record<string, number> => {
  const rates: Record<string, number> = {
    usd: 1
  };

  for (const metric of metrics) {
    rates[metric.currency] = metric.rate;
  }

  return rates;
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

  useEffect(() => {
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
        useFxStore.getState().setWorkerMetrics(data.payload.metrics, data.payload.stress, data.payload.unchanged);

        const rates = buildRatesFromMetrics(data.payload.metrics);
        const purchasingPower = computePurchasingPower(COUNTRY_PROFILES, rates);
        useFxStore.getState().setPurchasingPower(purchasingPower);
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

    const forwardSnapshotToWorker = (snapshot: FxSnapshot, unchanged: boolean): void => {
      useFxStore.getState().upsertSnapshot(snapshot);
      worker.postMessage({
        type: "snapshot",
        snapshot,
        unchanged
      });
    };

    const poller = new FxPoller({
      currencies: TRACKED_CURRENCIES,
      intervalMs: POLL_INTERVAL_MS,
      windowSize: ROLLING_WINDOW_SIZE,
      onSnapshot: (snapshot, unchanged) => {
        useFxStore.getState().setError(null);
        forwardSnapshotToWorker(snapshot, unchanged);
      },
      onError: (error) => {
        useFxStore.getState().setError(error.message);
      }
    });

    pollerRef.current = poller;
    poller.start();

    return () => {
      poller.stop();
      worker.postMessage({ type: "dispose" });
      worker.terminate();
    };
  }, []);

  const startReplay = useCallback(async (config: ReplayConfig) => {
    if (!workerRef.current) {
      return;
    }

    useFxStore.getState().setReplayConfig(config);
    useFxStore.getState().setStatus("replay");
    useFxStore.getState().setError(null);

    pollerRef.current?.stop();

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
    workerRef.current.postMessage({
      type: "startReplay",
      snapshots,
      speed: config.speed
    });
  }, []);

  const stopReplay = useCallback(() => {
    replayActiveRef.current = false;
    replaySnapshotsRef.current = [];
    workerRef.current?.postMessage({
      type: "stopReplay"
    });

    useFxStore.getState().setReplayConfig(null);
    useFxStore.getState().setReplayProgress({ currentIndex: 0, total: 0, date: null });
    pollerRef.current?.start();
  }, []);

  const seekReplay = useCallback((index: number) => {
    const snapshot = replaySnapshotsRef.current[index];
    if (!workerRef.current || !snapshot || replaySnapshotsRef.current.length === 0) {
      return;
    }

    pollerRef.current?.stop();
    replayActiveRef.current = true;
    workerRef.current.postMessage({
      type: "seekReplay",
      snapshot,
      index,
      total: replaySnapshotsRef.current.length
    });
  }, []);

  const getReplayDates = useCallback((): string[] => replaySnapshotsRef.current.map((snapshot) => snapshot.date), []);

  return {
    startReplay,
    stopReplay,
    seekReplay,
    getReplayDates
  };
};
