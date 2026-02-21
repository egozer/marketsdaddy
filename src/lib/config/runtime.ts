export const FX_LATEST_ENDPOINT =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/usd.json";

export const FX_HISTORICAL_ENDPOINT =
  "https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/{date}/currencies/usd.json";

export const POLL_INTERVAL_MS = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 5000);
export const POLL_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_POLL_TIMEOUT_MS ?? 4000);
export const ROLLING_WINDOW_SIZE = Number(process.env.NEXT_PUBLIC_ROLLING_WINDOW_SIZE ?? 120);
export const EMA_ALPHA = Number(process.env.NEXT_PUBLIC_EMA_ALPHA ?? 0.25);
export const PULSE_THRESHOLD_PERCENT = Number(
  process.env.NEXT_PUBLIC_PULSE_THRESHOLD_PERCENT ?? 0.15
);
export const ANOMALY_CLAMP_PERCENT = Number(
  process.env.NEXT_PUBLIC_ANOMALY_CLAMP_PERCENT ?? 5
);
export const WORKER_INTERPOLATION_TICK_MS = Number(
  process.env.NEXT_PUBLIC_WORKER_INTERPOLATION_TICK_MS ?? 100
);

export const LOCAL_CACHE_KEY = "living-dollar:last-snapshot";
