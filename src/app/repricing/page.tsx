"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingDown, TrendingUp, Minus, RefreshCw, Loader2,
  Check, ArrowRight, AlertTriangle, Clock, Zap, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Suggestion {
  id: string; title: string; brand: string; category: string;
  currentPrice: number; suggestedPrice: number;
  priceDiff: number; priceDiffPercent: number;
  reason: string; urgency: "low" | "medium" | "high";
  action: "hold" | "drop" | "raise" | "relist";
  daysListed: number; publishedPlatforms: number; totalPlatforms: number;
  image: string | null; status: string;
}

interface Stats {
  total: number; needsAction: number; highUrgency: number;
  avgDaysListed: number; potentialRevenue: number;
}

const URGENCY_STYLES = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const ACTION_ICONS = {
  hold: Minus,
  drop: TrendingDown,
  raise: TrendingUp,
  relist: RefreshCw,
};

export default function RepricingPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "drop" | "raise" | "hold" | "relist">("all");
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/repricing");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setStats(data.stats || null);
    } catch { toast.error("Failed to load pricing data"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const applyPrice = async (listingId: string, newPrice: number) => {
    setApplying(listingId);
    try {
      const res = await fetch("/api/repricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, newPrice }),
      });
      if (res.ok) {
        setApplied((prev) => new Set(prev).add(listingId));
        setSuggestions((prev) => prev.map((s) => s.id === listingId ? { ...s, currentPrice: newPrice, action: "hold", reason: "Price updated!" } : s));
        toast.success("Price updated");
      } else {
        toast.error("Failed to update price");
      }
    } catch { toast.error("Failed to update price"); }
    setApplying(null);
  };

  const applyAll = async () => {
    const actionable = filtered.filter((s) => s.action !== "hold" && !applied.has(s.id));
    for (const s of actionable) {
      await applyPrice(s.id, s.suggestedPrice);
      await new Promise((r) => setTimeout(r, 200));
    }
    toast.success(`Applied ${actionable.length} price changes`);
  };

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.action === filter);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
        <p className="text-sm text-muted-foreground">Analyzing {suggestions.length || "your"} listings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Smart Repricer</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            AI analyzes your listings and suggests optimal price adjustments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={fetchSuggestions}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => {
            const count = filtered.filter((s) => s.action !== "hold" && !applied.has(s.id)).length;
            if (count > 5 && !confirm(`Apply ${count} price changes? This cannot be undone.`)) return;
            applyAll();
          }} disabled={filtered.filter((s) => s.action !== "hold" && !applied.has(s.id)).length === 0}>
            <Zap className="h-3.5 w-3.5" /> Apply All ({filtered.filter((s) => s.action !== "hold" && !applied.has(s.id)).length})
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Needs Action", value: stats.needsAction, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "High Urgency", value: stats.highUrgency, icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Avg Days Listed", value: stats.avgDaysListed, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total Listings", value: stats.total, icon: BarChart3, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card border border-[var(--border)] p-4 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon className={cn("h-5 w-5", s.color)} />
              </div>
              <div>
                <p className="text-xl font-bold tabular-nums">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {(["all", "drop", "raise", "hold", "relist"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn("flex-1 px-3 py-2 rounded-lg text-[12px] font-medium capitalize transition-colors",
              filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f} {f !== "all" && <span className="ml-1 text-[10px]">({suggestions.filter((s) => s.action === f).length})</span>}
          </button>
        ))}
      </div>

      {/* Suggestions list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No listings match this filter</div>
        ) : (
          filtered.map((s) => {
            const ActionIcon = ACTION_ICONS[s.action];
            const isApplied = applied.has(s.id);

            return (
              <div key={s.id} className={cn("rounded-xl bg-card border overflow-hidden transition-all", isApplied ? "border-emerald-500/20 opacity-60" : "border-[var(--border)] hover:shadow-md")}>
                <div className="flex items-center gap-4 p-4">
                  {/* Action icon */}
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    s.action === "drop" ? "bg-red-500/10" : s.action === "raise" ? "bg-emerald-500/10" : s.action === "relist" ? "bg-blue-500/10" : "bg-muted"
                  )}>
                    <ActionIcon className={cn("h-5 w-5",
                      s.action === "drop" ? "text-red-500" : s.action === "raise" ? "text-emerald-500" : s.action === "relist" ? "text-blue-500" : "text-muted-foreground"
                    )} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold truncate">{s.title}</span>
                      <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 shrink-0", URGENCY_STYLES[s.urgency])}>{s.urgency}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground">{s.reason}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                      <span>{s.brand}</span>
                      <span>·</span>
                      <span>{s.daysListed}d listed</span>
                      <span>·</span>
                      <span>{s.publishedPlatforms} platforms</span>
                    </div>
                  </div>

                  {/* Price change */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[14px] font-bold tabular-nums">${s.currentPrice}</p>
                      <p className="text-[10px] text-muted-foreground">current</p>
                    </div>
                    {s.action !== "hold" && (
                      <>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                        <div className="text-right">
                          <p className={cn("text-[14px] font-bold tabular-nums", s.action === "drop" ? "text-red-500" : "text-emerald-500")}>
                            ${s.suggestedPrice}
                          </p>
                          <p className={cn("text-[10px] font-semibold", s.priceDiffPercent < 0 ? "text-red-500" : "text-emerald-500")}>
                            {s.priceDiffPercent > 0 ? "+" : ""}{s.priceDiffPercent}%
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action button */}
                  {s.action !== "hold" && !isApplied ? (
                    <Button
                      size="sm"
                      variant={s.action === "drop" ? "destructive" : "default"}
                      className="h-8 text-[11px] gap-1 shrink-0"
                      onClick={() => applyPrice(s.id, s.suggestedPrice)}
                      disabled={applying === s.id}
                    >
                      {applying === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Apply
                    </Button>
                  ) : isApplied ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[10px]">Applied</Badge>
                  ) : s.action === "hold" ? (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">Competitive</Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
