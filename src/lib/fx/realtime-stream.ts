import type { FxSnapshot } from "@/types/fx";

interface FxRealtimeStreamOptions {
  currencies: string[];
  endpoint: string;
  emitIntervalMs?: number;
  reconnectDelayMs?: number;
  onSnapshot: (snapshot: FxSnapshot, unchanged: boolean) => void;
  onError: (error: Error) => void;
}

const isoDateNow = (): string => new Date().toISOString().slice(0, 10);

const tryParseMessage = (payload: unknown): Record<string, unknown> | null => {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }

  if (typeof payload === "object" && payload !== null) {
    return payload as Record<string, unknown>;
  }

  return null;
};

const getNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))
      ? Number(value)
      : null;

const getSymbolAndPrice = (
  message: Record<string, unknown>
): { symbol: string; price: number } | null => {
  const symbolCandidates = [message.symbol, message.stock, message.ticker, message.s];
  const priceCandidates = [message.price, message.last, message.lastPrice, message.close, message.p];

  const symbol = symbolCandidates.find((value): value is string => typeof value === "string");
  const price = priceCandidates.map(getNumber).find((value): value is number => value !== null);

  if (!symbol || price === undefined) {
    return null;
  }

  return {
    symbol: symbol.toUpperCase(),
    price
  };
};

const symbolToRate = (symbol: string, price: number): { currency: string; rate: number } | null => {
  if (symbol.length !== 6 || price <= 0) {
    return null;
  }

  const base = symbol.slice(0, 3).toLowerCase();
  const quote = symbol.slice(3).toLowerCase();

  if (base === "usd") {
    return {
      currency: quote,
      rate: price
    };
  }

  if (quote === "usd") {
    return {
      currency: base,
      rate: 1 / price
    };
  }

  return null;
};

const hashRates = (currencies: string[], rates: Record<string, number>): string =>
  currencies.map((currency) => `${currency}:${rates[currency] ?? "na"}`).join("|");

export class FxRealtimeStream {
  private readonly currencies: string[];

  private readonly endpoint: string;

  private readonly emitIntervalMs: number;

  private readonly reconnectDelayMs: number;

  private readonly onSnapshot: FxRealtimeStreamOptions["onSnapshot"];

  private readonly onError: FxRealtimeStreamOptions["onError"];

  private ws: WebSocket | null = null;

  private emitTimer: ReturnType<typeof setInterval> | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private started = false;

  private dirty = false;

  private previousHash = "";

  private latestRates: Record<string, number> = {};

  constructor(options: FxRealtimeStreamOptions) {
    this.currencies = options.currencies;
    this.endpoint = options.endpoint;
    this.emitIntervalMs = options.emitIntervalMs ?? 1000;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 2500;
    this.onSnapshot = options.onSnapshot;
    this.onError = options.onError;
  }

  start = (): void => {
    if (this.started) {
      return;
    }

    this.started = true;
    this.connect();
    this.emitTimer = setInterval(this.emitSnapshot, this.emitIntervalMs);
  };

  stop = (): void => {
    this.started = false;

    if (this.emitTimer) {
      clearInterval(this.emitTimer);
      this.emitTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  };

  private connect = (): void => {
    if (!this.started) {
      return;
    }

    if (typeof window === "undefined" || typeof WebSocket === "undefined") {
      this.onError(new Error("WebSocket is not supported in this runtime."));
      return;
    }

    try {
      const ws = new WebSocket(this.endpoint);
      this.ws = ws;

      ws.onopen = () => {
        this.subscribePairs();
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      ws.onerror = () => {
        this.onError(new Error("Real-time stream error."));
      };

      ws.onclose = () => {
        this.ws = null;
        if (!this.started) {
          return;
        }

        this.reconnectTimer = setTimeout(this.connect, this.reconnectDelayMs);
      };
    } catch (error) {
      this.onError(error instanceof Error ? error : new Error("Failed to initialize realtime socket."));
      if (this.started) {
        this.reconnectTimer = setTimeout(this.connect, this.reconnectDelayMs);
      }
    }
  };

  private subscribePairs = (): void => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const currency of this.currencies) {
      const upper = currency.toUpperCase();
      const pairs = [`USD${upper}`, `${upper}USD`];

      for (const stock of pairs) {
        const payloads: Array<Record<string, string>> = [
          { action: "subscribe", market: "FX", stock },
          { type: "subscribe", market: "FX", stock },
          { op: "subscribe", market: "FX", stock },
          { action: "add", market: "FX", stock },
          { type: "add", market: "FX", stock },
          { cmd: "add", market: "FX", stock }
        ];

        for (const payload of payloads) {
          this.ws.send(JSON.stringify(payload));
        }
      }
    }
  };

  private handleMessage = (raw: unknown): void => {
    const message = tryParseMessage(raw);
    if (!message) {
      return;
    }

    const extracted = getSymbolAndPrice(message);
    if (!extracted) {
      return;
    }

    const mapped = symbolToRate(extracted.symbol, extracted.price);
    if (!mapped) {
      return;
    }

    if (!this.currencies.includes(mapped.currency)) {
      return;
    }

    this.latestRates[mapped.currency] = mapped.rate;
    this.dirty = true;
  };

  private emitSnapshot = (): void => {
    if (!this.started || !this.dirty) {
      return;
    }

    const rateCount = Object.keys(this.latestRates).length;
    if (rateCount < Math.max(5, Math.floor(this.currencies.length * 0.35))) {
      return;
    }

    const hash = hashRates(this.currencies, this.latestRates);
    const unchanged = hash === this.previousHash;

    const snapshot: FxSnapshot = {
      date: isoDateNow(),
      fetchedAt: Date.now(),
      rates: { ...this.latestRates },
      source: "live"
    };

    this.previousHash = hash;
    this.dirty = false;
    this.onSnapshot(snapshot, unchanged);
  };
}
