import { LOCAL_CACHE_KEY } from "@/lib/config/runtime";
import type { FxSnapshot } from "@/types/fx";

const isBrowser = (): boolean => typeof window !== "undefined";

export const writeSnapshotCache = (snapshot: FxSnapshot): void => {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(snapshot));
};

export const readSnapshotCache = (): FxSnapshot | null => {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as FxSnapshot;
    if (
      typeof parsed.date === "string" &&
      typeof parsed.fetchedAt === "number" &&
      typeof parsed.rates === "object" &&
      parsed.rates !== null
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
};
