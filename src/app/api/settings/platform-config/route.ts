import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";
import {
  type PlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
} from "@/lib/platform-config";

const PLATFORM_KEYS: (keyof PlatformConfig)[] = [
  "depop",
  "grailed",
  "poshmark",
  "mercari",
  "ebay",
];

function settingKey(platform: string): string {
  return `platform_config__${platform}`;
}

/**
 * GET /api/settings/platform-config
 *
 * Returns the saved config for every platform, falling back to defaults.
 * Optionally accepts ?platform=depop to fetch a single platform.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const singlePlatform = searchParams.get("platform");

  try {
    if (singlePlatform) {
      // Single platform lookup
      if (!PLATFORM_KEYS.includes(singlePlatform as keyof PlatformConfig)) {
        return NextResponse.json(
          { error: `Unknown platform: ${singlePlatform}` },
          { status: 400 }
        );
      }
      const raw = await getSetting(settingKey(singlePlatform));
      const config = raw
        ? JSON.parse(raw)
        : DEFAULT_PLATFORM_CONFIG[singlePlatform as keyof PlatformConfig];
      return NextResponse.json({ platform: singlePlatform, config });
    }

    // All platforms
    const result: Record<string, unknown> = {};
    for (const key of PLATFORM_KEYS) {
      const raw = await getSetting(settingKey(key));
      result[key] = raw
        ? JSON.parse(raw)
        : DEFAULT_PLATFORM_CONFIG[key];
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Failed to load platform configs:", err);
    return NextResponse.json(
      { error: "Failed to load platform configs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/platform-config
 *
 * Body: { platform: "depop", config: { ... } }
 * Saves the config for a single platform to the Settings table.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { platform, config } = body as {
    platform?: string;
    config?: unknown;
  };

  if (!platform || typeof platform !== "string") {
    return NextResponse.json(
      { error: "platform (string) is required" },
      { status: 400 }
    );
  }

  if (!PLATFORM_KEYS.includes(platform as keyof PlatformConfig)) {
    return NextResponse.json(
      { error: `Unknown platform: ${platform}` },
      { status: 400 }
    );
  }

  if (!config || typeof config !== "object") {
    return NextResponse.json(
      { error: "config (object) is required" },
      { status: 400 }
    );
  }

  try {
    await setSetting(settingKey(platform), JSON.stringify(config));
    return NextResponse.json({ ok: true, platform });
  } catch (err) {
    console.error("Failed to save platform config:", err);
    return NextResponse.json(
      { error: "Failed to save platform config" },
      { status: 500 }
    );
  }
}
