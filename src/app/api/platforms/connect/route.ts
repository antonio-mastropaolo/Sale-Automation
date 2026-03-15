import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET() {
  const credentials = await prisma.platformCredential.findMany();
  // Return only platform names and connection status, never the encrypted data
  const connected = credentials.map((c) => ({
    platform: c.platform,
    connected: true,
    updatedAt: c.updatedAt,
  }));

  const allPlatforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];
  const result = allPlatforms.map((p) => {
    const existing = connected.find((c) => c.platform === p);
    return existing || { platform: p, connected: false, updatedAt: null };
  });

  return NextResponse.json(result);
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
    return NextResponse.json(
      { error: "Platform, username, and password required" },
      { status: 400 }
    );
  }

  const validPlatforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json(
      { error: "Invalid platform" },
      { status: 400 }
    );
  }

  const encryptedData = encrypt(JSON.stringify({ username, password }));

  await prisma.platformCredential.upsert({
    where: { platform },
    update: { encryptedData },
    create: { platform, encryptedData },
  });

  return NextResponse.json({ success: true, platform });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");

  if (!platform) {
    return NextResponse.json(
      { error: "Platform required" },
      { status: 400 }
    );
  }

  await prisma.platformCredential.deleteMany({
    where: { platform },
  });

  return NextResponse.json({ success: true });
}
