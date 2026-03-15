import { prisma } from "./db";
import OpenAI from "openai";
import { getDefaultPrompt } from "./prompts";

// ── AI Provider definitions ─────────────────────────────────────────

export interface AIProvider {
  id: string;
  name: string;
  baseURL: string;
  defaultModel: string;
  models: string[];
  supportsVision: boolean;
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-5.4",
    models: [
      "gpt-5.4",        // Latest flagship (Mar 2026)
      "gpt-5.4-pro",    // Pro tier
      "gpt-5.2",        // Flagship (Dec 2025)
      "gpt-5.2-pro",    // Pro tier
      "gpt-5.1",        // Flagship (Nov 2025)
      "gpt-5",          // Original GPT-5
      "gpt-5-mini",     // Lightweight
      "gpt-5-nano",     // Ultra-light
      "gpt-4o",         // Still excellent
      "gpt-4o-mini",    // Fast + cheap
      "gpt-4.1",        // Stable
      "gpt-4.1-mini",   // Lightweight
      "gpt-4.1-nano",   // Ultra-light
      "o4-mini",        // Reasoning (fast)
      "o3",             // Reasoning (full)
      "o3-mini",        // Reasoning (light)
      "o1",             // Reasoning (original)
    ],
    supportsVision: true,
  },
  {
    id: "google",
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-3.1-pro-preview",
    models: [
      "gemini-3.1-pro-preview",  // Latest flagship (Feb 2026)
      "gemini-3.1-flash-lite",   // Ultra-fast, cheap
      "gemini-2.5-pro",          // Previous flagship
      "gemini-2.5-flash",        // Fast + balanced
      "gemini-2.0-flash",        // Stable
    ],
    supportsVision: true,
  },
  {
    id: "groq",
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    supportsVision: false,
  },
  {
    id: "together",
    name: "Together AI",
    baseURL: "https://api.together.xyz/v1",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
    supportsVision: false,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-sonnet-4",
    models: ["anthropic/claude-sonnet-4", "anthropic/claude-haiku-4", "openai/gpt-5.4", "google/gemini-3.1-pro-preview"],
    supportsVision: true,
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseURL: "",
    defaultModel: "",
    models: [],
    supportsVision: true,
  },
];

// ── Settings read/write ─────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value : null;
}

export async function getSettingParsed<T>(key: string, fallback: T): Promise<T> {
  const raw = await getSetting(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ── AI Client factory ───────────────────────────────────────────────

export async function getAIClient(): Promise<{ client: OpenAI; model: string }> {
  const providerId = await getSettingParsed<string>("ai_provider", "openai");
  const customApiKey = await getSetting("ai_api_key");
  const customModel = await getSetting("ai_model");
  const customBaseURL = await getSetting("ai_base_url");

  const provider = AI_PROVIDERS.find((p) => p.id === providerId) || AI_PROVIDERS[0];

  const baseURL = providerId === "custom" ? (customBaseURL || "") : provider.baseURL;
  const apiKey = customApiKey || process.env.OPENAI_API_KEY || "";
  const model = customModel || provider.defaultModel;

  const client = new OpenAI({ apiKey, baseURL });

  return { client, model };
}

// ── Prompt resolution ───────────────────────────────────────────────

/** Get the active prompt for a feature — custom override or default */
export async function getPromptText(featureKey: string): Promise<string> {
  const custom = await prisma.customPrompt.findUnique({ where: { featureKey } });
  if (custom) return custom.prompt;

  const def = getDefaultPrompt(featureKey);
  return def?.prompt || "";
}
