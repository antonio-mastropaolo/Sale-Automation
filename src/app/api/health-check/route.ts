import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";

/** Model fallback chains — if a model fails, try the next one */
const MODEL_FALLBACKS: Record<string, string[]> = {
  // Gemini family
  "gemini-3.1-pro-preview": ["gemini-2.5-pro", "gemini-2.5-flash"],
  "gemini-2.5-pro": ["gemini-2.5-flash"],
  // OpenAI family
  "gpt-5.4": ["gpt-5.4-pro", "gpt-5.2", "gpt-5-mini"],
  "gpt-5.4-pro": ["gpt-5.2", "gpt-5-mini"],
  "gpt-5.2": ["gpt-5.2-pro", "gpt-5-mini"],
  "gpt-5.1": ["gpt-5", "gpt-5-mini"],
  "gpt-5": ["gpt-5-mini", "gpt-4o"],
  "gpt-5-mini": ["gpt-4o-mini"],
  // Groq family
  "llama-3.3-70b-versatile": ["llama-3.1-8b-instant"],
};

/** Provider base URLs */
const PROVIDER_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
};

/**
 * GET /api/health-check
 * Background health check — tests the configured AI model.
 * If it fails, auto-switches to the closest fallback model
 * and logs a notification for the user.
 */
export async function GET() {
  try {
    // Get current AI config
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["ai_provider", "ai_model", "ai_api_key", "ai_api_key_openai", "ai_api_key_google", "ai_api_key_groq"] } },
    });

    const getVal = (key: string) => {
      const row = settings.find((s) => s.key === key);
      return row ? row.value.replace(/^"|"$/g, "") : "";
    };

    const provider = getVal("ai_provider") || "openai";
    const model = getVal("ai_model") || "gpt-5.4";
    const apiKey = getVal(`ai_api_key_${provider}`) || getVal("ai_api_key") || "";

    if (!apiKey) {
      return NextResponse.json({ status: "skipped", reason: "No API key configured" });
    }

    const baseURL = PROVIDER_URLS[provider] || PROVIDER_URLS.openai;

    // Test the model with a simple completion
    const testResult = await testModel(baseURL, apiKey, model);

    if (testResult.ok) {
      return NextResponse.json({ status: "healthy", provider, model, latencyMs: testResult.latencyMs });
    }

    // Model failed — try fallbacks
    const fallbacks = MODEL_FALLBACKS[model] || [];
    let switchedTo: string | null = null;

    for (const fallback of fallbacks) {
      const fallbackResult = await testModel(baseURL, apiKey, fallback);
      if (fallbackResult.ok) {
        switchedTo = fallback;
        break;
      }
    }

    if (switchedTo) {
      // Auto-switch to working model
      await prisma.setting.upsert({
        where: { key: "ai_model" },
        update: { value: JSON.stringify(switchedTo) },
        create: { key: "ai_model", value: JSON.stringify(switchedTo) },
      });

      // Log notification for user
      await logActivity({
        type: "settings_changed",
        title: `AI model auto-switched: ${model} → ${switchedTo}`,
        detail: `Model "${model}" is unavailable (${testResult.error}). Switched to "${switchedTo}" automatically.`,
        severity: "warning",
      });

      return NextResponse.json({
        status: "auto-fixed",
        previousModel: model,
        newModel: switchedTo,
        reason: testResult.error,
        provider,
      });
    }

    // All fallbacks failed
    await logActivity({
      type: "settings_changed",
      title: `AI health check failed: ${model}`,
      detail: `Model "${model}" and all fallbacks are unavailable. Error: ${testResult.error}`,
      severity: "error",
    });

    return NextResponse.json({
      status: "unhealthy",
      model,
      provider,
      error: testResult.error,
      fallbacksTried: fallbacks,
    });
  } catch (err) {
    return NextResponse.json({ status: "error", error: String(err) }, { status: 500 });
  }
}

/** Test a model with a tiny completion request */
async function testModel(baseURL: string, apiKey: string, model: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = performance.now();
  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with OK" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(10000),
    });

    const latencyMs = Math.round(performance.now() - start);

    if (res.ok) {
      return { ok: true, latencyMs };
    }

    const body = await res.json().catch(() => ({}));
    const errMsg = body?.error?.message || `HTTP ${res.status}`;
    return { ok: false, latencyMs, error: errMsg };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { ok: false, latencyMs, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
