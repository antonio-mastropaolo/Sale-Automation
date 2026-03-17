import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiStart = performance.now();

  try {
    // ── Listing counts by status ──
    const [total, active, draft, sold] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { status: "draft" } }),
      prisma.listing.count({ where: { status: "sold" } }),
    ]);

    // ── Published / scheduled / failed ──
    const [published, scheduled, failed] = await Promise.all([
      prisma.platformListing.count({ where: { status: "published" } }),
      prisma.scheduledPost.count({ where: { status: "pending" } }),
      prisma.platformListing.count({ where: { status: "failed" } }),
    ]);

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

    // ── Platform credential health ──
    const credentials = await prisma.platformCredential.findMany({
      select: { platform: true },
    });
    const connectedPlatforms = credentials.map((c) => c.platform);

    // ── AI provider health (from settings) ──
    const aiSettings = await prisma.setting.findMany({
      where: {
        key: { in: ["ai_api_key", "ai_api_key_openai", "ai_api_key_google", "ai_api_key_groq", "ai_provider"] },
      },
    });
    const aiKeySet = aiSettings.some((s) => s.key.startsWith("ai_api_key") && s.value && s.value !== '""');
    const aiProvider = aiSettings.find((s) => s.key === "ai_provider")?.value?.replace(/"/g, "") || "openai";

    // ── System metrics ──
    const mem = process.memoryUsage();
    const uptime = process.uptime();

    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Math.round(performance.now() - dbStart);

    const responseMs = Math.round(performance.now() - apiStart);

    const system = {
      memory: {
        usedMB: Math.round(mem.heapUsed / 1024 / 1024),
        totalMB: Math.round(mem.heapTotal / 1024 / 1024),
        percent: Math.round((mem.heapUsed / mem.heapTotal) * 100),
      },
      db: { latencyMs: dbLatency, status: dbLatency < 200 ? "ok" : "slow" },
      uptime: Math.round(uptime),
      responseMs,
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
      platforms: {
        connected: connectedPlatforms,
        total: 8,
      },
      ai: {
        configured: aiKeySet,
        provider: aiProvider,
      },
    });
  } catch (err) {
    console.error("Ops summary error:", err);
    return NextResponse.json(
      { error: "Failed to load ops summary" },
      { status: 500 }
    );
  }
}
