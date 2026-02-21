import type { FxSnapshot, WorkerMetricsPayload } from "@/types/fx";

export interface WorkerInitMessage {
  type: "init";
  currencies: string[];
  rollingWindowSize: number;
  emaAlpha: number;
  anomalyClampPercent: number;
  interpolationTickMs: number;
  interpolationDurationMs: number;
}

export interface WorkerSnapshotMessage {
  type: "snapshot";
  snapshot: FxSnapshot;
  unchanged: boolean;
}

export interface WorkerReplayStartMessage {
  type: "startReplay";
  snapshots: FxSnapshot[];
  speed: number;
}

export interface WorkerReplayStopMessage {
  type: "stopReplay";
}

export interface WorkerSeekReplayMessage {
  type: "seekReplay";
  snapshot: FxSnapshot;
  index: number;
  total: number;
}

export interface WorkerDisposeMessage {
  type: "dispose";
}

export type WorkerInboundMessage =
  | WorkerInitMessage
  | WorkerSnapshotMessage
  | WorkerReplayStartMessage
  | WorkerReplayStopMessage
  | WorkerSeekReplayMessage
  | WorkerDisposeMessage;

export interface WorkerMetricsMessage {
  type: "metrics";
  payload: WorkerMetricsPayload;
}

export interface WorkerStatusMessage {
  type: "status";
  status: "live" | "replay" | "idle";
}

export interface WorkerErrorMessage {
  type: "error";
  message: string;
}

export interface WorkerReplayProgressMessage {
  type: "replayProgress";
  currentIndex: number;
  total: number;
  date: string | null;
}

export type WorkerOutboundMessage =
  | WorkerMetricsMessage
  | WorkerStatusMessage
  | WorkerErrorMessage
  | WorkerReplayProgressMessage;
