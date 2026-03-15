"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Search,
  Target,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  Flame,
  BarChart3,
  Users,
  Zap,
  Lightbulb,
  Tag,
  ShoppingBag,
  ArrowRight,
  Star,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────

interface DiscoveredProduct {
  name: string;
  subtitle: string;
  sku?: string;
  imageSearch?: string;
  colorway?: string;
  avgResalePrice: number;
  retailPrice: number;
  demandLevel: string;
  profitMargin: string;
  bestPlatform: string;
  seasonality: string;
  quickTip: string;
  _imageUrl?: string; // resolved client-side
}

interface DiscoveryResult {
  products: DiscoveredProduct[];
  marketInsight: string;
  error?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>;

// ── Helpers ─────────────────────────────────────────────────────────

const demandBadge = (level: string) => {
  const l = (level || "").toLowerCase();
  if (l.includes("high")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700";
  if (l.includes("medium")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700";
  return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700";
};

const platformLabel: Record<string, string> = {
  depop: "Depop",
  grailed: "Grailed",
  poshmark: "Poshmark",
  mercari: "Mercari",
  ebay: "eBay",
};

const platformBadgeColor: Record<string, string> = {
  depop: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-300 dark:border-orange-700",
  grailed: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700",
  poshmark: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-300 dark:border-pink-700",
  mercari: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700",
  ebay: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700",
};

// ── Image resolution ────────────────────────────────────────────

async function resolveImages(
  products: DiscoveredProduct[]
): Promise<DiscoveredProduct[]> {
  const results = await Promise.allSettled(
    products.map(async (p) => {
      const query = p.imageSearch || `${p.name} product photo`;
      try {
        const res = await fetch(
          `/api/image-search?q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        return { ...p, _imageUrl: data.url || "" };
      } catch {
        return { ...p, _imageUrl: "" };
      }
    })
  );
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ...products[i], _imageUrl: "" }
  );
}

// ── Product image with fallback ─────────────────────────────────

function ProductImage({
  product,
  size = "md",
}: {
  product: DiscoveredProduct;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-24 w-full",
    lg: "h-32 w-full",
  };
  const iconSizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-10 w-10" };

  const [failed, setFailed] = useState(false);
  const hasImage = product._imageUrl && !failed;

  // Generate a consistent gradient based on product name
  const hash = product.name
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg overflow-hidden relative flex items-center justify-center shrink-0`}
      style={{
        background: hasImage
          ? "var(--muted)"
          : `linear-gradient(135deg, hsl(${hue}, 40%, 85%), hsl(${(hue + 40) % 360}, 35%, 75%))`,
      }}
    >
      {hasImage ? (
        <img
          src={product._imageUrl!}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-white/80">
          <ShoppingBag className={iconSizes[size]} />
          {size !== "sm" && product.colorway && (
            <span className="text-[9px] font-medium opacity-70 px-1 truncate max-w-full">
              {product.colorway}
            </span>
          )}
        </div>
      )}
      {/* Loading shimmer while image loads */}
      {product._imageUrl === undefined && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-lg" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════

export default function CompetitorPage() {
  // Step state
  const [step, setStep] = useState<"discover" | "select" | "analyze">("discover");

  // Step 1 — Discovery
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);

  // Step 2 — Selected product
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null);

  // Step 3 — Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  // ── Step 1: Discover products ──────────────────────────────────

  const discoverProducts = async () => {
    if (!brand.trim() && !category.trim()) {
      toast.error("Enter a brand or category");
      return;
    }
    setDiscovering(true);
    setDiscovery(null);
    try {
      const res = await fetch("/api/ai/competitor/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand: brand.trim(), category: category.trim() }),
      });
      const data = await res.json();
      if (data.error && (!data.products || data.products.length === 0)) {
        throw new Error(data.error);
      }
      setDiscovery(data);
      setStep("select");

      // Resolve images in background — don't block the UI
      if (data.products?.length > 0) {
        resolveImages(data.products).then((withImages) => {
          setDiscovery((prev) =>
            prev ? { ...prev, products: withImages } : prev
          );
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to discover products");
    }
    setDiscovering(false);
  };

  // ── Step 2: Select → Run analysis ──────────────────────────────

  const runAnalysis = async (product: DiscoveredProduct) => {
    setSelectedProduct(product);
    setStep("analyze");
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/ai/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: product.name,
          brand: brand.trim(),
          category: category.trim(),
          price: product.avgResalePrice,
        }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      setAnalysis(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setStep("select");
    }
    setAnalyzing(false);
  };

  // ── Reset ──────────────────────────────────────────────────────

  const goBack = () => {
    if (step === "analyze") {
      setStep("select");
      setAnalysis(null);
      setSelectedProduct(null);
    } else if (step === "select") {
      setStep("discover");
      setDiscovery(null);
    }
  };

  const startOver = () => {
    setStep("discover");
    setDiscovery(null);
    setSelectedProduct(null);
    setAnalysis(null);
    setBrand("");
    setCategory("");
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {step !== "discover" && (
            <Button variant="ghost" size="sm" onClick={goBack} className="h-8 gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Competitor Analysis</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              {step === "discover" && "Discover products to analyze in any brand or category"}
              {step === "select" && `Select a ${brand || category} product to deep-dive`}
              {step === "analyze" && `Full analysis: ${selectedProduct?.name}`}
            </p>
          </div>
        </div>
        {step !== "discover" && (
          <Button variant="outline" size="sm" className="h-8 text-[13px]" onClick={startOver}>
            New Search
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { id: "discover", label: "1. Brand & Category", icon: Search },
          { id: "select", label: "2. Choose Product", icon: ShoppingBag },
          { id: "analyze", label: "3. Deep Analysis", icon: Target },
        ].map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 sm:w-10 bg-border" />}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${
              step === s.id
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : step === "analyze" && s.id === "discover" || step === "analyze" && s.id === "select" || step === "select" && s.id === "discover"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
            }`}>
              {(step === "select" && s.id === "discover") || (step === "analyze" && (s.id === "discover" || s.id === "select"))
                ? <CheckCircle2 className="h-3 w-3" />
                : <s.icon className="h-3 w-3" />
              }
              <span className="hidden sm:inline font-medium">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 1: DISCOVER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === "discover" && (
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-5 w-5" style={{ color: "var(--primary)" }} />
              What are you selling?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  placeholder="e.g., Nike, Supreme, Levi's, Arc'teryx"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && discoverProducts()}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g., Sneakers, Jackets, Denim, Bags"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && discoverProducts()}
                />
              </div>
            </div>
            <Button
              className="w-full h-11"
              onClick={discoverProducts}
              disabled={discovering || (!brand.trim() && !category.trim())}
            >
              {discovering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {discovering ? "Scanning resale markets..." : "Discover Products"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              AI will find the most popular resale items for this brand/category
            </p>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 2: SELECT PRODUCT */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === "select" && discovery && (
        <div className="space-y-4">
          {/* Market insight banner */}
          {discovery.marketInsight && (
            <div className="rounded-xl border border-border bg-[var(--accent)] p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--accent-foreground)" }}>
                    Market Insight
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {discovery.marketInsight}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(discovery.products || []).map((product, i) => (
              <button
                key={i}
                onClick={() => runAnalysis(product)}
                className="group text-left rounded-xl border border-border bg-card overflow-hidden hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
              >
                {/* Product image */}
                <ProductImage product={product} size="lg" />

                <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                    {product.name}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[var(--primary)] shrink-0 mt-0.5 transition-colors" />
                </div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {product.subtitle && (
                    <span className="text-[11px] text-muted-foreground">{product.subtitle}</span>
                  )}
                  {product.sku && product.sku !== "N/A" && product.sku !== "Various" && (
                    <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {product.sku}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={demandBadge(product.demandLevel)}>
                    <Flame className="h-3 w-3 mr-1" />
                    {product.demandLevel}
                  </Badge>
                  <Badge variant="outline" className={platformBadgeColor[product.bestPlatform] || "bg-muted"}>
                    {platformLabel[product.bestPlatform] || product.bestPlatform}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-muted/40 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Resale</p>
                    <p className="text-sm font-bold">${product.avgResalePrice}</p>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Retail</p>
                    <p className="text-sm font-mono text-muted-foreground">${product.retailPrice}</p>
                  </div>
                  <div className="text-center p-2 bg-emerald-500/5 rounded-lg">
                    <p className="text-[10px] text-muted-foreground">Margin</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{product.profitMargin}</p>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <Star className="h-3 w-3 inline mr-1 text-amber-500" />
                  {product.quickTip}
                </p>
                </div>
              </button>
            ))}
          </div>

          {discovery.products?.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No products found</p>
              <p className="text-xs text-muted-foreground mb-4">Try a different brand or category</p>
              <Button variant="outline" size="sm" onClick={goBack}>Try Again</Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 3: DEEP ANALYSIS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === "analyze" && (
        <div className="space-y-4">
          {/* Selected product summary */}
          {selectedProduct && (
            <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--accent)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--accent-foreground)" }}>
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {brand} · {category}
                    {selectedProduct.sku && selectedProduct.sku !== "N/A" && ` · ${selectedProduct.sku}`}
                    {` · Avg $${selectedProduct.avgResalePrice}`}
                  </p>
                </div>
                <Badge variant="outline" className={demandBadge(selectedProduct.demandLevel)}>
                  {selectedProduct.demandLevel} demand
                </Badge>
              </div>
            </div>
          )}

          {/* Loading */}
          {analyzing && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}>
                <Target className="h-7 w-7 animate-pulse-soft" style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="text-lg font-semibold mb-1">Running Deep Analysis</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Analyzing competitors, pricing strategies, keywords, and market positioning for {selectedProduct?.name}...
              </p>
              <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ background: "var(--primary)", animation: "loading-bar-progress 2.5s ease-in-out infinite" }} />
              </div>
              <style>{`
                @keyframes loading-bar-progress {
                  0% { width: 5%; margin-left: 0%; }
                  30% { width: 45%; margin-left: 5%; }
                  60% { width: 30%; margin-left: 50%; }
                  80% { width: 20%; margin-left: 70%; }
                  100% { width: 5%; margin-left: 95%; }
                }
              `}</style>
            </div>
          )}

          {/* Analysis results */}
          {analysis && !analyzing && (
            <div className="space-y-4">
              {/* Market Overview */}
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" style={{ color: "var(--primary)" }} />
                    Market Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[11px] text-muted-foreground mb-1">Saturation</p>
                      <Badge variant="outline" className="text-xs font-bold">
                        {analysis?.marketOverview?.saturation || analysis?.marketOverview?.saturationLevel || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[11px] text-muted-foreground mb-1">Demand</p>
                      <Badge variant="outline" className={demandBadge(analysis?.marketOverview?.demandLevel || "")}>
                        {analysis?.marketOverview?.demandLevel || "N/A"}
                      </Badge>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[11px] text-muted-foreground mb-1">Price Range</p>
                      <p className="text-sm font-bold">
                        {analysis?.marketOverview?.priceRange
                          ? `$${analysis.marketOverview.priceRange.low}-$${analysis.marketOverview.priceRange.high}`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-xl">
                      <p className="text-[11px] text-muted-foreground mb-1">Listings</p>
                      <p className="text-sm font-bold">~{analysis?.marketOverview?.totalEstimatedListings || "?"}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis?.marketOverview?.summary || "No summary available."}
                  </p>
                </CardContent>
              </Card>

              {/* Strategies + Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      What Competitors Do
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(analysis?.competitorStrategies || []).map((s: Record<string, string> | string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span>{typeof s === "string" ? s : (s.strategy || s.detail || JSON.stringify(s))}</span>
                        </li>
                      ))}
                      {(!analysis?.competitorStrategies || analysis.competitorStrategies.length === 0) && (
                        <li className="text-sm text-muted-foreground">No data available</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      How to Stand Out
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {(analysis?.differentiationTips || []).map((t: Record<string, string> | string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>{typeof t === "string" ? t : (t.tip || t.detail || JSON.stringify(t))}</span>
                        </li>
                      ))}
                      {(!analysis?.differentiationTips || analysis.differentiationTips.length === 0) && (
                        <li className="text-sm text-muted-foreground">No data available</li>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Keywords */}
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4 text-amber-500" />
                    Keywords & SEO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analysis?.keywords && (
                    <>
                      {analysis.keywords.searchTerms?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Search Terms</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.keywords.searchTerms.map((kw: string) => (
                              <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.keywords.hashtags?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Hashtags</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.keywords.hashtags.map((h: string) => (
                              <Badge key={h} variant="outline" className="text-xs bg-blue-500/5">#{h}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.keywords.titleKeywords?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Title Keywords</p>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.keywords.titleKeywords.map((kw: string) => (
                              <Badge key={kw} variant="outline" className="text-xs bg-emerald-500/5">{kw}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {!analysis?.keywords && <p className="text-sm text-muted-foreground">No keyword data available</p>}
                </CardContent>
              </Card>

              {/* Pricing Recommendation */}
              <Card className="border border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    Pricing Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="text-center p-4 bg-emerald-500/5 rounded-xl shrink-0">
                      <p className="text-xs text-muted-foreground mb-1">Optimal Price</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${analysis?.pricingRecommendation?.suggestedPrice || "?"}
                      </p>
                    </div>
                    <div className="space-y-2 flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {analysis?.pricingRecommendation?.reasoning || ""}
                      </p>
                      {analysis?.pricingRecommendation?.undercut && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Undercut strategy:</span> {analysis.pricingRecommendation.undercut}
                        </p>
                      )}
                      {analysis?.pricingRecommendation?.premiumJustification && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">Premium angle:</span> {analysis.pricingRecommendation.premiumJustification}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
