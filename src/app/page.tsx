"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  Package,
  Search,
  ArrowUpRight,
  DollarSign,
  Sparkles,
  TrendingUp,
  Camera,
  BarChart3,
  Activity,
  ArrowRight,
  FileUp,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { platformBadge, statusStyles } from "@/lib/colors";

interface Listing {
  id: string;
  title: string;
  brand: string;
  price: number;
  status: string;
  category: string;
  createdAt: string;
  images: { path: string }[];
  platformListings: { platform: string; status: string }[];
}

export default function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    platformStats: [] as { platform: string; published: number; views: number; revenue: number }[],
  });

  useEffect(() => {
    fetch("/api/listings").then((r) => r.json()).then(setListings).catch(() => {});
    fetch("/api/analytics").then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  const totalPublished = stats.platformStats.reduce((s, p) => s + p.published, 0);
  const totalViews = stats.platformStats.reduce((s, p) => s + (p.views || 0), 0);
  const totalRevenue = stats.platformStats.reduce((s, p) => s + (p.revenue || 0), 0);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const filtered = listings.filter((l) => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.brand.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, filterStatus]);

  const statCards = [
    { label: "Total Listings", value: stats.totalListings, icon: Package, change: "+12%" },
    { label: "Active", value: stats.activeListings, icon: Activity },
    { label: "Published", value: totalPublished, icon: ArrowUpRight },
    { label: "Revenue", value: totalRevenue, icon: DollarSign, prefix: "$" },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage and monitor your listings across all platforms.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/listings/smart" className="flex-1 sm:flex-none">
            <Button variant="outline" size="sm" className="w-full sm:w-auto h-9 text-[13px] gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              <span className="sm:inline">Smart List</span>
            </Button>
          </Link>
          <Link href="/listings/new" className="flex-1 sm:flex-none">
            <Button size="sm" className="w-full sm:w-auto h-9 text-[13px] gap-1.5">
              <PlusCircle className="h-3.5 w-3.5" />
              New Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — iOS grouped card */}
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[var(--border)]">
          {statCards.map(({ label, value, icon: Icon, prefix, change }) => (
            <div key={label} className="p-3 sm:p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
                <Icon className="h-3.5 w-3.5 text-[var(--primary)] opacity-60" />
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-xl sm:text-2xl font-bold tracking-tight">
                  {prefix}{typeof value === "number" ? value.toLocaleString() : value}
                </span>
                {change && (
                  <span className="text-[10px] text-[#34c759] dark:text-[#30d158] font-semibold mb-0.5 flex items-center gap-0.5">
                    <TrendingUp className="h-2.5 w-2.5" />
                    {change}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions + Platform stats + Recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {/* Quick Actions */}
        <div className="rounded-xl bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-1">
            {[
              { href: "/listings/smart", label: "AI Smart Lister", desc: "Photo to listing in seconds", icon: Camera, color: "bg-[var(--primary)]" },
              { href: "/bulk-import", label: "Bulk Import", desc: "Import from CSV file", icon: FileUp, color: "bg-blue-500" },
              { href: "/analytics", label: "View Analytics", desc: "Track your performance", icon: BarChart3, color: "bg-amber-500" },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors group">
                  <div className={`h-8 w-8 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium">{action.label}</p>
                    <p className="text-[11px] text-muted-foreground">{action.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Platform Stats */}
        <div className="rounded-xl bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Platforms</h3>
            <Link href="/settings" className="text-[11px] text-primary font-medium hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"].map((platform) => {
              const pStats = stats.platformStats.find((p) => p.platform === platform);
              const barWidth = pStats?.published ? Math.min((pStats.published / Math.max(stats.totalListings, 1)) * 100, 100) : 0;
              return (
                <div key={platform} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${platformBadge[platform]}`}>
                        {platform.charAt(0).toUpperCase() + platform.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{pStats?.published || 0}</span>
                      {(pStats?.views || 0) > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {pStats?.views}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${barWidth}%`, background: "var(--primary)", opacity: 0.7 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl bg-card p-4 sm:p-5 md:col-span-2 xl:col-span-1">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          {listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-xl bg-[var(--accent)] flex items-center justify-center mb-3">
                <Sparkles className="h-5 w-5" style={{ color: "var(--primary)" }} />
              </div>
              <p className="text-sm font-medium mb-1">No activity yet</p>
              <p className="text-xs text-muted-foreground">Create your first listing to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.slice(0, 5).map((listing) => (
                <Link key={listing.id} href={`/listings/${listing.id}`} className="flex items-center gap-3 group p-1 -mx-1 rounded-lg hover:bg-muted/40 transition-colors">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {listing.images[0] ? (
                      <Image src={listing.images[0].path} alt="" width={36} height={36} className="object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">{listing.title}</p>
                    <p className="text-[11px] text-muted-foreground">{listing.brand || listing.category}</p>
                  </div>
                  <span className="text-[13px] font-mono font-semibold shrink-0">${listing.price.toFixed(0)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Listings Section */}
      <div className="rounded-xl bg-card overflow-hidden">
        {/* Header with search and filter — stacks on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border">
          <h2 className="text-sm font-semibold">Your Listings</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
              <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-[13px] rounded-lg"
              />
            </div>
            <div className="flex gap-px bg-muted rounded-lg p-0.5 self-start">
              {[
                { label: "All", value: null },
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
                { label: "Sold", value: "sold" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-2.5 py-1 text-[11px] sm:text-[12px] font-medium rounded-md transition-colors ${
                    filterStatus === f.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Package className="h-6 w-6 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-medium mb-1">
              {listings.length === 0 ? "No listings yet" : "No results"}
            </h3>
            <p className="text-[13px] text-muted-foreground mb-4 max-w-sm mx-auto">
              {listings.length === 0
                ? "Create your first listing and let AI optimize it for all platforms."
                : "Try adjusting your search or filters."}
            </p>
            {listings.length === 0 && (
              <Link href="/listings/new">
                <Button size="sm" className="h-9 text-[13px]">
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Create Listing
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table view */}
            <div className="hidden sm:block divide-y divide-border">
              {paged.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {listing.images[0] ? (
                      <Image src={listing.images[0].path} alt="" width={40} height={40} className="object-cover" />
                    ) : (
                      <Package className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{listing.title}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {listing.brand}{listing.brand && listing.category ? " · " : ""}{listing.category}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {listing.platformListings.map((pl) => (
                      <Badge
                        key={pl.platform}
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${platformBadge[pl.platform] || ""}`}
                      >
                        {pl.platform}
                      </Badge>
                    ))}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 shrink-0 ${statusStyles[listing.status] || ""}`}
                  >
                    {listing.status}
                  </Badge>
                  <span className="text-[13px] font-mono font-semibold w-16 text-right shrink-0">
                    ${listing.price.toFixed(0)}
                  </span>
                </Link>
              ))}
            </div>

            {/* Mobile card view */}
            <div className="sm:hidden divide-y divide-border">
              {paged.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {listing.images[0] ? (
                      <Image src={listing.images[0].path} alt="" width={48} height={48} className="object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium line-clamp-1">{listing.title}</p>
                      <span className="text-[13px] font-mono font-semibold shrink-0">${listing.price.toFixed(0)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {listing.brand}{listing.brand && listing.category ? " · " : ""}{listing.category}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 ${statusStyles[listing.status] || ""}`}
                      >
                        {listing.status}
                      </Badge>
                      {listing.platformListings.slice(0, 2).map((pl) => (
                        <Badge
                          key={pl.platform}
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${platformBadge[pl.platform] || ""}`}
                        >
                          {pl.platform}
                        </Badge>
                      ))}
                      {listing.platformListings.length > 2 && (
                        <span className="text-[9px] text-muted-foreground">+{listing.platformListings.length - 2}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} className="text-xs text-muted-foreground px-1">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={page === p ? "default" : "outline"}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      )
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
