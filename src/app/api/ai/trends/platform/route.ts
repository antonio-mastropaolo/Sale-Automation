import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { parseAIJson } from "@/lib/ai-utils";
import { tokenParams } from "@/lib/ai";

/**
 * GET /api/ai/trends/platform?p=depop
 * Returns trends specific to one platform.
 */
export async function GET(request: NextRequest) {
  const platform = request.nextUrl.searchParams.get("p") || "";
  if (!platform) {
    return NextResponse.json({ error: "p param required" }, { status: 400 });
  }

  const platformNames: Record<string, string> = {
    depop: "Depop", grailed: "Grailed", poshmark: "Poshmark",
    mercari: "Mercari", ebay: "eBay", vinted: "Vinted",
    facebook: "Facebook Marketplace", vestiaire: "Vestiaire Collective",
  };

  const name = platformNames[platform] || platform;

  try {
    const { client, model } = await getAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await client.chat.completions.create(
      {
        model,
        ...tokenParams(model, 2048),
        messages: [{
          role: "user",
          content: `You are a resale market analyst specializing in ${name}. Provide trends SPECIFIC to ${name} — what works on THIS platform, not generic resale trends.

Return JSON only (no markdown):
{
  "trendingCategories": [{"name":"...","heat":80,"description":"Why this category is hot on ${name} specifically"}],
  "trendingBrands": [{"name":"...","heat":90,"description":"Why this brand performs well on ${name}"}],
  "hotItems": [{"name":"...","priceRange":"$X-$Y","description":"Why this sells fast on ${name}"}],
  "sleeperPicks": [{"name":"...","reasoning":"Why this is undervalued on ${name}","estimatedROI":"X%"}],
  "platformStrategy": "2-3 sentences on the best overall strategy for selling on ${name} right now"
}

Provide 5-8 items per category. Be specific to ${name}'s audience, fee structure, and algorithm.`,
        }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = response.choices[0]?.message?.content || "{}";
    return NextResponse.json(parseAIJson(text));
  } catch {
    // Return minimal fallback
    return NextResponse.json({
      trendingCategories: [],
      trendingBrands: [],
      hotItems: [],
      sleeperPicks: [],
      platformStrategy: `Unable to fetch ${name}-specific trends. Check your AI provider in Settings.`,
    });
  }
}
