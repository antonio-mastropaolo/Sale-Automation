import { NextRequest, NextResponse } from "next/server";
import { parseAIJson } from "@/lib/ai-utils";
import { getAIClient, getPromptText } from "@/lib/settings";
import { interpolatePrompt } from "@/lib/prompts";

interface TrendData {
  trendingCategories: { name: string; heat: number; description: string }[];
  trendingBrands: { name: string; heat: number; description: string }[];
  hotItems: { name: string; priceRange: string; description: string }[];
  sleeperPicks: { name: string; reasoning: string; estimatedROI: string }[];
  seasonalAdvice: string;
  platformTips: { depop: string; grailed: string; poshmark: string; mercari: string };
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
    { name: "Vintage Patagonia Snap-T Fleece", reasoning: "Gorpcore trend is pushing all outdoor heritage pieces up.", estimatedROI: "40-60%" },
    { name: "Issey Miyake Pleats Please", reasoning: "Quiet luxury trend is expanding into avant-garde territory.", estimatedROI: "30-50%" },
    { name: "Vintage Band Tees (2000s era)", reasoning: "Y2K nostalgia is moving past accessories into graphic tees.", estimatedROI: "50-80%" },
  ],
  seasonalAdvice: "Spring transition pieces are about to spike in demand. Light jackets, transitional layering pieces, and spring-weight denim will see increased buyer activity over the next 2-4 weeks.",
  platformTips: {
    depop: "Y2K and vintage streetwear are performing best. Use trending sounds and aesthetic flat-lay photos.",
    grailed: "Designer and high-end streetwear dominate. Detailed measurements and condition reports drive sales.",
    poshmark: "Contemporary brands and athleisure lead sales. Host virtual Posh Parties and share actively.",
    mercari: "Competitive pricing wins on Mercari. Smart Pricing and promoted listings significantly boost visibility.",
  },
};

export async function GET(_request: NextRequest) {
  try {
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const template = await getPromptText("trends");
    const prompt = interpolatePrompt(template, { today });

    const { client, model } = await getAIClient();

    // Abort if AI takes longer than 10 seconds — use fallback instead
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await client.chat.completions.create(
      {
        model,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const content = response.choices[0]?.message?.content || "";
    const data: TrendData = parseAIJson<TrendData>(content);

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
