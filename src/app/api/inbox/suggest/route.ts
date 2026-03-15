import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";

/** POST — AI-suggested reply for a buyer message */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { buyerMessage, platform, listingTitle, context } = body as {
    buyerMessage?: string;
    platform?: string;
    listingTitle?: string;
    context?: string;
  };

  if (!buyerMessage) {
    return NextResponse.json({ error: "buyerMessage required" }, { status: 400 });
  }

  try {
    const { client, model } = await getAIClient();

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 300),
      messages: [
        {
          role: "user",
          content: `You are a professional reseller responding to a buyer on ${platform || "a marketplace"}.
${listingTitle ? `The item: "${listingTitle}"` : ""}
${context ? `Context: ${context}` : ""}

Buyer's message: "${buyerMessage}"

Write 3 different reply options:
1. FRIENDLY — warm, encouraging the sale
2. PROFESSIONAL — polite, straight to the point
3. BRIEF — very short, 1-2 sentences max

Return ONLY valid JSON (no markdown):
{"friendly":"...","professional":"...","brief":"..."}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({ friendly: text, professional: text, brief: text });
    }
  } catch {
    return NextResponse.json({
      friendly: "Thanks for reaching out! I'd be happy to help. Let me get back to you shortly.",
      professional: "Thank you for your message. I'll respond with the details shortly.",
      brief: "Thanks! I'll get back to you soon.",
    });
  }
}
