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

// Fast variant — uses flash model for speed-critical operations (must finish < 10s for Vercel)
async function chatFast(prompt: string, maxTokens: number = 1024): Promise<string> {
  const { client, model } = await getAIClient();
  // Use flash variant if available, otherwise use configured model
  const fastModel = model.includes("gemini") ? "gemini-2.5-flash" : model;
  const response = await client.chat.completions.create({
    model: fastModel,
    ...tokenParams(fastModel, maxTokens),
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

  // Single AI call for all platforms — must complete within 10s (Vercel limit)
  try {
    const prompt = `Optimize "${listing.title}" (${listing.brand||"?"}, $${listing.price}, ${listing.size||"?"}, ${listing.condition||"Good"}) for: ${targets.join(",")}.
Return ONLY a JSON array, one object per platform:
[{"platform":"depop","title":"optimized title","description":"short desc","hashtags":["tag1","tag2","tag3"],"suggestedPrice":${listing.price}}]`;

    const text = await chatFast(prompt, 1024);
    const parsed = parseAIJson<OptimizedListing[]>(text);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return targets.map((platform) => {
        const match = parsed.find((p) => p.platform === platform);
        return match || { platform, title: listing.title, description: listing.description, hashtags: [], suggestedPrice: listing.price };
      });
    }
  } catch (err) {
    console.error("AI optimize batch error:", err);
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
