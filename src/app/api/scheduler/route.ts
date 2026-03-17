import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  const posts = await prisma.scheduledPost.findMany({
    include: { listing: true },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json(posts);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { listingId, platform, scheduledAt } = body as {
    listingId?: string;
    platform?: string;
    scheduledAt?: string;
  };

  if (!listingId || !platform || !scheduledAt) {
    return NextResponse.json(
      { error: "listingId, platform, and scheduledAt are required" },
      { status: 400 }
    );
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json(
      { error: "scheduledAt must be a valid date string" },
      { status: 400 }
    );
  }

  // Verify the listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });
  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404 }
    );
  }

  const post = await prisma.scheduledPost.create({
    data: {
      listingId,
      platform,
      scheduledAt: scheduledDate,
    },
    include: { listing: true },
  });

  await logActivity({ type: "schedule_created", title: listing.title, platform: body.platform as string });

  return NextResponse.json(post, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "Query param 'id' is required" },
      { status: 400 }
    );
  }

  try {
    await prisma.scheduledPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Scheduled post not found" },
      { status: 404 }
    );
  }
}
