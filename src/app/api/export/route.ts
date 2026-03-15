import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "sales") {
    const sales = await prisma.sale.findMany({
      orderBy: { soldAt: "desc" },
    });

    const headers = [
      "Title",
      "Platform",
      "Sold Price",
      "Cost Price",
      "Shipping Cost",
      "Platform Fee",
      "Profit",
      "Buyer",
      "Sold At",
      "Notes",
    ];

    const rows = sales.map((s) => [
      csvEscape(s.title),
      s.platform,
      s.soldPrice.toFixed(2),
      s.costPrice.toFixed(2),
      s.shippingCost.toFixed(2),
      s.platformFee.toFixed(2),
      s.profit.toFixed(2),
      csvEscape(s.buyerName),
      new Date(s.soldAt).toISOString(),
      csvEscape(s.notes),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales-export-${Date.now()}.csv"`,
      },
    });
  }

  if (type === "listings") {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Title",
      "Description",
      "Category",
      "Brand",
      "Size",
      "Condition",
      "Price",
      "Cost Price",
      "Status",
      "Created At",
    ];

    const rows = listings.map((l) => [
      csvEscape(l.title),
      csvEscape(l.description),
      csvEscape(l.category),
      csvEscape(l.brand),
      csvEscape(l.size),
      l.condition,
      l.price.toFixed(2),
      l.costPrice.toFixed(2),
      l.status,
      new Date(l.createdAt).toISOString(),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="listings-export-${Date.now()}.csv"`,
      },
    });
  }

  return NextResponse.json(
    { error: 'Query param "type" must be "sales" or "listings"' },
    { status: 400 }
  );
}

function csvEscape(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
