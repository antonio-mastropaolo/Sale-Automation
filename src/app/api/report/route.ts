import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Aggregates all data needed for the PDF business report */
export async function GET() {
  try {
    // ── Listing stats ──
    const [total, active, draft, sold] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "active" } }),
      prisma.listing.count({ where: { status: "draft" } }),
      prisma.listing.count({ where: { status: "sold" } }),
    ]);

    // ── Platform breakdown ──
    const platformListings = await prisma.platformListing.groupBy({
      by: ["platform"],
      _count: true,
      where: { status: "published" },
    });

    const platformStats = platformListings.map((p) => ({
      platform: p.platform,
      published: p._count,
    }));

    // ── Sales data ──
    const sales = await prisma.sale.findMany({
      orderBy: { soldAt: "desc" },
      take: 50,
    });

    const totalRevenue = sales.reduce((sum, s) => sum + s.soldPrice, 0);
    const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
    const totalCost = sales.reduce((sum, s) => sum + s.costPrice, 0);
    const totalFees = sales.reduce((sum, s) => sum + s.platformFee, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Monthly breakdown (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySales = await prisma.sale.findMany({
      where: { soldAt: { gte: sixMonthsAgo } },
      orderBy: { soldAt: "asc" },
    });

    const monthlyMap: Record<string, { revenue: number; profit: number; count: number }> = {};
    monthlySales.forEach((s) => {
      const key = `${s.soldAt.getFullYear()}-${String(s.soldAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, profit: 0, count: 0 };
      monthlyMap[key].revenue += s.soldPrice;
      monthlyMap[key].profit += s.profit;
      monthlyMap[key].count += 1;
    });

    const monthlyBreakdown = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Platform revenue breakdown
    const platformRevenue: Record<string, { revenue: number; profit: number; count: number }> = {};
    sales.forEach((s) => {
      if (!platformRevenue[s.platform]) platformRevenue[s.platform] = { revenue: 0, profit: 0, count: 0 };
      platformRevenue[s.platform].revenue += s.soldPrice;
      platformRevenue[s.platform].profit += s.profit;
      platformRevenue[s.platform].count += 1;
    });

    // ── Top listings by price ──
    const topListings = await prisma.listing.findMany({
      take: 10,
      orderBy: { price: "desc" },
      select: { title: true, brand: true, price: true, status: true, category: true },
    });

    // ── Recent activity ──
    const recentActivity = await prisma.activityLog.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      select: { type: true, title: true, platform: true, severity: true, createdAt: true },
    });

    // ── Scheduled posts ──
    const scheduledCount = await prisma.scheduledPost.count({ where: { status: "pending" } });

    // ── Platform credentials ──
    const credentials = await prisma.platformCredential.findMany({ select: { platform: true } });

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      listings: { total, active, draft, sold },
      platformStats,
      sales: {
        count: sales.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        avgMargin: Math.round(avgMargin * 10) / 10,
        monthlyBreakdown,
        platformBreakdown: Object.entries(platformRevenue).map(([platform, data]) => ({
          platform,
          ...data,
        })),
        recentSales: sales.slice(0, 10).map((s) => ({
          title: s.title,
          platform: s.platform,
          soldPrice: s.soldPrice,
          profit: s.profit,
          soldAt: s.soldAt.toISOString(),
        })),
      },
      topListings,
      recentActivity: recentActivity.map((a) => ({
        type: a.type,
        title: a.title,
        platform: a.platform,
        severity: a.severity,
        ts: a.createdAt.toISOString(),
      })),
      scheduledPosts: scheduledCount,
      connectedPlatforms: credentials.map((c) => c.platform),
    });
  } catch (err) {
    console.error("Report data error:", err);
    return NextResponse.json({ error: "Failed to generate report data" }, { status: 500 });
  }
}
