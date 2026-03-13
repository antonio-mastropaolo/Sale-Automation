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

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are an expert reselling consultant who grades marketplace listings. Analyze this listing and provide a detailed health score.

Listing:
- Title: ${listing.title}
- Description: ${listing.description}
- Category: ${listing.category}
- Brand: ${listing.brand || "Not specified"}
- Size: ${listing.size || "Not specified"}
- Condition: ${listing.condition}
- Price: $${listing.price}
- Number of photos: ${listing.images.length}
- Platforms listed on: ${listing.platformListings.map((p) => p.platform).join(", ") || "None yet"}
- Status: ${listing.status}

Grade this listing on these criteria (each 0-100):
1. Title Quality (SEO keywords, length, clarity)
2. Description Quality (detail, appeal, measurements, keywords)
3. Photo Score (number of photos — ideally 4-8)
4. Pricing Strategy (is it competitive for the brand/category/condition?)
5. Platform Coverage (is it on enough platforms?)

Also provide:
- An overall score (weighted average)
- 3-5 specific, actionable improvements ranked by impact
- An estimated "days to sell" prediction
- A one-line verdict

Respond in JSON only (no markdown):
{
  "overall": 75,
  "scores": {
    "title": {"score": 80, "feedback": "..."},
    "description": {"score": 60, "feedback": "..."},
    "photos": {"score": 40, "feedback": "..."},
    "pricing": {"score": 85, "feedback": "..."},
    "platformCoverage": {"score": 25, "feedback": "..."}
  },
  "improvements": [
    {"action": "...", "impact": "high", "detail": "..."}
  ],
  "estimatedDaysToSell": 7,
  "verdict": "..."
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
