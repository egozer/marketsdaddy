import type { MarketPair, StockItem } from "@/lib/types";

export const DEFAULT_MARKETS: MarketPair[] = [
  { id: "usd-try", base: "usd", quote: "try", label: "USD/TRY" },
  { id: "eur-usd", base: "eur", quote: "usd", label: "EUR/USD" },
  { id: "gbp-usd", base: "gbp", quote: "usd", label: "GBP/USD" },
  { id: "usd-jpy", base: "usd", quote: "jpy", label: "USD/JPY" },
  { id: "btc-usd", base: "btc", quote: "usd", label: "BTC/USD" },
  { id: "eth-usd", base: "eth", quote: "usd", label: "ETH/USD" }
];

export const STOCK_UNIVERSE: StockItem[] = [
  { id: "aapl", symbol: "AAPL", company: "Apple Inc.", exchange: "NASDAQ", sector: "Technology" },
  { id: "msft", symbol: "MSFT", company: "Microsoft Corp.", exchange: "NASDAQ", sector: "Technology" },
  { id: "nvda", symbol: "NVDA", company: "NVIDIA Corp.", exchange: "NASDAQ", sector: "Semiconductors" },
  { id: "amzn", symbol: "AMZN", company: "Amazon.com, Inc.", exchange: "NASDAQ", sector: "Consumer Cyclical" },
  { id: "googl", symbol: "GOOGL", company: "Alphabet Inc.", exchange: "NASDAQ", sector: "Communication" },
  { id: "meta", symbol: "META", company: "Meta Platforms", exchange: "NASDAQ", sector: "Communication" },
  { id: "tsla", symbol: "TSLA", company: "Tesla, Inc.", exchange: "NASDAQ", sector: "Auto" },
  { id: "brk-b", symbol: "BRK-B", company: "Berkshire Hathaway", exchange: "NYSE", sector: "Financial" }
];

export const APP_NAME = "marketsdaddy.lol";
