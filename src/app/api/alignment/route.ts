import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALL_PLATFORMS = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

interface GapItem {
  listingId: string;
  title: string;
  brand: string;
  price: number;
  category: string;
  listedOn: string[];
  missingFrom: string[];
  coveragePercent: number;
}

/** GET — Analyze store alignment: find listings not published on all platforms */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetPlatforms = searchParams.get("platforms")?.split(",").filter(Boolean) || ALL_PLATFORMS;

  const listings = await prisma.listing.findMany({
    where: { status: { not: "sold" } },
    include: {
      platformListings: { where: { status: { in: ["published", "draft"] } } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get connected platforms
  const credentials = await prisma.platformCredential.findMany();
  const connectedPlatforms = credentials.map((c) => c.platform);

  // Analyze gaps
  const gaps: GapItem[] = [];
  let fullyAligned = 0;
  const platformCoverage: Record<string, { listed: number; total: number }> = {};

  for (const p of targetPlatforms) {
    platformCoverage[p] = { listed: 0, total: listings.length };
  }

  for (const listing of listings) {
    const listedOn = listing.platformListings.map((pl) => pl.platform);
    const missingFrom = targetPlatforms.filter(
      (p) => !listedOn.includes(p) && connectedPlatforms.includes(p)
    );

    for (const p of listedOn) {
      if (platformCoverage[p]) platformCoverage[p].listed++;
    }

    if (missingFrom.length === 0) {
      fullyAligned++;
    } else {
      gaps.push({
        listingId: listing.id,
        title: listing.title,
        brand: listing.brand,
        price: listing.price,
        category: listing.category,
        listedOn,
        missingFrom,
        coveragePercent: Math.round((listedOn.length / targetPlatforms.length) * 100),
      });
    }
  }

  // Sort: most gaps first
  gaps.sort((a, b) => b.missingFrom.length - a.missingFrom.length);

  const overallCoverage = listings.length > 0
    ? Math.round((fullyAligned / listings.length) * 100)
    : 100;

  return NextResponse.json({
    totalListings: listings.length,
    fullyAligned,
    withGaps: gaps.length,
    overallCoverage,
    connectedPlatforms,
    targetPlatforms,
    platformCoverage,
    gaps,
  });
}
