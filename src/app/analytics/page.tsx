"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnalyticsChart } from "@/components/analytics-chart";
import {
  Loader2,
  Sparkles,
  TrendingUp,
  Eye,
  Heart,
  DollarSign,
  Package,
  ArrowUpRight,
  AlertCircle,
  Lightbulb,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  platformBranding as platformBrandingColors,
  priorityStyles,
  statCardColors,
} from "@/lib/colors";

interface PlatformStat {
  platform: string;
  listings: number;
  published: number;
  views: number;
  likes: number;
  sales: number;
  revenue: number;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

const priorityConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  high: { icon: AlertCircle, color: priorityStyles.high.color, bg: priorityStyles.high.bg },
  medium: { icon: Target, color: priorityStyles.medium.color, bg: priorityStyles.medium.bg },
  low: { icon: Lightbulb, color: priorityStyles.low.color, bg: priorityStyles.low.bg },
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<{
    totalListings: number;
    activeListings: number;
    platformStats: PlatformStat[];
  } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const getRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommendations" }),
      });
      const data = await res.json();
      setRecommendations(Array.isArray(data) ? data : []);
      toast.success("Recommendations generated");
    } catch {
      toast.error("Failed to get recommendations");
    }
    setLoadingRecs(false);
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalViews = stats.platformStats.reduce((s, p) => s + p.views, 0);
  const totalLikes = stats.platformStats.reduce((s, p) => s + p.likes, 0);
  const totalRevenue = stats.platformStats.reduce((s, p) => s + p.revenue, 0);
  const totalSales = stats.platformStats.reduce((s, p) => s + p.sales, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Track performance across all platforms</p>
        </div>
        <Button onClick={getRecommendations} disabled={loadingRecs} className="bg-primary text-primary-foreground shadow-md">
          {loadingRecs ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          AI Insights
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Listings", value: stats.totalListings, icon: Package, color: statCardColors.listings.color, bg: statCardColors.listings.bg },
          { label: "Views", value: totalViews, icon: Eye, color: statCardColors.views.color, bg: statCardColors.views.bg },
          { label: "Likes", value: totalLikes, icon: Heart, color: statCardColors.likes.color, bg: statCardColors.likes.bg },
          { label: "Sales", value: totalSales, icon: TrendingUp, color: statCardColors.sales.color, bg: statCardColors.sales.bg },
          { label: "Revenue", value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: statCardColors.revenue.color, bg: statCardColors.revenue.bg },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`${bg} ${color} p-2.5 rounded-xl`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Platform Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsChart data={stats.platformStats} />
        </CardContent>
      </Card>

      {/* Per-platform breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.platformStats.map((p) => {
          const brand = platformBrandingColors[p.platform] || platformBrandingColors.depop;
          const conversionRate = p.views > 0 ? ((p.sales / p.views) * 100).toFixed(1) : "0.0";
          return (
            <Card key={p.platform} className="border-0 shadow-sm">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg ${brand.bg} ${brand.color} flex items-center justify-center font-bold text-sm`}>
                      {p.platform.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold">
                      {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {p.published} live
                  </Badge>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: "Views", value: p.views },
                    { label: "Likes", value: p.likes },
                    { label: "Sales", value: p.sales },
                    { label: "Conv.", value: `${conversionRate}%` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-2">
                      <p className="text-lg font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => {
              const config = priorityConfig[rec.priority] || priorityConfig.medium;
              const PIcon = config.icon;
              return (
                <div key={i} className="flex gap-3 p-4 bg-muted/30 rounded-xl">
                  <div className={`${config.bg} ${config.color} p-2 rounded-lg h-fit`}>
                    <PIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{rec.title}</p>
                      <Badge variant="outline" className={`text-xs ${config.color}`}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rec.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
