"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, Target, Eye, EyeOff, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { platformBadge } from "@/lib/colors";

interface GapItem {
  listingId: string;
  title: string;
  brand: string;
  price: number;
  category: string;
  listedOn: string[];
  missingFrom: string[];
  coveragePercent: number;
}

interface AlignmentData {
  totalListings: number;
  fullyAligned: number;
  withGaps: number;
  overallCoverage: number;
  connectedPlatforms: string[];
  targetPlatforms: string[];
  platformCoverage: Record<string, { listed: number; total: number }>;
  gaps: GapItem[];
}

export default function AlignmentPage() {
  const [data, setData] = useState<AlignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const fetch_data = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alignment");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch { toast.error("Failed to load alignment data"); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_data(); }, [fetch_data]);

  const publishToMissing = async (listingId: string, platform: string) => {
    setPublishing(`${listingId}-${platform}`);
    try {
      const res = await fetch(`/api/listings/${listingId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Publishing failed");
      } else {
        toast.success(`Published to ${platform}`);
        fetch_data();
      }
    } catch { toast.error("Publishing failed"); }
    setPublishing(null);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Analyzing store alignment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Store Alignment</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Find listings missing from platforms and fill the gaps
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetch_data} className="h-8 text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Score card */}
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--border)]">
          <div className="p-4 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Total Listings</span>
            <div className="text-2xl font-bold">{data.totalListings}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Fully Aligned</span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.fullyAligned}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">With Gaps</span>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.withGaps}</div>
          </div>
          <div className="p-4 space-y-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Coverage</span>
            <div className={`text-2xl font-bold ${data.overallCoverage >= 80 ? "text-emerald-600 dark:text-emerald-400" : data.overallCoverage >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
              {data.overallCoverage}%
            </div>
          </div>
        </div>
      </div>

      {/* Platform coverage bars */}
      <div className="rounded-xl bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold mb-3">Platform Coverage</h3>
        <div className="space-y-3">
          {Object.entries(data.platformCoverage).map(([platform, { listed, total }]) => {
            const pct = total > 0 ? Math.round((listed / total) * 100) : 0;
            const connected = data.connectedPlatforms.includes(platform);
            return (
              <div key={platform} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${platformBadge[platform] || ""}`}>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Badge>
                    {!connected && (
                      <span className="text-[9px] text-muted-foreground">(not connected)</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {listed}/{total} <span className="font-semibold text-foreground">{pct}%</span>
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct > 0 ? "bg-red-500" : "bg-muted"
                    }`}
                    style={{ width: `${pct}%`, opacity: connected ? 1 : 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap list */}
      {data.gaps.length === 0 ? (
        <div className="rounded-xl bg-card p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-1">Fully Aligned</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            All your active listings are published on every connected platform. No gaps detected.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Listings with Gaps</h3>
              <span className="text-xs text-muted-foreground">{data.gaps.length} items need attention</span>
            </div>
          </div>

          <div className="divide-y divide-border">
            {data.gaps.map((item) => (
              <div key={item.listingId} className="p-4 space-y-2.5 hover:bg-muted/20 transition-colors">
                {/* Item info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.brand}{item.brand && item.category ? " · " : ""}{item.category} · ${item.price.toFixed(0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`h-2 w-2 rounded-full ${item.coveragePercent >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
                    <span className="text-[11px] font-mono font-semibold">{item.coveragePercent}%</span>
                  </div>
                </div>

                {/* Listed on */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-muted-foreground font-medium w-14 shrink-0">Listed on</span>
                  {item.listedOn.map((p) => (
                    <Badge key={p} variant="outline" className={`text-[9px] px-1.5 py-0 ${platformBadge[p] || ""}`}>
                      {p}
                    </Badge>
                  ))}
                </div>

                {/* Missing from — with publish buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold w-14 shrink-0">Missing</span>
                  {item.missingFrom.map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1 border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => publishToMissing(item.listingId, p)}
                      disabled={publishing === `${item.listingId}-${p}`}
                    >
                      {publishing === `${item.listingId}-${p}` ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <ArrowRight className="h-2.5 w-2.5" />
                      )}
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
