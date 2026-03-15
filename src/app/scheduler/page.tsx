"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion";
import {
  Calendar,
  Clock,
  Send,
  XCircle,
  Plus,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { platformBranding, platformBadge } from "@/lib/colors";

/* ── Types ── */
interface Listing {
  id: string;
  title: string;
  brand?: string;
}

interface ScheduledPost {
  id: string;
  listingId: string;
  listingTitle: string;
  platform: string;
  scheduledAt: string;
  status: "pending" | "posted" | "failed" | "cancelled";
}

/* ── Best times data ── */
const bestTimes: {
  platform: string;
  times: string;
  icon: string;
}[] = [
  {
    platform: "depop",
    times: "Evenings 7-9pm, Sunday afternoons",
    icon: "D",
  },
  {
    platform: "grailed",
    times: "Weekday mornings 9-11am",
    icon: "G",
  },
  {
    platform: "poshmark",
    times: "Posh Parties times, 12pm & 7pm",
    icon: "P",
  },
  {
    platform: "mercari",
    times: "Evenings 6-8pm, Saturday mornings",
    icon: "M",
  },
  {
    platform: "ebay",
    times: "Sunday evenings 7-10pm, Thursday 6-9pm",
    icon: "e",
  },
];

/* ── Status badge styles ── */
const statusStyles: Record<string, string> = {
  pending:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700",
  posted:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700",
  failed:
    "bg-red-500/10 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700",
  cancelled:
    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700",
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function SchedulerPage() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  /* form state */
  const [listingSearch, setListingSearch] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<
    Record<string, boolean>
  >({
    depop: false,
    grailed: false,
    poshmark: false,
    mercari: false,
    ebay: false,
  });
  const [scheduledTime, setScheduledTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/scheduler");
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch("/api/listings");
      if (res.ok) {
        const data = await res.json();
        setListings(
          Array.isArray(data)
            ? data.map((l: Record<string, unknown>) => ({
                id: l.id as string,
                title: l.title as string,
                brand: (l.brand as string) ?? "",
              }))
            : []
        );
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchPosts(), fetchListings()]).finally(() =>
      setLoading(false)
    );
  }, [fetchPosts, fetchListings]);

  const handleSchedule = async () => {
    if (!selectedListing) {
      toast.error("Select a listing");
      return;
    }
    const platforms = Object.entries(selectedPlatforms)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (platforms.length === 0) {
      toast.error("Select at least one platform");
      return;
    }
    if (!scheduledTime) {
      toast.error("Pick a date and time");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: selectedListing.id,
          platforms,
          scheduledAt: new Date(scheduledTime).toISOString(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Post scheduled!");
      setDialogOpen(false);
      resetForm();
      await fetchPosts();
    } catch {
      toast.error("Failed to schedule post");
    }
    setSubmitting(false);
  };

  const cancelPost = async (id: string) => {
    try {
      const res = await fetch(`/api/scheduler/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Post cancelled");
      setPosts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "cancelled" } : p))
      );
    } catch {
      toast.error("Failed to cancel post");
    }
  };

  const resetForm = () => {
    setSelectedListing(null);
    setListingSearch("");
    setSelectedPlatforms({
      depop: false,
      grailed: false,
      poshmark: false,
      mercari: false,
    });
    setScheduledTime("");
  };

  const filteredListings = listings.filter(
    (l) =>
      l.title.toLowerCase().includes(listingSearch.toLowerCase()) ||
      l.brand?.toLowerCase().includes(listingSearch.toLowerCase())
  );

  /* ── Grouped by date ── */
  const grouped = posts.reduce<Record<string, ScheduledPost[]>>((acc, p) => {
    const day = new Date(p.scheduledAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(p);
    return acc;
  }, {});

  const pendingCount = posts.filter((p) => p.status === "pending").length;

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <FadeInUp>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2.5 rounded-xl">
              <Calendar className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Post Scheduler</h1>
              <p className="text-muted-foreground text-sm">
                {pendingCount > 0
                  ? `${pendingCount} post${pendingCount > 1 ? "s" : ""} queued`
                  : "Schedule listings across platforms"}
              </p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button className="shadow-md" />}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Post
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule a Post</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Listing selector */}
                <div className="space-y-2">
                  <Label>Listing</Label>
                  {selectedListing ? (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                      <span className="text-sm font-medium truncate">
                        {selectedListing.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedListing(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search listings..."
                          value={listingSearch}
                          onChange={(e) => setListingSearch(e.target.value)}
                          className="h-10 pl-9"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border p-1">
                        {filteredListings.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-3">
                            No listings found
                          </p>
                        ) : (
                          filteredListings.slice(0, 20).map((l) => (
                            <button
                              key={l.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/50 transition-colors truncate"
                              onClick={() => {
                                setSelectedListing(l);
                                setListingSearch("");
                              }}
                            >
                              {l.title}
                              {l.brand && (
                                <span className="text-muted-foreground ml-1">
                                  ({l.brand})
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Platform selector */}
                <div className="space-y-2">
                  <Label>Platforms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      Object.keys(selectedPlatforms) as Array<
                        keyof typeof selectedPlatforms
                      >
                    ).map((platform) => {
                      const branding = platformBranding[platform];
                      return (
                        <label
                          key={platform}
                          className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-colors ${
                            selectedPlatforms[platform]
                              ? `${branding?.bg ?? "bg-muted"} ring-1 ${branding?.border ?? "ring-border/40"}`
                              : "bg-muted/30 hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedPlatforms[platform]}
                            onCheckedChange={(checked) =>
                              setSelectedPlatforms((prev) => ({
                                ...prev,
                                [platform]: !!checked,
                              }))
                            }
                          />
                          <span
                            className={`text-sm font-medium ${branding?.color ?? ""}`}
                          >
                            {branding?.label ?? platform}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Quick delay buttons */}
                <div className="space-y-2">
                  <Label>When to post</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      { label: "In 30 min", mins: 30 },
                      { label: "In 1 hour", mins: 60 },
                      { label: "In 3 hours", mins: 180 },
                      { label: "In 6 hours", mins: 360 },
                      { label: "Tomorrow 9am", mins: -1 },
                      { label: "Custom", mins: 0 },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          if (opt.mins === 0) return; // just show the datetime picker
                          let d: Date;
                          if (opt.mins === -1) {
                            d = new Date();
                            d.setDate(d.getDate() + 1);
                            d.setHours(9, 0, 0, 0);
                          } else {
                            d = new Date(Date.now() + opt.mins * 60_000);
                          }
                          const iso = d.toISOString().slice(0, 16);
                          setScheduledTime(iso);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          opt.mins === 0
                            ? "border border-border text-muted-foreground hover:bg-muted"
                            : "bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-80"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-11"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={handleSchedule}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </FadeInUp>

      {/* ── Best Times Suggestion ── */}
      <FadeInUp delay={0.05}>
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Best Posting Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {bestTimes.map((bt) => {
                const branding = platformBranding[bt.platform];
                return (
                  <div
                    key={bt.platform}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg ${branding?.bg ?? "bg-muted"} ${
                        branding?.color ?? "text-foreground"
                      } flex items-center justify-center font-bold text-sm`}
                    >
                      {bt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          branding?.color ?? ""
                        }`}
                      >
                        {branding?.label ?? bt.platform}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {bt.times}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </FadeInUp>

      {/* ── Scheduled Posts ── */}
      <FadeInUp delay={0.1}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Scheduled Posts
          </h2>

          {posts.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No scheduled posts yet. Tap &quot;Schedule Post&quot; to get
                  started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <StaggerContainer className="space-y-6">
              {Object.entries(grouped).map(([day, dayPosts]) => (
                <StaggerItem key={day}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        {day}
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {dayPosts.map((post) => {
                        const branding = platformBranding[post.platform];
                        const time = new Date(
                          post.scheduledAt
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <Card
                            key={post.id}
                            className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                          >
                            <div
                              className={`h-1 ${branding?.accent ?? "bg-muted"}`}
                            />
                            <CardContent className="py-3 flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg ${
                                  branding?.bg ?? "bg-muted"
                                } ${
                                  branding?.color ?? "text-foreground"
                                } flex items-center justify-center font-bold text-sm shrink-0`}
                              >
                                {branding?.icon ?? post.platform.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {post.listingTitle}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant="outline"
                                    className={
                                      platformBadge[post.platform] ?? ""
                                    }
                                  >
                                    {branding?.label ?? post.platform}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {time}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    statusStyles[post.status] ?? ""
                                  }`}
                                >
                                  {post.status}
                                </Badge>
                                {post.status === "pending" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => cancelPost(post.id)}
                                    className="text-muted-foreground hover:text-red-500"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      </FadeInUp>
    </div>
  );
}
