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

    // ── Failed platform listings ──
    const failed = await prisma.platformListing.count({
      where: { status: "failed" },
    });

    // ── Recent activity log events (last 30) ──
    const recentLogs = await prisma.activityLog.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    const events = recentLogs.map((log) => ({
      id: log.id,
      type: log.type,
      platform: log.platform,
      title: log.title,
      detail: log.detail,
      severity: log.severity,
      ts: log.createdAt.toISOString(),
    }));

    // ── System metrics ──
    const mem = process.memoryUsage();
    const uptime = process.uptime();

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

    // ── Occasional cleanup: prune logs older than 30 days ──
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff } } }).catch(() => {});
    }

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
