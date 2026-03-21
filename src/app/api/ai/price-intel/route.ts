export const maxDuration = 30;
import { NextRequest, NextResponse } from "next/server";
import { parseAIJson } from "@/lib/ai-utils";
import { getAIClient, getPromptText } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { interpolatePrompt } from "@/lib/prompts";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { title, brand, category, condition, size, currentPrice } = body as {
    title?: string; brand?: string; category?: string; condition?: string; size?: string; currentPrice?: number;
  };

  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const template = await getPromptText("price_intel");
  const prompt = interpolatePrompt(template, {
    title,
    brand: brand || "Unknown",
    category: category || "Unknown",
    condition: condition || "Good",
    size: size || "Unknown",
    currentPrice: String(currentPrice ?? "Not set"),
  });

  const { client, model } = await getAIClient();
  const response = await client.chat.completions.create({
    model,
    ...tokenParams(model, 1024),
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices[0]?.message?.content || "{}";
  try {
    return NextResponse.json(parseAIJson(text));
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
