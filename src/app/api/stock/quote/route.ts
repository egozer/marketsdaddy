import { NextRequest, NextResponse } from "next/server";

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        currency?: string;
      };
    }>;
  };
};

function normalizeSymbol(raw: string) {
  return raw.toUpperCase().replace(/\./g, "-");
}

export async function GET(request: NextRequest) {
  const symbolParam = request.nextUrl.searchParams.get("symbol");
  if (!symbolParam) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const symbol = normalizeSymbol(symbolParam);
  const yahooSymbol = symbol === "BRK-B" ? "BRK-B" : symbol;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=5d&interval=1d`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "marketsdaddy.lol/1.0"
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          symbol,
          price: null,
          change24h: null,
          currency: "USD",
          fetchedAt: new Date().toISOString(),
          error: `quote service returned ${response.status}`
        },
        { status: 200 }
      );
    }

    const payload = (await response.json()) as YahooChartResponse;
    const meta = payload.chart?.result?.[0]?.meta;

    const price = typeof meta?.regularMarketPrice === "number" ? meta.regularMarketPrice : null;
    const previousClose = typeof meta?.previousClose === "number" ? meta.previousClose : null;
    const change24h =
      price !== null && previousClose && previousClose !== 0
        ? ((price - previousClose) / previousClose) * 100
        : null;

    return NextResponse.json({
      symbol,
      price,
      change24h,
      currency: meta?.currency ?? "USD",
      fetchedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        symbol,
        price: null,
        change24h: null,
        currency: "USD",
        fetchedAt: new Date().toISOString(),
        error: "quote service unavailable"
      },
      { status: 200 }
    );
  }
}
