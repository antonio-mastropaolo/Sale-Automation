import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, listingIds } = body as {
    action?: string;
    listingIds?: string[];
  };

  if (!action) {
    return NextResponse.json(
      { error: "action is required" },
      { status: 400 }
    );
  }
  if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
    return NextResponse.json(
      { error: "listingIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (action === "activate") {
    const result = await prisma.listing.updateMany({
      where: { id: { in: listingIds } },
      data: { status: "active" },
    });
    return NextResponse.json({ updated: result.count });
  }

  if (action === "deactivate") {
    const result = await prisma.listing.updateMany({
      where: { id: { in: listingIds } },
      data: { status: "draft" },
    });
    return NextResponse.json({ updated: result.count });
  }

  if (action === "delete") {
    const result = await prisma.listing.deleteMany({
      where: { id: { in: listingIds } },
    });
    return NextResponse.json({ updated: result.count });
  }

  if (action === "duplicate") {
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
    });

    const duplicateData = listings.map((listing) => ({
      title: `${listing.title} (Copy)`,
      description: listing.description,
      category: listing.category,
      brand: listing.brand,
      size: listing.size,
      condition: listing.condition,
      price: listing.price,
      costPrice: listing.costPrice,
      status: "draft",
    }));

    const result = await prisma.listing.createMany({ data: duplicateData });
    return NextResponse.json({ updated: result.count });
  }

  return NextResponse.json(
    { error: "Invalid action. Must be one of: activate, deactivate, delete, duplicate" },
    { status: 400 }
  );
}
