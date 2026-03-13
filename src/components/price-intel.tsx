"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Target,
  Clock,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";

interface PriceIntelData {
  marketAnalysis: {
    lowEnd: number;
    average: number;
    highEnd: number;
    summary: string;
  };
  platformPricing: Record<string, { price: number; reasoning: string }>;
  strategy: {
    recommendation: string;
    explanation: string;
    optimalPrice: number;
  };
  psychologyTips: string[];
  priceDropSchedule: { day: number; dropTo: number; reasoning: string }[];
  sellThrough: Record<string, { price: number; probability: string; estimatedDays: number }>;
}

const platformColors = Object.fromEntries(
  Object.entries(platformBranding).map(([k, v]) => [
    k,
    { bg: v.bg, text: v.color, icon: v.icon },
  ])
) as Record<string, { bg: string; text: string; icon: string }>;

interface PriceIntelProps {
  title: string;
  brand: string;
  category: string;
  condition: string;
  size: string;
  currentPrice: number;
}

export function PriceIntel({ title, brand, category, condition, size, currentPrice }: PriceIntelProps) {
  const [data, setData] = useState<PriceIntelData | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/price-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, brand, category, condition, size, currentPrice }),
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error("Price analysis failed");
    }
    setLoading(false);
  };

  if (!data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
            <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold mb-1">Price Intelligence</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            AI analyzes market data to find the optimal price for each platform.
          </p>
          <Button onClick={analyze} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
            Analyze Pricing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const strategyIcon =
    data.strategy.recommendation === "price_high_drop" ? TrendingDown :
    data.strategy.recommendation === "price_competitive" ? Minus : TrendingUp;
  const StratIcon = strategyIcon;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Price Intelligence
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Market range */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Market Range</p>
          <div className="relative h-8 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-amber-400 via-blue-400 to-indigo-500 opacity-20 rounded-full"
              style={{
                left: "5%",
                right: "5%",
              }}
            />
            {/* Current price marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-foreground"
              style={{
                left: `${Math.min(95, Math.max(5, ((currentPrice - data.marketAnalysis.lowEnd) / (data.marketAnalysis.highEnd - data.marketAnalysis.lowEnd)) * 90 + 5))}%`,
              }}
            />
            {/* Optimal price marker */}
            <div
              className="absolute top-1 bottom-1 w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-md flex items-center justify-center -ml-3"
              style={{
                left: `${Math.min(95, Math.max(5, ((data.strategy.optimalPrice - data.marketAnalysis.lowEnd) / (data.marketAnalysis.highEnd - data.marketAnalysis.lowEnd)) * 90 + 5))}%`,
              }}
            >
              <Target className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${data.marketAnalysis.lowEnd}</span>
            <span className="font-medium text-foreground">Avg ${data.marketAnalysis.average}</span>
            <span>${data.marketAnalysis.highEnd}</span>
          </div>
          <p className="text-xs text-muted-foreground">{data.marketAnalysis.summary}</p>
        </div>

        {/* Strategy recommendation */}
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <StratIcon className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Optimal Price: ${data.strategy.optimalPrice}</p>
            {data.strategy.optimalPrice !== currentPrice && (
              <Badge variant="outline" className={data.strategy.optimalPrice > currentPrice ? "text-blue-600 border-blue-300" : "text-amber-600 border-amber-300"}>
                {data.strategy.optimalPrice > currentPrice ? "+" : ""}
                ${(data.strategy.optimalPrice - currentPrice).toFixed(0)}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{data.strategy.explanation}</p>
        </div>

        {/* Platform-specific pricing */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">By Platform</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.platformPricing).map(([platform, info]) => {
              const pc = platformColors[platform];
              if (!pc) return null;
              return (
                <div key={platform} className={`p-2.5 rounded-lg ${pc.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-6 h-6 rounded-md ${pc.bg} ${pc.text} flex items-center justify-center text-xs font-bold`}>
                      {pc.icon}
                    </div>
                    <span className="text-lg font-bold">${info.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{info.reasoning}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price drop schedule */}
        {data.priceDropSchedule.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Price Drop Schedule
            </p>
            <div className="flex gap-2">
              {data.priceDropSchedule.map((drop, i) => (
                <div key={i} className="flex-1 p-2 bg-muted/30 rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Day {drop.day}</p>
                  <p className="font-bold">${drop.dropTo}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Psychology tips */}
        {data.psychologyTips?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Pro Tips
            </p>
            {data.psychologyTips.map((tip, i) => (
              <p key={i} className="text-xs text-muted-foreground flex gap-2">
                <span className="text-primary">•</span>
                {tip}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
