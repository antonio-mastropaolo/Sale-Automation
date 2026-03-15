import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/image-search?q=Nike+Air+Force+1
 *
 * Proxies an image search using DuckDuckGo's image search to find
 * a product photo. Returns { url: string } with the first result,
 * or { url: "" } if none found. This avoids CORS issues and keeps
 * the API key-free.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ url: "" });
  }

  try {
    // Step 1: Get DDG vqd token from HTML search page
    const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`;
    const htmlRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    const html = await htmlRes.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);
    if (!vqdMatch) {
      // Fallback: return a placeholder image URL based on brand
      return NextResponse.json({ url: "" });
    }

    // Step 2: Fetch image results from DDG API
    const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqdMatch[1]}&f=,,,,,&p=1`;
    const apiRes = await fetch(apiUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Referer: "https://duckduckgo.com/",
      },
      signal: AbortSignal.timeout(5000),
    });
    const data = await apiRes.json();
    const results = data.results || [];

    // Find the first result with a decent thumbnail
    for (const r of results.slice(0, 5)) {
      const thumb = r.thumbnail || r.image;
      if (thumb && typeof thumb === "string" && thumb.startsWith("http")) {
        return NextResponse.json({ url: thumb });
      }
    }

    return NextResponse.json({ url: "" });
  } catch {
    return NextResponse.json({ url: "" });
  }
}
