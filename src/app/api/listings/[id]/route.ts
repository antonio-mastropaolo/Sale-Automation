import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { order: "asc" } },
      platformListings: {
        include: { analyticsEvents: true },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(listing);
}

const VALID_CATEGORIES = [
  "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
  "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
  "Vintage", "Designer", "Sportswear", "Other",
];
const VALID_CONDITIONS = ["New with tags", "Like new", "Good", "Fair", "Poor"];
const VALID_STATUSES = ["draft", "active", "sold"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check listing exists first
  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Whitelist allowed fields and validate
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = String(body.title).replace(/<[^>]*>/g, "").trim();
    if (!title || title.length > 200) {
      return NextResponse.json({ error: "Title must be 1-200 characters" }, { status: 400 });
    }
    updates.title = title;
  }
  if (body.description !== undefined) {
    updates.description = String(body.description).replace(/<[^>]*>/g, "").trim();
  }
  if (body.category !== undefined) {
    if (!VALID_CATEGORIES.includes(body.category as string)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    updates.category = body.category;
  }
  if (body.brand !== undefined) {
    updates.brand = String(body.brand).replace(/<[^>]*>/g, "").trim();
  }
  if (body.size !== undefined) {
    updates.size = String(body.size).replace(/<[^>]*>/g, "").trim();
  }
  if (body.condition !== undefined) {
    if (!VALID_CONDITIONS.includes(body.condition as string)) {
      return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
    }
    updates.condition = body.condition;
  }
  if (body.price !== undefined) {
    const price = parseFloat(String(body.price));
    if (isNaN(price) || price <= 0 || price > 1_000_000) {
      return NextResponse.json({ error: "Price must be between $0.01 and $1,000,000" }, { status: 400 });
    }
    updates.price = price;
  }
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as string)) {
      return NextResponse.json({ error: "Status must be one of: draft, active, sold" }, { status: 400 });
    }
    updates.status = body.status;
  }

  const listing = await prisma.listing.update({
    where: { id },
    data: updates,
    include: {
      images: { orderBy: { order: "asc" } },
      platformListings: true,
    },
  });

  return NextResponse.json(listing);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.listing.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
