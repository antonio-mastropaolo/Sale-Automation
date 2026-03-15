#!/usr/bin/env python3
"""Generate CrossList Codebase Overview PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Colors
PRIMARY = HexColor("#1a1a2e")
ACCENT = HexColor("#e94560")
DARK_GRAY = HexColor("#333333")
MEDIUM_GRAY = HexColor("#666666")
LIGHT_GRAY = HexColor("#f0f0f0")
WHITE = HexColor("#ffffff")
BLUE = HexColor("#0066cc")

doc = SimpleDocTemplate(
    "/Users/amastro/Sale-Automation/docs/codebase-overview.pdf",
    pagesize=letter,
    topMargin=0.75 * inch,
    bottomMargin=0.75 * inch,
    leftMargin=0.85 * inch,
    rightMargin=0.85 * inch,
)

styles = getSampleStyleSheet()

# Custom styles
styles.add(ParagraphStyle(
    "DocTitle", parent=styles["Title"],
    fontSize=28, textColor=PRIMARY, spaceAfter=6,
    fontName="Helvetica-Bold"
))
styles.add(ParagraphStyle(
    "DocSubtitle", parent=styles["Normal"],
    fontSize=14, textColor=ACCENT, spaceAfter=24,
    fontName="Helvetica"
))
styles.add(ParagraphStyle(
    "SectionHead", parent=styles["Heading1"],
    fontSize=18, textColor=PRIMARY, spaceBefore=20, spaceAfter=10,
    fontName="Helvetica-Bold", borderColor=ACCENT, borderWidth=0,
    borderPadding=0
))
styles.add(ParagraphStyle(
    "SubHead", parent=styles["Heading2"],
    fontSize=13, textColor=DARK_GRAY, spaceBefore=12, spaceAfter=6,
    fontName="Helvetica-Bold"
))
styles.add(ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontSize=10, textColor=DARK_GRAY, spaceAfter=6,
    fontName="Helvetica", leading=14
))
styles.add(ParagraphStyle(
    "BulletItem", parent=styles["Normal"],
    fontSize=10, textColor=DARK_GRAY, spaceAfter=4,
    fontName="Helvetica", leading=14,
    leftIndent=20, bulletIndent=8
))
styles.add(ParagraphStyle(
    "CodeBlock", parent=styles["Normal"],
    fontSize=8.5, textColor=DARK_GRAY, spaceAfter=4,
    fontName="Courier", leading=12, leftIndent=15,
    backColor=LIGHT_GRAY
))
styles.add(ParagraphStyle(
    "SmallNote", parent=styles["Normal"],
    fontSize=8, textColor=MEDIUM_GRAY, spaceAfter=2,
    fontName="Helvetica-Oblique"
))

story = []

# ── Title Page ──
story.append(Spacer(1, 2 * inch))
story.append(Paragraph("CrossList", styles["DocTitle"]))
story.append(Paragraph("Codebase Overview &amp; Architecture Guide", styles["DocSubtitle"]))
story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=12))
story.append(Spacer(1, 0.3 * inch))
story.append(Paragraph(
    "AI-Powered Cross-Platform Resale Automation",
    styles["Body"]
))
story.append(Paragraph(
    "Next.js 16 &bull; React 19 &bull; Prisma &bull; SQLite &bull; OpenAI GPT-4o",
    styles["Body"]
))
story.append(Spacer(1, 0.5 * inch))
story.append(Paragraph("Generated: March 2026", styles["SmallNote"]))
story.append(PageBreak())

# ── Section 1: Project Summary ──
story.append(Paragraph("1. Project Summary", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))
story.append(Paragraph(
    "CrossList is an AI-powered cross-platform resale automation SaaS application. "
    "Built with Next.js 16, React 19, Prisma ORM with SQLite, and OpenAI GPT-4o, "
    "it helps resellers list products across four major secondhand marketplaces "
    "(Depop, Grailed, Poshmark, Mercari) from a single interface.",
    styles["Body"]
))
story.append(Paragraph(
    '<b>Core Value Proposition:</b> "List once, sell everywhere." Upload product details '
    "once and AI optimizes listings for each platform's unique audience, manages inventory, "
    "tracks analytics, and provides market intelligence.",
    styles["Body"]
))

# ── Section 2: Technology Stack ──
story.append(Paragraph("2. Technology Stack", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

tech_data = [
    ["Layer", "Technologies"],
    ["Frontend", "Next.js 16.1.6, React 19.2.3, Tailwind CSS 4 (oklch), Framer Motion, Recharts, shadcn/ui"],
    ["Backend", "Next.js API Routes, Prisma 7.5 ORM, SQLite via better-sqlite3"],
    ["AI / ML", "OpenAI GPT-4o (optimization, vision, pricing, trends, negotiation)"],
    ["Security", "AES-256-GCM encryption for platform credentials"],
    ["Testing", "Playwright with 40+ visual/contract tests"],
    ["Language", "TypeScript 5, ESLint 9"],
]
t = Table(tech_data, colWidths=[1.2 * inch, 5.0 * inch])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
    ("BACKGROUND", (0, 1), (-1, -1), LIGHT_GRAY),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
story.append(t)
story.append(Spacer(1, 8))

# ── Section 3: Project Structure ──
story.append(Paragraph("3. Project Structure", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

structure_lines = [
    "src/",
    "  app/                        Next.js pages &amp; API routes",
    "    page.tsx                   Dashboard (home)",
    "    analytics/page.tsx         Analytics dashboard",
    "    listings/new/page.tsx      Manual listing creation",
    "    listings/smart/page.tsx    AI smart lister (image recognition)",
    "    listings/[id]/page.tsx     Listing detail &amp; optimization",
    "    trends/page.tsx            Market trend radar",
    "    tools/page.tsx             Profit calculator, hashtag generator",
    "    settings/page.tsx          Platform credential management",
    "    api/                       REST API endpoints",
    "      listings/                CRUD + optimize + publish",
    "      platforms/connect/       Credential management",
    "      analytics/               Stats &amp; AI recommendations",
    "      ai/                      optimize, smart-list, price-intel, etc.",
    "  components/                  React components (30+ UI primitives)",
    "  lib/                         Utilities (db, ai, crypto, colors)",
    "prisma/                        Schema &amp; migrations",
    "tests/visual/                  Playwright visual tests",
]
for line in structure_lines:
    story.append(Paragraph(line, styles["CodeBlock"]))

# ── Section 4: Database Schema ──
story.append(Paragraph("4. Database Schema (Prisma / SQLite)", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

schema_data = [
    ["Model", "Key Fields", "Notes"],
    ["Listing", "id, title, description, category,\nbrand, size, condition, price, status", "status: draft | active | sold"],
    ["ListingImage", "id, listingId, path, order", "Max 8 images per listing"],
    ["PlatformListing", "id, listingId, platform,\noptimizedTitle, optimizedDescription,\nhashtags, suggestedPrice, status", "platform: depop | grailed |\nposhmark | mercari | ebay"],
    ["PlatformCredential", "id, platform, encryptedData", "AES-256-GCM encrypted"],
    ["AnalyticsEvent", "id, platformListingId,\neventType, value, recordedAt", "eventType: view | like |\noffer | sale"],
]
t2 = Table(schema_data, colWidths=[1.3 * inch, 2.5 * inch, 2.4 * inch])
t2.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 8.5),
    ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
    ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t2)

story.append(PageBreak())

# ── Section 5: Key Pages & Features ──
story.append(Paragraph("5. Key Pages &amp; Features", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

pages = [
    ("<b>Dashboard (/)</b>", "Stats summary (total listings, active, published, revenue), platform quick stats for all 4 marketplaces, searchable and filterable listings grid with status filtering."),
    ("<b>Smart Lister (/listings/smart)</b>", "Upload a photo and GPT-4o vision API analyzes the item, auto-filling brand, category, condition, price suggestions (3 tiers), hashtags, and style keywords."),
    ("<b>Listing Detail (/listings/[id])</b>", "Image gallery with thumbnails, AI optimization for all 4 platforms, per-platform publish buttons, health score assessment, price intel, and negotiate copilot."),
    ("<b>Trend Radar (/trends)</b>", "Trending categories and brands, hot items, sleeper picks (undervalued items about to trend), seasonal forecast, and platform-specific intelligence."),
    ("<b>Analytics (/analytics)</b>", "Summary stats, platform comparison bar charts (Recharts), per-platform breakdown with conversion rates, AI-generated actionable recommendations."),
    ("<b>Tools (/tools)</b>", "Profit calculator with per-platform fee breakdowns, AI hashtag generator, and AI description writer."),
    ("<b>Settings (/settings)</b>", "Platform credential management with AES-256-GCM encrypted storage. Connect/disconnect per platform with security indicators."),
]
for title, desc in pages:
    story.append(Paragraph(title, styles["SubHead"]))
    story.append(Paragraph(desc, styles["Body"]))

# ── Section 6: API Endpoints ──
story.append(Paragraph("6. API Endpoints", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

api_data = [
    ["Endpoint", "Methods", "Purpose"],
    ["/api/listings", "GET, POST", "List all listings / Create new"],
    ["/api/listings/[id]", "GET, PATCH, DELETE", "Single listing CRUD"],
    ["/api/listings/[id]/optimize", "POST", "AI optimize for all platforms"],
    ["/api/listings/[id]/publish", "POST", "Publish to specific platform"],
    ["/api/platforms/connect", "GET, POST, DELETE", "Credential management"],
    ["/api/analytics", "GET, POST", "Stats &amp; AI recommendations"],
    ["/api/ai/optimize", "POST", "Enhance descriptions"],
    ["/api/ai/smart-list", "POST", "Image recognition (vision API)"],
    ["/api/ai/price-intel", "POST", "Pricing analysis &amp; strategy"],
    ["/api/ai/health-score", "POST", "Listing quality grading"],
    ["/api/ai/negotiate", "POST", "Draft negotiation responses"],
    ["/api/ai/trends", "GET", "Market trend report"],
]
t3 = Table(api_data, colWidths=[2.2 * inch, 1.3 * inch, 2.7 * inch])
t3.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("FONTNAME", (0, 1), (0, -1), "Courier"),
    ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t3)

story.append(PageBreak())

# ── Section 7: Security ──
story.append(Paragraph("7. Security", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

security_items = [
    "<bullet>&bull;</bullet><b>Credential Encryption:</b> AES-256-GCM with random IV per encryption. Stored as iv:tag:ciphertext (hex-encoded). Authentication tag prevents tampering.",
    "<bullet>&bull;</bullet><b>Input Validation:</b> HTML tag stripping on text fields, price bounds ($0.01 - $1,000,000), title max 200 chars, description max 10,000 chars, category and condition enum validation.",
    "<bullet>&bull;</bullet><b>Request Limits:</b> Body size limit 100KB, image file size limit 20MB, image type validation (JPEG, PNG, WebP, GIF only).",
    "<bullet>&bull;</bullet><b>HTTP Method Enforcement:</b> Each API route validates the request method and returns 405 for unsupported methods.",
]
for item in security_items:
    story.append(Paragraph(item, styles["BulletItem"]))

# ── Section 8: Architecture Patterns ──
story.append(Paragraph("8. Architecture Patterns", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

patterns = [
    "<bullet>&bull;</bullet><b>Next.js App Router</b> with colocated API routes for clean separation of pages and endpoints.",
    "<bullet>&bull;</bullet><b>Client-side state</b> managed with React hooks (useState, useEffect). No external state management library.",
    "<bullet>&bull;</bullet><b>Centralized color tokens</b> (colors.ts) for consistent theming across platforms and statuses.",
    "<bullet>&bull;</bullet><b>Modular platform automation</b> using abstract base class with per-platform implementations (Depop, Grailed, Poshmark, Mercari).",
    "<bullet>&bull;</bullet><b>Robust AI response parsing</b> with JSON extraction that handles markdown code fences.",
    "<bullet>&bull;</bullet><b>Prisma singleton pattern</b> prevents multiple database connection instances in Next.js hot-reload.",
    "<bullet>&bull;</bullet><b>oklch color space</b> for perceptually uniform light/dark mode theming via Tailwind CSS 4.",
]
for p in patterns:
    story.append(Paragraph(p, styles["BulletItem"]))

# ── Section 9: Testing ──
story.append(Paragraph("9. Testing", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

story.append(Paragraph(
    "The project includes 40+ Playwright tests organized in 6 test suites, "
    "running against localhost:3000 with Chromium:",
    styles["Body"]
))

test_data = [
    ["Suite", "Tests", "Description"],
    ["Full-page Screenshots", "8", "Light &amp; dark mode across 4 pages"],
    ["Color Token Verification", "12", "oklch to RGB validation"],
    ["Component-level Colors", "12", "Button, card, navbar color contracts"],
    ["WCAG Contrast Compliance", "8", "Min 3:1 and 4.5:1 ratio checks"],
    ["Responsive Layout", "6", "Mobile, tablet, desktop viewports"],
    ["Interactive States", "6", "Hover, active, toggle behaviors"],
]
t4 = Table(test_data, colWidths=[2.0 * inch, 0.8 * inch, 3.4 * inch])
t4.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("ALIGN", (1, 0), (1, -1), "CENTER"),
]))
story.append(t4)

# ── Section 10: Environment Variables ──
story.append(Paragraph("10. Environment Variables", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

env_data = [
    ["Variable", "Description", "Default"],
    ["DATABASE_URL", "SQLite file path", "file:./dev.db"],
    ["OPENAI_API_KEY", "OpenAI API key for all AI features", "(required)"],
    ["ENCRYPTION_KEY", "64-char hex string for AES-256-GCM", "(required)"],
]
t5 = Table(env_data, colWidths=[1.8 * inch, 2.8 * inch, 1.6 * inch])
t5.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
    ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTSIZE", (0, 0), (-1, -1), 9),
    ("FONTNAME", (0, 1), (0, -1), "Courier"),
    ("FONTNAME", (1, 1), (-1, -1), "Helvetica"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [LIGHT_GRAY, WHITE]),
    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
]))
story.append(t5)

# ── Section 11: Current Limitations ──
story.append(Paragraph("11. Current Limitations", styles["SectionHead"]))
story.append(HRFlowable(width="100%", thickness=1, color=ACCENT, spaceAfter=10))

limitations = [
    "<bullet>&bull;</bullet>Platform automation (Depop, Grailed, Poshmark, Mercari) uses <b>placeholder implementations</b> with console.log stubs.",
    "<bullet>&bull;</bullet>Bulk operations, scheduled repricing, and buyer messaging are <b>not yet implemented</b>.",
    "<bullet>&bull;</bullet>No external analytics integration (self-hosted event tracking only).",
    "<bullet>&bull;</bullet>Images stored as-is without optimization or CDN delivery.",
    "<bullet>&bull;</bullet>Single-instance SQLite database (not suitable for horizontal scaling).",
]
for lim in limitations:
    story.append(Paragraph(lim, styles["BulletItem"]))

# Build
doc.build(story)
print("PDF generated: /Users/amastro/Sale-Automation/docs/codebase-overview.pdf")
