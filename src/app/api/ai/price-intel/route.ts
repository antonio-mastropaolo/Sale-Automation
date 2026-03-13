import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseAIJson } from "@/lib/ai-utils";

const client = new OpenAI();

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, brand, category, condition, size, currentPrice } = body as {
    title?: string; brand?: string; category?: string; condition?: string; size?: string; currentPrice?: number;
  };

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a reselling pricing expert with deep knowledge of marketplace dynamics. Analyze this item and provide comprehensive pricing intelligence.

Item:
- Title: ${title}
- Brand: ${brand || "Unknown"}
- Category: ${category || "Unknown"}
- Condition: ${condition || "Good"}
- Size: ${size || "Unknown"}
- Current price: $${currentPrice || "Not set"}

Provide:
1. Market price analysis — what similar items typically sell for across platforms
2. Platform-specific optimal prices (each platform has different buyer demographics)
3. A pricing strategy recommendation
4. Price psychology tips for this specific item
5. When to drop the price and by how much if it doesn't sell
6. Estimated sell-through rate at different price points

Respond in JSON only (no markdown):
{
  "marketAnalysis": {
    "lowEnd": 20,
    "average": 35,
    "highEnd": 55,
    "summary": "..."
  },
  "platformPricing": {
    "depop": {"price": 30, "reasoning": "..."},
    "grailed": {"price": 40, "reasoning": "..."},
    "poshmark": {"price": 35, "reasoning": "..."},
    "mercari": {"price": 28, "reasoning": "..."}
  },
  "strategy": {
    "recommendation": "price_high_drop|price_competitive|price_to_sell",
    "explanation": "...",
    "optimalPrice": 35
  },
  "psychologyTips": ["..."],
  "priceDropSchedule": [
    {"day": 7, "dropTo": 32, "reasoning": "..."},
    {"day": 14, "dropTo": 28, "reasoning": "..."}
  ],
  "sellThrough": {
    "at_high": {"price": 55, "probability": "20%", "estimatedDays": 30},
    "at_mid": {"price": 35, "probability": "65%", "estimatedDays": 10},
    "at_low": {"price": 20, "probability": "95%", "estimatedDays": 3}
  }
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return NextResponse.json(parseAIJson(text));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
