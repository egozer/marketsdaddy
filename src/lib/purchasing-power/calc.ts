import { median, normalizeToRange } from "@/lib/metrics/math";
import type { CountryCurrencyProfile, PurchasingPowerObject } from "@/types/fx";

interface RawRow {
  country: string;
  currency: string;
  convertedValue: number;
  realValueIndex: number;
  flagCode: string;
}

export const computePurchasingPower = (
  profiles: CountryCurrencyProfile[],
  rates: Record<string, number>
): PurchasingPowerObject[] => {
  const rawRows: RawRow[] = [];

  for (const profile of profiles) {
    const rate = profile.currency === "usd" ? 1 : rates[profile.currency];

    if (typeof rate !== "number" || rate <= 0 || profile.pppIndex <= 0) {
      continue;
    }

    const convertedValue = rate;
    const realValueIndex = convertedValue / profile.pppIndex;

    rawRows.push({
      country: profile.country,
      currency: profile.currency,
      convertedValue,
      realValueIndex,
      flagCode: profile.flagCode
    });
  }

  if (rawRows.length === 0) {
    return [];
  }

  const sortedByRaw = [...rawRows].sort((a, b) => b.realValueIndex - a.realValueIndex);
  const rawValues = sortedByRaw.map((row) => row.realValueIndex);
  const min = Math.min(...rawValues);
  const max = Math.max(...rawValues);
  const med = median(rawValues);

  return sortedByRaw.map((row, index) => {
    const normalizedScore = normalizeToRange(row.realValueIndex, min, max, 0, 100);
    const relativeVsMedianPercent = med === 0 ? 0 : ((row.realValueIndex - med) / med) * 100;

    return {
      country: row.country,
      currency: row.currency,
      convertedValue: row.convertedValue,
      realValueIndex: row.realValueIndex,
      normalizedScore,
      rank: index + 1,
      relativeVsMedianPercent,
      flagCode: row.flagCode
    };
  });
};
