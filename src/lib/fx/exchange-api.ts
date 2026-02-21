import {
  FX_HISTORICAL_ENDPOINT,
  FX_HISTORICAL_FALLBACK_ENDPOINT,
  FX_LATEST_ENDPOINT,
  FX_LATEST_FALLBACK_ENDPOINT,
  POLL_TIMEOUT_MS
} from "@/lib/config/runtime";
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

const fetchFromCandidates = async (
  urls: string[],
  signal?: AbortSignal
): Promise<FxApiResponse> => {
  let lastError: Error | null = null;

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, POLL_TIMEOUT_MS, signal);
      if (!response.ok) {
        lastError = new Error(`Failed FX fetch (${response.status}) for ${url}`);
        continue;
      }

      const payload = (await response.json()) as unknown;
      return validateFxResponse(payload);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown FX fetch error.");
    }
  }

  throw lastError ?? new Error("No FX endpoint candidates succeeded.");
};

export const fetchLatestUsdRates = async (signal?: AbortSignal): Promise<FxApiResponse> => {
  return fetchFromCandidates([FX_LATEST_ENDPOINT, FX_LATEST_FALLBACK_ENDPOINT], signal);
};

export const fetchHistoricalUsdRates = async (
  date: string,
  signal?: AbortSignal
): Promise<FxApiResponse> => {
  const primary = FX_HISTORICAL_ENDPOINT.replace("{date}", date);
  const fallback = FX_HISTORICAL_FALLBACK_ENDPOINT.replace("{date}", date);

  return fetchFromCandidates([primary, fallback], signal);
};
