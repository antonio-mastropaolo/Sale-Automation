import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { interpolatePrompt } from "@/lib/prompts";

/** POST — Test a prompt with sample variables and return the AI response */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { prompt, variables } = body as { prompt?: string; variables?: Record<string, string> };
  if (!prompt) {
    return NextResponse.json({ error: "prompt required" }, { status: 400 });
  }

  const interpolated = interpolatePrompt(prompt, variables || {});

  try {
    const { client, model } = await getAIClient();
    const response = await client.chat.completions.create({
      model,
      max_tokens: 1024,
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
