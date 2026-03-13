"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlatformPreview } from "@/components/platform-preview";
import { HealthScore } from "@/components/health-score";
import { PriceIntel } from "@/components/price-intel";
import { NegotiateCopilot } from "@/components/negotiate-copilot";
import {
  Loader2,
  Sparkles,
  ArrowLeft,
  Copy,
  Trash2,
  Tag,
  Ruler,
  ShieldCheck,
  DollarSign,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { statusStyles } from "@/lib/colors";

interface ListingImage {
  id: string;
  path: string;
  order: number;
}

interface PlatformListingData {
  id: string;
  platform: string;
  optimizedTitle: string;
  optimizedDescription: string;
  hashtags: string;
  suggestedPrice: number | null;
  status: string;
  platformUrl: string | null;
}

interface ListingData {
  id: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  size: string;
  condition: string;
  price: number;
  status: string;
  createdAt: string;
  images: ListingImage[];
  platformListings: PlatformListingData[];
}

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [listing, setListing] = useState<ListingData | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchListing = () => {
    fetch(`/api/listings/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Listing not found");
        return r.json();
      })
      .then(setListing)
      .catch(() => {
        toast.error("Failed to load listing");
        router.push("/");
      });
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

  const optimize = async () => {
    setOptimizing(true);
    try {
      const res = await fetch(`/api/listings/${id}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      toast.success("AI optimization complete");
      fetchListing();
    } catch {
      toast.error("Optimization failed — check your OpenAI API key");
    }
    setOptimizing(false);
  };

  const publish = async (platform: string) => {
    setPublishingPlatform(platform);
    try {
      const res = await fetch(`/api/listings/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Published to ${platform}`);
      fetchListing();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publishing failed");
    }
    setPublishingPlatform(null);
  };

  const deleteListing = async () => {
    if (!confirm("Are you sure you want to delete this listing?")) return;
    try {
      await fetch(`/api/listings/${id}`, { method: "DELETE" });
      toast.success("Listing deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const duplicateListing = async () => {
    if (!listing) return;
    try {
      const formData = new FormData();
      formData.append("title", listing.title + " (Copy)");
      formData.append("description", listing.description);
      formData.append("category", listing.category);
      formData.append("brand", listing.brand);
      formData.append("size", listing.size);
      formData.append("condition", listing.condition);
      formData.append("price", listing.price.toString());
      const res = await fetch("/api/listings", { method: "POST", body: formData });
      const newListing = await res.json();
      toast.success("Listing duplicated");
      router.push(`/listings/${newListing.id}`);
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  if (!listing) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading listing...</p>
        </div>
      </div>
    );
  }

  const details = [
    { icon: DollarSign, label: "Price", value: `$${listing.price.toFixed(2)}` },
    { icon: Tag, label: "Category", value: listing.category },
    ...(listing.brand ? [{ icon: Package, label: "Brand", value: listing.brand }] : []),
    ...(listing.size ? [{ icon: Ruler, label: "Size", value: listing.size }] : []),
    { icon: ShieldCheck, label: "Condition", value: listing.condition },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{listing.title}</h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <Badge variant="outline" className={statusStyles[listing.status] || ""}>
            {listing.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={duplicateListing}>
            <Copy className="h-4 w-4 mr-1" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={deleteListing} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — images + details */}
        <div className="lg:col-span-1 space-y-4">
          {listing.images.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden border shadow-sm">
                <Image
                  src={listing.images[selectedImage]?.path || listing.images[0].path}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
              </div>
              {listing.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {listing.images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImage(i)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        i === selectedImage ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <Image src={img.path} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square rounded-xl border-2 border-dashed flex items-center justify-center bg-muted/30">
              <div className="text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No images</p>
              </div>
            </div>
          )}

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
              <Separator />
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {listing.description}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right column — platform previews */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Platform Listings</h2>
              <p className="text-sm text-muted-foreground">
                {listing.platformListings.length > 0
                  ? `Optimized for ${listing.platformListings.length} platform${listing.platformListings.length > 1 ? "s" : ""}`
                  : "Generate AI-optimized versions for each marketplace"}
              </p>
            </div>
            <Button
              onClick={optimize}
              disabled={optimizing}
              className={listing.platformListings.length === 0 ? "bg-primary text-primary-foreground shadow-md" : ""}
            >
              {optimizing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {listing.platformListings.length > 0 ? "Re-optimize" : "Optimize with AI"}
            </Button>
          </div>

          {listing.platformListings.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="py-16 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">AI Optimization</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Our AI will tailor your listing for each platform — adjusting tone, hashtags, pricing, and descriptions to maximize visibility and sales.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listing.platformListings.map((pl) => (
                <PlatformPreview
                  key={pl.id}
                  platform={pl.platform}
                  title={pl.optimizedTitle}
                  description={pl.optimizedDescription}
                  hashtags={(() => {
                    try { return JSON.parse(pl.hashtags || "[]"); } catch { return []; }
                  })()}
                  suggestedPrice={pl.suggestedPrice}
                  status={pl.status}
                  platformUrl={pl.platformUrl}
                  onPublish={() => publish(pl.platform)}
                  publishing={publishingPlatform === pl.platform}
                />
              ))}
            </div>
          )}

          {/* AI Intelligence Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <HealthScore listingId={listing.id} />
            <PriceIntel
              title={listing.title}
              brand={listing.brand}
              category={listing.category}
              condition={listing.condition}
              size={listing.size}
              currentPrice={listing.price}
            />
          </div>

          {/* Negotiation Copilot */}
          <NegotiateCopilot
            itemTitle={listing.title}
            itemPrice={listing.price}
            itemDescription={listing.description}
          />
        </div>
      </div>
    </div>
  );
}
