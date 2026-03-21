import { getAIClient, getPromptText } from "./settings";
import { interpolatePrompt } from "./prompts";
import { parseAIJson } from "./ai-utils";

export type Platform = "depop" | "grailed" | "poshmark" | "mercari" | "ebay" | "vinted" | "facebook" | "vestiaire";

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

// Models that require max_completion_tokens instead of max_tokens
const NEW_TOKEN_PARAM_MODELS = /^(gpt-5|o[1-9]|o\d+-)/;

export function tokenParams(model: string, maxTokens: number): Record<string, number> {
  if (NEW_TOKEN_PARAM_MODELS.test(model)) {
    return { max_completion_tokens: maxTokens };
  }
  return { max_tokens: maxTokens };
}

async function chat(prompt: string, maxTokens: number = 1024): Promise<string> {
  const { client, model } = await getAIClient();
  const response = await client.chat.completions.create({
    model,
    ...tokenParams(model, maxTokens),
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content || "";
}

export async function optimizeForPlatform(
  listing: ListingInput,
  platform: Platform
): Promise<OptimizedListing> {
  const platformRules = await getPromptText(`platform_${platform}`);
  const template = await getPromptText("optimize");

  const prompt = interpolatePrompt(template, {
    platform,
    platformRules,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    brand: listing.brand,
    size: listing.size,
    condition: listing.condition,
    price: String(listing.price),
  });

  const text = await chat(prompt);

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
  const targets = platforms || (["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"] as Platform[]);

  // Batched AI call — split into 2 parallel batches of 4 for speed
  try {
    const mid = Math.ceil(targets.length / 2);
    const batch1 = targets.slice(0, mid);
    const batch2 = targets.slice(mid);

    const buildPrompt = (plats: Platform[]) => `Optimize "${listing.title}" ($${listing.price}, ${listing.brand || "?"}, ${listing.condition || "Good"}, ${listing.size || "?"}) for ${plats.join(",")}.
Return JSON array:[{"platform":"...","title":"...","description":"1-2 sentences","hashtags":["4 tags"],"suggestedPrice":${listing.price}}]
JSON ONLY:`;

    const [text1, text2] = await Promise.all([
      chat(buildPrompt(batch1), 512),
      batch2.length > 0 ? chat(buildPrompt(batch2), 512) : Promise.resolve("[]"),
    ]);

    const parsed1 = parseAIJson<OptimizedListing[]>(text1) || [];
    const parsed2 = parseAIJson<OptimizedListing[]>(text2) || [];
    const allParsed = [...(Array.isArray(parsed1) ? parsed1 : []), ...(Array.isArray(parsed2) ? parsed2 : [])];

    if (allParsed.length > 0) {
      return targets.map((platform) => {
        const match = allParsed.find((p) => p.platform === platform);
        return match || {
          platform,
          title: listing.title,
          description: listing.description,
          hashtags: [],
          suggestedPrice: listing.price,
        };
      });
    }
  } catch {
    // Fallback: if batched call fails, return basic results without AI
  }

  // Fallback: return unoptimized listings for each platform
  return targets.map((platform) => ({
    platform,
    title: listing.title,
    description: listing.description,
    hashtags: [],
    suggestedPrice: listing.price,
  }));
}

export async function enhanceDescription(
  roughNotes: string,
  category: string,
  brand: string
): Promise<string> {
  const template = await getPromptText("enhance");
  const prompt = interpolatePrompt(template, {
    category,
    brand,
    notes: roughNotes,
  });
  return chat(prompt, 512);
}

export async function getRecommendations(
  listings: { title: string; platform: string; views: number; likes: number; price: number }[]
): Promise<string> {
  const template = await getPromptText("recommendations");
  const prompt = interpolatePrompt(template, {
    listings: JSON.stringify(listings, null, 2),
  });
  return chat(prompt);
}
