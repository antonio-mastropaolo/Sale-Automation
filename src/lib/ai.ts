import OpenAI from "openai";
import { parseAIJson } from "./ai-utils";

const client = new OpenAI();

export type Platform = "depop" | "grailed" | "poshmark" | "mercari";

interface ListingInput {
  title: string;
  description: string;
  category: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
}

export interface OptimizedListing {
  platform: Platform;
  title: string;
  description: string;
  hashtags: string[];
  suggestedPrice: number;
}

const PLATFORM_RULES: Record<Platform, string> = {
  depop: `Depop style guide:
- Casual, trendy, Gen-Z tone
- Max 5 hashtags, make them searchable
- Keep description concise but descriptive
- Include measurements if relevant
- Mention "depop" trends like Y2K, vintage, streetwear where appropriate`,

  grailed: `Grailed style guide:
- Professional, brand-focused tone
- Emphasize designer/brand name, season, and collection
- Include detailed measurements (pit-to-pit, length, shoulder width)
- Mention fabric composition and country of manufacture
- Focus on condition details and flaws
- No hashtags needed, use proper category tagging`,

  poshmark: `Poshmark style guide:
- Friendly, enthusiastic tone with community feel
- Use relevant party tags (e.g., "Best in Tops Party")
- Mention sharing strategy appeal (e.g., "Share for a discount!")
- Include size details and fit description
- Add styling suggestions
- Use brand name prominently
- Include 3-5 relevant hashtags`,

  mercari: `Mercari style guide:
- Clean, factual, straightforward tone
- Emphasize competitive pricing
- Include shipping weight estimate
- Mention condition clearly using Mercari's rating system
- Keep title short and keyword-rich for search
- Include dimensions/measurements
- 3-5 relevant hashtags for search discovery`,
};

async function chat(prompt: string, maxTokens: number = 1024): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content || "";
}

export async function optimizeForPlatform(
  listing: ListingInput,
  platform: Platform
): Promise<OptimizedListing> {
  const text = await chat(
    `You are a marketplace listing optimization expert. Optimize this product listing for ${platform}.

${PLATFORM_RULES[platform]}

Original listing:
- Title: ${listing.title}
- Description: ${listing.description}
- Category: ${listing.category}
- Brand: ${listing.brand}
- Size: ${listing.size}
- Condition: ${listing.condition}
- Price: $${listing.price}

Respond in JSON format only (no markdown):
{
  "title": "optimized title",
  "description": "optimized description",
  "hashtags": ["tag1", "tag2"],
  "suggestedPrice": 99.99
}`
  );

  try {
    const parsed = parseAIJson<{ title: string; description: string; hashtags?: string[]; suggestedPrice?: number }>(text);
    return {
      platform,
      title: parsed.title,
      description: parsed.description,
      hashtags: parsed.hashtags || [],
      suggestedPrice: parsed.suggestedPrice || listing.price,
    };
  } catch {
    return {
      platform,
      title: listing.title,
      description: listing.description,
      hashtags: [],
      suggestedPrice: listing.price,
    };
  }
}

export async function optimizeForAllPlatforms(
  listing: ListingInput,
  platforms?: Platform[]
): Promise<OptimizedListing[]> {
  const targets = platforms || (["depop", "grailed", "poshmark", "mercari"] as Platform[]);
  const results = await Promise.all(
    targets.map((platform) => optimizeForPlatform(listing, platform))
  );
  return results;
}

export async function enhanceDescription(
  roughNotes: string,
  category: string,
  brand: string
): Promise<string> {
  return chat(
    `Turn these rough notes into a polished product listing description. Keep it natural and appealing.

Category: ${category}
Brand: ${brand}
Notes: ${roughNotes}

Return only the polished description text, no JSON or formatting.`,
    512
  );
}

export async function getRecommendations(
  listings: { title: string; platform: string; views: number; likes: number; price: number }[]
): Promise<string> {
  return chat(
    `You are a reselling analytics expert. Based on these listings and their performance, provide actionable recommendations to improve sales.

Listings data:
${JSON.stringify(listings, null, 2)}

Provide 3-5 specific, actionable recommendations. Format as a JSON array of objects:
[{"title": "recommendation title", "description": "detailed advice", "priority": "high|medium|low"}]

Return only valid JSON, no markdown.`
  );
}
