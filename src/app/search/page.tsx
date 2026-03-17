"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Loader2, Filter, ExternalLink, Heart, Eye,
  ShoppingBag, Sparkles, X, DollarSign, Tag,
  TrendingUp, Shield, BarChart3, Zap,
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
  imageUrl?: string;
  listingUrl: string;
  likes?: number;
  views?: number;
  postedAgo: string;
  aiScore?: number;
  aiInsight?: string;
}

type SortKey = "relevance" | "price-low" | "price-high" | "newest";

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

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setSelectedResult(null);
    // Simulate AI-powered search delay
    await new Promise((r) => setTimeout(r, 1500));
    const mockResults = generateMockResults(query);
    setResults(mockResults);
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
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12px] text-muted-foreground">
              <span className="font-semibold text-foreground">{sortedResults.length}</span> results across <span className="font-semibold text-foreground">{new Set(sortedResults.map((r) => r.platform)).size}</span> platforms
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedResults.map((result) => {
              const isSelected = selectedResult?.id === result.id;
              const marketAvg = Math.round(result.price * (0.9 + Math.random() * 0.3));
              const resaleEst = Math.round(result.price * (1.2 + Math.random() * 0.5));
              const dealPercent = Math.round(((marketAvg - result.price) / marketAvg) * 100);

              return (
                <div
                  key={result.id}
                  className={cn(
                    "rounded-xl bg-card border overflow-hidden transition-all duration-200 hover:shadow-lg group",
                    isSelected ? "ring-2 ring-[var(--primary)] shadow-lg" : "border-[var(--border)]"
                  )}
                >
                  {/* Product image placeholder */}
                  <a href={result.listingUrl} target="_blank" rel="noopener noreferrer" className="block relative">
                    <div className="h-44 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative overflow-hidden">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/15" />
                      {/* Platform badge */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: result.platformColor }} />
                        <span className="text-[9px] font-semibold text-white">{result.platform}</span>
                      </div>
                      {/* AI score badge */}
                      {result.aiScore && (
                        <div className={cn(
                          "absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm",
                          result.aiScore >= 85 ? "bg-emerald-500/80" : result.aiScore >= 70 ? "bg-blue-500/80" : "bg-black/50"
                        )}>
                          <Sparkles className="h-2.5 w-2.5 text-white" />
                          <span className="text-[9px] font-bold text-white">{result.aiScore}</span>
                        </div>
                      )}
                      {/* Deal badge */}
                      {dealPercent > 5 && (
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[9px] font-bold text-white flex items-center gap-0.5">
                          <Zap className="h-2.5 w-2.5" /> {dealPercent}% below market
                        </div>
                      )}
                      {/* Time badge */}
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[8px] text-white/70">
                        {result.postedAgo} ago
                      </div>
                    </div>
                  </a>

                  <div className="p-3.5">
                    {/* Price */}
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

                    {/* Title */}
                    <a href={result.listingUrl} target="_blank" rel="noopener noreferrer">
                      <h3 className="text-[13px] font-semibold line-clamp-2 mb-2 group-hover:text-[var(--primary)] transition-colors">{result.title}</h3>
                    </a>

                    {/* Metadata badges */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {result.brand && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.brand}</Badge>}
                      {result.size && <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.size}</Badge>}
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{result.condition}</Badge>
                    </div>

                    {/* AI insight */}
                    {result.aiInsight && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10 px-2.5 py-1.5 mb-2.5">
                        <Sparkles className="h-3 w-3 text-[var(--primary)] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[var(--primary)] leading-snug">{result.aiInsight}</p>
                      </div>
                    )}

                    {/* Seller + AI analysis row */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">@{result.seller}</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground" title="Market average">
                          <BarChart3 className="h-3 w-3" /> ${marketAvg}
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] text-emerald-500" title="Resale estimate">
                          <TrendingUp className="h-3 w-3" /> ${resaleEst}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (click to expand) */}
                  <button
                    onClick={() => setSelectedResult(isSelected ? null : result)}
                    className="w-full text-center py-1.5 border-t border-border text-[10px] font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                  >
                    {isSelected ? "Close" : "Quick Actions"}
                  </button>

                  {isSelected && (
                    <div className="p-3.5 pt-0 space-y-2 animate-fade-in">
                      <div className="flex gap-2">
                        <a href={result.listingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" className="w-full h-8 text-[11px] gap-1.5">
                            <ExternalLink className="h-3 w-3" /> View on {result.platform}
                          </Button>
                        </a>
                        <Button variant="outline" size="sm" className="flex-1 h-8 text-[11px] gap-1.5">
                          <Tag className="h-3 w-3" /> Save to List
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                        <div className="rounded-lg bg-muted/30 p-2 text-center">
                          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground mx-auto mb-0.5" />
                          <p className="font-semibold">${marketAvg}</p>
                          <p className="text-[8px] text-muted-foreground">Market Avg</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2 text-center">
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-0.5" />
                          <p className="font-semibold text-emerald-500">${resaleEst}</p>
                          <p className="text-[8px] text-muted-foreground">Resale Est</p>
                        </div>
                        <div className="rounded-lg bg-muted/30 p-2 text-center">
                          <Shield className="h-3.5 w-3.5 text-blue-500 mx-auto mb-0.5" />
                          <p className="font-semibold text-blue-500">{result.aiScore}%</p>
                          <p className="text-[8px] text-muted-foreground">AI Score</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
          <div className="flex flex-wrap justify-center gap-2">
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
        </div>
      )}
    </div>
  );
}
