import { FX_HISTORICAL_ENDPOINT, FX_LATEST_ENDPOINT, POLL_TIMEOUT_MS } from "@/lib/config/runtime";
import type { FxApiResponse } from "@/types/fx";

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validateFxResponse = (value: unknown): FxApiResponse => {
  if (!isObject(value)) {
    throw new Error("FX payload is not an object.");
  }

  const date = value.date;
  const usd = value.usd;

  if (typeof date !== "string") {
    throw new Error("FX payload missing date.");
  }

  if (!isObject(usd)) {
    throw new Error("FX payload missing usd rates object.");
  }

  const rates: Record<string, number> = {};

  for (const [key, rateValue] of Object.entries(usd)) {
    if (typeof rateValue === "number" && Number.isFinite(rateValue)) {
      rates[key.toLowerCase()] = rateValue;
    }
  }

  return {
    date,
    usd: rates
  };
};

const fetchWithTimeout = async (url: string, timeoutMs: number, signal?: AbortSignal): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = (): void => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: "no-store"
    });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
};

export const fetchLatestUsdRates = async (signal?: AbortSignal): Promise<FxApiResponse> => {
  const response = await fetchWithTimeout(FX_LATEST_ENDPOINT, POLL_TIMEOUT_MS, signal);

  if (!response.ok) {
    throw new Error(`Failed latest FX fetch: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return validateFxResponse(payload);
};

export const fetchHistoricalUsdRates = async (
  date: string,
  signal?: AbortSignal
): Promise<FxApiResponse> => {
  const url = FX_HISTORICAL_ENDPOINT.replace("{date}", date);
  const response = await fetchWithTimeout(url, POLL_TIMEOUT_MS, signal);

  if (!response.ok) {
    throw new Error(`Failed historical FX fetch for ${date}: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return validateFxResponse(payload);
};
