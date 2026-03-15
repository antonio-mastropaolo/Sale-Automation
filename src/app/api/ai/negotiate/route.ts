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
  const { action, itemTitle, itemPrice, itemDescription, buyerMessage, minimumPrice, sellerStyle } = body as {
    action?: string; itemTitle?: string; itemPrice?: number; itemDescription?: string;
    buyerMessage?: string; minimumPrice?: number; sellerStyle?: string;
  };

  const { client, model } = await getAIClient();

  if (action === "draft_response") {
    if (!buyerMessage || !itemTitle) {
      return NextResponse.json({ error: "buyerMessage and itemTitle required" }, { status: 400 });
    }

    const template = await getPromptText("negotiate_response");
    const prompt = interpolatePrompt(template, {
      itemTitle,
      itemPrice: String(itemPrice ?? "Unknown"),
      itemDescription: itemDescription || "N/A",
      minimumPrice: String(minimumPrice ?? "No minimum set"),
      sellerStyle: sellerStyle || "friendly and professional",
      buyerMessage,
    });

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 512),
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
      return NextResponse.json(parseAIJson(text));
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  }

  if (action === "answer_question") {
    const template = await getPromptText("negotiate_question");
    const prompt = interpolatePrompt(template, {
      itemTitle: itemTitle || "",
      itemPrice: String(itemPrice ?? "Unknown"),
      itemDescription: itemDescription || "N/A",
      buyerMessage: buyerMessage || "",
    });

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 256),
      messages: [{ role: "user", content: prompt }],
    });

    return NextResponse.json({
      response: response.choices[0]?.message?.content || "",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
