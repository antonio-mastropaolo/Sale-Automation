"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight, Minus,
  RefreshCw, Loader2, Clock, DollarSign, ShoppingBag, Zap,
  ChevronRight, Settings2, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";

interface Drop {
  name: string; brand: string; category: string;
  releaseDate?: string; droppedDate?: string;
  retailPrice: number; estimatedResale?: number; currentResale?: number;
  resaleMultiplier: number; hype: number;
  platform?: string; availability?: string; tip: string;
}

interface TrendingItem {
  name: string; brand: string; avgResale: number;
  priceChange: string; direction: string;
  reason: string; bestPlatform: string;
}

interface DropFeed {
  upcomingDrops: Drop[];
  recentDrops: Drop[];
  trendingItems: TrendingItem[];
  weeklyInsight: string;
}

// Widget visibility settings
const WIDGET_KEYS = ["upcomingDrops", "recentDrops", "trendingItems", "weeklyInsight"] as const;
const WIDGET_LABELS: Record<string, string> = {
  upcomingDrops: "Upcoming Drops",
  recentDrops: "Recent Drops",
  trendingItems: "Trending Items",
  weeklyInsight: "Weekly Insight",
};

function hypeColor(hype: number) {
  if (hype >= 80) return "text-orange-500";
  if (hype >= 60) return "text-amber-500";
  return "text-emerald-500";
}

function hypeBg(hype: number) {
  if (hype >= 80) return "bg-orange-500";
  if (hype >= 60) return "bg-amber-500";
  return "bg-emerald-500";
}

function catColor(cat: string) {
  const map: Record<string, string> = {
    sneakers: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    streetwear: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    luxury: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    accessories: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
  };
  return map[cat] || "bg-muted text-muted-foreground";
}

const directionIcon: Record<string, { icon: typeof ArrowUpRight; color: string }> = {
  rising: { icon: ArrowUpRight, color: "text-emerald-500" },
  stable: { icon: Minus, color: "text-blue-500" },
  declining: { icon: ArrowDownRight, color: "text-red-500" },
};

export default function DropsPage() {
  const [data, setData] = useState<DropFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return { upcomingDrops: true, recentDrops: true, trendingItems: true, weeklyInsight: true };
    try {
      const saved = localStorage.getItem("drops-widgets");
      return saved ? JSON.parse(saved) : { upcomingDrops: true, recentDrops: true, trendingItems: true, weeklyInsight: true };
    } catch { return { upcomingDrops: true, recentDrops: true, trendingItems: true, weeklyInsight: true }; }
  });
  const [showConfig, setShowConfig] = useState(false);

  const toggleWidget = (key: string) => {
    setVisibleWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("drops-widgets", JSON.stringify(next));
      return next;
    });
  };

  const fetchDrops = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/ai/drops");
      if (!res.ok) throw new Error();
      setData(await res.json());
      if (isRefresh) toast.success("Drop feed refreshed");
    } catch { toast.error("Failed to load drop feed"); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchDrops(); }, [fetchDrops]);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "var(--accent)" }}>
          <Flame className="h-7 w-7 animate-pulse-soft" style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="text-lg font-semibold mb-1">Scanning the Market</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-md">AI is pulling the latest drops, restocks, and trending items...</p>
        <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ background: "var(--primary)", animation: "loading-bar 2.5s ease-in-out infinite" }} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">This may take 10-20 seconds</p>
        <style>{`@keyframes loading-bar { 0% { width: 5%; margin-left: 0%; } 50% { width: 40%; margin-left: 30%; } 100% { width: 5%; margin-left: 95%; } }`}</style>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Drop Feed</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Upcoming releases, restocks &amp; trending items for resellers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)} className="h-8 text-xs gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Configure
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchDrops(true)} disabled={refreshing} className="h-8 text-xs gap-1.5">
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Widget configurator */}
      {showConfig && (
        <div className="rounded-xl bg-card p-4 border border-border animate-fade-in">
          <p className="text-xs font-semibold text-muted-foreground mb-3">Show/hide widgets</p>
          <div className="flex flex-wrap gap-2">
            {WIDGET_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggleWidget(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  visibleWidgets[key]
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {visibleWidgets[key] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                {WIDGET_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Insight */}
      {visibleWidgets.weeklyInsight && data.weeklyInsight && (
        <div className="rounded-xl bg-card p-4 border-l-4" style={{ borderLeftColor: "var(--primary)" }}>
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--primary)" }} />
            <div>
              <h3 className="text-sm font-semibold mb-1">Weekly Market Pulse</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.weeklyInsight}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Drops */}
      {visibleWidgets.upcomingDrops && data.upcomingDrops.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h2 className="text-base font-semibold">Upcoming Drops</h2>
            <span className="text-xs text-muted-foreground">{data.upcomingDrops.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.upcomingDrops.map((drop, i) => (
              <div key={i} className="rounded-xl bg-card p-4 space-y-3 card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold leading-tight line-clamp-2">{drop.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{drop.brand}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ${catColor(drop.category)}`}>{drop.category}</Badge>
                </div>

                {/* Hype bar */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className={`font-semibold ${hypeColor(drop.hype)}`}>Hype {drop.hype}/100</span>
                    <span className="text-muted-foreground">{drop.releaseDate || "TBA"}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${hypeBg(drop.hype)}`} style={{ width: `${drop.hype}%` }} />
                  </div>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Retail</span>
                    <span className="ml-1 font-semibold">${drop.retailPrice}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                  <div>
                    <span className="text-muted-foreground">Est. Resale</span>
                    <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">${drop.estimatedResale || "?"}</span>
                  </div>
                  <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                    {drop.resaleMultiplier}x
                  </Badge>
                </div>

                {/* Tip */}
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-2.5 py-1.5">
                  {drop.platform && <span className="font-semibold">{drop.platform}: </span>}
                  {drop.tip}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Drops */}
      {visibleWidgets.recentDrops && data.recentDrops.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-semibold">Recent Drops</h2>
            <span className="text-xs text-muted-foreground">{data.recentDrops.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recentDrops.map((drop, i) => (
              <div key={i} className="rounded-xl bg-card p-4 space-y-3 card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold leading-tight line-clamp-2">{drop.name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{drop.brand}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] shrink-0 ${
                    drop.availability === "sold out"
                      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                      : drop.availability === "limited"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                  }`}>{drop.availability || "unknown"}</Badge>
                </div>

                {/* Pricing */}
                <div className="flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Retail</span>
                    <span className="ml-1 font-semibold">${drop.retailPrice}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
                  <div>
                    <span className="text-muted-foreground">Resale</span>
                    <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">${drop.currentResale || "?"}</span>
                  </div>
                  <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0">
                    {drop.resaleMultiplier}x
                  </Badge>
                </div>

                {/* Tip */}
                <p className="text-[10px] text-muted-foreground leading-relaxed bg-muted/30 rounded-lg px-2.5 py-1.5">
                  {drop.tip}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trending Items */}
      {visibleWidgets.trendingItems && data.trendingItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-semibold">Trending on Resale</h2>
            <span className="text-xs text-muted-foreground">{data.trendingItems.length}</span>
          </div>
          <div className="rounded-xl bg-card overflow-hidden">
            {data.trendingItems.map((item, i) => {
              const dir = directionIcon[item.direction] || directionIcon.stable;
              const DirIcon = dir.icon;
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.brand} &middot; {item.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-mono font-bold">${item.avgResale}</p>
                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-semibold ${dir.color}`}>
                      <DirIcon className="h-3 w-3" />
                      {item.priceChange}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 capitalize">{item.bestPlatform}</Badge>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
