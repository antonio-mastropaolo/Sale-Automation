import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { parseAIJson } from "@/lib/ai-utils";

// ── Fallback product database for when AI is unavailable ──────────

const FALLBACK_DB: Record<string, Record<string, Array<{
  name: string; subtitle: string; sku: string; imageSearch: string;
  colorway: string; avgResalePrice: number; retailPrice: number;
  demandLevel: string; profitMargin: string; bestPlatform: string;
  seasonality: string; quickTip: string;
}>>> = {
  nike: {
    sneakers: [
      { name: "Nike Air Force 1 Low '07", subtitle: "Classic white-on-white", sku: "CW2288-111", imageSearch: "Nike Air Force 1 Low 07 Triple White CW2288-111", colorway: "White/White", avgResalePrice: 95, retailPrice: 110, demandLevel: "high", profitMargin: "10-20%", bestPlatform: "mercari", seasonality: "Year-round staple", quickTip: "DS pairs in original box command 20% premium" },
      { name: "Nike Dunk Low Panda", subtitle: "Most popular Dunk colorway", sku: "DD1391-100", imageSearch: "Nike Dunk Low Panda DD1391-100 product", colorway: "White/Black", avgResalePrice: 110, retailPrice: 110, demandLevel: "high", profitMargin: "15-30%", bestPlatform: "depop", seasonality: "Year-round, peaks in fall", quickTip: "List on multiple platforms simultaneously for fastest sale" },
      { name: "Nike Air Max 90", subtitle: "Iconic runner silhouette", sku: "CN8490-100", imageSearch: "Nike Air Max 90 White CN8490-100", colorway: "White", avgResalePrice: 100, retailPrice: 130, demandLevel: "medium", profitMargin: "10-25%", bestPlatform: "mercari", seasonality: "Spring/Summer peaks", quickTip: "Vintage OG colorways command 2-3x premium over GRs" },
      { name: "Nike Air Jordan 1 Retro High OG", subtitle: "The grail silhouette", sku: "DZ5485", imageSearch: "Air Jordan 1 Retro High OG product photo", colorway: "Various", avgResalePrice: 200, retailPrice: 180, demandLevel: "high", profitMargin: "20-50%", bestPlatform: "grailed", seasonality: "Year-round, peaks at release", quickTip: "Condition is everything — keep DS pairs with receipt" },
      { name: "Nike Air Max 97 Silver Bullet", subtitle: "Reflective silver classic", sku: "DM0028-002", imageSearch: "Nike Air Max 97 Silver Bullet DM0028-002", colorway: "Metallic Silver", avgResalePrice: 160, retailPrice: 175, demandLevel: "medium", profitMargin: "15-25%", bestPlatform: "grailed", seasonality: "Fall/Winter peak", quickTip: "OG 2017 release fetches significantly more than retros" },
      { name: "Nike SB Dunk Low", subtitle: "Skate-collab favorites", sku: "Various", imageSearch: "Nike SB Dunk Low collaboration colorway", colorway: "Various collabs", avgResalePrice: 180, retailPrice: 120, demandLevel: "high", profitMargin: "30-60%", bestPlatform: "grailed", seasonality: "Collab-dependent", quickTip: "Collaboration pairs (Travis Scott, Ben & Jerry's) are 5-10x retail" },
      { name: "Nike Air Max Plus TN", subtitle: "Tuned Air classic", sku: "604133-139", imageSearch: "Nike Air Max Plus TN Triple White", colorway: "White/White", avgResalePrice: 140, retailPrice: 175, demandLevel: "medium", profitMargin: "10-20%", bestPlatform: "depop", seasonality: "Spring/Summer", quickTip: "European colorways often sell for premium in US market" },
      { name: "Nike Blazer Mid '77 Vintage", subtitle: "Retro basketball heritage", sku: "BQ6806-100", imageSearch: "Nike Blazer Mid 77 Vintage White Black", colorway: "White/Black", avgResalePrice: 75, retailPrice: 105, demandLevel: "medium", profitMargin: "10-20%", bestPlatform: "poshmark", seasonality: "Back-to-school peaks", quickTip: "Bundle with socks or laces for higher perceived value" },
    ],
    outerwear: [
      { name: "Nike ACG Gore-Tex Jacket", subtitle: "Technical outerwear", sku: "CV0598", imageSearch: "Nike ACG Gore-Tex Jacket product", colorway: "Various", avgResalePrice: 250, retailPrice: 350, demandLevel: "medium", profitMargin: "15-30%", bestPlatform: "grailed", seasonality: "Fall/Winter", quickTip: "Gorpcore trend drives consistent demand" },
      { name: "Nike Tech Fleece Hoodie", subtitle: "Bestselling fleece", sku: "CU4489", imageSearch: "Nike Tech Fleece Full Zip Hoodie", colorway: "Various", avgResalePrice: 80, retailPrice: 130, demandLevel: "high", profitMargin: "15-25%", bestPlatform: "depop", seasonality: "Fall/Winter peak", quickTip: "Full sets (hoodie + joggers) sell for 30% premium over individual pieces" },
    ],
  },
  supreme: {
    streetwear: [
      { name: "Supreme Box Logo Hoodie", subtitle: "The most iconic streetwear piece", sku: "FW23", imageSearch: "Supreme Box Logo Hoodie product photo", colorway: "Various", avgResalePrice: 450, retailPrice: 168, demandLevel: "high", profitMargin: "50-100%+", bestPlatform: "grailed", seasonality: "FW release peaks", quickTip: "Receipt and bag photos increase buyer confidence significantly" },
      { name: "Supreme x Nike SB Dunk Low", subtitle: "Collab sneaker grails", sku: "Various", imageSearch: "Supreme Nike SB Dunk Low collaboration", colorway: "Various", avgResalePrice: 350, retailPrice: 110, demandLevel: "high", profitMargin: "100-200%", bestPlatform: "grailed", seasonality: "Release-driven", quickTip: "DS pairs with original Supreme receipt are the gold standard" },
      { name: "Supreme Tee (Graphic)", subtitle: "Seasonal graphic tees", sku: "Various", imageSearch: "Supreme graphic t-shirt product", colorway: "Various", avgResalePrice: 80, retailPrice: 48, demandLevel: "medium", profitMargin: "40-70%", bestPlatform: "depop", seasonality: "Year-round", quickTip: "Older seasons and collaborations fetch highest premiums" },
    ],
  },
};

function getFallbackProducts(brand: string, category: string) {
  const b = brand.toLowerCase().trim();
  const c = category.toLowerCase().trim();
  const brandData = FALLBACK_DB[b];
  if (brandData) {
    const catData = brandData[c];
    if (catData) return catData;
    // Return first category found for this brand
    const firstCat = Object.values(brandData)[0];
    if (firstCat) return firstCat;
  }
  // Generic fallback
  return FALLBACK_DB.nike?.sneakers || [];
}

/**
 * POST /api/ai/competitor/discover
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brand, category, sku } = body as { brand?: string; category?: string; sku?: string };
  if (!brand && !category) {
    return NextResponse.json(
      { error: "At least brand or category is required" },
      { status: 400 }
    );
  }

  const skuLine = sku ? `\n- SKU / Model Number: ${sku} (find products matching or related to this specific model)` : "";

  const prompt = `You are an expert resale market analyst with deep knowledge of secondhand fashion and goods across Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.

Given the following:
- Brand: ${brand || "Any"}
- Category: ${category || "Any"}${skuLine}

${sku ? `Find the exact product matching SKU "${sku}" and also list 7 related/similar products from the same brand.` : "Generate a list of 8 specific, real products that resellers commonly list and flip in this brand/category space."} For each product, provide detailed information.

Respond with valid JSON only (no markdown, no code fences):
{
  "products": [
    {
      "name": "Specific product name (e.g., 'Nike Air Force 1 Low 07')",
      "subtitle": "Brief identifying details (e.g., '2023 Release')",
      "sku": "Model number or style code (e.g., 'CW2288-111'). Use 'N/A' if unknown",
      "imageSearch": "Precise search query to find a photo of this exact product",
      "colorway": "Primary color or colorway name (e.g., 'Triple White')",
      "avgResalePrice": 95,
      "retailPrice": 110,
      "demandLevel": "high|medium|low",
      "profitMargin": "15-25%",
      "bestPlatform": "depop|grailed|poshmark|mercari|ebay|vinted|facebook|vestiaire",
      "seasonality": "When this sells best",
      "quickTip": "One actionable selling tip"
    }
  ],
  "marketInsight": "2-3 sentence overview of this brand/category in the current resale market"
}

Be specific — use real product names, real model/SKU numbers, and realistic pricing.`;

  try {
    const { client, model } = await getAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    const response = await client.chat.completions.create(
      {
        model,
        ...tokenParams(model, 2048),
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = response.choices[0]?.message?.content || "{}";
    const parsed = parseAIJson<{ products?: unknown[]; marketInsight?: string }>(text);

    // Validate we got products
    if (!parsed.products || !Array.isArray(parsed.products) || parsed.products.length === 0) {
      throw new Error("AI returned empty products");
    }

    return NextResponse.json(parsed);
  } catch {
    // Use curated fallback data
    const fallback = getFallbackProducts(brand || "", category || "");
    return NextResponse.json({
      products: fallback,
      marketInsight: `Showing curated market data for ${brand || "popular"} ${category || "items"}. Connect an AI provider in Settings for live market analysis.`,
    });
  }
}
