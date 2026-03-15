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
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o3-mini"],
    supportsVision: true,
  },
  {
    id: "google",
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
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
    models: ["anthropic/claude-sonnet-4", "anthropic/claude-haiku-4", "openai/gpt-4o", "google/gemini-2.5-flash"],
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
