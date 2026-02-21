export type MarketPair = {
  id: string;
  base: string;
  quote: string;
  label: string;
};

export type MarketQuote = {
  base: string;
  quote: string;
  price: number;
  change24h: number | null;
  fetchedAt: string;
};

export type AppUserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WatchItem = MarketPair & {
  createdAt: string;
  lastPrice?: number;
  lastUpdated?: string;
};

export type PriceAlert = {
  id: string;
  base: string;
  quote: string;
  label: string;
  targetPrice: number;
  direction: "above" | "below";
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  lastTriggeredPrice?: number;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};

export type AiAnalysis = {
  pair: string;
  summary: string;
  conviction: "Bullish" | "Neutral" | "Bearish";
  risks: string[];
  opportunities: string[];
  actionPlan: string[];
  generatedAt: string;
};
