import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { setSetting } from "@/lib/settings";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { aiProvider, aiApiKey, aiModel, platforms } = await req.json();

    // Save AI settings if provided
    if (aiProvider) {
      await setSetting("ai_provider", JSON.stringify(aiProvider));
    }
    if (aiApiKey) {
      await setSetting("ai_api_key", aiApiKey);
    }
    if (aiModel) {
      await setSetting("ai_model", aiModel);
    }
    if (platforms) {
      await setSetting("platforms", JSON.stringify(platforms));
    }

    // Mark user as onboarded
    await prisma.user.update({
      where: { id: user.id },
      data: { onboarded: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Onboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
