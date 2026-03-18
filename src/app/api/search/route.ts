import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=supreme+hoodie
 *
 * Searches real marketplace listings and returns actual product data
 * with real images. Uses public APIs where available.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [], error: "Query too short" });
  }

  const results: SearchResultAPI[] = [];

  // Search multiple platforms in parallel
  const searches = await Promise.allSettled([
    searchGrailed(q),
    searchDepop(q),
  ]);

  for (const result of searches) {
    if (result.status === "fulfilled" && result.value) {
      results.push(...result.value);
    }
  }

  // Sort by relevance (items with images first, then by price)
  results.sort((a, b) => {
    if (a.images.length && !b.images.length) return -1;
    if (!a.images.length && b.images.length) return 1;
    return 0;
  });

  return NextResponse.json({ results, total: results.length, query: q });
}

interface SearchResultAPI {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  platform: string;
  platformColor: string;
  seller: string;
  condition: string;
  size?: string;
  brand?: string;
  images: string[];
  listingUrl: string;
  postedAgo: string;
}

/** Search Grailed's public API */
async function searchGrailed(query: string): Promise<SearchResultAPI[]> {
  try {
    const res = await fetch("https://www.grailed.com/api/merchandise/marquee", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        index: "Listing",
        query,
        hitsPerPage: 12,
        page: 0,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const hits = data?.data?.hits || data?.hits || [];

    return hits.slice(0, 12).map((hit: Record<string, unknown>, i: number) => {
      const photos = (hit.photos as { url: string }[] | undefined) || [];
      const coverPhoto = hit.cover_photo as { url: string } | undefined;
      const images: string[] = [];
      if (coverPhoto?.url) images.push(coverPhoto.url);
      photos.forEach((p) => { if (p.url && !images.includes(p.url)) images.push(p.url); });

      return {
        id: `grailed-${hit.id || i}`,
        title: (hit.title as string) || (hit.designer_names as string) || "Untitled",
        price: Number(hit.price) || 0,
        originalPrice: hit.original_price ? Number(hit.original_price) : undefined,
        platform: "Grailed",
        platformColor: "#333333",
        seller: (hit.seller as string) || (hit.seller_username as string) || "seller",
        condition: (hit.condition as string) || "Used",
        size: (hit.size as string) || undefined,
        brand: (hit.designer_names as string) || (hit.designers as string[])?.join(", ") || "",
        images: images.slice(0, 4),
        listingUrl: `https://www.grailed.com/listings/${hit.id}`,
        postedAgo: "recent",
      };
    });
  } catch (err) {
    console.error("Grailed search failed:", err);
    return [];
  }
}

/** Search Depop's public API */
async function searchDepop(query: string): Promise<SearchResultAPI[]> {
  try {
    const res = await fetch(`https://webapi.depop.com/api/v2/search/products/?what=${encodeURIComponent(query)}&itemsPerPage=12&country=us`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const products = data?.products || [];

    return products.slice(0, 12).map((p: Record<string, unknown>, i: number) => {
      const preview = p.preview as { photos?: { url: string }[] } | undefined;
      const images = (preview?.photos || []).map((ph) => ph.url).filter(Boolean).slice(0, 4);

      return {
        id: `depop-${p.slug || i}`,
        title: (p.description as string)?.split("\n")[0]?.slice(0, 80) || "Depop Listing",
        price: Number((p.price as { amount: string })?.amount) || 0,
        platform: "Depop",
        platformColor: "#FF2300",
        seller: (p.seller as { username: string })?.username || "seller",
        condition: "See listing",
        brand: (p.brand as string) || "",
        images,
        listingUrl: `https://www.depop.com/products/${p.slug}`,
        postedAgo: "recent",
      };
    });
  } catch (err) {
    console.error("Depop search failed:", err);
    return [];
  }
}
