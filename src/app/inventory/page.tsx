"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  Package,
  BarChart3,
  Loader2,
  Trash2,
  PercentIcon,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import { platformBadge } from "@/lib/colors";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
  CountUp,
} from "@/components/motion";

// ── Types ────────────────────────────────────────────────────────────

interface Sale {
  id: string;
  listingId: string | null;
  platform: string;
  title: string;
  soldPrice: number;
  costPrice: number;
  shippingCost: number;
  platformFee: number;
  profit: number;
  buyerName: string;
  soldAt: string;
  notes: string;
}

interface Stats {
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  count: number;
  avgProfitMargin: number;
  monthlyBreakdown: Record<
    string,
    { revenue: number; profit: number; count: number }
  >;
  platformBreakdown: Record<
    string,
    { revenue: number; profit: number; count: number }
  >;
}

// ── Helpers ──────────────────────────────────────────────────────────

const PLATFORMS = ["depop", "grailed", "poshmark", "mercari", "ebay"] as const;

function formatCurrency(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

export default function InventoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/sales?stats=true");
      const data = await res.json();
      setSales(data.sales || []);
      setStats(data.stats || null);
    } catch {
      toast.error("Failed to load sales data");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteSale = async (id: string) => {
    if (!confirm("Delete this sale record?")) return;
    try {
      await fetch(`/api/sales?id=${id}`, { method: "DELETE" });
      toast.success("Sale deleted");
      fetchData();
    } catch {
      toast.error("Failed to delete sale");
    }
  };

  const downloadExport = async (type: "sales" | "listings") => {
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${type === "sales" ? "Sales" : "Listings"} CSV downloaded`);
    } catch {
      toast.error("Failed to download export");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const monthlyKeys = stats
    ? Object.keys(stats.monthlyBreakdown).sort()
    : [];
  const maxRevenue = stats
    ? Math.max(
        ...Object.values(stats.monthlyBreakdown).map((m) => m.revenue),
        1
      )
    : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">P&L / Inventory</h1>
            <p className="text-muted-foreground text-sm">
              Track your revenue, costs, and profit across all platforms
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadExport("sales")}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Sales CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadExport("listings")}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export Listings CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<Button size="sm" />}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Record Sale
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Record a Sale
                  </DialogTitle>
                </DialogHeader>
                <RecordSaleForm
                  onSuccess={() => {
                    setDialogOpen(false);
                    fetchData();
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </FadeInUp>

      {/* Stats Row */}
      {stats && (
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StaggerItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Revenue
                    </p>
                    <CountUp
                      value={Math.round(stats.totalRevenue)}
                      prefix="$"
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/10">
                    <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total Profit
                    </p>
                    <CountUp
                      value={Math.round(stats.totalProfit)}
                      prefix="$"
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total COGS</p>
                    <CountUp
                      value={Math.round(stats.totalCost)}
                      prefix="$"
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <PercentIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Profit Margin
                    </p>
                    <CountUp
                      value={Math.round(stats.avgProfitMargin)}
                      suffix="%"
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-pink-500/10">
                    <ShoppingCart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Items Sold</p>
                    <CountUp
                      value={stats.count}
                      className="text-xl font-bold"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>
      )}

      {/* Revenue Chart */}
      {stats && monthlyKeys.length > 0 && (
        <FadeInUp delay={0.15}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Revenue — Last 6 Months
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-48">
                {monthlyKeys.map((key) => {
                  const data = stats.monthlyBreakdown[key];
                  const heightPct = (data.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={key}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatCurrency(data.revenue)}
                      </span>
                      <div className="w-full flex justify-center">
                        <div
                          className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-500 dark:to-emerald-300 transition-all duration-700 ease-out"
                          style={{
                            height: `${Math.max(heightPct, 4)}%`,
                            minHeight: "8px",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {monthLabel(key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      )}

      {/* Sales Table */}
      <FadeInUp delay={0.25}>
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Sales History
              {sales.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {sales.length} sale{sales.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                  <ShoppingCart className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-muted-foreground">
                  No sales recorded yet
                </p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Click &ldquo;Record Sale&rdquo; to log your first sale
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Sold Price</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Fees</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {sale.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={platformBadge[sale.platform] || ""}
                        >
                          {sale.platform.charAt(0).toUpperCase() +
                            sale.platform.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.soldPrice)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(sale.costPrice)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(sale.shippingCost + sale.platformFee)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          sale.profit >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {formatCurrency(sale.profit)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sale.soldAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSale(sale.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </FadeInUp>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// RECORD SALE FORM
// ═════════════════════════════════════════════════════════════════════

function RecordSaleForm({ onSuccess }: { onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    platform: "depop",
    soldPrice: "",
    costPrice: "",
    shippingCost: "",
    platformFee: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.soldPrice || parseFloat(form.soldPrice) <= 0) {
      toast.error("Enter a valid sold price");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          platform: form.platform,
          soldPrice: parseFloat(form.soldPrice),
          costPrice: parseFloat(form.costPrice) || 0,
          shippingCost: parseFloat(form.shippingCost) || 0,
          platformFee: parseFloat(form.platformFee) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sale recorded");
      onSuccess();
    } catch {
      toast.error("Failed to record sale");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="e.g., Vintage Nike Windbreaker"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>Platform</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => update("platform", p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                form.platform === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Sold Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.soldPrice}
            onChange={(e) => update("soldPrice", e.target.value)}
            placeholder="0.00"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Cost Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.costPrice}
            onChange={(e) => update("costPrice", e.target.value)}
            placeholder="0.00"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Shipping Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.shippingCost}
            onChange={(e) => update("shippingCost", e.target.value)}
            placeholder="0.00"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label>Platform Fee ($)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.platformFee}
            onChange={(e) => update("platformFee", e.target.value)}
            placeholder="0.00"
            className="h-11"
          />
        </div>
      </div>

      {form.soldPrice && (
        <div className="p-3 rounded-xl bg-muted/30">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated Profit</span>
            <span
              className={`font-semibold ${
                (parseFloat(form.soldPrice) || 0) -
                  (parseFloat(form.costPrice) || 0) -
                  (parseFloat(form.shippingCost) || 0) -
                  (parseFloat(form.platformFee) || 0) >=
                0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(
                (parseFloat(form.soldPrice) || 0) -
                  (parseFloat(form.costPrice) || 0) -
                  (parseFloat(form.shippingCost) || 0) -
                  (parseFloat(form.platformFee) || 0)
              )}
            </span>
          </div>
        </div>
      )}

      <Button
        className="w-full h-11"
        onClick={submit}
        disabled={saving}
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Record Sale
      </Button>
    </div>
  );
}
