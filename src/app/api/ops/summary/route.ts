import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ── Listing counts by status ──
    const [total, active, draft, sold] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { status: "draft" } }),
      prisma.listing.count({ where: { status: "sold" } }),
    ]);

    // ── Published platform listings ──
    const published = await prisma.platformListing.count({
      where: { status: "published" },
    });

    // ── Scheduled posts ──
    const scheduled = await prisma.scheduledPost.count({
      where: { status: "pending" },
    });

    // ── Failed platform listings (proxy for failed jobs) ──
    const failed = await prisma.platformListing.count({
      where: { status: "failed" },
    });

    // ── Recent events (last 20 analytics events) ──
    const recentEvents = await prisma.analyticsEvent.findMany({
      take: 20,
      orderBy: { recordedAt: "desc" },
      select: {
        id: true,
        eventType: true,
        value: true,
        recordedAt: true,
        platformListing: {
          select: {
            platform: true,
            listing: { select: { title: true } },
          },
        },
      },
    });

    const events = recentEvents.map((e) => ({
      id: e.id,
      type: e.eventType,
      platform: e.platformListing?.platform ?? "unknown",
      value: e.value,
      title: e.platformListing?.listing?.title ?? "Unknown",
      ts: e.recordedAt.toISOString(),
    }));

    // ── System metrics ──
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    // DB latency check
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Math.round(performance.now() - dbStart);

    const system = {
      memory: {
        usedMB: Math.round(mem.heapUsed / 1024 / 1024),
        totalMB: Math.round(mem.heapTotal / 1024 / 1024),
        percent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      db: { latencyMs: dbLatency, status: dbLatency < 200 ? "ok" : "slow" },
      uptime: Math.round(uptime),
    };

    return NextResponse.json({
      listings: { total, active, draft, sold },
      published,
      scheduled,
      failed,
      events,
      system,
    });
  } catch (err) {
    console.error("Ops summary error:", err);
    return NextResponse.json(
      { error: "Failed to load ops summary" },
      { status: 500 }
    );
  }
}
