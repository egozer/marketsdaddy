/// <reference lib="webworker" />

import { computeMetrics, type MetricsEngineOptions, type MetricsEngineState } from "@/lib/metrics/engine";
import { clamp } from "@/lib/metrics/math";
import type { FxSnapshot } from "@/types/fx";
import type {
  WorkerInboundMessage,
  WorkerMetricsMessage,
  WorkerOutboundMessage,
  WorkerStatusMessage
} from "@/types/worker";

let options: MetricsEngineOptions = {
  currencies: [],
  rollingWindowSize: 120,
  emaAlpha: 0.25,
  anomalyClampPercent: 5
};

const state: MetricsEngineState = {
  snapshots: [],
  emaByCurrency: {}
};

let interpolationTickMs = 100;
let interpolationDurationMs = 5000;
let liveInterpolationDurationMs = 5000;
let interpolationTimer: ReturnType<typeof setInterval> | null = null;
let replayTimer: ReturnType<typeof setInterval> | null = null;
let replayQueue: FxSnapshot[] = [];
let replayTotal = 0;
let replayIndex = 0;
let transitionStart = 0;

const post = (message: WorkerOutboundMessage): void => {
  self.postMessage(message);
};

const postStatus = (status: WorkerStatusMessage["status"]): void => {
  post({
    type: "status",
    status
  });
};

const postReplayProgress = (date: string | null): void => {
  post({
    type: "replayProgress",
    currentIndex: replayIndex,
    total: replayTotal,
    date
  });
};

const pushSnapshot = (snapshot: FxSnapshot): void => {
  state.snapshots.push(snapshot);
  if (state.snapshots.length > options.rollingWindowSize) {
    state.snapshots.splice(0, state.snapshots.length - options.rollingWindowSize);
  }
  transitionStart = Date.now();
};

const emitMetrics = (unchanged: boolean): void => {
  if (state.snapshots.length === 0) {
    return;
  }

  const progress = clamp((Date.now() - transitionStart) / interpolationDurationMs, 0, 1);
  const { metrics, stress } = computeMetrics(state, options, progress);

  const message: WorkerMetricsMessage = {
    type: "metrics",
    payload: {
      timestamp: Date.now(),
      metrics,
      stress,
      unchanged
    }
  };

  post(message);
};

const ensureInterpolationLoop = (): void => {
  if (interpolationTimer) {
    return;
  }

  interpolationTimer = setInterval(() => {
    emitMetrics(false);
  }, interpolationTickMs);
};

const stopReplay = (): void => {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
  replayQueue = [];
  replayTotal = 0;
  replayIndex = 0;
  interpolationDurationMs = liveInterpolationDurationMs;
};

const startReplay = (snapshots: FxSnapshot[], speed: number): void => {
  stopReplay();
  replayQueue = [...snapshots];
  replayTotal = snapshots.length;
  replayIndex = 0;

  if (replayQueue.length === 0) {
    postReplayProgress(null);
    return;
  }

  const replayIntervalMs = Math.max(80, Math.round(1000 / Math.max(0.1, speed)));
  interpolationDurationMs = replayIntervalMs;

  postStatus("replay");

  replayTimer = setInterval(() => {
    const nextSnapshot = replayQueue.shift();

    if (!nextSnapshot) {
      postReplayProgress(null);
      stopReplay();
      postStatus("live");
      return;
    }

    pushSnapshot(nextSnapshot);
    replayIndex += 1;
    emitMetrics(false);
    postReplayProgress(nextSnapshot.date);
  }, replayIntervalMs);
};

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  const message = event.data;

  switch (message.type) {
    case "init": {
      options = {
        currencies: message.currencies,
        rollingWindowSize: message.rollingWindowSize,
        emaAlpha: message.emaAlpha,
        anomalyClampPercent: message.anomalyClampPercent
      };
      interpolationTickMs = message.interpolationTickMs;
      interpolationDurationMs = message.interpolationDurationMs;
      liveInterpolationDurationMs = message.interpolationDurationMs;
      ensureInterpolationLoop();
      postStatus("idle");
      break;
    }
    case "snapshot": {
      if (message.unchanged) {
        emitMetrics(true);
        break;
      }

      pushSnapshot(message.snapshot);
      emitMetrics(false);
      postStatus("live");
      break;
    }
    case "startReplay": {
      startReplay(message.snapshots, message.speed);
      break;
    }
    case "seekReplay": {
      stopReplay();
      replayTotal = message.total;
      replayIndex = message.index + 1;
      pushSnapshot(message.snapshot);
      emitMetrics(false);
      postStatus("replay");
      postReplayProgress(message.snapshot.date);
      break;
    }
    case "stopReplay": {
      stopReplay();
      postStatus("live");
      postReplayProgress(null);
      break;
    }
    case "dispose": {
      if (interpolationTimer) {
        clearInterval(interpolationTimer);
        interpolationTimer = null;
      }
      stopReplay();
      state.snapshots = [];
      state.emaByCurrency = {};
      postStatus("idle");
      break;
    }
    default: {
      post({
        type: "error",
        message: "Unknown worker message."
      });
    }
  }
};

export {};
