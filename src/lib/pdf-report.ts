import jsPDF from "jspdf";

/* ── Types ── */

interface ReportData {
  generatedAt: string;
  listings: { total: number; active: number; draft: number; sold: number };
  platformStats: { platform: string; published: number }[];
  sales: {
    count: number;
    totalRevenue: number;
    totalProfit: number;
    totalCost: number;
    totalFees: number;
    avgMargin: number;
    monthlyBreakdown: { month: string; revenue: number; profit: number; count: number }[];
    platformBreakdown: { platform: string; revenue: number; profit: number; count: number }[];
    recentSales: { title: string; platform: string; soldPrice: number; profit: number; soldAt: string }[];
  };
  topListings: { title: string; brand: string; price: number; status: string; category: string }[];
  recentActivity: { type: string; title: string; platform: string; severity: string; ts: string }[];
  scheduledPosts: number;
  connectedPlatforms: string[];
}

/* ── Color palette ── */

const COLORS = {
  bg: [12, 18, 34] as [number, number, number],       // dark navy
  card: [20, 29, 47] as [number, number, number],     // card bg
  primary: [59, 130, 246] as [number, number, number], // blue
  purple: [124, 58, 237] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  muted: [148, 163, 184] as [number, number, number],
  dimText: [100, 116, 139] as [number, number, number],
};

const PLATFORMS = ["Depop", "Grailed", "Poshmark", "Mercari", "eBay", "Vinted", "Facebook", "Vestiaire"];

/* ── Helpers ── */

function fmt$(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMonth(m: string): string {
  const [year, month] = m.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

/* ── Cover page ── */

function drawCoverPage(doc: jsPDF, data: ReportData) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Dark background
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, W, H, "F");

  // Gradient stripe at top
  for (let i = 0; i < 6; i++) {
    const alpha = 0.15 - i * 0.02;
    doc.setFillColor(59, 130, 246);
    doc.setGState(doc.GState({ opacity: alpha }));
    doc.rect(0, i * 2, W, 2, "F");
  }
  doc.setGState(doc.GState({ opacity: 1 }));

  // Lightning bolt icon (simplified)
  const cx = W / 2;
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(cx - 18, 55, 36, 36, 8, 8, "F");
  doc.setFillColor(...COLORS.white);
  doc.setFontSize(24);
  doc.text("⚡", cx, 79, { align: "center" });

  // Title
  doc.setFontSize(32);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text("ListBlitz", cx, 115, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.text("AI-POWERED CROSS-PLATFORM LISTING", cx, 126, { align: "center" });

  // Tagline
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("List once, sell everywhere", cx, 148, { align: "center" });

  // Platform badges
  const badges = PLATFORMS;
  const badgeW = 22;
  const totalBadgeW = badges.length * badgeW + (badges.length - 1) * 4;
  let bx = cx - totalBadgeW / 2;
  doc.setFontSize(6.5);
  badges.forEach((p) => {
    const isConnected = data.connectedPlatforms.includes(p.toLowerCase());
    if (isConnected) {
      doc.setFillColor(...COLORS.primary);
      doc.setTextColor(...COLORS.white);
    } else {
      doc.setFillColor(30, 41, 59);
      doc.setTextColor(...COLORS.dimText);
    }
    doc.roundedRect(bx, 162, badgeW, 10, 2, 2, "F");
    doc.text(p, bx + badgeW / 2, 168.5, { align: "center" });
    bx += badgeW + 4;
  });

  // Divider
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(40, 185, W - 40, 185);

  // Key metrics
  const metrics = [
    { label: "Total Listings", value: String(data.listings.total), color: COLORS.primary },
    { label: "Active", value: String(data.listings.active), color: COLORS.emerald },
    { label: "Published", value: String(data.sales.count > 0 ? data.platformStats.reduce((s, p) => s + p.published, 0) : 0), color: COLORS.amber },
    { label: "Revenue", value: fmt$(data.sales.totalRevenue), color: COLORS.emerald },
  ];

  const mw = 42;
  const mx = cx - (metrics.length * mw + (metrics.length - 1) * 6) / 2;
  metrics.forEach((m, i) => {
    const x = mx + i * (mw + 6);
    doc.setFillColor(...COLORS.card);
    doc.roundedRect(x, 195, mw, 32, 3, 3, "F");

    doc.setFontSize(14);
    doc.setTextColor(...m.color);
    doc.setFont("helvetica", "bold");
    doc.text(m.value, x + mw / 2, 210, { align: "center" });

    doc.setFontSize(6);
    doc.setTextColor(...COLORS.dimText);
    doc.setFont("helvetica", "normal");
    doc.text(m.label, x + mw / 2, 220, { align: "center" });
  });

  // Report date
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dimText);
  doc.text(`Business Report · ${fmtDate(data.generatedAt)}`, cx, 250, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(60, 70, 90);
  doc.text("Generated by ListBlitz.io", cx, H - 15, { align: "center" });
  doc.text("listblitz.io", cx, H - 10, { align: "center" });
}

/* ── Section header ── */

function drawSectionHeader(doc: jsPDF, y: number, title: string): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...COLORS.primary);
  doc.rect(20, y, 3, 12, "F");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.text(title, 28, y + 9);
  doc.setDrawColor(30, 41, 59);
  doc.line(20, y + 16, W - 20, y + 16);
  return y + 22;
}

/* ── Check page break ── */

function checkPage(doc: jsPDF, y: number, needed: number): number {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - 25) {
    doc.addPage();
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(...COLORS.bg);
    doc.rect(0, 0, W, H, "F");
    return 20;
  }
  return y;
}

/* ── New page with dark background ── */

function newPage(doc: jsPDF): number {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(...COLORS.bg);
  doc.rect(0, 0, W, H, "F");
  return 20;
}

/* ── Main generator ── */

export async function generatePDFReport(): Promise<void> {
  // Fetch report data
  const res = await fetch("/api/report");
  if (!res.ok) throw new Error("Failed to fetch report data");
  const data: ReportData = await res.json();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // ═══ PAGE 1: Cover ═══
  drawCoverPage(doc, data);

  // ═══ PAGE 2: Executive Summary + Sales ═══
  let y = newPage(doc);

  y = drawSectionHeader(doc, y, "Executive Summary");

  // Stat cards
  const summaryItems = [
    { label: "Total Listings", value: String(data.listings.total) },
    { label: "Active", value: String(data.listings.active) },
    { label: "Draft", value: String(data.listings.draft) },
    { label: "Sold", value: String(data.listings.sold) },
    { label: "Revenue", value: fmt$(data.sales.totalRevenue) },
    { label: "Profit", value: fmt$(data.sales.totalProfit) },
    { label: "Avg Margin", value: `${data.sales.avgMargin}%` },
    { label: "Platforms", value: `${data.connectedPlatforms.length}/8` },
  ];

  const cardW = (W - 50) / 4;
  summaryItems.forEach((item, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 20 + col * (cardW + 3);
    const cy = y + row * 22;

    doc.setFillColor(...COLORS.card);
    doc.roundedRect(x, cy, cardW, 18, 2, 2, "F");

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text(item.value, x + cardW / 2, cy + 9, { align: "center" });

    doc.setFontSize(6);
    doc.setTextColor(...COLORS.dimText);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, x + cardW / 2, cy + 15, { align: "center" });
  });

  y += 50;

  // ── Sales by Platform ──
  y = drawSectionHeader(doc, y, "Revenue by Platform");

  if (data.sales.platformBreakdown.length > 0) {
    // Table header
    doc.setFillColor(20, 29, 47);
    doc.rect(20, y, W - 40, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.dimText);
    doc.setFont("helvetica", "bold");
    doc.text("Platform", 25, y + 5.5);
    doc.text("Sales", 80, y + 5.5);
    doc.text("Revenue", 110, y + 5.5);
    doc.text("Profit", 145, y + 5.5);
    y += 10;

    data.sales.platformBreakdown.forEach((p) => {
      y = checkPage(doc, y, 8);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "normal");
      doc.text(p.platform.charAt(0).toUpperCase() + p.platform.slice(1), 25, y + 5);
      doc.text(String(p.count), 80, y + 5);
      doc.setTextColor(...COLORS.emerald);
      doc.text(fmt$(p.revenue), 110, y + 5);
      doc.setTextColor(p.profit >= 0 ? COLORS.emerald[0] : COLORS.red[0], p.profit >= 0 ? COLORS.emerald[1] : COLORS.red[1], p.profit >= 0 ? COLORS.emerald[2] : COLORS.red[2]);
      doc.text(fmt$(p.profit), 145, y + 5);
      y += 8;
    });

    // Total row
    doc.setDrawColor(30, 41, 59);
    doc.line(20, y, W - 20, y);
    y += 2;
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.text("Total", 25, y + 5);
    doc.text(String(data.sales.count), 80, y + 5);
    doc.setTextColor(...COLORS.emerald);
    doc.text(fmt$(data.sales.totalRevenue), 110, y + 5);
    doc.text(fmt$(data.sales.totalProfit), 145, y + 5);
    y += 14;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dimText);
    doc.text("No sales recorded yet", 25, y + 8);
    y += 16;
  }

  // ── Monthly Trend ──
  if (data.sales.monthlyBreakdown.length > 0) {
    y = checkPage(doc, y, 50);
    y = drawSectionHeader(doc, y, "Monthly Revenue Trend");

    const months = data.sales.monthlyBreakdown;
    const maxRev = Math.max(...months.map((m) => m.revenue), 1);
    const barAreaW = W - 60;
    const barW = Math.min(20, barAreaW / months.length - 3);

    months.forEach((m, i) => {
      const x = 25 + i * (barW + 3);
      const barH = Math.max(2, (m.revenue / maxRev) * 35);

      doc.setFillColor(...COLORS.primary);
      doc.roundedRect(x, y + 35 - barH, barW, barH, 1, 1, "F");

      doc.setFontSize(6);
      doc.setTextColor(...COLORS.dimText);
      doc.text(fmtMonth(m.month), x + barW / 2, y + 42, { align: "center" });

      doc.setFontSize(5.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(fmt$(m.revenue), x + barW / 2, y + 35 - barH - 2, { align: "center" });
    });

    y += 52;
  }

  // ═══ PAGE 3: Listings & Activity ═══
  y = checkPage(doc, y, 60);
  if (y < 30) y = 20;

  y = drawSectionHeader(doc, y, "Top Listings");

  if (data.topListings.length > 0) {
    doc.setFillColor(20, 29, 47);
    doc.rect(20, y, W - 40, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.dimText);
    doc.setFont("helvetica", "bold");
    doc.text("Title", 25, y + 5.5);
    doc.text("Brand", 100, y + 5.5);
    doc.text("Category", 130, y + 5.5);
    doc.text("Price", 165, y + 5.5);
    y += 10;

    data.topListings.forEach((l) => {
      y = checkPage(doc, y, 8);
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "normal");
      doc.text(l.title.slice(0, 35) + (l.title.length > 35 ? "…" : ""), 25, y + 5);
      doc.setTextColor(...COLORS.muted);
      doc.text(l.brand.slice(0, 15), 100, y + 5);
      doc.text(l.category, 130, y + 5);
      doc.setTextColor(...COLORS.emerald);
      doc.text(fmt$(l.price), 165, y + 5);
      y += 8;
    });

    y += 8;
  }

  // ── Recent Activity ──
  y = checkPage(doc, y, 50);
  y = drawSectionHeader(doc, y, "Recent Activity");

  if (data.recentActivity.length > 0) {
    data.recentActivity.forEach((a) => {
      y = checkPage(doc, y, 7);
      const dotColor = a.severity === "error" ? COLORS.red : a.severity === "success" ? COLORS.emerald : COLORS.muted;
      doc.setFillColor(...dotColor);
      doc.circle(25, y + 3, 1.5, "F");

      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "normal");
      doc.text(a.type.replace(/_/g, " "), 30, y + 4.5);

      doc.setTextColor(...COLORS.dimText);
      doc.text(a.title.slice(0, 30), 70, y + 4.5);

      if (a.platform) {
        doc.text(a.platform, 130, y + 4.5);
      }

      doc.setFontSize(6.5);
      doc.text(fmtDate(a.ts), 160, y + 4.5);
      y += 7;
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.dimText);
    doc.text("No recent activity", 25, y + 8);
  }

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFontSize(6.5);
    doc.setTextColor(60, 70, 90);
    doc.text("ListBlitz.io · Business Report", 20, pH - 8);
    doc.text(`Page ${i - 1} of ${pageCount - 1}`, W - 20, pH - 8, { align: "right" });
    doc.text(fmtDate(data.generatedAt), W / 2, pH - 8, { align: "center" });
  }

  // Save
  doc.save(`ListBlitz-Report-${new Date().toISOString().split("T")[0]}.pdf`);
}
