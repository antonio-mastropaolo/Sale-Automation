"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProfitCalculator } from "@/components/profit-calculator";
import { Loader2, Sparkles, Hash, Copy, Check, Calculator, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { platformBadge } from "@/lib/colors";

export default function ToolsPage() {
  // Hashtag generator state
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtags, setHashtags] = useState<Record<string, string[]>>({});
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  // Description writer state
  const [descNotes, setDescNotes] = useState("");
  const [descBrand, setDescBrand] = useState("");
  const [descCategory, setDescCategory] = useState("");
  const [generatedDesc, setGeneratedDesc] = useState("");
  const [loadingDesc, setLoadingDesc] = useState(false);

  const generateHashtags = async () => {
    if (!hashtagInput.trim()) {
      toast.error("Enter a product description first");
      return;
    }
    setLoadingHashtags(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "optimize",
          title: hashtagInput,
          description: hashtagInput,
          category: "",
          brand: "",
          size: "",
          condition: "Good",
          price: 50,
        }),
      });
      const data = await res.json();
      const result: Record<string, string[]> = {};
      if (Array.isArray(data)) {
        data.forEach((d: { platform: string; hashtags: string[] }) => {
          result[d.platform] = d.hashtags || [];
        });
      }
      setHashtags(result);
      toast.success("Hashtags generated");
    } catch {
      toast.error("Failed to generate hashtags");
    }
    setLoadingHashtags(false);
  };

  const copyHashtags = (platform: string, tags: string[]) => {
    navigator.clipboard.writeText(tags.map((t) => `#${t}`).join(" "));
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
    toast.success("Copied to clipboard");
  };

  const generateDescription = async () => {
    if (!descNotes.trim()) {
      toast.error("Enter some notes first");
      return;
    }
    setLoadingDesc(true);
    try {
      const res = await fetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enhance",
          description: descNotes,
          category: descCategory,
          brand: descBrand,
        }),
      });
      const data = await res.json();
      if (data.description) {
        setGeneratedDesc(data.description);
        toast.success("Description generated");
      }
    } catch {
      toast.error("Failed to generate description");
    }
    setLoadingDesc(false);
  };

  const platformColors = platformBadge;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Seller Tools</h1>
        <p className="text-muted-foreground text-sm">Free tools to boost your reselling game</p>
      </div>

      {/* Profit Calculator */}
      <ProfitCalculator />

      {/* Hashtag Generator */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Hashtag Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Describe your product</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., vintage Nike windbreaker 90s colorblock jacket"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                className="h-11"
                onKeyDown={(e) => e.key === "Enter" && generateHashtags()}
              />
              <Button onClick={generateHashtags} disabled={loadingHashtags} className="h-11 shrink-0">
                {loadingHashtags ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate
              </Button>
            </div>
          </div>

          {Object.keys(hashtags).length > 0 && (
            <div className="space-y-3">
              {Object.entries(hashtags).map(([platform, tags]) => (
                <div key={platform} className="flex items-start gap-3 p-3 bg-muted/30 rounded-xl">
                  <Badge variant="outline" className={platformColors[platform] || ""}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </Badge>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span key={tag} className="text-sm text-muted-foreground">#{tag}</span>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyHashtags(platform, tags)}
                    className="shrink-0"
                  >
                    {copiedPlatform === platform ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Description Writer */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Description Writer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                placeholder="e.g., Nike"
                value={descBrand}
                onChange={(e) => setDescBrand(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                placeholder="e.g., Outerwear"
                value={descCategory}
                onChange={(e) => setDescCategory(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Your rough notes</Label>
            <Textarea
              placeholder="Just jot down anything about the item — condition, measurements, flaws, materials, where you got it..."
              rows={4}
              value={descNotes}
              onChange={(e) => setDescNotes(e.target.value)}
            />
          </div>
          <Button onClick={generateDescription} disabled={loadingDesc}>
            {loadingDesc ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate Description
          </Button>
          {generatedDesc && (
            <div className="relative p-4 bg-muted/30 rounded-xl">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{generatedDesc}</p>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(generatedDesc);
                  toast.success("Copied to clipboard");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
