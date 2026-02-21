export type CurrencyCode = string;

export interface FxApiResponse {
  date: string;
  usd: Record<string, number>;
}

export interface FxSnapshot {
  date: string;
  fetchedAt: number;
  rates: Record<CurrencyCode, number>;
  source: "live" | "historical" | "cache";
}

export interface ProcessedCurrencyMetric {
  currency: CurrencyCode;
  rate: number;
  delta: number;
  percentChange: number;
  volatility: number;
  emaDelta: number;
  strengthScore: number;
  rank: number;
}

export interface GlobalStress {
  score: number;
  level: "Low" | "Moderate" | "High";
}

export interface WorkerMetricsPayload {
  timestamp: number;
  metrics: ProcessedCurrencyMetric[];
  stress: GlobalStress;
  unchanged: boolean;
}

export interface CountryCurrencyProfile {
  country: string;
  currency: CurrencyCode;
  currencyName: string;
  flagCode: string;
  region: "Americas" | "Europe" | "Asia Pacific" | "Middle East & Africa";
  lat: number;
  lon: number;
  pppIndex: number;
}

export interface PurchasingPowerObject {
  country: string;
  currency: CurrencyCode;
  convertedValue: number;
  realValueIndex: number;
  normalizedScore: number;
  rank: number;
  relativeVsMedianPercent: number;
  flagCode: string;
}

export interface ReplayConfig {
  startDate: string;
  endDate: string;
  speed: number;
}

export interface ReplayProgress {
  currentIndex: number;
  total: number;
  date: string | null;
}
