import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_PROMPTS } from "@/lib/prompts";

/** GET — Return all prompts (defaults merged with custom overrides) */
export async function GET() {
  const customPrompts = await prisma.customPrompt.findMany();
  const customMap = new Map(customPrompts.map((c) => [c.featureKey, c]));

  const result = DEFAULT_PROMPTS.map((def) => {
    const custom = customMap.get(def.featureKey);
    return {
      featureKey: def.featureKey,
      label: def.label,
      description: def.description,
      category: def.category,
      variables: def.variables,
      sampleVars: def.sampleVars,
      defaultPrompt: def.prompt,
      customPrompt: custom?.prompt || null,
      isCustomized: !!custom,
      updatedAt: custom?.updatedAt || null,
    };
  });

  return NextResponse.json(result);
}

/** POST — Save a custom prompt override */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { featureKey, prompt } = body as { featureKey?: string; prompt?: string };
  if (!featureKey || typeof prompt !== "string") {
    return NextResponse.json({ error: "featureKey and prompt required" }, { status: 400 });
  }

  const def = DEFAULT_PROMPTS.find((d) => d.featureKey === featureKey);
  if (!def) {
    return NextResponse.json({ error: "Unknown featureKey" }, { status: 400 });
  }

  await prisma.customPrompt.upsert({
    where: { featureKey },
    update: { prompt, label: def.label },
    create: { featureKey, prompt, label: def.label },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE — Remove a custom prompt override (revert to default) */
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const featureKey = searchParams.get("featureKey");
  if (!featureKey) {
    return NextResponse.json({ error: "featureKey param required" }, { status: 400 });
  }
  await prisma.customPrompt.deleteMany({ where: { featureKey } });
  return NextResponse.json({ ok: true });
}
