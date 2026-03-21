export const maxDuration = 30;
import { NextRequest, NextResponse } from "next/server";
import { parseAIJson } from "@/lib/ai-utils";
import { getAIClient, getPromptText } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { interpolatePrompt } from "@/lib/prompts";

interface TrendData {
  marketSummary: string;
  trendingCategories: {
    name: string; heat: number; description: string;
    whyTrending?: string; priceRange?: { low: number; high: number };
    competitionLevel?: string; sellThroughRate?: string;
    bestPlatforms?: string[]; peakTiming?: string;
    sourcingTips?: string[]; targetBuyer?: string;
    relatedKeywords?: string[]; riskLevel?: string;
    trendDirection?: string;
  }[];
  trendingBrands: {
    name: string; heat: number; description: string;
    topSellingItems?: string[]; avgResalePrice?: string;
    priceAppreciation?: string; bestPlatforms?: string[];
    competitionLevel?: string; sellThroughRate?: string;
    sourcingTips?: string[]; targetBuyer?: string;
    authenticityNotes?: string; relatedBrands?: string[];
  }[];
  hotItems: {
    name: string; priceRange: string; description: string;
    bestPlatforms?: { platform: string; avgPrice: string; sellSpeed: string }[];
    competitionLevel?: string; sellThroughRate?: string;
    sourcingTips?: string[]; listingTips?: string;
    pricingStrategy?: string; targetBuyer?: string;
    seasonality?: string; relatedItems?: string[];
    trendDirection?: string;
  }[];
  sleeperPicks: {
    name: string; reasoning: string; estimatedROI: string;
    currentAvgPrice?: string; projectedPrice?: string;
    timeframe?: string; bestPlatforms?: string[];
    sourcingTips?: string[]; riskLevel?: string;
    catalysts?: string[];
  }[];
  seasonalAdvice: string;
}

const fallbackData: TrendData = {
  marketSummary: "The resale market continues to show strong demand for vintage denim, technical outerwear, and quiet luxury pieces. Y2K accessories and gorpcore remain dominant trends, with increasing interest in sustainable and heritage brands.",
  trendingCategories: [
    { name: "Vintage Denim", heat: 92, description: "Levi's 501s, Wranglers, and vintage wash jeans dominating across all platforms.", whyTrending: "Nostalgia-driven demand meets sustainable fashion. TikTok vintage haul content drives discovery. Authentic fading and USA-made denim commands premiums.", priceRange: { low: 40, high: 200 }, competitionLevel: "high", sellThroughRate: "78% within 7 days", bestPlatforms: ["depop", "ebay", "grailed"], peakTiming: "Year-round, slight dip in summer", sourcingTips: ["Thrift stores in rural areas", "Estate sales", "Goodwill outlet bins"], targetBuyer: "18-30, fashion-forward, values authenticity", relatedKeywords: ["vintage levis", "501 jeans", "made in USA denim", "vintage wrangler"], riskLevel: "low", trendDirection: "stable" },
    { name: "Gorpcore / Outdoor", heat: 87, description: "Technical outerwear, hiking boots, and fleece from Arc'teryx, Patagonia, and Salomon.", whyTrending: "Fashion's embrace of functional outdoor gear. Celebrity endorsements and high-fashion collaborations with outdoor brands.", priceRange: { low: 60, high: 550 }, competitionLevel: "medium", sellThroughRate: "65% within 10 days", bestPlatforms: ["grailed", "ebay", "depop"], peakTiming: "Peaks Oct-Feb, strong year-round", sourcingTips: ["REI garage sales", "Facebook Marketplace in outdoor regions", "Patagonia Worn Wear returns"], targetBuyer: "22-38, outdoor enthusiasts and fashion-forward urbanites", relatedKeywords: ["gorpcore", "arcteryx", "technical jacket", "hiking fashion"], riskLevel: "low", trendDirection: "rising" },
    { name: "Y2K Accessories", heat: 78, description: "Mini bags, chunky belts, and butterfly clips from the early 2000s era.", whyTrending: "Gen Z nostalgia cycle hitting peak momentum. Instagram and TikTok outfit-of-the-day content featuring Y2K styling.", priceRange: { low: 15, high: 120 }, competitionLevel: "medium", sellThroughRate: "70% within 5 days", bestPlatforms: ["depop", "mercari", "poshmark"], peakTiming: "Spring/Summer peaks", sourcingTips: ["Buy lots on eBay", "Dollar bins at thrift stores", "Facebook groups for Y2K collectors"], targetBuyer: "16-25, Gen Z, trend-driven", relatedKeywords: ["y2k", "2000s fashion", "mini bag", "butterfly clip"], riskLevel: "medium", trendDirection: "peaking" },
    { name: "Luxury Knitwear", heat: 74, description: "Cashmere sweaters and designer knits from Loro Piana, Brunello Cucinelli.", whyTrending: "Quiet luxury movement values understated, high-quality materials over logos. Post-pandemic comfort dressing elevated.", priceRange: { low: 80, high: 500 }, competitionLevel: "low", sellThroughRate: "55% within 14 days", bestPlatforms: ["vestiaire", "grailed", "ebay"], peakTiming: "Sept-March, peaks in Nov-Jan", sourcingTips: ["Consignment stores in affluent areas", "Estate sales", "Off-season luxury outlets"], targetBuyer: "30-55, professionals, quiet luxury aesthetic", relatedKeywords: ["cashmere", "loro piana", "quiet luxury", "designer knitwear"], riskLevel: "low", trendDirection: "rising" },
    { name: "Retro Sportswear", heat: 68, description: "Vintage team jerseys, track jackets, and 90s athletic wear.", whyTrending: "Sports nostalgia intersecting with streetwear culture. Vintage champion and starter pieces have cult followings.", priceRange: { low: 25, high: 150 }, competitionLevel: "medium", sellThroughRate: "60% within 10 days", bestPlatforms: ["ebay", "depop", "mercari"], peakTiming: "Year-round, spikes during sports seasons", sourcingTips: ["Thrift stores near universities", "Garage sales", "Bulk vintage lots"], targetBuyer: "18-35, streetwear and sports culture enthusiasts", relatedKeywords: ["vintage jersey", "champion", "starter jacket", "90s sportswear"], riskLevel: "low", trendDirection: "stable" },
  ],
  trendingBrands: [
    { name: "Arc'teryx", heat: 95, description: "Technical outerwear remains the hottest brand in resale.", topSellingItems: ["Alpha SV Jacket", "Beta LT", "Atom Hoody", "Mantis 26 Backpack"], avgResalePrice: "$280", priceAppreciation: "+22% over last 3 months", bestPlatforms: ["grailed", "ebay"], competitionLevel: "medium", sellThroughRate: "82% within 7 days", sourcingTips: ["REI garage sales", "Facebook groups", "Outlet stores"], targetBuyer: "25-40, outdoor enthusiasts and gorpcore fashion", authenticityNotes: "Check holographic logo tag, zippers should be YKK AquaGuard, verify on Arc'teryx warranty lookup", relatedBrands: ["Patagonia", "Salomon", "The North Face"] },
    { name: "Maison Margiela", heat: 88, description: "Tabis and deconstructed pieces commanding premium prices.", topSellingItems: ["Tabi Boots", "Replica Sneakers", "Glam Slam Bag", "5AC Bag"], avgResalePrice: "$420", priceAppreciation: "+18% over last 3 months", bestPlatforms: ["grailed", "vestiaire"], competitionLevel: "low", sellThroughRate: "70% within 14 days", sourcingTips: ["Consignment luxury stores", "The RealReal overflow", "EU marketplaces"], targetBuyer: "25-40, avant-garde fashion enthusiasts", authenticityNotes: "Check for correct font on labels, four corner stitches on the white label, Italian manufacturing", relatedBrands: ["Rick Owens", "Comme des Garcons", "Jil Sander"] },
    { name: "Carhartt WIP", heat: 82, description: "Workwear-meets-streetwear continues its strong run.", topSellingItems: ["Active Jacket", "Michigan Coat", "Simple Pant", "Chase Hoodie"], avgResalePrice: "$85", priceAppreciation: "+12% over last 3 months", bestPlatforms: ["depop", "grailed", "ebay"], competitionLevel: "high", sellThroughRate: "75% within 7 days", sourcingTips: ["End-of-season sales", "EU shops ship cheaper", "Outlet stores"], targetBuyer: "20-35, streetwear and skate culture", authenticityNotes: "WIP line has different labels than mainline Carhartt — check the small square logo", relatedBrands: ["Dickies", "Stussy", "Palace"] },
    { name: "New Balance", heat: 79, description: "Made in USA/UK models consistently selling at premium.", topSellingItems: ["990v4", "993", "2002R", "550"], avgResalePrice: "$145", priceAppreciation: "+8% over last 3 months", bestPlatforms: ["ebay", "grailed", "depop"], competitionLevel: "high", sellThroughRate: "68% within 10 days", sourcingTips: ["Outlet stores for discounted MiUSA", "Retail drops on NB website", "Facebook sneaker groups"], targetBuyer: "22-40, sneakerheads and casual fashion", authenticityNotes: "MiUSA/MiUK models have flag on tongue, better materials, and a higher number on size tag", relatedBrands: ["ASICS", "Saucony", "Salomon"] },
    { name: "Chrome Hearts", heat: 75, description: "Silver jewelry and leather goods in high demand.", topSellingItems: ["Cross Pendant", "Cemetery Ring", "Trucker Hat", "Zip-Up Hoodie"], avgResalePrice: "$650", priceAppreciation: "+15% over last 3 months", bestPlatforms: ["grailed", "ebay"], competitionLevel: "low", sellThroughRate: "60% within 14 days", sourcingTips: ["Japan secondhand stores (2nd Street)", "Authenticated consignment", "Private collectors"], targetBuyer: "20-35, luxury streetwear, hip-hop culture", authenticityNotes: "Sterling .925 stamp, heavy weight, handmade feel. Many fakes exist — verify with an authentication service.", relatedBrands: ["AMBUSH", "Vivienne Westwood", "Martine Ali"] },
  ],
  hotItems: [
    { name: "Arc'teryx Alpha SV Jacket", priceRange: "$350-$550", description: "Gore-Tex pro shell jackets selling fast in neutral colors.", bestPlatforms: [{ platform: "grailed", avgPrice: "$480", sellSpeed: "3 days" }, { platform: "ebay", avgPrice: "$420", sellSpeed: "5 days" }, { platform: "depop", avgPrice: "$380", sellSpeed: "4 days" }], competitionLevel: "medium", sellThroughRate: "78% within 7 days", sourcingTips: ["REI garage sales", "Outdoor gear swap meets", "Facebook Marketplace in CO/PNW"], listingTips: "Photograph with size tag visible, close-up of Gore-Tex logo, show all zippers functional. Mention waterproof rating and specific color name.", pricingStrategy: "Price at $450, drop 10% after 10 days if unsold", targetBuyer: "Outdoor enthusiasts and gorpcore fashion, 25-40", seasonality: "Peaks Oct-Feb, strong year-round due to gorpcore trend", relatedItems: ["Arc'teryx Beta LT", "Patagonia Torrentshell", "Salomon XT-6"], trendDirection: "rising" },
    { name: "Maison Margiela Tabi Boots", priceRange: "$400-$700", description: "Split-toe boots in black leather are the most sought-after.", bestPlatforms: [{ platform: "grailed", avgPrice: "$580", sellSpeed: "7 days" }, { platform: "vestiaire", avgPrice: "$550", sellSpeed: "10 days" }], competitionLevel: "low", sellThroughRate: "65% within 14 days", sourcingTips: ["Consignment luxury stores", "EU secondhand platforms", "The RealReal"], listingTips: "Show sole condition, split-toe detail, and interior label. Include exact heel height and EU sizing.", pricingStrategy: "Price firm — these hold value well. Start at $600 for excellent condition.", targetBuyer: "Fashion-forward, avant-garde style, 25-40", seasonality: "Year-round, slight boost in fall fashion season", relatedItems: ["Margiela Replica Sneakers", "Rick Owens Ramones", "Bottega Veneta Puddle Boots"], trendDirection: "stable" },
    { name: "Vintage Levi's 501 (Pre-2000)", priceRange: "$80-$200", description: "Made in USA pairs with natural fading command top dollar.", bestPlatforms: [{ platform: "ebay", avgPrice: "$130", sellSpeed: "5 days" }, { platform: "depop", avgPrice: "$110", sellSpeed: "4 days" }, { platform: "grailed", avgPrice: "$150", sellSpeed: "7 days" }], competitionLevel: "high", sellThroughRate: "80% within 7 days", sourcingTips: ["Thrift stores in rural areas", "Goodwill bins/outlets", "Estate sales"], listingTips: "Photograph waist tag, care label, and natural fading. Measure actual waist — vintage sizes run different.", pricingStrategy: "Start competitive at $100-120 for good pairs, premium for selvedge or unique washes", targetBuyer: "18-35, vintage enthusiasts, sustainable fashion buyers", seasonality: "Year-round, peaks in spring and fall transition", relatedItems: ["Vintage Wrangler Jeans", "Levi's 505", "Vintage Lee Jeans"], trendDirection: "stable" },
  ],
  sleeperPicks: [
    { name: "Vintage Patagonia Snap-T Fleece", reasoning: "Gorpcore trend is pushing all outdoor heritage pieces up. Original colorful patterns from the 90s have cult following.", estimatedROI: "40-60%", currentAvgPrice: "$45", projectedPrice: "$70-90", timeframe: "4-6 weeks", bestPlatforms: ["depop", "ebay"], sourcingTips: ["Thrift stores", "Patagonia Worn Wear program returns", "Bulk vintage lots"], riskLevel: "low", catalysts: ["Gorpcore trend continuing", "Spring hiking season approaching", "TikTok vintage outdoor content"] },
    { name: "Issey Miyake Pleats Please", reasoning: "Quiet luxury trend expanding into avant-garde territory. Timeless design appreciating in value.", estimatedROI: "30-50%", currentAvgPrice: "$120", projectedPrice: "$160-180", timeframe: "6-8 weeks", bestPlatforms: ["vestiaire", "grailed"], sourcingTips: ["Japanese secondhand stores online", "Estate sales in metropolitan areas", "Consignment shops"], riskLevel: "low", catalysts: ["Quiet luxury movement", "Resort season demand", "Growing appreciation for Japanese fashion"] },
    { name: "Vintage Band Tees (2000s era)", reasoning: "Y2K nostalgia moving past accessories into graphic tees. Concert merch from 2000-2010 is undervalued.", estimatedROI: "50-80%", currentAvgPrice: "$25", projectedPrice: "$45-60", timeframe: "3-5 weeks", bestPlatforms: ["depop", "ebay", "grailed"], sourcingTips: ["Goodwill bins", "Garage sales", "Bulk vintage t-shirt lots on eBay"], riskLevel: "medium", catalysts: ["Y2K nostalgia cycle peaking", "Festival season driving demand", "TikTok thrift haul content"] },
  ],
  seasonalAdvice: "Spring transition pieces are about to spike. Light jackets, layering pieces, and spring-weight denim will see increased buyer activity over the next 2-4 weeks. Start listing lightweight outerwear, pastel and earth-tone pieces, and transitional footwear now to catch the seasonal wave.",
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const response = await client.chat.completions.create(
      {
        model,
        ...tokenParams(model, 4096),
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
      !data.seasonalAdvice
    ) {
      throw new Error("Incomplete response structure");
    }

    // Ensure marketSummary exists
    if (!data.marketSummary) {
      data.marketSummary = data.seasonalAdvice;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Trend analysis error:", error);
    return NextResponse.json(fallbackData);
  }
}
