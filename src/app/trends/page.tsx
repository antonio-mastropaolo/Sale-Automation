"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  platformBranding,
  heatColor as getHeatColorFn,
  brandGradient,
} from "@/lib/colors";

interface TrendCategory {
  name: string;
  heat: number;
  description: string;
}

interface TrendBrand {
  name: string;
  heat: number;
  description: string;
}

interface HotItem {
  name: string;
  priceRange: string;
  description: string;
}

interface SleeperPick {
  name: string;
  reasoning: string;
  estimatedROI: string;
}

interface PlatformTips {
  depop: string;
  grailed: string;
  poshmark: string;
  mercari: string;
  ebay: string;
  vinted: string;
  facebook: string;
  vestiaire: string;
}

interface TrendData {
  trendingCategories: TrendCategory[];
  trendingBrands: TrendBrand[];
  hotItems: HotItem[];
  sleeperPicks: SleeperPick[];
  seasonalAdvice: string;
  platformTips: PlatformTips;
}

const platformConfig = platformBranding;

function getHeatColor(heat: number) {
  return getHeatColorFn(heat);
}

function getBrandColor(index: number) {
  return brandGradient(index);
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Loading header with progress info */}
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <Target className="h-7 w-7 animate-pulse-soft" style={{ color: "var(--primary)" }} />
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-1">Analyzing Market Trends</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">
          AI is scanning resale markets across Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective for the latest insights...
        </p>
        {/* Animated progress bar */}
        <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: "var(--primary)",
              animation: "loading-bar-progress 2.5s ease-in-out infinite",
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">This may take 10-20 seconds</p>
      </div>

      {/* Subtle skeleton placeholders below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 opacity-30">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
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
  );
}

// ── Reusable section: shows 5 in a grid, expandable to all (up to 20) ──

function TrendSection<T>({
  title,
  subtitle,
  icon,
  items,
  renderItem,
  defaultCount = 5,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  defaultCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, defaultCount);
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
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Show top {defaultCount}</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Show all {items.length}</>
            )}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {visible.map((item, i) => (
          <div key={i}>{renderItem(item, i)}</div>
        ))}
      </div>
    </section>
  );
}

export default function TrendsPage() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrends = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/ai/trends");
      if (!res.ok) throw new Error("Failed to fetch trends");
      const result = await res.json();
      setData(result);
      if (isRefresh) toast.success("Trends refreshed with latest data");
    } catch {
      toast.error("Failed to load trend data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  const [activeTab, setActiveTab] = useState("all");

  if (loading || !data) {
    return <LoadingSkeleton />;
  }

  const platformKeys = Object.keys(data.platformTips || {});
  const activePlatformTip = activeTab !== "all" ? (data.platformTips as unknown as Record<string, string>)[activeTab] : null;
  const activePlatformConfig = activeTab !== "all" ? platformConfig[activeTab] : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Trend Radar</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">AI-powered market intelligence across 8 platforms</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTrends(true)}
          disabled={refreshing}
          className="h-8 text-xs gap-1.5"
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {/* ── Platform Tabs ── */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === "all"
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          All Platforms
        </button>
        {platformKeys.map((p) => {
          const config = platformConfig[p];
          if (!config) return null;
          return (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === p
                  ? `${config.bg} ${config.color} font-semibold`
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${activeTab === p ? "" : config.bg + " " + config.color}`}>
                {config.icon || config.label.charAt(0)}
              </span>
              {config.label}
            </button>
          );
        })}
      </div>

      {/* ── Platform-specific tip banner ── */}
      {activeTab !== "all" && activePlatformTip && activePlatformConfig && (
        <div className={`rounded-xl p-4 ${activePlatformConfig.bg} border ${activePlatformConfig.border}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${activePlatformConfig.color} ${activePlatformConfig.bg}`}>
              {activePlatformConfig.icon || activePlatformConfig.label.charAt(0)}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${activePlatformConfig.color}`}>
                {activePlatformConfig.label} — What&apos;s Working Now
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{activePlatformTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Trending Categories ── */}
      <TrendSection
        title="Trending Categories"
        icon={<Flame className="h-5 w-5 text-orange-500" />}
        items={data.trendingCategories}
        renderItem={(cat) => {
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
            </div>
          );
        }}
      />

      {/* ── Trending Brands ── */}
      <TrendSection
        title="Trending Brands"
        icon={<TrendingUp className="h-5 w-5 text-primary" />}
        items={data.trendingBrands}
        renderItem={(brand, idx) => {
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
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${heat.bar}`} style={{ width: `${brand.heat}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{brand.description}</p>
            </div>
          );
        }}
      />

      {/* ── Hot Items ── */}
      <TrendSection
        title="Hot Items"
        icon={<Zap className="h-5 w-5 text-orange-500" />}
        items={data.hotItems}
        renderItem={(item, idx) => (
          <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[13px] leading-tight">{item.name}</h3>
              <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-bold shrink-0">{item.priceRange}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-400" />#{idx + 1} trending
            </div>
          </div>
        )}
      />

      {/* ── Sleeper Picks ── */}
      <TrendSection
        title="Sleeper Picks"
        subtitle="Undervalued items about to trend — get ahead of the curve"
        icon={<Gem className="h-5 w-5 text-emerald-500" />}
        items={data.sleeperPicks}
        defaultCount={5}
        renderItem={(pick) => (
          <div className="rounded-xl bg-card p-4 space-y-2.5 card-hover relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-[13px]">{pick.name}</h3>
              <Badge className="bg-emerald-500 border-0 text-white text-[10px] font-bold shrink-0">+{pick.estimatedROI}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{pick.reasoning}</p>
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

      {/* ── All Platform Tips (only on "All" tab) ── */}
      {activeTab === "all" && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: "var(--primary)" }} />
            Platform Intelligence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {(Object.entries(data.platformTips as unknown as Record<string, string>)).map(([platform, tip]) => {
              const config = platformConfig[platform];
              if (!config) return null;
              return (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className="text-left rounded-xl bg-card p-4 card-hover space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-md ${config.bg} ${config.color} flex items-center justify-center font-bold text-[10px]`}>
                      {config.icon || config.label.charAt(0)}
                    </div>
                    <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{tip}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
