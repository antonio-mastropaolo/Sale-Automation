"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  Package,
  Zap,
  Search,
  ArrowUpRight,
  DollarSign,
  Eye,
  Sparkles,
  Clock,
  Flame,
  CheckCircle2,
  PlayCircle,
  Timer,
  BarChart3,
  Users,
  TrendingUp,
  Camera,
} from "lucide-react";
import { platformBadge, statusStyles } from "@/lib/colors";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
  CountUp,
  GlowCard,
  motion,
} from "@/components/motion";

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

  /* Stat cards — Donezo-matching colored icon treatment */
  const statCards = [
    {
      label: "Total Listings",
      value: stats.totalListings,
      icon: CheckCircle2,
      featured: true,
      subtext: "Increased from last month",
      iconBg: "bg-white/15",
      iconColor: "text-white/80",
    },
    {
      label: "Active",
      value: stats.activeListings,
      icon: PlayCircle,
      featured: false,
      subtext: "Increased from last month",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      label: "Published",
      value: totalPublished,
      icon: ArrowUpRight,
      featured: false,
      subtext: "Across platforms",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      label: "Revenue",
      value: totalRevenue,
      icon: DollarSign,
      featured: false,
      subtext: "Total earned",
      isRevenue: true,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Page heading — matches Donezo exactly */}
      <FadeInUp>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight leading-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Plan, prioritize, and manage your listings with ease.
            </p>
          </div>
          <Link href="/listings/new" className="self-start">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button className="bg-primary text-primary-foreground rounded-2xl shadow-sm hover:shadow-md hover:bg-primary/90 transition-all h-10 px-5 text-sm font-semibold">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Listing
              </Button>
            </motion.div>
          </Link>
        </div>
      </FadeInUp>

      {/* Stats grid — colored icon circles like Donezo */}
      <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, featured, subtext, isRevenue, iconBg, iconColor }) => (
          <StaggerItem key={label}>
            <div
              className={`rounded-2xl p-6 transition-all ${
                featured
                  ? "bg-gradient-to-br from-[oklch(0.28_0.07_155)] to-[oklch(0.36_0.10_155)] text-white shadow-lg shimmer-card animate-gradient-shift"
                  : "bg-card ring-1 ring-border/40 card-hover"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <p className={`text-[13px] font-medium ${featured ? "text-white/80" : "text-muted-foreground"}`}>
                  {label}
                </p>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${iconBg}`}>
                  <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
                </div>
              </div>
              <CountUp
                value={typeof value === "number" ? value : 0}
                prefix={isRevenue ? "$" : ""}
                className={`text-[36px] font-extrabold tracking-tight leading-none ${featured ? "text-white" : "text-foreground"}`}
              />
              <p className={`text-xs mt-3 flex items-center gap-1.5 ${featured ? "text-green-300/80" : "text-muted-foreground/70"}`}>
                <Flame className="h-3 w-3" />
                {subtext}
              </p>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Widget grid — 3-column layout matching Donezo's section pattern */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Platform Analytics widget */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <h3 className="text-[15px] font-semibold mb-4">Platform Analytics</h3>
            <div className="space-y-3">
              {["depop", "grailed", "poshmark", "mercari"].map((platform) => {
                const pStats = stats.platformStats.find((p) => p.platform === platform);
                const barWidth = pStats?.published ? Math.min((pStats.published / Math.max(stats.totalListings, 1)) * 100, 100) : 0;
                return (
                  <div key={platform} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[11px] ${platformBadge[platform]}`}>
                          {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{pStats?.published || 0} listed</span>
                    </div>
                    <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary/70 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </StaggerItem>

        {/* Quick Stats widget */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <h3 className="text-[15px] font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Total Views</p>
                    <p className="text-xs text-muted-foreground">Across platforms</p>
                  </div>
                </div>
                <span className="text-lg font-bold">{totalViews}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Published</p>
                    <p className="text-xs text-muted-foreground">Active listings</p>
                  </div>
                </div>
                <span className="text-lg font-bold">{totalPublished}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Revenue</p>
                    <p className="text-xs text-muted-foreground">Total earned</p>
                  </div>
                </div>
                <span className="text-lg font-bold">${totalRevenue}</span>
              </div>
            </div>
          </div>
        </StaggerItem>

        {/* Recent Activity widget */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <h3 className="text-[15px] font-semibold mb-4">Recent Activity</h3>
            {listings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {listings.slice(0, 4).map((listing) => (
                  <Link key={listing.id} href={`/listings/${listing.id}`} className="flex items-center gap-3 group">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 overflow-hidden">
                      {listing.images[0] ? (
                        <Image src={listing.images[0].path} alt="" width={36} height={36} className="object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{listing.title}</p>
                      <p className="text-xs text-muted-foreground">{listing.brand || listing.category}</p>
                    </div>
                    <span className="text-sm font-semibold">${listing.price.toFixed(0)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Widget grid row 2 — matching Donezo's 2-row layout */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Team / Platforms widget (like Donezo's Team Collaboration) */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-semibold">Connected Platforms</h3>
              <button className="text-xs text-primary font-medium hover:underline">+ Add Platform</button>
            </div>
            <div className="space-y-3">
              {["depop", "grailed", "poshmark", "mercari"].map((platform) => {
                const pStats = stats.platformStats.find((p) => p.platform === platform);
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      platform === "depop" ? "bg-red-400" :
                      platform === "grailed" ? "bg-gray-700" :
                      platform === "poshmark" ? "bg-pink-400" :
                      "bg-emerald-500"
                    }`}>
                      {platform.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{platform.charAt(0).toUpperCase() + platform.slice(1)}</p>
                      <p className="text-xs text-muted-foreground">{pStats?.published || 0} listings · {pStats?.views || 0} views</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </StaggerItem>

        {/* Listing Progress widget (like Donezo's Project Progress) */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <h3 className="text-[15px] font-semibold mb-4">Listing Progress</h3>
            <div className="flex items-center justify-center py-3">
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-muted/40" strokeWidth="10" />
                  <motion.circle
                    cx="60" cy="60" r="50" fill="none" stroke="currentColor" className="text-primary"
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
                    animate={{
                      strokeDashoffset: stats.totalListings > 0
                        ? 2 * Math.PI * 50 * (1 - stats.activeListings / stats.totalListings)
                        : 2 * Math.PI * 50,
                    }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold">
                    {stats.totalListings > 0 ? Math.round((stats.activeListings / stats.totalListings) * 100) : 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground">Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted" />
                Pending
              </span>
            </div>
          </div>
        </StaggerItem>

        {/* Quick Actions widget (like Donezo's Time Tracker) */}
        <StaggerItem>
          <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5 card-hover">
            <h3 className="text-[15px] font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/listings/smart">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors group">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">AI Smart Lister</p>
                    <p className="text-xs text-muted-foreground">Snap & list instantly</p>
                  </div>
                </div>
              </Link>
              <Link href="/listings/new">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 flex items-center justify-center">
                    <PlusCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">Manual Listing</p>
                    <p className="text-xs text-muted-foreground">Create step by step</p>
                  </div>
                </div>
              </Link>
              <Link href="/analytics">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group">
                  <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">View Analytics</p>
                    <p className="text-xs text-muted-foreground">Track performance</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </StaggerItem>
      </StaggerContainer>

      {/* Listings section — wrapped in card like Donezo */}
      <FadeInUp delay={0.3}>
        <div className="bg-card rounded-2xl ring-1 ring-border/40 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-[15px] font-semibold">Your Listings</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 rounded-xl h-9 border-border/50 text-sm"
                />
              </div>
              <div className="flex gap-0.5 bg-muted/40 rounded-xl p-0.5">
                {[
                  { label: "All", value: null },
                  { label: "Draft", value: "draft" },
                  { label: "Active", value: "active" },
                  { label: "Sold", value: "sold" },
                ].map((f) => (
                  <button
                    key={f.label}
                    onClick={() => setFilterStatus(f.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
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
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="rounded-2xl border-dashed border-2 border-border/30"
            >
              <div className="py-14 text-center">
                <motion.div
                  className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="text-base font-semibold mb-2">
                  {listings.length === 0 ? "Create your first listing" : "No listings match your search"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto mb-5">
                  {listings.length === 0
                    ? "Add a product and let AI optimize it for Depop, Grailed, Poshmark, and Mercari in seconds."
                    : "Try adjusting your search or filters."}
                </p>
                {listings.length === 0 && (
                  <Link href="/listings/new">
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
                      <Button className="bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 rounded-2xl h-10 px-5 font-semibold text-sm">
                        <Zap className="h-4 w-4 mr-2" />
                        Create Listing
                      </Button>
                    </motion.div>
                  </Link>
                )}
              </div>
            </motion.div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((listing) => (
                <StaggerItem key={listing.id}>
                  <Link href={`/listings/${listing.id}`}>
                    <motion.div
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Card className="group overflow-hidden cursor-pointer rounded-2xl ring-border/40 transition-shadow hover:shadow-lg">
                        <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                          {listing.images[0] ? (
                            <Image
                              src={listing.images[0].path}
                              alt={listing.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Package className="h-12 w-12 text-muted-foreground/20" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <Badge variant="outline" className={`${statusStyles[listing.status] || ""} backdrop-blur-sm`}>
                              {listing.status}
                            </Badge>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent p-4 pt-10">
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
                    </motion.div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </FadeInUp>
    </div>
  );
}
