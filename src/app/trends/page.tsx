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
          AI is scanning resale markets across Depop, Grailed, Poshmark, Mercari, and eBay for the latest insights...
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

  if (loading || !data) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Trend Radar</h1>
              <p className="text-muted-foreground text-sm">
                AI-powered market intelligence
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => fetchTrends(true)}
          disabled={refreshing}
          className="bg-primary text-primary-foreground shadow-md"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* ── Trending Categories ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Flame className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Trending Categories</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {data.trendingCategories.map((cat) => {
            const heat = getHeatColor(cat.heat);
            return (
              <Card
                key={cat.name}
                className="min-w-[240px] max-w-[260px] shrink-0 border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm truncate pr-2">
                      {cat.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold shrink-0 ${heat.text}`}
                    >
                      {cat.heat}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{heat.label}</span>
                      <span>{cat.heat}/100</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${heat.bar} transition-all duration-500`}
                        style={{ width: `${cat.heat}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {cat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Trending Brands ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Trending Brands</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
          {data.trendingBrands.map((brand, idx) => {
            const heat = getHeatColor(brand.heat);
            return (
              <Card
                key={brand.name}
                className="min-w-[220px] max-w-[240px] shrink-0 border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full ${getBrandColor(idx)} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                    >
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm truncate">
                        {brand.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold mt-0.5 ${heat.text}`}
                      >
                        {heat.label} {brand.heat}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${heat.bar} transition-all duration-500`}
                        style={{ width: `${brand.heat}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {brand.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Hot Items ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Hot Items</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.hotItems.map((item, idx) => (
            <Card
              key={item.name}
              className="border-0 shadow-sm hover:shadow-md transition-shadow group"
            >
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-orange-500/10 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
                      <Zap className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {item.name}
                    </h3>
                  </div>
                  <Badge className="bg-primary text-primary-foreground border-0 text-xs font-bold shrink-0 shadow-sm">
                    {item.priceRange}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Flame className="h-3 w-3 text-orange-400" />
                  <span>#{idx + 1} trending item</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Sleeper Picks ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Gem className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">Sleeper Picks</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          Undervalued items about to trend — get ahead of the curve
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.sleeperPicks.map((pick) => (
            <Card
              key={pick.name}
              className="border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-700" />
              <CardContent className="pt-6 pb-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm">{pick.name}</h3>
                  </div>
                  <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 border-0 text-white text-xs font-bold shrink-0 shadow-sm">
                    +{pick.estimatedROI}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pick.reasoning}
                </p>
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 pt-1">
                  <Gem className="h-3 w-3" />
                  <span>Hidden opportunity</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* ── Seasonal Advice ── */}
      <section>
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
              Seasonal Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.seasonalAdvice}
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator />

      {/* ── Platform Tips ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Platform Intelligence</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.entries(data.platformTips) as [string, string][]).map(
            ([platform, tip]) => {
              const config = platformConfig[platform];
              if (!config) return null;
              return (
                <Card
                  key={platform}
                  className={`border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden`}
                >
                  <div className={`h-1 ${config.accent}`} />
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${config.bg} ${config.color} flex items-center justify-center font-bold text-sm`}
                      >
                        {config.label.charAt(0)}
                      </div>
                      <h3 className={`font-semibold ${config.color}`}>
                        {config.label}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {tip}
                    </p>
                  </CardContent>
                </Card>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
