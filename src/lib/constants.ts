import type { MarketPair } from "@/lib/types";

export const DEFAULT_MARKETS: MarketPair[] = [
  { id: "usd-try", base: "usd", quote: "try", label: "USD/TRY" },
  { id: "eur-usd", base: "eur", quote: "usd", label: "EUR/USD" },
  { id: "gbp-usd", base: "gbp", quote: "usd", label: "GBP/USD" },
  { id: "usd-jpy", base: "usd", quote: "jpy", label: "USD/JPY" },
  { id: "btc-usd", base: "btc", quote: "usd", label: "BTC/USD" },
  { id: "eth-usd", base: "eth", quote: "usd", label: "ETH/USD" }
];

export const APP_NAME = "marketsdaddy.lol";
