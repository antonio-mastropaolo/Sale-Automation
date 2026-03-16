import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";

/** POST — Generate a short push-notification summary of a buyer message */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { buyerMessage, buyerName, platform, listingTitle } = body as {
    buyerMessage?: string;
    buyerName?: string;
    platform?: string;
    listingTitle?: string;
  };

  if (!buyerMessage) {
    return NextResponse.json({ error: "buyerMessage required" }, { status: 400 });
  }

  try {
    const { client, model } = await getAIClient();

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 60),
      messages: [
        {
          role: "user",
          content: `Summarize this buyer message for a push notification in under 15 words. Be specific about what the buyer wants. No quotes, no emoji.

Buyer: ${buyerName || "Someone"}
Platform: ${platform || "marketplace"}
${listingTitle ? `About: "${listingTitle}"` : ""}
Message: "${buyerMessage}"

Return ONLY the summary text, nothing else.`,
        },
      ],
    });

    const summary = response.choices[0]?.message?.content?.trim() || buyerMessage.slice(0, 80);
    return NextResponse.json({ summary });
  } catch {
    // Fallback: truncate the message itself
    const fallback = buyerMessage.length > 80
      ? buyerMessage.slice(0, 77) + "..."
      : buyerMessage;
    return NextResponse.json({ summary: fallback });
  }
}
