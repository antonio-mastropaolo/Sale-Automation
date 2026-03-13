import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { parseAIJson } from "@/lib/ai-utils";

const client = new OpenAI();

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action } = body;

  if (action === "analyze") {
    // Get all active/draft listings
    const listings = await prisma.listing.findMany({
      where: { status: { in: ["draft", "active"] } },
      include: {
        images: true,
        platformListings: { include: { analyticsEvents: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (listings.length === 0) {
      return NextResponse.json({ suggestions: [], summary: "No active listings to analyze." });
    }

    const listingSummaries = listings.map((l) => ({
      id: l.id,
      title: l.title,
      brand: l.brand,
      category: l.category,
      condition: l.condition,
      currentPrice: l.price,
      daysListed: Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000),
      photoCount: l.images.length,
      platforms: l.platformListings.map((pl) => ({
        platform: pl.platform,
        status: pl.status,
        views: pl.analyticsEvents.filter((e) => e.eventType === "view").reduce((s, e) => s + e.value, 0),
        likes: pl.analyticsEvents.filter((e) => e.eventType === "like").reduce((s, e) => s + e.value, 0),
      })),
    }));

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert reselling pricing strategist. Analyze this inventory and suggest optimal repricing to maximize sell-through and revenue.

Current inventory:
${JSON.stringify(listingSummaries, null, 2)}

For each listing, determine:
1. Is the current price optimal?
2. Should it be raised, lowered, or kept the same?
3. What's the recommended new price?
4. Priority of the price change (high/medium/low)
5. Brief reasoning

Also provide:
- Overall inventory health assessment
- Total estimated revenue at current prices vs. optimized prices
- Which items to prioritize selling first (stale inventory)

Respond in JSON only (no markdown):
{
  "suggestions": [
    {
      "listingId": "...",
      "title": "...",
      "currentPrice": 45,
      "suggestedPrice": 38,
      "action": "lower|raise|keep",
      "priority": "high|medium|low",
      "reasoning": "...",
      "estimatedDaysToSell": 5
    }
  ],
  "summary": "...",
  "currentEstimatedRevenue": 500,
  "optimizedEstimatedRevenue": 620,
  "staleItems": ["listingId1", "listingId2"]
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
      return NextResponse.json(parseAIJson(text));
    } catch {
      return NextResponse.json({ error: "Failed to parse" }, { status: 500 });
    }
  }

  if (action === "apply") {
    const { reprices } = body as { reprices?: unknown };
    // reprices: [{listingId, newPrice}]
    if (!Array.isArray(reprices)) {
      return NextResponse.json({ error: "reprices array required" }, { status: 400 });
    }

    const results = await Promise.all(
      reprices.map(async (r: { listingId: string; newPrice: number }) => {
        await prisma.listing.update({
          where: { id: r.listingId },
          data: { price: r.newPrice },
        });
        // Also update platform listings
        await prisma.platformListing.updateMany({
          where: { listingId: r.listingId },
          data: { suggestedPrice: r.newPrice },
        });
        return { listingId: r.listingId, newPrice: r.newPrice, updated: true };
      })
    );

    return NextResponse.json({ results });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
