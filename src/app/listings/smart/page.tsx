"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Sparkles,
  Loader2,
  Camera,
  Tag,
  DollarSign,
  Hash,
  Zap,
  TrendingUp,
  ArrowRight,
  RotateCcw,
  Package,
  Palette,
  Shirt,
  ShieldCheck,
  Ruler,
  Target,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { platformBadge, confidenceColor, confidenceBg } from "@/lib/colors";

const CATEGORIES = [
  "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
  "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
  "Vintage", "Designer", "Sportswear", "Other",
];

const CONDITIONS = ["New with tags", "Like new", "Good", "Fair", "Poor"];

const platformLabels: Record<string, string> = {
  depop: "Depop",
  grailed: "Grailed",
  poshmark: "Poshmark",
  mercari: "Mercari",
};

interface SmartListResult {
  item_type: string;
  brand: string;
  model: string | null;
  category: string;
  size: string | null;
  condition: string;
  colors: string[];
  material: string | null;
  era: string | null;
  title: string;
  description: string;
  price_suggestion: {
    low: number;
    mid: number;
    high: number;
    currency: string;
  };
  hashtags: {
    depop: string[];
    poshmark: string[];
    mercari: string[];
  };
  style_keywords: string[];
  confidence_score: number;
}

export default function SmartListerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SmartListResult | null>(null);
  const [creating, setCreating] = useState(false);

  // Editable fields (populated from AI, user can override)
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editCondition, setEditCondition] = useState("Good");
  const [selectedPrice, setSelectedPrice] = useState<"low" | "mid" | "high">("mid");

  const handleFile = useCallback(
    (file: File) => {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please upload a JPEG, PNG, WebP, or GIF image");
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image too large. Maximum size is 20MB.");
        return;
      }

      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setResult(null);

      // Immediately start analysis
      analyzeImage(file);
    },
    []
  );

  const analyzeImage = async (file: File) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ai/smart-list", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }

      const data: SmartListResult = await res.json();
      setResult(data);

      // Populate editable fields
      setEditTitle(data.title);
      setEditDescription(data.description);
      setEditCategory(data.category);
      setEditBrand(data.brand || "");
      setEditSize(data.size || "");
      setEditCondition(data.condition);
      setSelectedPrice("mid");

      toast.success("Item identified successfully!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to analyze image"
      );
    }
    setAnalyzing(false);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setAnalyzing(false);
    setEditTitle("");
    setEditDescription("");
    setEditCategory("");
    setEditBrand("");
    setEditSize("");
    setEditCondition("Good");
    setSelectedPrice("mid");
  };

  const handleCreateListing = async () => {
    if (!editTitle || !editDescription || !editCategory) {
      toast.error("Please fill in title, description, and category");
      return;
    }

    const price = result
      ? result.price_suggestion[selectedPrice]
      : 0;

    if (!price) {
      toast.error("Please select a price");
      return;
    }

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("title", editTitle);
      formData.append("description", editDescription);
      formData.append("category", editCategory);
      formData.append("brand", editBrand);
      formData.append("size", editSize);
      formData.append("condition", editCondition);
      formData.append("price", price.toString());
      if (imageFile) {
        formData.append("images", imageFile);
      }

      const res = await fetch("/api/listings", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to create listing");
      const listing = await res.json();
      toast.success("Listing created!");
      router.push(`/listings/${listing.id}`);
    } catch {
      toast.error("Failed to create listing");
    }
    setCreating(false);
  };

  const getConfidenceColor = confidenceColor;
  const getConfidenceBg = confidenceBg;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
          <Sparkles className="h-4 w-4" />
          AI-Powered
        </div>
        <h1 className="text-3xl font-bold">Smart Lister</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Upload a photo and let AI identify your item, generate a complete
          listing, and suggest pricing in seconds.
        </p>
      </div>

      {/* Upload Zone */}
      {!imagePreview && !analyzing && (
        <Card className="border-2 border-dashed border-muted-foreground/20 shadow-none bg-transparent">
          <CardContent className="py-0">
            <div
              className={`flex flex-col items-center justify-center py-20 cursor-pointer rounded-xl transition-all ${
                dragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "hover:bg-muted/30"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-md">
                <Camera className="h-10 w-10 text-primary-foreground" />
              </div>
              <p className="text-xl font-semibold mb-2">
                {dragging ? "Drop your photo here" : "Upload a photo to get started"}
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Drag and drop or click to browse. PNG, JPG, WebP up to 20MB.
              </p>
              <Button
                type="button"
                className="bg-primary text-primary-foreground shadow-md hover:shadow-lg"
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyzing State */}
      {analyzing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image preview while analyzing */}
            <Card className="border-0 shadow-sm overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {imagePreview && (
                  <Image
                    src={imagePreview}
                    alt="Uploaded item"
                    fill
                    className="object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="relative mx-auto mb-4">
                      <div className="w-16 h-16 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                      <Sparkles className="h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-lg font-semibold mb-1">AI is analyzing your item...</p>
                    <p className="text-white/70 text-sm">
                      Identifying brand, condition, and generating your listing
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Skeleton loading cards */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  <div className="h-6 bg-muted rounded-lg animate-pulse w-3/4" />
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
                    <div className="h-6 w-20 bg-muted rounded-full animate-pulse" />
                    <div className="h-6 w-14 bg-muted rounded-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6 space-y-3">
                  <div className="h-5 bg-muted rounded animate-pulse w-1/3" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-20 bg-muted rounded-xl animate-pulse" />
                    <div className="h-20 bg-muted rounded-xl animate-pulse" />
                    <div className="h-20 bg-muted rounded-xl animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && imagePreview && !analyzing && (
        <div className="space-y-6">
          {/* Top row: Image + AI attributes + Editable title/description */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image with attribute badges */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  <Image
                    src={imagePreview}
                    alt={result.title}
                    fill
                    className="object-cover"
                  />
                  {/* Overlaid badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    {result.brand && result.brand !== "Unbranded" && (
                      <Badge className="bg-black/70 text-white backdrop-blur-sm border-0 shadow-md">
                        <Package className="h-3 w-3 mr-1" />
                        {result.brand}
                      </Badge>
                    )}
                    <Badge className="bg-black/70 text-white backdrop-blur-sm border-0 shadow-md">
                      <Tag className="h-3 w-3 mr-1" />
                      {result.category}
                    </Badge>
                    <Badge className="bg-black/70 text-white backdrop-blur-sm border-0 shadow-md">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {result.condition}
                    </Badge>
                  </div>
                  {/* Confidence badge */}
                  <div className="absolute top-3 right-3">
                    <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 text-center shadow-md">
                      <div className={`text-lg font-bold ${getConfidenceColor(result.confidence_score)}`}>
                        {result.confidence_score}%
                      </div>
                      <div className="text-[10px] text-white/70 font-medium uppercase tracking-wide">
                        Confidence
                      </div>
                    </div>
                  </div>
                  {/* Bottom gradient with item info */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                    <div className="flex flex-wrap gap-1.5">
                      {result.colors.map((color) => (
                        <Badge
                          key={color}
                          variant="outline"
                          className="bg-white/15 text-white border-white/25 backdrop-blur-sm text-xs"
                        >
                          <Palette className="h-3 w-3 mr-1" />
                          {color}
                        </Badge>
                      ))}
                      {result.material && (
                        <Badge
                          variant="outline"
                          className="bg-white/15 text-white border-white/25 backdrop-blur-sm text-xs"
                        >
                          <Shirt className="h-3 w-3 mr-1" />
                          {result.material}
                        </Badge>
                      )}
                      {result.era && (
                        <Badge
                          variant="outline"
                          className="bg-white/15 text-white border-white/25 backdrop-blur-sm text-xs"
                        >
                          {result.era}
                        </Badge>
                      )}
                      {result.size && (
                        <Badge
                          variant="outline"
                          className="bg-white/15 text-white border-white/25 backdrop-blur-sm text-xs"
                        >
                          <Ruler className="h-3 w-3 mr-1" />
                          {result.size}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Confidence bar */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      AI Confidence Score
                    </span>
                    <span className={`text-sm font-bold ${getConfidenceColor(result.confidence_score)}`}>
                      {result.confidence_score}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getConfidenceBg(result.confidence_score)}`}
                      style={{ width: `${result.confidence_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {result.confidence_score >= 80
                      ? "High confidence -- AI is very sure about this identification."
                      : result.confidence_score >= 60
                        ? "Moderate confidence -- review the details and adjust if needed."
                        : "Low confidence -- please review and correct the generated details."}
                  </p>
                </CardContent>
              </Card>

              {/* Reset button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Analyze a Different Item
              </Button>
            </div>

            {/* Right: Editable fields */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Generated Listing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smart-title" className="text-sm font-medium">
                      Title
                    </Label>
                    <Input
                      id="smart-title"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smart-description" className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id="smart-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={8}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        Category
                      </Label>
                      <Select
                        value={editCategory}
                        onValueChange={(v) => setEditCategory(v ?? "")}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smart-brand" className="text-sm font-medium flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        Brand
                      </Label>
                      <Input
                        id="smart-brand"
                        value={editBrand}
                        onChange={(e) => setEditBrand(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smart-size" className="text-sm font-medium flex items-center gap-1.5">
                        <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
                        Size
                      </Label>
                      <Input
                        id="smart-size"
                        value={editSize}
                        onChange={(e) => setEditSize(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                        Condition
                      </Label>
                      <Select
                        value={editCondition}
                        onValueChange={(v) => setEditCondition(v ?? "Good")}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Price Suggestion */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Suggested Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(["low", "mid", "high"] as const).map((tier) => {
                  const price = result.price_suggestion[tier];
                  const labels = {
                    low: { name: "Quick Sale", desc: "Sell fast, competitive price", icon: Zap },
                    mid: { name: "Fair Value", desc: "Market rate, balanced approach", icon: TrendingUp },
                    high: { name: "Premium", desc: "Maximum value, patient seller", icon: Target },
                  };
                  const info = labels[tier];
                  const Icon = info.icon;
                  const isSelected = selectedPrice === tier;

                  return (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedPrice(tier)}
                      className={`relative rounded-xl p-5 text-left transition-all ${
                        isSelected
                          ? "ring-2 ring-primary bg-primary/5 shadow-md"
                          : "bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-muted-foreground/10"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                        {info.name}
                      </p>
                      <p className="text-2xl font-bold">
                        ${price}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {info.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Platform Hashtags */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Hash className="h-4 w-4 text-primary" />
                Platform Hashtags
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {(Object.keys(result.hashtags) as Array<keyof typeof result.hashtags>).map(
                (platform) => {
                  const tags = result.hashtags[platform];
                  if (!tags || tags.length === 0) return null;
                  return (
                    <div key={platform}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Badge
                          variant="outline"
                          className={platformBadge[platform] || ""}
                        >
                          {platformLabels[platform] || platform}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${platformBadge[platform] || "bg-muted text-muted-foreground"}`}
                          >
                            #{tag.replace(/^#/, "")}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                }
              )}
            </CardContent>
          </Card>

          {/* Style Keywords */}
          {result.style_keywords && result.style_keywords.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  Style Keywords
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.style_keywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="outline"
                      className="bg-primary/5 text-primary border-primary/20"
                    >
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create Listing Button */}
          <div className="sticky bottom-4 z-10">
            <Card className="border-0 shadow-lg sf-surface sf-blur">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{editTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      ${result.price_suggestion[selectedPrice]} &middot; {editCategory} &middot; {editCondition}
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateListing}
                    disabled={creating}
                    className="bg-primary text-primary-foreground shadow-md hover:shadow-lg h-12 px-8 text-base shrink-0"
                  >
                    {creating ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <ArrowRight className="h-5 w-5 mr-2" />
                    )}
                    Create Listing
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
