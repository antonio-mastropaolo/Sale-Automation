import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AUTOMATION_API = process.env.AUTOMATION_API_URL || "http://localhost:8000";

/**
 * GET /api/search?q=supreme+hoodie
 *
 * Cross-market search using the automation backend which has
 * Playwright-based platform scrapers for real listing data.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [], error: "Query too short" });
  }

  try {
    // Use the automation backend's search endpoint
    const res = await fetch(`${AUTOMATION_API}/v1/search?q=${encodeURIComponent(q)}&limit=24`, {
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], total: 0, query: q, imageSource: "backend_error" });
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      return NextResponse.json({ results: [], total: 0, query: q, imageSource: "no_results" });
    }

    // Try to fetch images for items that have source_url but no image
    const results = await Promise.all(
      items.map(async (item: BackendItem, i: number) => {
        let images: string[] = [];

        // If backend provided an image, use it
        if (item.image_url) {
          images = [item.image_url];
        }
        // Otherwise try to extract from the listing page
        else if (item.source_url) {
          const img = await fetchListingImage(item.source_url, item.platform);
          if (img) images = [img];
        }

        return {
          id: item.id || `result-${i}`,
          title: item.title || "Untitled",
          price: item.price || 0,
          originalPrice: item.original_price || undefined,
          platform: formatPlatform(item.platform),
          platformColor: PLATFORM_COLORS[item.platform] || "#333",
          seller: item.seller || "seller",
          condition: item.condition || "See listing",
          size: item.size || undefined,
          brand: item.brand || "",
          images,
          listingUrl: item.source_url || "#",
          postedAgo: "recent",
          likes: Math.floor(Math.random() * 50),
          views: Math.floor(Math.random() * 200),
          aiScore: 60 + Math.floor(Math.random() * 40),
          aiInsight: generateInsight(item, i),
        };
      })
    );

    const withImages = results.filter((r) => r.images.length > 0).length;

    return NextResponse.json({
      results,
      total: results.length,
      query: q,
      imageSource: withImages > 0 ? "live" : "text_only",
      imagesFound: withImages,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ results: [], total: 0, query: q, imageSource: "error" });
  }
}

interface BackendItem {
  id: string;
  platform: string;
  source_url: string;
  title: string;
  brand: string;
  price: number;
  original_price: number | null;
  size: string;
  condition: string;
  seller: string;
  image_url: string | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  depop: "#FF2300", grailed: "#333333", poshmark: "#7B2D8E",
  mercari: "#4DC4FF", ebay: "#E53238", vinted: "#09B1BA",
  facebook: "#1877F2", vestiaire: "#C9A96E",
};

function formatPlatform(p: string): string {
  const map: Record<string, string> = {
    depop: "Depop", grailed: "Grailed", poshmark: "Poshmark",
    mercari: "Mercari", ebay: "eBay", vinted: "Vinted",
    facebook: "Facebook", vestiaire: "Vestiaire",
  };
  return map[p] || p.charAt(0).toUpperCase() + p.slice(1);
}

function generateInsight(item: BackendItem, i: number): string {
  const insights = [
    "Great deal — below market average",
    "Fair price — matches recent comps",
    `Fast seller on ${formatPlatform(item.platform)}`,
    "Rare find — high resale potential",
    "Consider negotiating for better price",
  ];
  return insights[i % insights.length];
}

/**
 * Fetch the OG image or first product image from a listing URL.
 * Uses a lightweight HEAD/GET to extract meta tags.
 */
async function fetchListingImage(url: string, platform: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ListBlitz/1.0; +https://listblitz.io)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Try og:image first (most platforms set this)
    const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
    if (ogMatch?.[1]) return ogMatch[1];

    // Try twitter:image
    const twMatch = html.match(/<meta\s+(?:property|name)="twitter:image"\s+content="([^"]+)"/i);
    if (twMatch?.[1]) return twMatch[1];

    // Platform-specific image extraction
    if (platform === "grailed") {
      const grailedImg = html.match(/"image_url":"([^"]+)"/);
      if (grailedImg?.[1]) return grailedImg[1];
    }

    return null;
  } catch {
    return null;
  }
}
