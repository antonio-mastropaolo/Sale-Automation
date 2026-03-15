import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAllSettings, setSetting } from "@/lib/settings";

export async function GET() {
  const settings = await getAllSettings();
  // Mask API key for security
  if (settings.ai_api_key) {
    const key = settings.ai_api_key;
    settings.ai_api_key = key.length > 8
      ? key.slice(0, 4) + "..." + key.slice(-4)
      : "****";
  }
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { settings } = body as { settings?: Record<string, string> };
  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "settings object required" }, { status: 400 });
  }

  const allowedKeys = [
    "ai_provider", "ai_api_key", "ai_model", "ai_base_url",
    "ai_api_key_openai", "ai_api_key_google", "ai_api_key_groq",
    "ai_api_key_together", "ai_api_key_openrouter", "ai_api_key_custom",
    "default_condition", "default_category", "currency",
    "auto_optimize", "listing_expiry_days", "theme_color",
  ];

  for (const [key, value] of Object.entries(settings)) {
    if (!allowedKeys.includes(key)) continue;
    if (typeof value !== "string") continue;
    await setSetting(key, value);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "key param required" }, { status: 400 });
  }
  await prisma.setting.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
