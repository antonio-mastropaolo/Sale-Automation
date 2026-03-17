"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronDown,
  ChevronUp,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  vinted: "Vinted",
  facebook: "Facebook Marketplace",
  vestiaire: "Vestiaire Collective",
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
    lg: "h-44 w-full",
  };
  const iconSizes = { sm: "h-5 w-5", md: "h-8 w-8", lg: "h-12 w-12" };

  const [failed, setFailed] = useState(false);
  const hasImage = product._imageUrl && !failed;

  // Generate a consistent gradient based on product name
  const hash = product.name
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = hash % 360;

  return (
    <div
      className={`${sizeClasses[size]} overflow-hidden relative flex items-center justify-center shrink-0`}
      style={{
        background: hasImage
          ? "var(--muted)"
          : `linear-gradient(135deg, hsl(${hue}, 45%, 80%), hsl(${(hue + 50) % 360}, 40%, 65%))`,
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
        <div className="flex flex-col items-center gap-1.5 text-white/70">
          <ShoppingBag className={iconSizes[size]} />
          {size !== "sm" && product.colorway && (
            <span className="text-[10px] font-medium opacity-60 px-2 truncate max-w-full">
              {product.colorway}
            </span>
          )}
        </div>
      )}
      {/* Loading shimmer while image loads */}
      {product._imageUrl === undefined && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
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
  const [sku, setSku] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discovery, setDiscovery] = useState<DiscoveryResult | null>(null);

  // Step 2 — Selected product
  const [selectedProduct, setSelectedProduct] = useState<DiscoveredProduct | null>(null);

  // Step 3 — Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  // UI state
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [insightOpen, setInsightOpen] = useState(true);

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
        body: JSON.stringify({ brand: brand.trim(), category: category.trim(), sku: sku.trim() || undefined }),
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
    setSku("");
  };

  // ── Markup percentage helper ───────────────────────────────────

  const calcMarkup = (retail: number, resale: number) => {
    if (!retail || retail === 0) return 0;
    return Math.round(((resale - retail) / retail) * 100);
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
              {step === "discover" && "Discover trending resale products and analyze the competition"}
              {step === "select" && `Found ${discovery?.products?.length || 0} products for ${brand || category} -- pick one to analyze`}
              {step === "analyze" && `Deep analysis: ${selectedProduct?.name}`}
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
      {/* STEP 1: DISCOVER                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === "discover" && (
        <div className="space-y-6">
          {/* Hero search area */}
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="max-w-2xl mx-auto text-center mb-6">
              <div className="h-14 w-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4 mx-auto">
                <Search className="h-7 w-7 text-[var(--primary)]" />
              </div>
              <h2 className="text-lg font-semibold mb-1">What are you selling?</h2>
              <p className="text-sm text-muted-foreground">
                Enter a brand and category to discover the hottest resale products and competitor pricing
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4">
              {/* Main search row */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Brand — Nike, Supreme, Arc'teryx..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="pl-10 h-12 text-[14px]"
                    onKeyDown={(e) => e.key === "Enter" && discoverProducts()}
                  />
                </div>
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Category — Sneakers, Jackets, Bags..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="pl-10 h-12 text-[14px]"
                    onKeyDown={(e) => e.key === "Enter" && discoverProducts()}
                  />
                </div>
              </div>

              {/* Optional SKU row */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="SKU or model number (optional) — CW2288-111, 501-0115, FW23..."
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="pl-10 h-11 font-mono text-sm"
                  onKeyDown={(e) => e.key === "Enter" && discoverProducts()}
                />
              </div>

              {/* Search button */}
              <Button
                className="w-full h-12 text-[14px] gap-2"
                onClick={discoverProducts}
                disabled={discovering || (!brand.trim() && !category.trim())}
              >
                {discovering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {discovering ? "Scanning resale markets..." : "Discover Products"}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                AI scans Depop, Grailed, eBay, Poshmark, Mercari, and more to find trending items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 2: SELECT PRODUCT (card grid)                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {step === "select" && discovery && (
        <div className="space-y-4">
          {/* Collapsible market insight banner */}
          {discovery.marketInsight && (
            <button
              onClick={() => setInsightOpen(!insightOpen)}
              className="w-full text-left rounded-xl border border-border bg-[var(--accent)] overflow-hidden transition-all"
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--accent-foreground)" }}>
                      Market Insight
                    </p>
                    {!insightOpen && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {discovery.marketInsight}
                      </p>
                    )}
                  </div>
                </div>
                {insightOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
              {insightOpen && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed pl-11">
                    {discovery.marketInsight}
                  </p>
                </div>
              )}
            </button>
          )}

          {/* Product card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(discovery.products || []).map((product, i) => {
              const markup = calcMarkup(product.retailPrice, product.avgResalePrice);
              const isPositiveMarkup = markup > 0;

              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl bg-card border overflow-hidden transition-all duration-200 hover:shadow-lg group",
                    "border-[var(--border)]"
                  )}
                >
                  {/* Product image area with overlays */}
                  <button
                    onClick={() => runAnalysis(product)}
                    className="block w-full relative text-left"
                  >
                    <ProductImage product={product} size="lg" />

                    {/* Demand badge overlay — top left */}
                    <div className="absolute top-2.5 left-2.5">
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-sm",
                        product.demandLevel.toLowerCase().includes("high")
                          ? "bg-emerald-500/80"
                          : product.demandLevel.toLowerCase().includes("medium")
                            ? "bg-amber-500/80"
                            : "bg-red-500/80"
                      )}>
                        <Flame className="h-2.5 w-2.5 text-white" />
                        <span className="text-[9px] font-bold text-white">{product.demandLevel}</span>
                      </div>
                    </div>

                    {/* Profit margin overlay — top right */}
                    <div className="absolute top-2.5 right-2.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                        <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                        <span className="text-[9px] font-bold text-emerald-400">{product.profitMargin} margin</span>
                      </div>
                    </div>

                    {/* Platform badge — bottom left */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm">
                        <Star className="h-2.5 w-2.5 text-white/70" />
                        <span className="text-[9px] font-semibold text-white">
                          Best on {platformLabel[product.bestPlatform] || product.bestPlatform}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Card body */}
                  <div className="p-3.5">
                    {/* Title + arrow */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <button
                        onClick={() => runAnalysis(product)}
                        className="text-left"
                      >
                        <h3 className="text-[13px] font-semibold line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                          {product.name}
                        </h3>
                      </button>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-[var(--primary)] shrink-0 mt-0.5 transition-colors" />
                    </div>

                    {/* Subtitle + SKU */}
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

                    {/* Price comparison row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold">${product.avgResalePrice}</span>
                        <span className="text-[12px] text-muted-foreground line-through">${product.retailPrice}</span>
                      </div>
                      {markup !== 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0",
                            isPositiveMarkup
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
                          )}
                        >
                          {isPositiveMarkup ? "+" : ""}{markup}% markup
                        </Badge>
                      )}
                    </div>

                    {/* Quick tip info box */}
                    {product.quickTip && (
                      <div className="flex items-start gap-1.5 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/10 px-2.5 py-1.5 mb-3">
                        <Info className="h-3 w-3 text-[var(--primary)] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[var(--primary)] leading-snug">{product.quickTip}</p>
                      </div>
                    )}

                    {/* Bottom row: seasonality + analyze button */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border">
                      <span className="text-[10px] text-muted-foreground">
                        {product.seasonality}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1 px-2 text-[var(--primary)] hover:text-[var(--primary)]"
                        onClick={() => runAnalysis(product)}
                      >
                        Analyze <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {discovery.products?.length === 0 && (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-semibold mb-1">No products found</p>
              <p className="text-xs text-muted-foreground mb-4">Try a different brand or category</p>
              <Button variant="outline" size="sm" onClick={goBack}>Try Again</Button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* STEP 3: DEEP ANALYSIS                                     */}
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

              {/* Collapsible Strategies + Tips */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setStrategyOpen(!strategyOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-500" />
                    <span className="text-sm font-semibold">Competitor Strategies & Differentiation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {(analysis?.competitorStrategies?.length || 0) + (analysis?.differentiationTips?.length || 0)} insights
                    </span>
                    {strategyOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {strategyOpen && (
                  <div className="border-t border-border animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                      {/* What Competitors Do */}
                      <div className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-orange-500" />
                          What Competitors Do
                        </p>
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
                      </div>

                      {/* How to Stand Out */}
                      <div className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-emerald-500" />
                          How to Stand Out
                        </p>
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
                      </div>
                    </div>
                  </div>
                )}
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
