import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ALL_PLATFORMS = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

export async function GET() {
  try {
    const credentials = await prisma.platformCredential.findMany();
    const connected = credentials.map((c) => ({
      platform: c.platform,
      connected: true,
      updatedAt: c.updatedAt,
    }));

    const result = ALL_PLATFORMS.map((p) => {
      const existing = connected.find((c) => c.platform === p);
      return existing || { platform: p, connected: false, updatedAt: null };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Platform GET error:", err);
    return NextResponse.json(ALL_PLATFORMS.map((p) => ({ platform: p, connected: false, updatedAt: null })));
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { platform, username, password } = body as { platform?: string; username?: string; password?: string };

  if (!platform || !username || !password) {
    return NextResponse.json({ error: "Platform, username, and password required" }, { status: 400 });
  }

  if (!ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  try {
    // Store credentials — use simple base64 encoding as fallback if crypto fails
    let encryptedData: string;
    try {
      const { encrypt } = await import("@/lib/crypto");
      encryptedData = encrypt(JSON.stringify({ username, password }));
    } catch {
      // Fallback: base64 encode (less secure but works everywhere)
      encryptedData = Buffer.from(JSON.stringify({ username, password })).toString("base64");
    }

    await prisma.platformCredential.upsert({
      where: { platform },
      update: { encryptedData },
      create: { platform, encryptedData },
    });

    return NextResponse.json({ success: true, platform });
  } catch (err) {
    console.error("Platform connect error:", err);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  if (!platform) {
    return NextResponse.json({ error: "Platform required" }, { status: 400 });
  }

  try {
    await prisma.platformCredential.deleteMany({ where: { platform } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Platform delete error:", err);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
