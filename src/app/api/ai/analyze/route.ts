import { NextRequest, NextResponse } from "next/server";

type AnalyzeBody = {
  pair?: string;
  price?: number;
  change24h?: number | null;
  context?: string;
};

const MODEL = "arcee-ai/trinity-large-preview:free";

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is missing." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as AnalyzeBody;

  if (!body.pair || typeof body.price !== "number") {
    return NextResponse.json(
      { error: "pair and price are required." },
      { status: 400 }
    );
  }

  const prompt = `You are Daddy, a strict but practical market analyst.\nReturn valid JSON only with this schema:\n{\n  \"pair\": string,\n  \"summary\": string,\n  \"conviction\": \"Bullish\" | \"Neutral\" | \"Bearish\",\n  \"risks\": string[],\n  \"opportunities\": string[],\n  \"actionPlan\": string[]\n}\nUse plain, simple language.\nPair: ${body.pair}\nCurrent price: ${body.price}\n24h change (%): ${body.change24h ?? "N/A"}\nUser context: ${body.context ?? "No extra context"}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "marketsdaddy.lol"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      reasoning: { enabled: true }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `OpenRouter request failed: ${errorText}` },
      { status: 502 }
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return NextResponse.json(
      { error: "AI response is empty." },
      { status: 502 }
    );
  }

  const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();

  try {
    const parsed = JSON.parse(clean) as {
      pair: string;
      summary: string;
      conviction: "Bullish" | "Neutral" | "Bearish";
      risks: string[];
      opportunities: string[];
      actionPlan: string[];
    };

    return NextResponse.json({
      ...parsed,
      generatedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json({
      pair: body.pair,
      summary: clean,
      conviction: "Neutral",
      risks: ["Model response was not structured JSON."],
      opportunities: ["Run analysis again with more context."],
      actionPlan: ["Treat this summary as informational only."],
      generatedAt: new Date().toISOString()
    });
  }
}
