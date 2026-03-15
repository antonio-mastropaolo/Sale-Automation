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

async function chat(prompt: string, maxTokens: number = 1024): Promise<string> {
  const { client, model } = await getAIClient();
  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
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
