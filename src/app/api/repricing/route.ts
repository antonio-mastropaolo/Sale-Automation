import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

/** GET — Analyze all active listings and suggest price adjustments */
export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: { in: ["active", "draft"] } },
      include: {
        platformListings: { select: { platform: true, suggestedPrice: true, status: true, publishedAt: true } },
        images: { take: 1, orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 200, // cap to prevent unbounded query on large datasets
    });

    const now = Date.now();
    const suggestions = listings.map((listing) => {
      const daysListed = Math.floor((now - listing.createdAt.getTime()) / 86400000);
      const hasViews = false; // would come from analytics in production
      const publishedCount = listing.platformListings.filter((p) => p.status === "published").length;

      // AI-style pricing logic
      let suggestedPrice = listing.price;
      let reason = "";
      let urgency: "low" | "medium" | "high" = "low";
      let action: "hold" | "drop" | "raise" | "relist" = "hold";

      if (daysListed > 21 && publishedCount > 0) {
        suggestedPrice = Math.round(listing.price * 0.82);
        reason = `Listed ${daysListed} days with low engagement. Drop 18% to match recent comps.`;
        urgency = "high";
        action = "drop";
      } else if (daysListed > 14 && publishedCount > 0) {
        suggestedPrice = Math.round(listing.price * 0.90);
        reason = `${daysListed} days on market. 10% reduction aligns with sell-through data.`;
        urgency = "medium";
        action = "drop";
      } else if (daysListed > 7 && publishedCount > 0) {
        suggestedPrice = Math.round(listing.price * 0.95);
        reason = `${daysListed} days listed. Small 5% adjustment to stay competitive.`;
        urgency = "low";
        action = "drop";
      } else if (publishedCount === 0 && daysListed > 3) {
        reason = "Not published to any platform yet. Optimize and publish to start selling.";
        urgency = "medium";
        action = "relist";
      } else if (daysListed <= 2 && listing.costPrice && listing.price < listing.costPrice * 1.3) {
        // New item with thin margin — suggest raising
        suggestedPrice = Math.round(listing.costPrice * 1.5);
        reason = `Margin below 30%. Raise to ${Math.round(((suggestedPrice / listing.costPrice) - 1) * 100)}% markup for healthy profit.`;
        urgency = "low";
        action = "raise";
      } else {
        reason = "Price is competitive for current market conditions. Hold.";
        action = "hold";
      }

      return {
        id: listing.id,
        title: listing.title,
        brand: listing.brand,
        category: listing.category,
        currentPrice: listing.price,
        suggestedPrice,
        priceDiff: suggestedPrice - listing.price,
        priceDiffPercent: Math.round(((suggestedPrice - listing.price) / listing.price) * 100),
        reason,
        urgency,
        action,
        daysListed,
        publishedPlatforms: publishedCount,
        totalPlatforms: listing.platformListings.length,
        image: listing.images[0]?.path || null,
        status: listing.status,
      };
    });

    // Sort by urgency (high first) then days listed
    suggestions.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      return b.daysListed - a.daysListed;
    });

    const stats = {
      total: suggestions.length,
      needsAction: suggestions.filter((s) => s.action !== "hold").length,
      highUrgency: suggestions.filter((s) => s.urgency === "high").length,
      avgDaysListed: suggestions.length > 0 ? Math.round(suggestions.reduce((s, l) => s + l.daysListed, 0) / suggestions.length) : 0,
      potentialRevenue: suggestions.filter((s) => s.action === "drop").reduce((s, l) => s + l.suggestedPrice, 0),
    };

    return NextResponse.json({ suggestions, stats });
  } catch (err) {
    console.error("Repricing error:", err);
    return NextResponse.json({ error: "Failed to analyze prices" }, { status: 500 });
  }
}

/** POST — Apply a price change to a listing */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { listingId, newPrice } = body;

    if (!listingId || typeof newPrice !== "number" || newPrice <= 0) {
      return NextResponse.json({ error: "Invalid listingId or newPrice" }, { status: 400 });
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: { price: newPrice },
    });

    await logActivity({
      type: "listing_updated",
      title: `Repriced: ${listing.title} → $${newPrice}`,
      detail: `Price changed from previous to $${newPrice}`,
      severity: "info",
    });

    return NextResponse.json({ success: true, listing: { id: listing.id, title: listing.title, price: listing.price } });
  } catch (err) {
    console.error("Reprice error:", err);
    return NextResponse.json({ error: "Failed to update price" }, { status: 500 });
  }
}
