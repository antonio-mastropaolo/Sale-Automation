import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { platforms } from "@/lib/platforms";
import { logActivity } from "@/lib/activity-log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const platform = body.platform as string;

  if (!platform || !platforms[platform]) {
    return NextResponse.json(
      { error: "Invalid platform" },
      { status: 400 }
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      platformListings: {
        where: { platform },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const platformListing = listing.platformListings[0];
  if (!platformListing) {
    return NextResponse.json(
      { error: "Listing not optimized for this platform yet. Run optimize first." },
      { status: 400 }
    );
  }

  try {
    const automation = platforms[platform];
    const result = await automation.publish({
      title: platformListing.optimizedTitle,
      description: platformListing.optimizedDescription,
      price: platformListing.suggestedPrice || listing.price,
      category: listing.category,
      brand: listing.brand,
      size: listing.size,
      condition: listing.condition,
      images: listing.images.map((img) => img.path),
      hashtags: JSON.parse(platformListing.hashtags || "[]"),
    });

    await Promise.all([
      prisma.platformListing.update({
        where: { id: platformListing.id },
        data: { status: "published", platformUrl: result.url, publishedAt: new Date() },
      }),
      prisma.listing.update({
        where: { id },
        data: { status: "active" },
      }),
      logActivity({ type: "publish_success", title: listing.title, platform, severity: "success" }),
    ]);

    return NextResponse.json({ success: true, url: result.url });
  } catch (error) {
    await prisma.platformListing.update({
      where: { id: platformListing.id },
      data: { status: "failed" },
    });

    await logActivity({ type: "publish_failed", title: listing.title, platform, severity: "error", detail: error instanceof Error ? error.message : "Unknown" });

    const errMsg = error instanceof Error ? error.message : "Publishing failed";
    const isBackendDown = errMsg.includes("ECONNREFUSED") || errMsg.includes("fetch failed") || errMsg.includes("timeout");
    const userMessage = isBackendDown
      ? `Could not reach the automation backend. Make sure the publishing service is running.`
      : errMsg;

    return NextResponse.json(
      { error: userMessage, detail: errMsg },
      { status: 500 }
    );
  }
}
