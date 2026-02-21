import { NextRequest, NextResponse } from "next/server";

type DaddyBody = {
  symbol?: string;
  company?: string;
  question?: string;
  price?: number | null;
  change24h?: number | null;
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY missing" }, { status: 500 });
  }

  const body = (await request.json()) as DaddyBody;
  const symbol = body.symbol?.trim();
  const question = body.question?.trim();

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const userQuestion = question && question.length > 0
    ? question
    : "Give me your current high-conviction take in plain English.";

  const prompt = [
    "You are Daddy, a blunt but practical investing community analyst.",
    "Keep response short, direct, and public-forum friendly.",
    "No markdown. No disclaimers unless risk is extreme.",
    "Use this shape:",
    "Verdict: <Bullish/Neutral/Bearish>",
    "Why: <2-3 short sentences>",
    "Gameplan: <3 bullet-like lines prefixed with '- '>",
    `Stock: ${symbol}`,
    `Company: ${body.company ?? "Unknown"}`,
    `Price: ${typeof body.price === "number" ? body.price : "N/A"}`,
    `Daily change (%): ${typeof body.change24h === "number" ? body.change24h.toFixed(2) : "N/A"}`,
    `User question: ${userQuestion}`
  ].join("\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "marketsdaddy.lol"
    },
    body: JSON.stringify({
      model: "arcee-ai/trinity-large-preview:free",
      messages: [{ role: "user", content: prompt }],
      reasoning: { enabled: true }
    })
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Daddy AI request failed" },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "Daddy AI empty response" }, { status: 502 });
  }

  return NextResponse.json({
    reply: content,
    generatedAt: new Date().toISOString()
  });
}
