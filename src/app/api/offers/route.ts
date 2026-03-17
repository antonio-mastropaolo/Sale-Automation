import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

/** Mock offer data — in production, pulled from platform APIs */
function generateMockOffers(listings: { id: string; title: string; price: number; brand: string }[]) {
  const buyers = ["alex_m", "sneaker.head", "vintage_finds", "streetwear_ny", "resell_la", "grail_hunter", "closet_deals", "hype_collector"];
  const platforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted"];
  const messages = [
    "Would you take ${{price}} for this?",
    "Hi! Is ${{price}} ok? I can pay right away",
    "Interested! Best price?",
    "Can you do ${{price}}? Bundle discount?",
    "I'll buy now for ${{price}}",
    "Any wiggle room on price? ${{price}}?",
  ];

  return listings.slice(0, 12).map((listing, i) => {
    const offerPercent = 0.65 + Math.random() * 0.25; // 65-90% of asking
    const offerPrice = Math.round(listing.price * offerPercent);
    const costPrice = Math.round(listing.price * 0.4); // estimated cost
    const profitAtOffer = offerPrice - costPrice;
    const profitAtAsking = listing.price - costPrice;

    return {
      id: `offer-${i}-${listing.id.slice(0, 8)}`,
      listingId: listing.id,
      listingTitle: listing.title,
      listingPrice: listing.price,
      brand: listing.brand,
      platform: platforms[i % platforms.length],
      buyer: buyers[i % buyers.length],
      offerPrice,
      offerPercent: Math.round(offerPercent * 100),
      message: messages[i % messages.length].replace("{{price}}", String(offerPrice)),
      receivedAt: new Date(Date.now() - (i * 3600000 + Math.random() * 7200000)).toISOString(),
      status: "pending" as "pending" | "accepted" | "countered" | "declined",
      // AI analysis
      ai: {
        recommendation: offerPercent >= 0.85 ? "accept" as const : offerPercent >= 0.75 ? "counter" as const : "decline" as const,
        reason: offerPercent >= 0.85
          ? "Offer is within 15% of asking — strong deal. Accept to close quickly."
          : offerPercent >= 0.75
            ? `Counter at $${Math.round(listing.price * 0.90)}. Buyer likely willing to go higher.`
            : "Offer is too low. Decline or counter at asking price minus 10%.",
        suggestedCounter: Math.round(listing.price * (offerPercent >= 0.85 ? 1.0 : 0.90)),
        profitAtOffer,
        profitAtAsking,
        marketAvg: Math.round(listing.price * (0.9 + Math.random() * 0.2)),
        sellProbability: offerPercent >= 0.85 ? 92 : offerPercent >= 0.75 ? 68 : 25,
      },
    };
  });
}

/** GET — Fetch all pending offers across platforms */
export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      where: { status: { in: ["active", "draft"] } },
      select: { id: true, title: true, price: true, brand: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const offers = generateMockOffers(listings);

    const stats = {
      total: offers.length,
      pending: offers.filter((o) => o.status === "pending").length,
      totalValue: offers.reduce((s, o) => s + o.offerPrice, 0),
      avgOfferPercent: Math.round(offers.reduce((s, o) => s + o.offerPercent, 0) / Math.max(offers.length, 1)),
      acceptRecommended: offers.filter((o) => o.ai.recommendation === "accept").length,
      counterRecommended: offers.filter((o) => o.ai.recommendation === "counter").length,
    };

    return NextResponse.json({ offers, stats });
  } catch (err) {
    console.error("Offers error:", err);
    return NextResponse.json({ error: "Failed to load offers" }, { status: 500 });
  }
}

/** POST — Respond to an offer (accept, counter, decline) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { offerId, action, counterPrice } = body;

    if (!offerId || !["accept", "counter", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid offerId or action" }, { status: 400 });
    }

    await logActivity({
      type: "batch_action",
      title: `Offer ${action}: ${offerId}`,
      detail: action === "counter" ? `Counter at $${counterPrice}` : `Offer ${action}ed`,
      severity: action === "accept" ? "success" : "info",
    });

    return NextResponse.json({ success: true, offerId, action, counterPrice });
  } catch (err) {
    return NextResponse.json({ error: "Failed to process offer" }, { status: 500 });
  }
}
