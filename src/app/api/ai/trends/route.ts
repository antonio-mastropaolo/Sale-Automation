import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseAIJson } from "@/lib/ai-utils";

const client = new OpenAI();

interface TrendCategory {
  name: string;
  heat: number;
  description: string;
}

interface TrendBrand {
  name: string;
  heat: number;
  description: string;
}

interface HotItem {
  name: string;
  priceRange: string;
  description: string;
}

interface SleeperPick {
  name: string;
  reasoning: string;
  estimatedROI: string;
}

interface PlatformTips {
  depop: string;
  grailed: string;
  poshmark: string;
  mercari: string;
}

interface TrendData {
  trendingCategories: TrendCategory[];
  trendingBrands: TrendBrand[];
  hotItems: HotItem[];
  sleeperPicks: SleeperPick[];
  seasonalAdvice: string;
  platformTips: PlatformTips;
}

const fallbackData: TrendData = {
  trendingCategories: [
    { name: "Vintage Denim", heat: 92, description: "Levi's 501s, Wranglers, and vintage wash jeans are dominating across all platforms." },
    { name: "Gorpcore / Outdoor", heat: 87, description: "Technical outerwear, hiking boots, and fleece from Arc'teryx, Patagonia, and Salomon." },
    { name: "Y2K Accessories", heat: 78, description: "Mini bags, chunky belts, and butterfly clips from the early 2000s era." },
    { name: "Luxury Knitwear", heat: 74, description: "Cashmere sweaters and designer knits from brands like Loro Piana and Brunello Cucinelli." },
    { name: "Retro Sportswear", heat: 68, description: "Vintage team jerseys, track jackets, and 90s athletic wear." },
  ],
  trendingBrands: [
    { name: "Arc'teryx", heat: 95, description: "Technical outerwear remains the hottest brand in resale right now." },
    { name: "Maison Margiela", heat: 88, description: "Tabis and deconstructed pieces are commanding premium prices." },
    { name: "Carhartt WIP", heat: 82, description: "Workwear-meets-streetwear continues its strong run." },
    { name: "New Balance", heat: 79, description: "Made in USA/UK models (990, 993, 2002R) are consistently selling." },
    { name: "Chrome Hearts", heat: 75, description: "Silver jewelry and leather goods remain in high demand." },
  ],
  hotItems: [
    { name: "Arc'teryx Alpha SV Jacket", priceRange: "$350-$550", description: "Gore-Tex pro shell jackets are selling fast, especially in neutral colors." },
    { name: "Maison Margiela Tabi Boots", priceRange: "$400-$700", description: "Split-toe boots in black leather are the most sought-after style." },
    { name: "Vintage Levi's 501 (Pre-2000)", priceRange: "$80-$200", description: "Made in USA pairs with natural fading command top dollar." },
    { name: "New Balance 990v4", priceRange: "$120-$220", description: "Grey colorway is the classic that keeps appreciating." },
    { name: "Kapital Bandana Patchwork", priceRange: "$200-$450", description: "Unique Japanese streetwear pieces with cult following." },
  ],
  sleeperPicks: [
    { name: "Vintage Patagonia Snap-T Fleece", reasoning: "Gorpcore trend is pushing all outdoor heritage pieces up. Snap-Ts from the 90s are still underpriced relative to demand.", estimatedROI: "40-60%" },
    { name: "Issey Miyake Pleats Please", reasoning: "Quiet luxury trend is expanding into avant-garde territory. These pleated pieces are timeless and supply is limited.", estimatedROI: "30-50%" },
    { name: "Vintage Band Tees (2000s era)", reasoning: "Y2K nostalgia is moving past accessories into graphic tees. 2000s concert tees are the next wave after 90s ones peaked.", estimatedROI: "50-80%" },
  ],
  seasonalAdvice: "Spring transition pieces are about to spike in demand. Light jackets, transitional layering pieces, and spring-weight denim will see increased buyer activity over the next 2-4 weeks. Start sourcing lightweight outerwear and linen pieces now before the rush.",
  platformTips: {
    depop: "Y2K and vintage streetwear are performing best. Use trending sounds and aesthetic flat-lay photos. Price competitively — Depop buyers are deal-hunters. Refresh listings daily for algorithm boost.",
    grailed: "Designer and high-end streetwear dominate. Detailed measurements and condition reports drive sales. Archive fashion pieces from Helmut Lang, Raf Simons, and Margiela have the highest sell-through rates.",
    poshmark: "Contemporary brands and athleisure lead sales. Host virtual Posh Parties and share actively. Lululemon, Free People, and Anthropologie have the fastest sell-through. Bundle discounts drive higher AOV.",
    mercari: "Competitive pricing wins on Mercari. Electronics, sneakers, and everyday brands perform well. Smart Pricing and promoted listings significantly boost visibility. Fast shipping ratings improve search ranking.",
  },
};

export async function GET(_request: NextRequest) {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert reselling market analyst specializing in secondhand fashion and goods across Depop, Grailed, Poshmark, and Mercari. Today is ${today}.

Based on your knowledge of current resale market trends, provide a comprehensive trend report. Consider recent fashion weeks, social media trends, seasonal shifts, and platform-specific dynamics.

Provide the following:

1. **Top 5 Trending Categories** — what types of items are hottest right now. Include a heat score (1-100) and a short description.
2. **Top 5 Trending Brands** — which brands are commanding the most demand and premium prices. Include a heat score (1-100) and a short description.
3. **Top 5 Hot Items/Styles** — specific items or styles that are selling fast right now. Include an estimated resale price range and description.
4. **3 Sleeper Picks** — undervalued items that are about to trend. Include your reasoning and estimated ROI percentage.
5. **Seasonal Advice** — what's about to be in demand in the next 2-4 weeks based on seasonal shifts.
6. **Platform-Specific Tips** — what's performing best on each platform (Depop, Grailed, Poshmark, Mercari) and how to optimize for each.

Respond in JSON format only (no markdown, no code fences):
{
  "trendingCategories": [{"name": "...", "heat": 80, "description": "..."}],
  "trendingBrands": [{"name": "...", "heat": 90, "description": "..."}],
  "hotItems": [{"name": "...", "priceRange": "$X-$Y", "description": "..."}],
  "sleeperPicks": [{"name": "...", "reasoning": "...", "estimatedROI": "X%"}],
  "seasonalAdvice": "...",
  "platformTips": {"depop": "...", "grailed": "...", "poshmark": "...", "mercari": "..."}
}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const data: TrendData = parseAIJson<TrendData>(content);

    // Validate the structure has all required fields
    if (
      !data.trendingCategories ||
      !data.trendingBrands ||
      !data.hotItems ||
      !data.sleeperPicks ||
      !data.seasonalAdvice ||
      !data.platformTips
    ) {
      throw new Error("Incomplete response structure");
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Trend analysis error:", error);
    return NextResponse.json(fallbackData);
  }
}
