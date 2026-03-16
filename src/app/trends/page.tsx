"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Flame,
  Gem,
  Calendar,
  Zap,
  RefreshCw,
  Loader2,
  Target,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Minus,
  ShieldCheck,
  DollarSign,
  Users,
  Search,
  ShoppingBag,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { heatColor as getHeatColorFn, brandGradient } from "@/lib/colors";

// ── Types ──

interface TrendCategory {
  name: string; heat: number; description: string;
  whyTrending?: string; priceRange?: { low: number; high: number };
  competitionLevel?: string; sellThroughRate?: string;
  bestPlatforms?: string[]; peakTiming?: string;
  sourcingTips?: string[]; targetBuyer?: string;
  relatedKeywords?: string[]; riskLevel?: string;
  trendDirection?: string;
}

interface TrendBrand {
  name: string; heat: number; description: string;
  topSellingItems?: string[]; avgResalePrice?: string;
  priceAppreciation?: string; bestPlatforms?: string[];
  competitionLevel?: string; sellThroughRate?: string;
  sourcingTips?: string[]; targetBuyer?: string;
  authenticityNotes?: string; relatedBrands?: string[];
}

interface HotItem {
  name: string; priceRange: string; description: string;
  bestPlatforms?: { platform: string; avgPrice: string; sellSpeed: string }[];
  competitionLevel?: string; sellThroughRate?: string;
  sourcingTips?: string[]; listingTips?: string;
  pricingStrategy?: string; targetBuyer?: string;
  seasonality?: string; relatedItems?: string[];
  trendDirection?: string;
}

interface SleeperPick {
  name: string; reasoning: string; estimatedROI: string;
  currentAvgPrice?: string; projectedPrice?: string;
  timeframe?: string; bestPlatforms?: string[];
  sourcingTips?: string[]; riskLevel?: string;
  catalysts?: string[];
}

interface TrendData {
  marketSummary: string;
  trendingCategories: TrendCategory[];
  trendingBrands: TrendBrand[];
  hotItems: HotItem[];
  sleeperPicks: SleeperPick[];
  seasonalAdvice: string;
}

// ── Helpers ──

function getHeatColor(heat: number) { return getHeatColorFn(heat); }
function getBrandColor(index: number) { return brandGradient(index); }

const DIRECTION_ICONS: Record<string, { icon: typeof ArrowUpRight; color: string; label: string }> = {
  rising: { icon: ArrowUpRight, color: "text-emerald-500", label: "Rising" },
  peaking: { icon: Flame, color: "text-orange-500", label: "Peaking" },
  stable: { icon: Minus, color: "text-blue-500", label: "Stable" },
  declining: { icon: ArrowDownRight, color: "text-red-500", label: "Declining" },
};

const COMPETITION_COLORS: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  high: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const RISK_COLORS = COMPETITION_COLORS;

function DirectionBadge({ direction }: { direction?: string }) {
  const d = DIRECTION_ICONS[direction || "stable"] || DIRECTION_ICONS.stable;
  const Icon = d.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${d.color}`}>
      <Icon className="h-3 w-3" /> {d.label}
    </span>
  );
}

function CompetitionBadge({ level }: { level?: string }) {
  const cls = COMPETITION_COLORS[level || "medium"] || COMPETITION_COLORS.medium;
  return <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${cls}`}>{level || "medium"}</Badge>;
}

function PlatformPills({ platforms }: { platforms?: string[] }) {
  if (!platforms?.length) return null;
  return (
    <div className="flex gap-1 flex-wrap">
      {platforms.slice(0, 4).map((p) => (
        <span key={p} className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-medium capitalize">{p}</span>
      ))}
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  );
}

// ── Loading ──

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Target className="h-7 w-7 animate-pulse-soft" style={{ color: "var(--primary)" }} />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-1">Analyzing Market Trends</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          AI is scanning resale markets for the latest insights...
        </p>
        <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ background: "var(--primary)", animation: "loading-bar-progress 2.5s ease-in-out infinite" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">This may take 15-30 seconds</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 opacity-30">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <style>{`@keyframes loading-bar-progress { 0% { width: 5%; margin-left: 0%; } 30% { width: 45%; margin-left: 5%; } 60% { width: 30%; margin-left: 50%; } 80% { width: 20%; margin-left: 70%; } 100% { width: 5%; margin-left: 95%; } }`}</style>
    </div>
  );
}

// ── Generic expandable section ──

function TrendSection<T>({
  title, subtitle, icon, items, renderCard, renderDetail, defaultCount = 8,
}: {
  title: string; subtitle?: string; icon: React.ReactNode;
  items: T[];
  renderCard: (item: T, index: number, isExpanded: boolean) => React.ReactNode;
  renderDetail: (item: T, index: number) => React.ReactNode;
  defaultCount?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const visible = showAll ? items : items.slice(0, defaultCount);
  const hasMore = items.length > defaultCount;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-base font-semibold">{title}</h2>
            <span className="text-xs text-muted-foreground ml-1">{items.length}</span>
          </div>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 ml-7">{subtitle}</p>}
        </div>
        {hasMore && (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setShowAll(!showAll)}>
            {showAll ? <><ChevronUp className="h-3 w-3" /> Show top {defaultCount}</> : <><ChevronDown className="h-3 w-3" /> Show all {items.length}</>}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visible.map((item, i) => (
          <div key={i} className={`${expandedIndex === i ? "col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4" : ""}`}>
            <div onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="cursor-pointer">
              {renderCard(item, i, expandedIndex === i)}
            </div>
            {expandedIndex === i && (
              <div className="mt-2 rounded-xl bg-card border border-border p-4 sm:p-5 animate-fade-in">
                <div className="flex justify-end mb-2">
                  <button onClick={(e) => { e.stopPropagation(); setExpandedIndex(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renderDetail(item, i)}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Page ──

export default function TrendsPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrends = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/ai/trends");
      if (!res.ok) throw new Error();
      setData(await res.json());
      if (isRefresh) toast.success("Trends refreshed");
    } catch { toast.error("Failed to load trend data"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchTrends(); }, [fetchTrends]);

  if (loading || !data) return <LoadingSkeleton />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Trend Radar</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">AI-powered market intelligence</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchTrends(true)} disabled={refreshing} className="h-8 text-xs gap-1.5">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {/* Market Pulse */}
      {data.marketSummary && (
        <div className="rounded-xl bg-card p-4 border-l-4" style={{ borderLeftColor: "var(--primary)" }}>
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
            <div>
              <h3 className="text-sm font-semibold mb-1">Market Pulse</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.marketSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Trending Categories ── */}
      <TrendSection
        title="Trending Categories"
        icon={<Flame className="h-5 w-5 text-orange-500" />}
        items={data.trendingCategories}
        renderCard={(cat) => {
          const heat = getHeatColor(cat.heat);
          return (
            <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[13px] truncate pr-2">{cat.name}</h3>
                <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${heat.text}`}>{cat.heat}</Badge>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${heat.bar}`} style={{ width: `${cat.heat}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{cat.description}</p>
              <div className="flex items-center justify-between gap-2">
                <DirectionBadge direction={cat.trendDirection} />
                <CompetitionBadge level={cat.competitionLevel} />
              </div>
            </div>
          );
        }}
        renderDetail={(cat) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={<Flame className="h-3.5 w-3.5 text-orange-500" />} label="Why It's Trending">
              <p>{cat.whyTrending || cat.description}</p>
            </DetailRow>
            <DetailRow icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />} label="Pricing">
              <p>Range: ${cat.priceRange?.low || "?"} – ${cat.priceRange?.high || "?"}</p>
              <p className="text-muted-foreground">Sell-through: {cat.sellThroughRate || "N/A"}</p>
            </DetailRow>
            <DetailRow icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />} label="Sourcing Tips">
              <ul className="list-disc list-inside space-y-0.5">{cat.sourcingTips?.map((t, i) => <li key={i}>{t}</li>) || <li>No tips available</li>}</ul>
            </DetailRow>
            <DetailRow icon={<Users className="h-3.5 w-3.5 text-blue-500" />} label="Target Buyer">
              <p>{cat.targetBuyer || "General resale buyers"}</p>
            </DetailRow>
            <DetailRow icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Best Platforms">
              <PlatformPills platforms={cat.bestPlatforms} />
            </DetailRow>
            <DetailRow icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} label="Peak Timing">
              <p>{cat.peakTiming || "Year-round"}</p>
            </DetailRow>
            {cat.relatedKeywords?.length ? (
              <div className="sm:col-span-2">
                <DetailRow icon={<Search className="h-3.5 w-3.5 text-muted-foreground" />} label="SEO Keywords">
                  <div className="flex flex-wrap gap-1">{cat.relatedKeywords.map((k, i) => <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>)}</div>
                </DetailRow>
              </div>
            ) : null}
          </div>
        )}
      />

      {/* ── Trending Brands ── */}
      <TrendSection
        title="Trending Brands"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        items={data.trendingBrands}
        renderCard={(brand, idx) => {
          const heat = getHeatColor(brand.heat);
          return (
            <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-full ${getBrandColor(idx)} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
                  {brand.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[13px] truncate">{brand.name}</h3>
                  <span className={`text-[10px] font-bold ${heat.text}`}>{heat.label} {brand.heat}</span>
                </div>
                {brand.priceAppreciation && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] shrink-0">{brand.priceAppreciation}</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{brand.description}</p>
              <PlatformPills platforms={brand.bestPlatforms} />
            </div>
          );
        }}
        renderDetail={(brand) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />} label="Pricing & Performance">
              <p>Avg resale: {brand.avgResalePrice || "N/A"}</p>
              <p>Appreciation: {brand.priceAppreciation || "N/A"}</p>
              <p className="text-muted-foreground">Sell-through: {brand.sellThroughRate || "N/A"}</p>
            </DetailRow>
            <DetailRow icon={<Zap className="h-3.5 w-3.5 text-orange-500" />} label="Top Selling Items">
              <ul className="list-disc list-inside space-y-0.5">{brand.topSellingItems?.map((t, i) => <li key={i}>{t}</li>) || <li>N/A</li>}</ul>
            </DetailRow>
            <DetailRow icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />} label="Sourcing Tips">
              <ul className="list-disc list-inside space-y-0.5">{brand.sourcingTips?.map((t, i) => <li key={i}>{t}</li>) || <li>N/A</li>}</ul>
            </DetailRow>
            <DetailRow icon={<ShieldCheck className="h-3.5 w-3.5 text-amber-500" />} label="Authenticity Notes">
              <p>{brand.authenticityNotes || "No specific notes"}</p>
            </DetailRow>
            <DetailRow icon={<Users className="h-3.5 w-3.5 text-blue-500" />} label="Target Buyer">
              <p>{brand.targetBuyer || "General"}</p>
            </DetailRow>
            <DetailRow icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Best Platforms">
              <PlatformPills platforms={brand.bestPlatforms} />
              {brand.relatedBrands?.length ? <p className="text-muted-foreground mt-1">Also stock: {brand.relatedBrands.join(", ")}</p> : null}
            </DetailRow>
          </div>
        )}
      />

      {/* ── Hot Items ── */}
      <TrendSection
        title="Hot Items"
        icon={<Zap className="h-5 w-5 text-orange-500" />}
        items={data.hotItems}
        renderCard={(item) => (
          <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-[13px] leading-tight min-w-0 line-clamp-2">{item.name}</h3>
              <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-bold shrink-0 whitespace-nowrap">{item.priceRange}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
            <div className="flex items-center justify-between">
              <DirectionBadge direction={item.trendDirection} />
              <CompetitionBadge level={item.competitionLevel} />
            </div>
          </div>
        )}
        renderDetail={(item) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Platform Breakdown">
              {item.bestPlatforms?.length ? (
                <div className="space-y-1">
                  {item.bestPlatforms.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-2.5 py-1.5">
                      <span className="font-medium capitalize">{p.platform}</span>
                      <span className="text-muted-foreground">{p.avgPrice} avg &middot; {p.sellSpeed}</span>
                    </div>
                  ))}
                </div>
              ) : <p>No platform data</p>}
            </DetailRow>
            <DetailRow icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />} label="Pricing Strategy">
              <p>{item.pricingStrategy || "Price competitively"}</p>
              <p className="text-muted-foreground mt-1">Sell-through: {item.sellThroughRate || "N/A"}</p>
            </DetailRow>
            <DetailRow icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />} label="Sourcing Tips">
              <ul className="list-disc list-inside space-y-0.5">{item.sourcingTips?.map((t, i) => <li key={i}>{t}</li>) || <li>N/A</li>}</ul>
            </DetailRow>
            <DetailRow icon={<Search className="h-3.5 w-3.5 text-muted-foreground" />} label="Listing Tips">
              <p>{item.listingTips || "Use clear photos and detailed descriptions"}</p>
            </DetailRow>
            <DetailRow icon={<Users className="h-3.5 w-3.5 text-blue-500" />} label="Target Buyer">
              <p>{item.targetBuyer || "General"}</p>
            </DetailRow>
            <DetailRow icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} label="Seasonality">
              <p>{item.seasonality || "Year-round"}</p>
              {item.relatedItems?.length ? <p className="text-muted-foreground mt-1">Related: {item.relatedItems.join(", ")}</p> : null}
            </DetailRow>
          </div>
        )}
      />

      {/* ── Sleeper Picks ── */}
      <TrendSection
        title="Sleeper Picks"
        subtitle="Undervalued items about to trend — get ahead of the curve"
        icon={<Gem className="h-5 w-5 text-emerald-500" />}
        items={data.sleeperPicks}
        renderCard={(pick) => (
          <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[13px]">{pick.name}</h3>
              <Badge className="bg-emerald-500 border-0 text-white text-[10px] font-bold shrink-0">+{pick.estimatedROI}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{pick.reasoning}</p>
            <div className="flex items-center justify-between">
              {pick.timeframe && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="h-3 w-3" /> {pick.timeframe}</span>}
              {pick.riskLevel && <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${RISK_COLORS[pick.riskLevel] || ""}`}>{pick.riskLevel} risk</Badge>}
            </div>
          </div>
        )}
        renderDetail={(pick) => (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow icon={<DollarSign className="h-3.5 w-3.5 text-emerald-500" />} label="Price Trajectory">
              <p>Current: {pick.currentAvgPrice || "N/A"}</p>
              <p>Projected: {pick.projectedPrice || "N/A"}</p>
              <p className="font-medium text-emerald-600 dark:text-emerald-400">ROI: +{pick.estimatedROI}</p>
              <p className="text-muted-foreground">Timeframe: {pick.timeframe || "N/A"}</p>
            </DetailRow>
            <DetailRow icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} label="Catalysts & Risk">
              {pick.catalysts?.length ? (
                <ul className="list-disc list-inside space-y-0.5">{pick.catalysts.map((c, i) => <li key={i}>{c}</li>)}</ul>
              ) : <p>No specific catalysts identified</p>}
              <p className="text-muted-foreground mt-1">Risk: <span className="capitalize">{pick.riskLevel || "medium"}</span></p>
            </DetailRow>
            <DetailRow icon={<ShoppingBag className="h-3.5 w-3.5 text-primary" />} label="Sourcing Tips">
              <ul className="list-disc list-inside space-y-0.5">{pick.sourcingTips?.map((t, i) => <li key={i}>{t}</li>) || <li>N/A</li>}</ul>
            </DetailRow>
            <DetailRow icon={<Target className="h-3.5 w-3.5 text-primary" />} label="Best Platforms">
              <PlatformPills platforms={pick.bestPlatforms} />
            </DetailRow>
          </div>
        )}
      />

      {/* ── Seasonal Advice ── */}
      <div className="rounded-xl bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold mb-1">Seasonal Forecast</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{data.seasonalAdvice}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
