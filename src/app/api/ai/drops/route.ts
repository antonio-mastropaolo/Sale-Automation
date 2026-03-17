import { NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { parseAIJson } from "@/lib/ai-utils";

/** In-memory cache — avoids expensive AI calls on every page load */
let cachedResult: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const EMPTY_FEED = {
  upcomingDrops: [],
  recentDrops: [],
  trendingItems: [],
  weeklyInsight: "",
};

/** GET — AI-generated drop feed: upcoming releases, restocks, trending items */
export async function GET(req: Request) {
  // Return cache if fresh (skip with ?refresh=true)
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "true";

  if (!forceRefresh && cachedResult && Date.now() - cachedResult.ts < CACHE_TTL) {
    return NextResponse.json(cachedResult.data);
  }

  try {
    const { client, model } = await getAIClient();

    // Check if API key is actually configured
    if (!client.apiKey) {
      return NextResponse.json(
        { ...EMPTY_FEED, weeklyInsight: "No AI provider configured. Go to Settings → AI Provider to add your API key.", error: "no_api_key" },
        { status: 200 } // 200 so the frontend doesn't get stuck
      );
    }

    const today = new Date().toISOString().split("T")[0];

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 2000),
      messages: [
        {
          role: "user",
          content: `You are a resale market expert specializing in sneakers, streetwear, and luxury fashion. Today is ${today}.

Generate a drop feed for resellers. Return ONLY valid JSON (no markdown, no explanation):

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
      "tip": "quick sourcing tip for resellers"
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

    let parsed: Record<string, unknown>;
    try {
      parsed = parseAIJson<Record<string, unknown>>(text);
    } catch {
      // Last resort: if AI returned something but it's not JSON, show it as insight
      parsed = { ...EMPTY_FEED, weeklyInsight: text.slice(0, 500) };
    }

    // Validate structure — ensure all expected arrays exist
    const result = {
      upcomingDrops: Array.isArray(parsed.upcomingDrops) ? parsed.upcomingDrops : [],
      recentDrops: Array.isArray(parsed.recentDrops) ? parsed.recentDrops : [],
      trendingItems: Array.isArray(parsed.trendingItems) ? parsed.trendingItems : [],
      weeklyInsight: typeof parsed.weeklyInsight === "string" ? parsed.weeklyInsight : "",
    };

    // Cache the result
    cachedResult = { data: result, ts: Date.now() };

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    // Provide actionable error messages
    let userMessage = "Failed to load drop feed. ";
    if (message.includes("401") || message.includes("auth") || message.includes("API key")) {
      userMessage += "Your AI API key appears to be invalid. Check Settings → AI Provider.";
    } else if (message.includes("429") || message.includes("rate")) {
      userMessage += "Rate limit hit. Try again in a minute.";
    } else if (message.includes("timeout") || message.includes("ECONNREFUSED")) {
      userMessage += "Could not reach AI provider. Check your connection.";
    } else {
      userMessage += message.slice(0, 150);
    }

    // Return 200 with error info so the frontend doesn't get stuck
    return NextResponse.json(
      { ...EMPTY_FEED, weeklyInsight: userMessage, error: "api_error" },
      { status: 200 }
    );
  }
}
