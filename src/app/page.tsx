"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  Package,
  TrendingUp,
  ShoppingBag,
  Zap,
  Search,
  Filter,
  ArrowUpRight,
  DollarSign,
  Eye,
  Sparkles,
  Clock,
} from "lucide-react";
import { platformBadge, statusStyles, statCardColors } from "@/lib/colors";

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

  const filtered = listings.filter((l) => {
    if (filterStatus && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.brand.toLowerCase().includes(q) || l.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-8 text-primary-foreground">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome to CrossList</h1>
              <p className="text-primary-foreground/70 text-lg">
                List once, sell everywhere. AI-powered cross-platform listing.
              </p>
            </div>
            <Link href="/listings/new">
              <Button size="lg" variant="secondary" className="shadow-lg">
                <PlusCircle className="h-5 w-5 mr-2" />
                New Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Listings", value: stats.totalListings, icon: Package, color: statCardColors.listings.color, bg: statCardColors.listings.bg },
          { label: "Active", value: stats.activeListings, icon: TrendingUp, color: statCardColors.active.color, bg: statCardColors.active.bg },
          { label: "Published", value: totalPublished, icon: ShoppingBag, color: statCardColors.published.color, bg: statCardColors.published.bg },
          { label: "Revenue", value: `$${totalRevenue.toFixed(0)}`, icon: DollarSign, color: statCardColors.revenue.color, bg: statCardColors.revenue.bg },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-sm transition-shadow">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`${bg} ${color} p-3 rounded-xl`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["depop", "grailed", "poshmark", "mercari"].map((platform) => {
          const pStats = stats.platformStats.find((p) => p.platform === platform);
          return (
            <Card key={platform} className="hover:shadow-sm transition-all hover:-translate-y-0.5">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={platformBadge[platform]}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {pStats?.published || 0} listed
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {pStats?.views || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Listings section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Your Listings</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              {[
                { label: "All", value: null },
                { label: "Draft", value: "draft" },
                { label: "Active", value: "active" },
                { label: "Sold", value: "sold" },
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setFilterStatus(f.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
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
          <Card className="border-dashed border-2">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {listings.length === 0 ? "Create your first listing" : "No listings match your search"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {listings.length === 0
                  ? "Add a product and let AI optimize it for Depop, Grailed, Poshmark, and Mercari in seconds."
                  : "Try adjusting your search or filters."}
              </p>
              {listings.length === 0 && (
                <Link href="/listings/new">
                  <Button className="bg-primary text-primary-foreground shadow-md hover:shadow-lg">
                    <Zap className="h-4 w-4 mr-2" />
                    Create Listing
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="group overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
                  <div className="relative aspect-[4/3] bg-muted">
                    {listing.images[0] ? (
                      <Image
                        src={listing.images[0].path}
                        alt={listing.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className={`${statusStyles[listing.status] || ""} backdrop-blur-sm`}>
                        {listing.status}
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-8">
                      <p className="text-white font-semibold line-clamp-1">{listing.title}</p>
                      <p className="text-white/70 text-sm">
                        {listing.brand}{listing.brand && listing.category ? " · " : ""}{listing.category}
                      </p>
                    </div>
                  </div>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {listing.platformListings.map((pl) => (
                          <Badge
                            key={pl.platform}
                            variant="outline"
                            className={`text-xs ${platformBadge[pl.platform] || ""}`}
                          >
                            {pl.platform}
                          </Badge>
                        ))}
                        {listing.platformListings.length === 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Not optimized yet
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-lg">${listing.price.toFixed(0)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
