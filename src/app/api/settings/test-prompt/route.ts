import { NextRequest, NextResponse } from "next/server";
import { getAIClient, AI_PROVIDERS } from "@/lib/settings";
import { interpolatePrompt } from "@/lib/prompts";
import { tokenParams } from "@/lib/ai";
import OpenAI from "openai";

/** POST — Test a prompt with sample variables and return the AI response.
 *  Accepts optional `provider`, `apiKey`, `model` overrides so the user
 *  can test without saving first. */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, variables, provider: overrideProvider, apiKey: overrideKey, model: overrideModel } =
    body as {
      prompt?: string;
      variables?: Record<string, string>;
      provider?: string;
      apiKey?: string;
      model?: string;
    };
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const interpolated = interpolatePrompt(prompt, variables || {});

  try {
    let client: OpenAI;
    let model: string;

    if (overrideKey && overrideProvider) {
      // Use the override values directly — no DB read, no save
      const provDef = AI_PROVIDERS.find((p) => p.id === overrideProvider) || AI_PROVIDERS[0];
      model = overrideModel || provDef.defaultModel;
      client = new OpenAI({ apiKey: overrideKey, baseURL: provDef.baseURL });
    } else {
      // Fall back to saved settings
      ({ client, model } = await getAIClient());
    }

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 1024),
      messages: [{ role: "user", content: interpolated }],
    });

    const output = response.choices[0]?.message?.content || "";
    return NextResponse.json({
      output,
      model,
      interpolatedPrompt: interpolated,
      tokensUsed: response.usage?.total_tokens || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 500 });
  }
}
