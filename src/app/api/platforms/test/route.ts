import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { platforms } from "@/lib/platforms";

const ALL_PLATFORMS = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

const PLATFORM_URLS: Record<string, string> = {
  ebay: "https://www.ebay.com",
  vinted: "https://www.vinted.com",
  facebook: "https://www.facebook.com",
  vestiaire: "https://www.vestiairecollective.com",
};

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { platform } = body as { platform?: string };

  if (!platform || !ALL_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const cred = await prisma.platformCredential.findUnique({
    where: { platform },
  });
  if (!cred) {
    return NextResponse.json({
      success: false,
      message: "No credentials saved for this platform",
      errorCode: "invalid_credentials",
      tip: "Save your username and password first.",
    });
  }

  // If we have an automation class with testConnection(), use it
  const automation = platforms[platform];
  if (automation) {
    const result = await automation.testConnection();
    return NextResponse.json(result);
  }

  // For platforms without automation classes: decrypt + reachability check
  try {
    const { decrypt } = await import("@/lib/crypto");
    const data = JSON.parse(decrypt(cred.encryptedData));
    if (!data.username || !data.password) {
      return NextResponse.json({
        success: false,
        message: "Stored credentials are incomplete",
        errorCode: "invalid_credentials",
        tip: "Re-enter both your username and password and save again.",
      });
    }

    // Check platform reachability
    const url = PLATFORM_URLS[platform];
    if (url) {
      try {
        const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(10000) });
        if (!res.ok && res.status >= 500) {
          return NextResponse.json({
            success: false,
            message: `${platform} appears to be down`,
            errorCode: "platform_down",
            tip: "The platform may be experiencing issues. Try again later.",
          });
        }
      } catch {
        return NextResponse.json({
          success: false,
          message: `Could not reach ${platform}`,
          errorCode: "network_error",
          tip: "Check your server's internet connection or try again later.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Credentials valid and ${platform} is reachable`,
    });
  } catch {
    return NextResponse.json({
      success: false,
      message: "Stored credentials could not be decrypted",
      errorCode: "unknown",
      tip: "Your credentials may be corrupted. Try disconnecting and re-entering them.",
    });
  }
}
