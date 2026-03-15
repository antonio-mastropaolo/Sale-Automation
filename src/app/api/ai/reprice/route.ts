import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseAIJson } from "@/lib/ai-utils";
import { getAIClient, getPromptText } from "@/lib/settings";
import { interpolatePrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action } = body;

  if (action === "analyze") {
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

    const template = await getPromptText("reprice");
    const prompt = interpolatePrompt(template, {
      inventory: JSON.stringify(listingSummaries, null, 2),
    });

    const { client, model } = await getAIClient();
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
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
    if (!Array.isArray(reprices)) {
      return NextResponse.json({ error: "reprices array required" }, { status: 400 });
    }

    const results = await Promise.all(
      reprices.map(async (r: { listingId: string; newPrice: number }) => {
        await prisma.listing.update({
          where: { id: r.listingId },
          data: { price: r.newPrice },
        });
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
