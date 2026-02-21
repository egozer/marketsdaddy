import { POLL_INTERVAL_MS, ROLLING_WINDOW_SIZE } from "@/lib/config/runtime";
import { readSnapshotCache, writeSnapshotCache } from "@/lib/fx/cache";
import { fetchLatestUsdRates } from "@/lib/fx/exchange-api";
import type { FxSnapshot } from "@/types/fx";

interface FxPollerOptions {
  currencies: string[];
  intervalMs?: number;
  windowSize?: number;
  onSnapshot: (snapshot: FxSnapshot, unchanged: boolean) => void;
  onError: (error: Error) => void;
}

const hashSnapshot = (snapshot: FxSnapshot, currencies: string[]): string =>
  currencies.map((currency) => `${currency}:${snapshot.rates[currency] ?? "na"}`).join("|");

const hydrateRates = (
  currencies: string[],
  latestRates: Record<string, number>,
  previousSnapshot?: FxSnapshot
): Record<string, number> => {
  const result: Record<string, number> = {};

  for (const currency of currencies) {
    const latestValue = latestRates[currency];
    if (typeof latestValue === "number") {
      result[currency] = latestValue;
      continue;
    }

    const fallback = previousSnapshot?.rates[currency];
    if (typeof fallback === "number") {
      result[currency] = fallback;
    }
  }

  return result;
};

export class FxPoller {
  private readonly currencies: string[];

  private readonly onSnapshot: FxPollerOptions["onSnapshot"];

  private readonly onError: FxPollerOptions["onError"];

  private readonly intervalMs: number;

  private readonly windowSize: number;

  private timer: ReturnType<typeof setTimeout> | null = null;

  private abortController: AbortController | null = null;

  private previousSnapshot: FxSnapshot | undefined;

  private previousHash = "";

  private snapshots: FxSnapshot[] = [];

  private running = false;

  constructor(options: FxPollerOptions) {
    this.currencies = options.currencies;
    this.intervalMs = options.intervalMs ?? POLL_INTERVAL_MS;
    this.windowSize = options.windowSize ?? ROLLING_WINDOW_SIZE;
    this.onSnapshot = options.onSnapshot;
    this.onError = options.onError;
  }

  start = (): void => {
    if (this.running) {
      return;
    }
    this.running = true;
    this.tick();
  };

  stop = (): void => {
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.abortController?.abort();
    this.abortController = null;
  };

  getSnapshots = (): FxSnapshot[] => this.snapshots;

  private scheduleNext = (): void => {
    if (!this.running) {
      return;
    }

    this.timer = setTimeout(this.tick, this.intervalMs);
  };

  private pushSnapshot = (snapshot: FxSnapshot, unchanged: boolean): void => {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.windowSize) {
      this.snapshots.splice(0, this.snapshots.length - this.windowSize);
    }

    this.previousSnapshot = snapshot;
    this.previousHash = hashSnapshot(snapshot, this.currencies);

    if (!unchanged) {
      writeSnapshotCache(snapshot);
    }

    this.onSnapshot(snapshot, unchanged);
  };

  private tick = async (): Promise<void> => {
    if (!this.running) {
      return;
    }

    this.abortController = new AbortController();

    try {
      const data = await fetchLatestUsdRates(this.abortController.signal);
      const rates = hydrateRates(this.currencies, data.usd, this.previousSnapshot);

      const snapshot: FxSnapshot = {
        date: data.date,
        fetchedAt: Date.now(),
        rates,
        source: "live"
      };

      const currentHash = hashSnapshot(snapshot, this.currencies);
      const unchanged = currentHash === this.previousHash;

      if (!unchanged || this.snapshots.length === 0) {
        this.pushSnapshot(snapshot, false);
      } else {
        this.onSnapshot(snapshot, true);
      }
    } catch (error) {
      const cached = readSnapshotCache();

      if (cached) {
        const snapshot: FxSnapshot = {
          ...cached,
          fetchedAt: Date.now(),
          source: "cache"
        };

        this.pushSnapshot(snapshot, true);
      }

      if (error instanceof Error) {
        this.onError(error);
      } else {
        this.onError(new Error("Unknown polling error."));
      }
    } finally {
      this.abortController = null;
      this.scheduleNext();
    }
  };
}
