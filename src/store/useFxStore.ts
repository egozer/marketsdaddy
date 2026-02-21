import { create } from "zustand";

import { ROLLING_WINDOW_SIZE } from "@/lib/config/runtime";
import type {
  FxSnapshot,
  GlobalStress,
  ProcessedCurrencyMetric,
  PurchasingPowerObject,
  ReplayConfig,
  ReplayProgress
} from "@/types/fx";

interface FxStoreState {
  snapshots: FxSnapshot[];
  metrics: ProcessedCurrencyMetric[];
  stress: GlobalStress;
  status: "idle" | "live" | "replay" | "error";
  error: string | null;
  lastUpdated: number | null;
  unchangedCount: number;
  replayConfig: ReplayConfig | null;
  replayProgress: ReplayProgress;
  purchasingPower: PurchasingPowerObject[];
  upsertSnapshot: (snapshot: FxSnapshot) => void;
  setWorkerMetrics: (metrics: ProcessedCurrencyMetric[], stress: GlobalStress, unchanged: boolean) => void;
  setStatus: (status: FxStoreState["status"]) => void;
  setError: (error: string | null) => void;
  setReplayConfig: (config: ReplayConfig | null) => void;
  setReplayProgress: (progress: ReplayProgress) => void;
  setPurchasingPower: (rows: PurchasingPowerObject[]) => void;
}

export const useFxStore = create<FxStoreState>((set) => ({
  snapshots: [],
  metrics: [],
  stress: {
    score: 0,
    level: "Low"
  },
  status: "idle",
  error: null,
  lastUpdated: null,
  unchangedCount: 0,
  replayConfig: null,
  replayProgress: {
    currentIndex: 0,
    total: 0,
    date: null
  },
  purchasingPower: [],
  upsertSnapshot: (snapshot) =>
    set((state) => {
      const nextSnapshots = [...state.snapshots, snapshot];
      if (nextSnapshots.length > ROLLING_WINDOW_SIZE) {
        nextSnapshots.splice(0, nextSnapshots.length - ROLLING_WINDOW_SIZE);
      }

      return {
        snapshots: nextSnapshots
      };
    }),
  setWorkerMetrics: (metrics, stress, unchanged) =>
    set((state) => ({
      metrics,
      stress,
      lastUpdated: Date.now(),
      unchangedCount: unchanged ? state.unchangedCount + 1 : 0
    })),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? "error" : "live" }),
  setReplayConfig: (replayConfig) =>
    set({
      replayConfig,
      replayProgress: { currentIndex: 0, total: 0, date: null }
    }),
  setReplayProgress: (replayProgress) => set({ replayProgress }),
  setPurchasingPower: (purchasingPower) => set({ purchasingPower })
}));
