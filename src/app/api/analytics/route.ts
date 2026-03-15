import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRecommendations } from "@/lib/ai";
import { parseAIJson } from "@/lib/ai-utils";

export async function GET() {
  // Summary stats
  const totalListings = await prisma.listing.count();
  const activeListings = await prisma.listing.count({ where: { status: "active" } });
  const platformListings = await prisma.platformListing.findMany({
    include: {
      listing: true,
      analyticsEvents: true,
    },
  });

  const platformStats = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"].map((platform) => {
    const pListings = platformListings.filter((pl) => pl.platform === platform);
    const events = pListings.flatMap((pl) => pl.analyticsEvents);
    return {
      platform,
      listings: pListings.length,
      published: pListings.filter((pl) => pl.status === "published").length,
      views: events.filter((e) => e.eventType === "view").reduce((sum, e) => sum + e.value, 0),
      likes: events.filter((e) => e.eventType === "like").reduce((sum, e) => sum + e.value, 0),
      sales: events.filter((e) => e.eventType === "sale").reduce((sum, e) => sum + e.value, 0),
      revenue: events.filter((e) => e.eventType === "sale").reduce((sum, e) => sum + e.value, 0),
    };
  });

  return NextResponse.json({
    totalListings,
    activeListings,
    platformStats,
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action } = body;

  if (action === "record") {
    const { platformListingId, eventType, value } = body as {
      platformListingId?: string; eventType?: string; value?: number;
    };
    const event = await prisma.analyticsEvent.create({
      data: { platformListingId: platformListingId || "", eventType: eventType || "", value: value || 0 },
    });
    return NextResponse.json(event);
  }

  if (action === "recommendations") {
    const platformListings = await prisma.platformListing.findMany({
      include: {
        listing: true,
        analyticsEvents: true,
      },
    });

    const listingsData = platformListings.map((pl) => ({
      title: pl.optimizedTitle,
      platform: pl.platform,
      views: pl.analyticsEvents.filter((e) => e.eventType === "view").reduce((s, e) => s + e.value, 0),
      likes: pl.analyticsEvents.filter((e) => e.eventType === "like").reduce((s, e) => s + e.value, 0),
      price: pl.suggestedPrice || pl.listing.price,
    }));

    const recommendations = await getRecommendations(listingsData);
    return NextResponse.json(parseAIJson(recommendations));
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
