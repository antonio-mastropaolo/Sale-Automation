import { NextRequest, NextResponse } from "next/server";
import { enhanceDescription, optimizeForAllPlatforms, Platform } from "@/lib/ai";


export async function POST(request: NextRequest) {
  // Body size guard
  const contentLength = parseInt(request.headers.get("content-length") || "0");
  if (contentLength > 100_000) {
    return NextResponse.json({ error: "Request body too large (max 100KB)" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { action } = body;

  if (action === "enhance") {
    const { description, category, brand } = body as { description?: string; category?: string; brand?: string };
    if (!description) {
      return NextResponse.json({ error: "Description required" }, { status: 400 });
    }
    // Truncate to prevent abuse
    const safeDesc = String(description).substring(0, 10_000);
    const enhanced = await enhanceDescription(safeDesc, category || "", brand || "");
    return NextResponse.json({ description: enhanced });
  }

  if (action === "optimize") {
    const { title, description, category, brand, size, condition, price, platforms: targetPlatforms } = body as {
      title?: string; description?: string; category?: string; brand?: string; size?: string; condition?: string; price?: number; platforms?: Platform[];
    };
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description required" }, { status: 400 });
    }
    try {
      const optimized = await optimizeForAllPlatforms(
        { title, description, category: category || "", brand: brand || "", size: size || "", condition: condition || "Good", price: price || 0 },
        targetPlatforms
      );
      return NextResponse.json(optimized);
    } catch (err) {
      console.error("AI optimize error:", err);
      // Return fallback (unoptimized) instead of 500
      const platforms = targetPlatforms || ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"] as Platform[];
      return NextResponse.json(platforms.map((p) => ({ platform: p, title, description, hashtags: [], suggestedPrice: price || 0 })));
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
