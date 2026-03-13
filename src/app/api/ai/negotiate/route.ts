import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { parseAIJson } from "@/lib/ai-utils";

const client = new OpenAI();

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

  if (action === "draft_response") {
    if (!buyerMessage || !itemTitle) {
      return NextResponse.json({ error: "buyerMessage and itemTitle required" }, { status: 400 });
    }

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an expert reseller's AI assistant helping draft responses to buyer messages. Your goal is to maximize the sale price while keeping the buyer engaged.

Item: ${itemTitle}
Listed price: $${itemPrice || "Unknown"}
Description: ${itemDescription || "N/A"}
Minimum acceptable price: $${minimumPrice || "No minimum set"}
Seller communication style: ${sellerStyle || "friendly and professional"}

Buyer's message: "${buyerMessage}"

Analyze the buyer's intent and draft 3 response options:
1. FIRM — Politely hold your price (for lowball offers or when price is fair)
2. NEGOTIATE — Counter-offer or meet in the middle (for reasonable offers)
3. ACCEPT — Accept or encourage the sale (for good offers)

For each response, explain the strategy behind it.

Also determine:
- Is this a serious buyer or a lowballer?
- What's the buyer's likely maximum price?
- Best negotiation tactic for this situation

Respond in JSON only (no markdown):
{
  "buyerAnalysis": {
    "intent": "lowball|negotiating|serious|question",
    "estimatedMaxPrice": 35,
    "seriousnessScore": 7
  },
  "responses": [
    {
      "type": "firm",
      "message": "...",
      "strategy": "..."
    },
    {
      "type": "negotiate",
      "message": "...",
      "strategy": "..."
    },
    {
      "type": "accept",
      "message": "...",
      "strategy": "..."
    }
  ],
  "recommendedResponse": "firm|negotiate|accept",
  "tactic": "..."
}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "{}";
    try {
      return NextResponse.json(parseAIJson(text));
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }
  }

  if (action === "answer_question") {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are a helpful seller on a marketplace. A buyer asked a question about your item. Draft a response.

Item: ${itemTitle}
Price: $${itemPrice || "Unknown"}
Description: ${itemDescription || "N/A"}
Buyer's question: "${buyerMessage}"

Write a friendly, helpful response that answers their question and encourages the sale. Keep it concise (2-3 sentences max). Return plain text only, no JSON.`,
        },
      ],
    });

    return NextResponse.json({
      response: response.choices[0]?.message?.content || "",
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
