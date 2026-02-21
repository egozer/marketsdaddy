import { fetchHistoricalUsdRates } from "@/lib/fx/exchange-api";
import type { FxSnapshot } from "@/types/fx";

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

const enumerateDates = (startDate: string, endDate: string): string[] => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

export const fetchHistoricalSnapshots = async (
  currencies: string[],
  startDate: string,
  endDate: string
): Promise<FxSnapshot[]> => {
  const dates = enumerateDates(startDate, endDate);

  const snapshots: FxSnapshot[] = [];

  for (const date of dates) {
    try {
      const payload = await fetchHistoricalUsdRates(date);
      const rates: Record<string, number> = {};

      for (const currency of currencies) {
        const rate = payload.usd[currency];
        if (typeof rate === "number") {
          rates[currency] = rate;
        }
      }

      snapshots.push({
        date: payload.date,
        fetchedAt: Date.now(),
        rates,
        source: "historical"
      });
    } catch {
      continue;
    }
  }

  return snapshots;
};
