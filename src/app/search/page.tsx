"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, Filter, ExternalLink, Heart, Eye,
  ShoppingBag, Sparkles, X, DollarSign, Tag,
  TrendingUp, Shield, BarChart3, Zap, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PLATFORMS = [
  { id: "depop", label: "Depop", color: "#FF2300" },
  { id: "grailed", label: "Grailed", color: "#000000" },
  { id: "poshmark", label: "Poshmark", color: "#7B2D8E" },
  { id: "mercari", label: "Mercari", color: "#4DC4FF" },
  { id: "ebay", label: "eBay", color: "#E53238" },
  { id: "vinted", label: "Vinted", color: "#09B1BA" },
  { id: "facebook", label: "Facebook", color: "#1877F2" },
  { id: "vestiaire", label: "Vestiaire", color: "#1A1A1A" },
];

interface SearchResult {
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
  likes?: number;
  views?: number;
  postedAgo: string;
  aiScore?: number;
  aiInsight?: string;
}

type SortKey = "relevance" | "price-low" | "price-high" | "newest";

// Real product image URLs mapped by item type
const PRODUCT_IMAGES: Record<string, string[]> = {
  hoodie: [
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1578768079470-1e3d02c2da68?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1614975059251-992f11792571?w=400&h=400&fit=crop",
  ],
  crewneck: [
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=400&h=400&fit=crop",
  ],
  tee: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=400&h=400&fit=crop",
  ],
  jacket: [
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1544923246-77307dd270cb?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1548883354-7622d03aca27?w=400&h=400&fit=crop",
  ],
  pants: [
    "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop",
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop",
  ],
};
const ITEM_TYPES = ["hoodie", "crewneck", "tee", "jacket", "pants"] as const;
const ITEM_LABELS = ["Hoodie", "Crewneck", "Tee", "Jacket", "Pants"];

// Simulated search results for demo
function generateMockResults(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const brands = ["Supreme", "Nike", "Jordan", "Stussy", "Palace", "Arc'teryx", "Balenciaga", "New Balance"];
  const conditions = ["New with tags", "Like new", "Good", "Fair"];
  const sizes = ["XS", "S", "M", "L", "XL"];

  return Array.from({ length: 24 }, (_, i) => {
    const brand = brands[i % brands.length];
    const platform = PLATFORMS[i % PLATFORMS.length];
    const basePrice = 50 + Math.floor(Math.random() * 400);
    const hasDiscount = Math.random() > 0.6;

    return {
      id: `result-${i}`,
      title: `${brand} ${q.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} ${["Hoodie", "Crewneck", "Tee", "Jacket", "Pants"][i % 5]} ${["SS24", "FW23", "SS23", "Archive"][i % 4]}`,
      price: basePrice,
      originalPrice: hasDiscount ? basePrice + Math.floor(Math.random() * 100) : undefined,
      platform: platform.label,
      platformColor: platform.color,
      seller: `${["vintage", "hype", "grail", "closet", "resell"][i % 5]}_${["dealer", "finds", "shop", "nyc", "la"][i % 5]}`,
      condition: conditions[i % conditions.length],
      size: sizes[i % sizes.length],
      brand,
      images: (() => {
        const type = ITEM_TYPES[i % 5];
        const pool = PRODUCT_IMAGES[type];
        return [
          pool[i % pool.length],
          pool[(i + 1) % pool.length],
          pool[(i + 2) % pool.length],
        ];
      })(),
      listingUrl: "#",
      likes: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 200),
      postedAgo: `${[1, 2, 5, 12, 24][i % 5]}${["h", "h", "h", "h", "d"][i % 5]}`,
      aiScore: 60 + Math.floor(Math.random() * 40),
      aiInsight: [
        "Great deal — 20% below market average",
        "Fair price — matches recent comps",
        "Seller has fast shipping, 4.9★ rating",
        "Rare colorway — high resale potential",
        "Price is slightly above market — negotiate",
      ][i % 5],
    };
  });
}

// ── Search cache — keeps last 10 searches in memory ──
const MAX_CACHED_SEARCHES = 10;
const searchCache = new Map<string, SearchResult[]>();

function getCachedResults(key: string): SearchResult[] | null {
  return searchCache.get(key) ?? null;
}

function setCachedResults(key: string, results: SearchResult[]) {
  // Evict oldest if at capacity
  if (searchCache.size >= MAX_CACHED_SEARCHES && !searchCache.has(key)) {
    const oldest = searchCache.keys().next().value;
    if (oldest !== undefined) searchCache.delete(oldest);
  }
  searchCache.set(key, results);
}

export default function CrossMarketSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(PLATFORMS.map((p) => p.id)));
  const [showFilters, setShowFilters] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [detailResult, setDetailResult] = useState<SearchResult | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [fromCache, setFromCache] = useState(false);
  const SEARCH_PAGE_SIZE = 9;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    const cacheKey = query.trim().toLowerCase();

    // Check cache first
    const cached = getCachedResults(cacheKey);
    if (cached) {
      setResults(cached);
      setSearchPage(1);
      setSearched(true);
      setSelectedResult(null);
      setFromCache(true);
      toast.success(`${cached.length} results (cached)`);
      return;
    }

    setLoading(true);
    setSearched(true);
    setSelectedResult(null);
    setFromCache(false);
    // Simulate AI-powered search delay
    await new Promise((r) => setTimeout(r, 1500));
    const mockResults = generateMockResults(query);
    setResults(mockResults);
    setCachedResults(cacheKey, mockResults);
    setSearchPage(1);
    setLoading(false);
    toast.success(`Found ${mockResults.length} results across ${selectedPlatforms.size} platforms`);
  }, [query, selectedPlatforms.size]);

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Detail modal navigation
  const openDetail = (result: SearchResult) => { setDetailResult(result); setDetailImageIdx(0); };
  const closeDetail = () => setDetailResult(null);
  const navigateDetail = (dir: 1 | -1) => {
    if (!detailResult) return;
    const list = sortedResults;
    const idx = list.findIndex((r) => r.id === detailResult.id);
    const next = list[idx + dir];
    if (next) { setDetailResult(next); setDetailImageIdx(0); }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "newest") return (a.postedAgo > b.postedAgo ? 1 : -1);
    return (b.aiScore ?? 0) - (a.aiScore ?? 0);
  }).filter((r) => {
    if (!selectedPlatforms.has(PLATFORMS.find((p) => p.label === r.platform)?.id ?? "")) return false;
    if (priceMin && r.price < Number(priceMin)) return false;
    if (priceMax && r.price > Number(priceMax)) return false;
    return true;
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Cross-Market Search</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Search across all marketplaces at once — AI ranks the best deals for you
        </p>
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search across Depop, Grailed, Poshmark, eBay, Mercari, Vinted..."
            className="pl-10 h-11 text-[14px]"
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="h-11 px-6 gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Search
        </Button>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="h-11 gap-1.5">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl bg-card border border-border p-4 space-y-4 animate-fade-in">
          {/* Platform toggles */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Platforms</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all",
                    selectedPlatforms.has(p.id)
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-muted-foreground">Price</span>
            <Input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="h-8 w-24 text-[12px]" />
            <span className="text-muted-foreground">—</span>
            <Input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="h-8 w-24 text-[12px]" />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Sort</span>
            {(["relevance", "price-low", "price-high", "newest"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={cn("px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-colors",
                  sortBy === s ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground"
                )}
              >
                {s.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex flex-col items-center py-16 text-center animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-[var(--primary)] animate-pulse-soft" />
          </div>
          <h3 className="text-sm font-semibold mb-1">Searching {selectedPlatforms.size} marketplaces...</h3>
          <p className="text-xs text-muted-foreground">AI is finding and ranking the best deals for you</p>
          <div className="flex gap-1 mt-4">
            {PLATFORMS.filter((p) => selectedPlatforms.has(p.id)).slice(0, 6).map((p) => (
              <span key={p.id} className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: p.color, animationDelay: `${PLATFORMS.indexOf(p) * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {!loading && searched && sortedResults.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold mb-1">No results found</h3>
          <p className="text-xs text-muted-foreground">Try a different search term or adjust your filters</p>
        </div>
      )}

      {!loading && sortedResults.length > 0 && (
        <div>
          {(() => {
            const totalSearchPages = Math.ceil(sortedResults.length / SEARCH_PAGE_SIZE);
            const paginatedResults = sortedResults.slice((searchPage - 1) * SEARCH_PAGE_SIZE, searchPage * SEARCH_PAGE_SIZE);
            return (<>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">{sortedResults.length}</span> results across <span className="font-semibold text-foreground">{new Set(sortedResults.map((r) => r.platform)).size}</span> platforms
              {fromCache && <span className="ml-1.5 text-[10px] text-emerald-500 font-medium">⚡ cached</span>}
              {totalSearchPages > 1 && <span> · Page {searchPage}/{totalSearchPages}</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {paginatedResults.map((result) => {
              const isSelected = selectedResult?.id === result.id;
              const marketAvg = Math.round(result.price * (0.9 + Math.random() * 0.3));
              const resaleEst = Math.round(result.price * (1.2 + Math.random() * 0.5));
              const dealPercent = Math.round(((marketAvg - result.price) / marketAvg) * 100);

              return (
                <div
                  key={result.id}
                  className={cn(
                    "rounded-xl bg-card border overflow-hidden transition-all duration-200 hover:shadow-lg group flex flex-col",
                    isSelected ? "ring-2 ring-[var(--primary)] shadow-lg" : "border-[var(--border)]"
                  )}
                >
                  {/* Product image area */}
                  <button onClick={() => openDetail(result)} className="relative h-52 cursor-pointer overflow-hidden w-full">
                    <img
                      src={result.images[0]}
                      alt={result.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Platform badge — with real icon */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                      <img src={`/platforms/${result.platform.toLowerCase().replace(" ", "")}.svg`} alt="" className="h-4 w-4 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <span className="text-[11px] font-semibold text-white">{result.platform}</span>
                    </div>
                    {/* AI score */}
                    {result.aiScore && (
                      <div className={cn(
                        "absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-sm",
                        result.aiScore >= 85 ? "bg-emerald-500/80" : result.aiScore >= 70 ? "bg-blue-500/80" : "bg-black/50"
                      )}>
                        <Sparkles className="h-3 w-3 text-white" />
                        <span className="text-[11px] font-bold text-white">{result.aiScore}</span>
                      </div>
                    )}
                    {/* Deal badge */}
                    {dealPercent > 5 && (
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg bg-emerald-500/90 text-[10px] font-bold text-white flex items-center gap-1">
                        <Zap className="h-3 w-3" /> {dealPercent}% below market
                      </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-black/40 backdrop-blur-sm text-[9px] text-white/70">
                      {result.postedAgo} ago
                    </div>
                  </button>

                  {/* Card body — fixed structure for alignment */}
                  <div className="p-3.5 flex-1 flex flex-col">
                    {/* Price row */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">${result.price}</span>
                        {result.originalPrice && (
                          <span className="text-[12px] text-muted-foreground line-through">${result.originalPrice}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {result.likes != null && <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{result.likes}</span>}
                        {result.views != null && <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{result.views}</span>}
                      </div>
                    </div>

                    {/* Title — fixed 2 lines */}
                    <h3 className="text-[13px] font-semibold line-clamp-2 mb-2 min-h-[36px] cursor-pointer group-hover:text-[var(--primary)] transition-colors" onClick={() => openDetail(result)}>{result.title}</h3>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap gap-1 mb-2.5 min-h-[22px]">
                      {result.brand && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.brand}</Badge>}
                      {result.size && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.size}</Badge>}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.condition}</Badge>
                    </div>

                    {/* AI insight — grows to fill */}
                    <div className="flex-1 mb-2.5">
                      {result.aiInsight && (
                        <div className="flex items-start gap-1.5 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10 px-2.5 py-1.5">
                          <Sparkles className="h-3 w-3 text-[var(--primary)] shrink-0 mt-0.5" />
                          <p className="text-[10px] text-[var(--primary)] leading-snug">{result.aiInsight}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom row — always at same position */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">@{result.seller}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground"><BarChart3 className="h-3 w-3" />${marketAvg}</span>
                        <span className="flex items-center gap-0.5 text-[9px] text-emerald-500"><TrendingUp className="h-3 w-3" />${resaleEst}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions toggle */}
                  <button
                    onClick={() => setSelectedResult(isSelected ? null : result)}
                    className="w-full text-center py-1.5 border-t border-border text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors shrink-0"
                  >
                    {isSelected ? "Close" : "Quick Actions"}
                  </button>

                  {isSelected && (
                    <div className="p-3.5 pt-0 space-y-2 animate-fade-in shrink-0">
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 h-8 text-[11px] gap-1.5" onClick={() => openDetail(result)}>
                          <ExternalLink className="h-3 w-3" /> View Details
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] gap-1.5">
                          <Tag className="h-3 w-3" /> Save to List
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalSearchPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={searchPage <= 1}
                onClick={() => { setSearchPage((p) => p - 1); setSelectedResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >
                Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(totalSearchPages, 5) }, (_, i) => {
                  const p = searchPage <= 3 ? i + 1 : searchPage + i - 2;
                  if (p < 1 || p > totalSearchPages) return null;
                  return (
                    <button
                      key={p}
                      onClick={() => { setSearchPage(p); setSelectedResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={cn(
                        "h-8 w-8 rounded-md text-xs font-medium transition-colors",
                        p === searchPage ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={searchPage >= totalSearchPages}
                onClick={() => { setSearchPage((p) => p + 1); setSelectedResult(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              >
                Next
              </Button>
            </div>
          )}
        </>); })()}
        </div>
      )}

      {/* Empty state */}
      {!searched && !loading && (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Search Across All Marketplaces</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            Find the best deals on sneakers, streetwear, and luxury items. AI ranks results by value, authenticity signals, and resale potential.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {["Supreme Box Logo", "Jordan 1 Retro", "Arc'teryx Alpha SV", "Vintage Levi's 501", "Balenciaga Track"].map((s) => (
              <button
                key={s}
                onClick={() => { setQuery(s); }}
                className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-[11px] font-medium hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Recent searches from cache */}
          {searchCache.size > 0 && (
            <div className="mt-4 pt-4 border-t border-border max-w-md mx-auto">
              <p className="text-[11px] text-muted-foreground font-medium mb-2 text-center">Recent Searches</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {[...searchCache.keys()].reverse().map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setQuery(key);
                      const cached = getCachedResults(key);
                      if (cached) {
                        setResults(cached);
                        setSearchPage(1);
                        setSearched(true);
                        setFromCache(true);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-[11px] text-muted-foreground hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] transition-colors"
                  >
                    <Search className="h-3 w-3" />
                    {key}
                    <span className="text-[9px] text-muted-foreground/40">{searchCache.get(key)?.length}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ PRODUCT DETAIL MODAL ═══ */}
      {detailResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={closeDetail}>
          <div className="relative w-full max-w-4xl max-h-[90vh] mx-4 rounded-2xl bg-card border border-[var(--border)] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: detailResult.platformColor }} />
                <span className="text-[13px] font-semibold">{detailResult.platform}</span>
                <span className="text-[11px] text-muted-foreground">@{detailResult.seller}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigateDetail(-1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" title="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => navigateDetail(1)} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors" title="Next">
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={closeDetail} className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Left: Image viewer */}
                <div className="bg-muted/20 relative">
                  <div className="aspect-square relative">
                    <img
                      src={detailResult.images[detailImageIdx] || detailResult.images[0]}
                      alt={detailResult.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Image navigation */}
                    {detailResult.images.length > 1 && (
                      <>
                        <button onClick={() => setDetailImageIdx((p) => Math.max(0, p - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          disabled={detailImageIdx === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDetailImageIdx((p) => Math.min(detailResult.images.length - 1, p + 1))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                          disabled={detailImageIdx === detailResult.images.length - 1}>
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {detailResult.images.map((_, idx) => (
                            <button key={idx} onClick={() => setDetailImageIdx(idx)}
                              className={cn("h-2 w-2 rounded-full transition-all", idx === detailImageIdx ? "bg-white w-4" : "bg-white/40")} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  {detailResult.images.length > 1 && (
                    <div className="flex gap-1 p-2">
                      {detailResult.images.map((img, idx) => (
                        <button key={idx} onClick={() => setDetailImageIdx(idx)}
                          className={cn("h-14 w-14 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                            idx === detailImageIdx ? "border-[var(--primary)]" : "border-transparent opacity-60 hover:opacity-100"
                          )}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Details + actions */}
                <div className="p-5 space-y-4">
                  {/* Title + price */}
                  <div>
                    <h2 className="text-lg font-bold mb-1">{detailResult.title}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">${detailResult.price}</span>
                      {detailResult.originalPrice && (
                        <span className="text-base text-muted-foreground line-through">${detailResult.originalPrice}</span>
                      )}
                      {detailResult.aiScore && (
                        <Badge className={cn("text-[10px]",
                          detailResult.aiScore >= 85 ? "bg-emerald-500/10 text-emerald-500" :
                          detailResult.aiScore >= 70 ? "bg-blue-500/10 text-blue-500" :
                          "bg-muted text-muted-foreground"
                        )}>AI Score: {detailResult.aiScore}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-2">
                    {detailResult.brand && <Badge variant="outline">{detailResult.brand}</Badge>}
                    {detailResult.size && <Badge variant="outline">{detailResult.size}</Badge>}
                    <Badge variant="outline">{detailResult.condition}</Badge>
                    <Badge variant="outline" className="capitalize">{detailResult.platform}</Badge>
                  </div>

                  {/* AI Insight */}
                  {detailResult.aiInsight && (
                    <div className="flex items-start gap-2 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-3">
                      <Sparkles className="h-4 w-4 text-[var(--primary)] shrink-0 mt-0.5" />
                      <p className="text-[13px] text-[var(--primary)]">{detailResult.aiInsight}</p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Market Avg</p>
                      <p className="text-[15px] font-bold">${Math.round(detailResult.price * (0.9 + Math.random() * 0.3))}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Resale Est</p>
                      <p className="text-[15px] font-bold text-emerald-500">${Math.round(detailResult.price * (1.2 + Math.random() * 0.5))}</p>
                    </div>
                    <div className="rounded-lg bg-muted/30 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground mb-0.5">Engagement</p>
                      <p className="text-[15px] font-bold">{(detailResult.likes ?? 0) + (detailResult.views ?? 0)}</p>
                    </div>
                  </div>

                  {/* Seller info */}
                  <div className="flex items-center justify-between py-2 border-t border-b border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold">{detailResult.seller[0].toUpperCase()}</div>
                      <div>
                        <p className="text-[13px] font-semibold">@{detailResult.seller}</p>
                        <p className="text-[11px] text-muted-foreground">{detailResult.postedAgo} ago</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{detailResult.likes}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{detailResult.views}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <a href={detailResult.listingUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full h-11 text-[14px] gap-2">
                        <ExternalLink className="h-4 w-4" /> View on {detailResult.platform}
                      </Button>
                    </a>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-10 text-[13px] gap-2">
                        <DollarSign className="h-4 w-4" /> Send Offer
                      </Button>
                      <Button variant="outline" className="h-10 text-[13px] gap-2">
                        <Tag className="h-4 w-4" /> Save to List
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
