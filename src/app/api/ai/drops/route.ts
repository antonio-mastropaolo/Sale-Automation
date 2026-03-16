import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";

/** GET — AI-generated drop feed: upcoming releases, restocks, trending items */
export async function GET() {
  try {
    const { client, model } = await getAIClient();

    const today = new Date().toISOString().split("T")[0];

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 2000),
      messages: [
        {
          role: "user",
          content: `You are a resale market expert specializing in sneakers, streetwear, and luxury fashion. Today is ${today}.

Generate a drop feed for resellers. Return ONLY valid JSON (no markdown):

{
  "upcomingDrops": [
    {
      "name": "product name",
      "brand": "brand",
      "category": "sneakers|streetwear|luxury|accessories",
      "releaseDate": "YYYY-MM-DD or TBA",
      "retailPrice": 180,
      "estimatedResale": 350,
      "resaleMultiplier": 1.9,
      "hype": 85,
      "platform": "Nike SNKRS|Adidas Confirmed|Supreme|Palace|SSENSE|etc",
      "tip": "quick sourcing tip for resellers",
      "image": null
    }
  ],
  "recentDrops": [
    {
      "name": "product name",
      "brand": "brand",
      "category": "sneakers|streetwear|luxury",
      "droppedDate": "${today}",
      "retailPrice": 160,
      "currentResale": 280,
      "resaleMultiplier": 1.75,
      "hype": 78,
      "availability": "sold out|limited|available",
      "tip": "buy/hold/sell advice"
    }
  ],
  "trendingItems": [
    {
      "name": "item name",
      "brand": "brand",
      "avgResale": 420,
      "priceChange": "+12%",
      "direction": "rising|stable|declining",
      "reason": "why it's trending",
      "bestPlatform": "grailed|depop|ebay|stockx"
    }
  ],
  "weeklyInsight": "A 2-3 sentence market summary for resellers this week."
}

Include 5-6 upcoming drops (next 2 weeks), 4-5 recent drops, and 4-5 trending items. Use real brand names and realistic pricing. Focus on Nike, Jordan, New Balance, Adidas, Supreme, Stussy, Palace, Arc'teryx, Salomon, Balenciaga, and similar resale-heavy brands.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({
        upcomingDrops: [],
        recentDrops: [],
        trendingItems: [],
        weeklyInsight: text,
      });
    }
  } catch (err) {
    return NextResponse.json(
      {
        upcomingDrops: [],
        recentDrops: [],
        trendingItems: [],
        weeklyInsight: "Failed to load drop feed. Check your AI provider settings.",
      },
      { status: 500 }
    );
  }
}
