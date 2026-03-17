"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Truck, Package, MapPin, Clock, CheckCircle2, AlertTriangle,
  Bell, ExternalLink, Search, Filter, ChevronRight, Copy,
  Check, Loader2, Printer, QrCode, RefreshCw, ArrowRight,
  DollarSign, Shield, Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── Types ── */

interface ShipmentLabel {
  id: string;
  orderId: string;
  platform: string;
  platformColor: string;
  buyer: string;
  buyerCity: string;
  carrier: string;
  trackingNumber: string;
  status: "label_created" | "in_transit" | "delivered" | "exception";
  shippingCost: number;
  weight: string;
  createdAt: string;
  estimatedDelivery?: string;
  itemTitle: string;
}

type FilterStatus = "all" | "label_created" | "in_transit" | "delivered" | "exception";

const PLATFORM_COLORS: Record<string, string> = {
  depop: "#FF2300", grailed: "#333", poshmark: "#7B2D8E", mercari: "#4DC4FF",
  ebay: "#E53238", vinted: "#09B1BA", facebook: "#1877F2", vestiaire: "#1A1A1A",
};

const STATUS_META: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  label_created: { label: "Label Created", color: "text-blue-400", icon: QrCode },
  in_transit: { label: "In Transit", color: "text-amber-400", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-400", icon: CheckCircle2 },
  exception: { label: "Exception", color: "text-red-400", icon: AlertTriangle },
};

/* ── Mock data generator ── */
function generateMockLabels(): ShipmentLabel[] {
  const items = [
    "Nike Air Max 90 OG", "Supreme Box Logo Hoodie", "Jordan 1 Retro High", "Arc'teryx Alpha SV",
    "Vintage Levi's 501", "Stussy 8-Ball Tee", "Palace Tri-Ferg", "New Balance 990v5",
    "Balenciaga Track Runner", "Issey Miyake Pleats", "Chrome Hearts Ring", "Salomon XT-6",
  ];
  const buyers = ["alex_m", "sneaker.head", "vintage_finds", "streetwear_ny", "resell_la", "grail_hunter"];
  const cities = ["Brooklyn, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Miami, FL", "Portland, OR"];
  const carriers = ["USPS", "UPS", "FedEx"];
  const statuses: ShipmentLabel["status"][] = ["label_created", "in_transit", "delivered", "exception"];
  const platforms = Object.keys(PLATFORM_COLORS);

  return Array.from({ length: 12 }, (_, i) => ({
    id: `ship-${i}`,
    orderId: `ORD-${String(1000 + i).padStart(4, "0")}`,
    platform: platforms[i % platforms.length],
    platformColor: PLATFORM_COLORS[platforms[i % platforms.length]],
    buyer: buyers[i % buyers.length],
    buyerCity: cities[i % cities.length],
    carrier: carriers[i % carriers.length],
    trackingNumber: `${["1Z", "94", "7"][i % 3]}${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
    status: statuses[i % statuses.length],
    shippingCost: 4.5 + Math.floor(Math.random() * 12),
    weight: `${(0.5 + Math.random() * 4).toFixed(1)} lb`,
    createdAt: new Date(Date.now() - i * 3600000 * (2 + Math.random() * 24)).toISOString(),
    estimatedDelivery: i % statuses.length !== 2 ? new Date(Date.now() + (2 + Math.random() * 5) * 86400000).toISOString().split("T")[0] : undefined,
    itemTitle: items[i % items.length],
  }));
}

export default function ShippingHubPage() {
  const [labels, setLabels] = useState<ShipmentLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<ShipmentLabel | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching from platforms
    setTimeout(() => {
      setLabels(generateMockLabels());
      setLoading(false);
    }, 800);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Tracking number copied");
  };

  const filteredLabels = labels.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.itemTitle.toLowerCase().includes(q) || l.buyer.toLowerCase().includes(q) || l.trackingNumber.toLowerCase().includes(q) || l.orderId.toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: labels.length,
    created: labels.filter((l) => l.status === "label_created").length,
    transit: labels.filter((l) => l.status === "in_transit").length,
    delivered: labels.filter((l) => l.status === "delivered").length,
    exceptions: labels.filter((l) => l.status === "exception").length,
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Shipping Hub</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            All your shipping labels from every platform in one place
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={() => { setLoading(true); setTimeout(() => { setLabels(generateMockLabels()); setLoading(false); toast.success("Labels refreshed"); }, 600); }}>
            <RefreshCw className="h-3.5 w-3.5" />
            Sync All
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Label Created", value: stats.created, icon: QrCode, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "In Transit", value: stats.transit, icon: Truck, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Delivered", value: stats.delivered, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Exceptions", value: stats.exceptions, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
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

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by item, buyer, tracking #, or order ID..." className="pl-10 h-9" />
        </div>
        <div className="flex gap-1">
          {(["all", "label_created", "in_transit", "delivered", "exception"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn("px-2.5 py-1.5 rounded-lg text-[10px] font-medium capitalize transition-colors whitespace-nowrap",
                filter === f ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All" : STATUS_META[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Labels list */}
      {loading ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mb-3" />
          <p className="text-sm text-muted-foreground">Syncing labels from all platforms...</p>
        </div>
      ) : filteredLabels.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <h3 className="text-sm font-semibold mb-1">No shipments found</h3>
          <p className="text-xs text-muted-foreground">Labels will appear here when orders are placed on your connected platforms</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLabels.map((label) => {
            const statusMeta = STATUS_META[label.status];
            const StatusIcon = statusMeta.icon;
            const isSelected = selectedLabel?.id === label.id;

            return (
              <div
                key={label.id}
                className={cn(
                  "rounded-xl bg-card border overflow-hidden transition-all duration-200",
                  isSelected ? "ring-2 ring-[var(--primary)] shadow-lg" : "border-[var(--border)] hover:shadow-md"
                )}
              >
                {/* Main row */}
                <button
                  onClick={() => setSelectedLabel(isSelected ? null : label)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  {/* Status icon */}
                  <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", label.status === "exception" ? "bg-red-500/10" : label.status === "delivered" ? "bg-emerald-500/10" : label.status === "in_transit" ? "bg-amber-500/10" : "bg-blue-500/10")}>
                    <StatusIcon className={cn("h-5 w-5", statusMeta.color)} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-semibold truncate">{label.itemTitle}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0 capitalize">{label.platform}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>@{label.buyer}</span>
                      <span>·</span>
                      <span>{label.buyerCity}</span>
                      <span>·</span>
                      <span>{label.carrier}</span>
                    </div>
                  </div>

                  {/* Right: price + status */}
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold tabular-nums">${label.shippingCost.toFixed(2)}</p>
                    <p className={cn("text-[10px] font-semibold", statusMeta.color)}>{statusMeta.label}</p>
                  </div>

                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground/30 shrink-0 transition-transform", isSelected && "rotate-90")} />
                </button>

                {/* Expanded detail */}
                {isSelected && (
                  <div className="border-t border-[var(--border)] p-4 bg-muted/10 space-y-4 animate-fade-in">
                    {/* Tracking */}
                    <div className="flex items-center justify-between rounded-lg bg-card border border-[var(--border)] p-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-0.5">Tracking Number</p>
                        <p className="text-[13px] font-mono font-semibold">{label.trackingNumber}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={(e) => { e.stopPropagation(); handleCopy(label.trackingNumber, label.id); }}>
                          {copiedId === label.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          Copy
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1">
                          <ExternalLink className="h-3 w-3" /> Track
                        </Button>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-card border border-[var(--border)] p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Order ID</p>
                        <p className="text-[12px] font-semibold">{label.orderId}</p>
                      </div>
                      <div className="rounded-lg bg-card border border-[var(--border)] p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Weight</p>
                        <p className="text-[12px] font-semibold">{label.weight}</p>
                      </div>
                      <div className="rounded-lg bg-card border border-[var(--border)] p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Created</p>
                        <p className="text-[12px] font-semibold">{fmtDate(label.createdAt)} {fmtTime(label.createdAt)}</p>
                      </div>
                      <div className="rounded-lg bg-card border border-[var(--border)] p-2.5">
                        <p className="text-[9px] text-muted-foreground mb-0.5">Est. Delivery</p>
                        <p className="text-[12px] font-semibold">{label.estimatedDelivery ? fmtDate(label.estimatedDelivery) : "Delivered"}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-[11px] gap-1.5 flex-1">
                        <Printer className="h-3.5 w-3.5" /> Print Label
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 flex-1">
                        <Shield className="h-3.5 w-3.5" /> File Claim
                      </Button>
                    </div>

                    {/* Exception alert */}
                    {label.status === "exception" && (
                      <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] font-semibold text-red-400 mb-0.5">Delivery Exception</p>
                          <p className="text-[11px] text-muted-foreground">Package could not be delivered. Check tracking for details or contact the carrier.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
