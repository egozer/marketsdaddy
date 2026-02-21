import { NextRequest, NextResponse } from "next/server";

function toDateTag(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchRate(base: string, quote: string, version: string) {
  const urls = [
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${base}.json`,
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${version}/v1/currencies/${base}/${quote}.json`
  ];

  for (const url of urls) {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as Record<string, unknown>;

    if (typeof payload[quote] === "number" || typeof payload[quote] === "string") {
      const value = Number(payload[quote]);
      if (Number.isFinite(value)) {
        return value;
      }
    }

    if (payload[base] && typeof payload[base] === "object") {
      const nested = payload[base] as Record<string, unknown>;
      if (typeof nested[quote] === "number" || typeof nested[quote] === "string") {
        const value = Number(nested[quote]);
        if (Number.isFinite(value)) {
          return value;
        }
      }
    }
  }

  throw new Error(`Quote unavailable for ${base}/${quote}`);
}

export async function GET(request: NextRequest) {
  const base = request.nextUrl.searchParams.get("base")?.toLowerCase();
  const quote = request.nextUrl.searchParams.get("quote")?.toLowerCase();

  if (!base || !quote) {
    return NextResponse.json(
      { error: "Missing base or quote query parameter." },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1);

    const [price, previous] = await Promise.all([
      fetchRate(base, quote, "latest"),
      fetchRate(base, quote, toDateTag(yesterday)).catch(() => null)
    ]);

    const change24h = previous ? ((price - previous) / previous) * 100 : null;

    return NextResponse.json({
      base,
      quote,
      price,
      change24h,
      fetchedAt: now.toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected market error"
      },
      { status: 500 }
    );
  }
}
