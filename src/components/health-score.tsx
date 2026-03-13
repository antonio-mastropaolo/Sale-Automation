"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Activity,
  ArrowUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  scoreColor,
  scoreBg,
  impactStyles as impactColor,
} from "@/lib/colors";

interface HealthScoreData {
  overall: number;
  scores: Record<string, { score: number; feedback: string }>;
  improvements: { action: string; impact: string; detail: string }[];
  estimatedDaysToSell: number;
  verdict: string;
}

const scoreLabel = (s: number) =>
  s >= 85 ? "Excellent" : s >= 70 ? "Good" : s >= 50 ? "Needs Work" : "Poor";

const criteriaLabels: Record<string, string> = {
  title: "Title Quality",
  description: "Description",
  photos: "Photos",
  pricing: "Pricing",
  platformCoverage: "Platform Coverage",
};

export function HealthScore({ listingId }: { listingId: string }) {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/health-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setData(result);
    } catch {
      toast.error("Failed to analyze listing");
    }
    setLoading(false);
  };

  if (!data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Listing Health Score</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            AI analyzes your listing quality, pricing, and coverage to help you sell faster.
          </p>
          <Button onClick={analyze} disabled={loading} className="bg-primary text-primary-foreground">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
            Analyze Listing
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Health Score
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={analyze} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall score circle */}
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-muted"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
              />
              <path
                className={scoreBg(data.overall).replace("bg-", "stroke-")}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                strokeWidth="3"
                strokeDasharray={`${data.overall}, 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold ${scoreColor(data.overall)}`}>{data.overall}</span>
            </div>
          </div>
          <div>
            <p className={`font-semibold ${scoreColor(data.overall)}`}>{scoreLabel(data.overall)}</p>
            <p className="text-sm text-muted-foreground">{data.verdict}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{data.estimatedDaysToSell} days to sell
            </div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="space-y-2">
          {Object.entries(data.scores).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{criteriaLabels[key] || key}</span>
                <span className={`font-medium ${scoreColor(val.score)}`}>{val.score}/100</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scoreBg(val.score)}`}
                  style={{ width: `${val.score}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{val.feedback}</p>
            </div>
          ))}
        </div>

        {/* Improvements */}
        {data.improvements.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Quick Wins
            </p>
            {data.improvements.map((imp, i) => (
              <div key={i} className="flex gap-2 p-2.5 bg-muted/30 rounded-lg">
                <Badge variant="outline" className={`text-xs shrink-0 h-fit ${impactColor[imp.impact] || ""}`}>
                  {imp.impact}
                </Badge>
                <div>
                  <p className="text-sm font-medium">{imp.action}</p>
                  <p className="text-xs text-muted-foreground">{imp.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
