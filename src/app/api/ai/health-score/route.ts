export const maxDuration = 30;
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseAIJson } from "@/lib/ai-utils";
import { getAIClient, getPromptText } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { interpolatePrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { listingId } = body as { listingId?: string };

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      images: true,
      platformListings: { include: { analyticsEvents: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await getPromptText("health_score");
  const prompt = interpolatePrompt(template, {
    title: listing.title,
    description: listing.description,
    category: listing.category,
    brand: listing.brand || "Not specified",
    size: listing.size || "Not specified",
    condition: listing.condition,
    price: String(listing.price),
    photoCount: String(listing.images.length),
    platforms: listing.platformListings.map((p) => p.platform).join(", ") || "None yet",
    status: listing.status,
  });

  const { client, model } = await getAIClient();
  const response = await client.chat.completions.create({
    model,
    ...tokenParams(model, 1024),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return NextResponse.json(parseAIJson(text));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
