import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wantStats = searchParams.get("stats") === "true";

  const sales = await prisma.sale.findMany({
    orderBy: { soldAt: "desc" },
  });

  if (!wantStats) {
    return NextResponse.json(sales);
  }

  // Aggregate stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.soldPrice, 0);
  const totalCost = sales.reduce(
    (sum, s) => sum + s.costPrice + s.shippingCost + s.platformFee,
    0
  );
  const totalProfit = sales.reduce((sum, s) => sum + s.profit, 0);
  const count = sales.length;
  const avgProfitMargin =
    count > 0 && totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Monthly breakdown (last 6 months)
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const monthlyBreakdown: Record<
    string,
    { revenue: number; profit: number; count: number }
  > = {};

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyBreakdown[key] = { revenue: 0, profit: 0, count: 0 };
  }

  for (const sale of sales) {
    const soldDate = new Date(sale.soldAt);
    if (soldDate >= sixMonthsAgo) {
      const key = `${soldDate.getFullYear()}-${String(soldDate.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyBreakdown[key]) {
        monthlyBreakdown[key].revenue += sale.soldPrice;
        monthlyBreakdown[key].profit += sale.profit;
        monthlyBreakdown[key].count += 1;
      }
    }
  }

  // Per-platform breakdown
  const platformMap: Record<
    string,
    { revenue: number; profit: number; count: number }
  > = {};
  for (const sale of sales) {
    if (!platformMap[sale.platform]) {
      platformMap[sale.platform] = { revenue: 0, profit: 0, count: 0 };
    }
    platformMap[sale.platform].revenue += sale.soldPrice;
    platformMap[sale.platform].profit += sale.profit;
    platformMap[sale.platform].count += 1;
  }

  return NextResponse.json({
    sales,
    stats: {
      totalRevenue,
      totalProfit,
      totalCost,
      count,
      avgProfitMargin,
      monthlyBreakdown,
      platformBreakdown: platformMap,
    },
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    listingId,
    platform,
    title,
    soldPrice,
    costPrice,
    shippingCost,
    platformFee,
  } = body as {
    listingId?: string;
    platform?: string;
    title?: string;
    soldPrice?: number;
    costPrice?: number;
    shippingCost?: number;
    platformFee?: number;
  };

  if (!platform || !title || soldPrice == null) {
    return NextResponse.json(
      { error: "platform, title, and soldPrice are required" },
      { status: 400 }
    );
  }

  const safeCostPrice = costPrice || 0;
  const safeShippingCost = shippingCost || 0;
  const safePlatformFee = platformFee || 0;
  const profit = soldPrice - safeCostPrice - safeShippingCost - safePlatformFee;

  const sale = await prisma.sale.create({
    data: {
      listingId: listingId || null,
      platform,
      title,
      soldPrice,
      costPrice: safeCostPrice,
      shippingCost: safeShippingCost,
      platformFee: safePlatformFee,
      profit,
    },
  });

  // If a listingId was provided, mark the listing as sold
  if (listingId) {
    try {
      await prisma.listing.update({
        where: { id: listingId },
        data: { status: "sold" },
      });
    } catch {
      // Listing may not exist; sale is still valid
    }
  }

  return NextResponse.json(sale, { status: 201 });
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
    await prisma.sale.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });
  }
}
