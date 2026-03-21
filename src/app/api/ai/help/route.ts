export const maxDuration = 30;
import { NextRequest, NextResponse } from "next/server";
import { getAIClient } from "@/lib/settings";
import { tokenParams } from "@/lib/ai";
import { HELP_KNOWLEDGE } from "@/lib/help-knowledge";
import { prisma } from "@/lib/db";

const SYSTEM_BASE = `You are the ListBlitz AI Help Assistant. You help users understand and troubleshoot the ListBlitz platform — an AI-powered cross-platform listing tool for resellers.

Be concise, friendly, and actionable. When suggesting fixes, give specific step-by-step instructions referencing the exact settings/pages in ListBlitz. Use short paragraphs.

${HELP_KNOWLEDGE}`;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mode, question, error: errorMsg, errorDetails, page, history, message } = body as {
    mode?: string;
    question?: string;
    error?: string;
    errorDetails?: string;
    page?: string;
    history?: { role: string; content: string }[];
    message?: string;
  };

  // ── Contact Support ──
  if (mode === "contact") {
    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    try {
      await prisma.supportMessage.create({
        data: { message, page: page || "" },
      });
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }
  }

  // ── AI modes (ask / error) ──
  try {
    const { client, model } = await getAIClient();

    let systemPrompt = SYSTEM_BASE;
    let userMessage = question || "";

    if (mode === "error") {
      systemPrompt += `\n\nThe user encountered an error and needs help understanding and fixing it. Explain what went wrong in plain language and give specific, actionable steps to resolve it. If the error is related to a known issue in the troubleshooting guide above, reference the exact fix.`;
      userMessage = `I got this error${page ? ` on the ${page} page` : ""}:\n\n"${errorMsg}"${errorDetails ? `\n\nDetails: ${errorDetails}` : ""}\n\nWhat does this mean and how do I fix it?`;
    }

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
      }
    }

    messages.push({ role: "user", content: userMessage });

    const response = await client.chat.completions.create({
      model,
      ...tokenParams(model, 800),
      messages,
    });

    const output = response.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply: output, model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `AI request failed: ${msg}` }, { status: 500 });
  }
}
