"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign, MessageCircle, Check, X, ArrowRight, Loader2,
  RefreshCw, Sparkles, TrendingUp, BarChart3, Clock, Shield,
  ThumbsUp, ThumbsDown, ArrowLeftRight, Zap, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Offer {
  id: string; listingId: string; listingTitle: string; listingPrice: number;
  brand: string; platform: string; buyer: string;
  offerPrice: number; offerPercent: number; message: string;
  receivedAt: string; status: "pending" | "accepted" | "countered" | "declined";
  ai: {
    recommendation: "accept" | "counter" | "decline";
    reason: string; suggestedCounter: number;
    profitAtOffer: number; profitAtAsking: number;
    marketAvg: number; sellProbability: number;
  };
}

interface Stats {
  total: number; pending: number; totalValue: number;
  avgOfferPercent: number; acceptRecommended: number; counterRecommended: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  depop: "#FF2300", grailed: "#333", poshmark: "#7B2D8E",
  mercari: "#4DC4FF", ebay: "#E53238", vinted: "#09B1BA",
};

const REC_STYLES = {
  accept: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: ThumbsUp, label: "Accept" },
  counter: { bg: "bg-amber-500/10", text: "text-amber-500", icon: ArrowLeftRight, label: "Counter" },
  decline: { bg: "bg-red-500/10", text: "text-red-500", icon: ThumbsDown, label: "Decline" },
};

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);
  const [counterPrices, setCounterPrices] = useState<Record<string, string>>({});
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "accept" | "counter" | "decline">("all");

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/offers");
      const data = await res.json();
      setOffers(data.offers || []);
      setStats(data.stats || null);
      // Pre-fill counter prices with AI suggestions
      const prices: Record<string, string> = {};
      (data.offers || []).forEach((o: Offer) => { prices[o.id] = String(o.ai.suggestedCounter); });
      setCounterPrices(prices);
    } catch { toast.error("Failed to load offers"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const respondToOffer = async (offerId: string, action: "accept" | "counter" | "decline") => {
    setResponding(offerId);
    try {
      const counterPrice = action === "counter" ? Number(counterPrices[offerId] || 0) : undefined;
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, action, counterPrice }),
      });
      if (res.ok) {
        setOffers((prev) => prev.map((o) => o.id === offerId ? { ...o, status: action === "accept" ? "accepted" : action === "counter" ? "countered" : "declined" } : o));
        toast.success(`Offer ${action === "accept" ? "accepted" : action === "counter" ? "countered" : "declined"}`);
      }
    } catch { toast.error("Failed to respond"); }
    setResponding(null);
  };

  const filtered = filter === "all" ? offers : offers.filter((o) => o.ai.recommendation === filter);

  const fmtAgo = (iso: string) => {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
        <p className="text-sm text-muted-foreground">Loading offers across all platforms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Offer Hub</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            All incoming offers across platforms — AI recommends the best response
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={fetchOffers}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending Offers", value: stats.pending, icon: MessageCircle, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Total Value", value: `$${stats.totalValue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Accept Rec.", value: stats.acceptRecommended, icon: ThumbsUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Counter Rec.", value: stats.counterRecommended, icon: ArrowLeftRight, color: "text-amber-400", bg: "bg-amber-500/10" },
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
        {(["all", "accept", "counter", "decline"] as const).map((f) => {
          const style = f !== "all" ? REC_STYLES[f] : null;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium capitalize transition-colors",
                filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {style && <style.icon className={cn("h-3.5 w-3.5", style.text)} />}
              {f === "all" ? "All Offers" : style?.label}
              <span className="text-[10px] text-muted-foreground">
                ({f === "all" ? offers.length : offers.filter((o) => o.ai.recommendation === f).length})
              </span>
            </button>
          );
        })}
      </div>

      {/* Offers list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No offers match this filter</div>
        ) : (
          filtered.map((offer) => {
            const rec = REC_STYLES[offer.ai.recommendation];
            const RecIcon = rec.icon;
            const isExpanded = expandedOffer === offer.id;
            const isResponded = offer.status !== "pending";

            return (
              <div key={offer.id} className={cn("rounded-xl bg-card border overflow-hidden transition-all",
                isResponded ? "opacity-50 border-[var(--border)]" : "border-[var(--border)] hover:shadow-lg"
              )}>
                {/* Main row */}
                <button
                  onClick={() => setExpandedOffer(isExpanded ? null : offer.id)}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  {/* AI recommendation badge */}
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", rec.bg)}>
                    <RecIcon className={cn("h-5 w-5", rec.text)} />
                  </div>

                  {/* Offer info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold truncate">{offer.listingTitle}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 capitalize shrink-0">{offer.platform}</Badge>
                    </div>
                    <p className="text-[12px] text-muted-foreground truncate">
                      <span className="font-medium">@{offer.buyer}</span>: &ldquo;{offer.message}&rdquo;
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span>{fmtAgo(offer.receivedAt)}</span>
                      <span>·</span>
                      <span>{offer.offerPercent}% of asking</span>
                      <span>·</span>
                      <span className={cn("font-semibold", rec.text)}>AI: {rec.label}</span>
                    </div>
                  </div>

                  {/* Price comparison */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Offer</p>
                      <p className="text-[16px] font-bold tabular-nums">${offer.offerPrice}</p>
                    </div>
                    <div className="text-[10px] text-muted-foreground/30">vs</div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Asking</p>
                      <p className="text-[16px] font-bold tabular-nums text-muted-foreground">${offer.listingPrice}</p>
                    </div>
                  </div>

                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground/30 shrink-0 transition-transform", isExpanded && "rotate-180")} />
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] p-4 space-y-4 animate-fade-in bg-muted/10">
                    {/* AI analysis */}
                    <div className={cn("rounded-xl border p-4 space-y-2", rec.bg, `border-${offer.ai.recommendation === "accept" ? "emerald" : offer.ai.recommendation === "counter" ? "amber" : "red"}-500/20`)}>
                      <div className="flex items-center gap-2">
                        <Sparkles className={cn("h-4 w-4", rec.text)} />
                        <span className={cn("text-[13px] font-semibold", rec.text)}>AI Recommendation: {rec.label}</span>
                      </div>
                      <p className="text-[12px] text-foreground/70">{offer.ai.reason}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <div className="rounded-lg bg-card p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Profit if Accept</p>
                          <p className="text-[14px] font-bold text-emerald-500">${offer.ai.profitAtOffer}</p>
                        </div>
                        <div className="rounded-lg bg-card p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Profit at Asking</p>
                          <p className="text-[14px] font-bold">${offer.ai.profitAtAsking}</p>
                        </div>
                        <div className="rounded-lg bg-card p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Market Avg</p>
                          <p className="text-[14px] font-bold">${offer.ai.marketAvg}</p>
                        </div>
                        <div className="rounded-lg bg-card p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Sell Probability</p>
                          <p className={cn("text-[14px] font-bold", offer.ai.sellProbability >= 70 ? "text-emerald-500" : offer.ai.sellProbability >= 40 ? "text-amber-500" : "text-red-500")}>
                            {offer.ai.sellProbability}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {!isResponded && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" className="h-9 text-[12px] gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => respondToOffer(offer.id, "accept")} disabled={responding === offer.id}>
                          {responding === offer.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Accept ${offer.offerPrice}
                        </Button>

                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            value={counterPrices[offer.id] || ""}
                            onChange={(e) => setCounterPrices((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                            className="h-9 w-24 text-[12px] font-mono"
                            placeholder="Counter $"
                          />
                          <Button size="sm" variant="outline" className="h-9 text-[12px] gap-1.5"
                            onClick={() => respondToOffer(offer.id, "counter")} disabled={responding === offer.id}>
                            <ArrowLeftRight className="h-3.5 w-3.5" /> Counter
                          </Button>
                        </div>

                        <Button size="sm" variant="outline" className="h-9 text-[12px] gap-1.5 text-red-500 hover:bg-red-500/10"
                          onClick={() => respondToOffer(offer.id, "decline")} disabled={responding === offer.id}>
                          <X className="h-3.5 w-3.5" /> Decline
                        </Button>
                      </div>
                    )}

                    {isResponded && (
                      <Badge className={cn("text-[11px]",
                        offer.status === "accepted" ? "bg-emerald-500/10 text-emerald-500" :
                        offer.status === "countered" ? "bg-amber-500/10 text-amber-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {offer.status === "accepted" ? "✓ Accepted" : offer.status === "countered" ? "↔ Countered" : "✗ Declined"}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
