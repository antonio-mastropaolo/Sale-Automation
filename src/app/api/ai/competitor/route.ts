import { NextRequest, NextResponse } from "next/server";
import { getAIClient, getPromptText } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { interpolatePrompt } from "@/lib/prompts";
import { parseAIJson } from "@/lib/ai-utils";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, brand, category, price } = body as {
    title?: string;
    brand?: string;
    category?: string;
    price?: number;
  };

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  try {
    const template = await getPromptText("competitor");
    const prompt = interpolatePrompt(template, {
      title,
      brand: brand || "Unknown",
      category: category || "Unknown",
      price: String(price ?? "Not set"),
    });

    const { client, model } = await getAIClient();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await client.chat.completions.create(
      {
        model,
        ...tokenParams(model, 1024),
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    const text = response.choices[0]?.message?.content || "{}";
    return NextResponse.json(parseAIJson(text));
  } catch (err) {
    return NextResponse.json(
      {
        error: "AI analysis failed",
        details: err instanceof Error ? err.message : "unknown",
      },
      { status: 500 }
    );
  }
}
