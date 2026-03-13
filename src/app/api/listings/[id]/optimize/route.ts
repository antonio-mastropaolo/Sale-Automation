import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { optimizeForAllPlatforms, Platform } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const platforms = body.platforms as Platform[] | undefined;

  const optimized = await optimizeForAllPlatforms(
    {
      title: listing.title,
      description: listing.description,
      category: listing.category,
      brand: listing.brand,
      size: listing.size,
      condition: listing.condition,
      price: listing.price,
    },
    platforms
  );

  // Upsert platform listings
  const platformListings = await Promise.all(
    optimized.map(async (opt) => {
      const existing = await prisma.platformListing.findFirst({
        where: { listingId: id, platform: opt.platform },
      });

      if (existing) {
        return prisma.platformListing.update({
          where: { id: existing.id },
          data: {
            optimizedTitle: opt.title,
            optimizedDescription: opt.description,
            hashtags: JSON.stringify(opt.hashtags),
            suggestedPrice: opt.suggestedPrice,
          },
        });
      }

      return prisma.platformListing.create({
        data: {
          listingId: id,
          platform: opt.platform,
          optimizedTitle: opt.title,
          optimizedDescription: opt.description,
          hashtags: JSON.stringify(opt.hashtags),
          suggestedPrice: opt.suggestedPrice,
        },
      });
    })
  );

  return NextResponse.json(platformListings);
}
