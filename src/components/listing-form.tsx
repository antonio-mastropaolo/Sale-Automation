"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ImageUploader } from "@/components/image-uploader";
import { Loader2, Sparkles, Zap, Tag, DollarSign, Ruler, ShieldCheck, Package } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

const CATEGORIES = [
  "Tops",
  "Bottoms",
  "Outerwear",
  "Footwear",
  "Accessories",
  "Dresses",
  "Activewear",
  "Bags",
  "Jewelry",
  "Streetwear",
  "Vintage",
  "Designer",
  "Sportswear",
  "Other",
];

const CONDITIONS = ["New with tags", "Like new", "Good", "Fair", "Poor"];

export function ListingForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    brand: "",
    size: "",
    condition: "Good",
    price: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const enhanceDescription = async () => {
    if (!form.description.trim()) {
      toast.error("Enter some notes first");
      return;
    }
    setEnhancing(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance",
          description: form.description,
          category: form.category,
          brand: form.brand,
        }),
      });
      const data = await res.json();
      if (data.description) {
        updateField("description", data.description);
        toast.success("Description enhanced by AI");
      }
    } catch {
      toast.error("Failed to enhance — check your API key");
    }
    setEnhancing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.category || !form.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      images.forEach((img) => formData.append("images", img));

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
    setSubmitting(false);
  };

  const filled = [form.title, form.description, form.category, form.price].filter(Boolean).length;
  const progress = Math.round((filled / 4) * 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Completion</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Images first — visual impact */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Photos</Label>
        <p className="text-sm text-muted-foreground">Add up to 8 photos. First photo will be the cover image.</p>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-base font-semibold">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Vintage Nike Windbreaker Jacket 90s Colorblock"
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          className="h-11"
        />
      </div>

      {/* Description with AI enhance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-base font-semibold">
            Description <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enhanceDescription}
            disabled={enhancing}
            className="text-primary border-primary/30 hover:bg-primary/5"
          >
            {enhancing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            AI Enhance
          </Button>
        </div>
        <Textarea
          id="description"
          placeholder="Write rough notes — AI will polish them into a professional listing. Include details like measurements, flaws, materials..."
          rows={6}
          value={form.description}
          onChange={(e) => updateField("description", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Tip: The more details you include, the better the AI optimization will be.
        </p>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            Category <span className="text-destructive">*</span>
          </Label>
          <Select value={form.category} onValueChange={(v) => updateField("category", v ?? "")}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select category" />
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
          <Label htmlFor="brand" className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            Brand
          </Label>
          <Input
            id="brand"
            placeholder="e.g., Nike, Supreme, Vintage"
            value={form.brand}
            onChange={(e) => updateField("brand", e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="size" className="flex items-center gap-1.5">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            Size
          </Label>
          <Input
            id="size"
            placeholder="e.g., M, 10, 32x30, OS"
            value={form.size}
            onChange={(e) => updateField("size", e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            Condition
          </Label>
          <Select value={form.condition} onValueChange={(v) => updateField("condition", v ?? "Good")}>
            <SelectTrigger className="h-11">
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

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price" className="flex items-center gap-1.5 text-base font-semibold">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Price <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            className="pl-8 h-12 text-lg font-medium"
          />
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        className="w-full h-12 text-base bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
        disabled={submitting}
      >
        {submitting ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <Zap className="h-5 w-5 mr-2" />
        )}
        Create Listing
      </Button>
    </form>
  );
}
