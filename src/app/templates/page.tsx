"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Plus,
  FileText,
  Trash2,
  ArrowRight,
  Tag,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
} from "@/components/motion";

// ── Types ────────────────────────────────────────────────────────────

interface Template {
  id: string;
  name: string;
  category: string;
  brand: string;
  condition: string;
  description: string;
  tags: string;
  platforms: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

const CONDITIONS = ["New with tags", "Like new", "Good", "Fair", "Poor"];
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
  "Other",
];

function parseTags(tagsStr: string): string[] {
  try {
    const parsed = JSON.parse(tagsStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ═════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data);
    } catch {
      toast.error("Failed to load templates");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const useTemplate = (template: Template) => {
    const params = new URLSearchParams();
    if (template.name) params.set("title", template.name);
    if (template.category) params.set("category", template.category);
    if (template.brand) params.set("brand", template.brand);
    if (template.condition) params.set("condition", template.condition);
    if (template.description) params.set("description", template.description);
    const tags = parseTags(template.tags);
    if (tags.length > 0) params.set("tags", tags.join(","));
    router.push(`/listings/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Templates</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Pre-filled listing blueprints — fill in the [BRACKETS] and publish in seconds
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button size="sm" />}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Template
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Create Template
                </DialogTitle>
              </DialogHeader>
              <CreateTemplateForm
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchTemplates();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </FadeInUp>

      {/* How templates work */}
      <div className="rounded-xl bg-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold mb-2">How templates work</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          Templates are pre-written listing descriptions with placeholder fields in <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">[BRACKETS]</code>.
          Click &quot;Use Template&quot; to start a new listing with the template pre-filled — just replace the brackets with your item&apos;s details and you&apos;re ready to publish across all 8 platforms.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="bg-muted px-2 py-1 rounded-md">[BRAND] = item brand</span>
          <span className="bg-muted px-2 py-1 rounded-md">[SIZE] = size info</span>
          <span className="bg-muted px-2 py-1 rounded-md">[COLOR] = colorway</span>
          <span className="bg-muted px-2 py-1 rounded-md">[MODEL] = model name</span>
          <span className="bg-muted px-2 py-1 rounded-md">___&quot; = measurements</span>
        </div>
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <FadeInUp delay={0.1}>
          <Card className="border-0 shadow-sm">
            <CardContent className="py-20">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-5 rounded-2xl bg-muted/30 mb-5">
                  <FileText className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="font-semibold text-lg">No templates yet</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Create a template with pre-filled fields to speed up your
                  listing workflow. Templates let you save common categories,
                  brands, and descriptions.
                </p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger render={<Button className="mt-5" size="sm" />}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Create Your First Template
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Create Template
                      </DialogTitle>
                    </DialogHeader>
                    <CreateTemplateForm
                      onSuccess={() => {
                        setDialogOpen(false);
                        fetchTemplates();
                      }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const tags = parseTags(template.tags);
            return (
              <StaggerItem key={template.id}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow group">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{template.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {template.category && (
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      )}
                      {template.brand && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                        >
                          {template.brand}
                        </Badge>
                      )}
                      {template.condition && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                        >
                          {template.condition}
                        </Badge>
                      )}
                    </div>

                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/70"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                        {tags.length > 5 && (
                          <span className="text-xs text-muted-foreground/50">
                            +{tags.length - 5} more
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => useTemplate(template)}
                    >
                      Use Template
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// CREATE TEMPLATE FORM
// ═════════════════════════════════════════════════════════════════════

function CreateTemplateForm({ onSuccess }: { onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    brand: "",
    condition: "Good",
    description: "",
    tags: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    setSaving(true);
    try {
      const tagsArray = form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          brand: form.brand.trim(),
          condition: form.condition,
          description: form.description.trim(),
          tags: tagsArray,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Template created");
      onSuccess();
    } catch {
      toast.error("Failed to create template");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="e.g., Vintage Outerwear"
          className="h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.slice(0, 6).map((c) => (
              <button
                key={c}
                onClick={() => update("category", form.category === c ? "" : c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  form.category === c
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label>Condition</Label>
          <div className="flex flex-wrap gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => update("condition", c)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  form.condition === c
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Brand</Label>
        <Input
          value={form.brand}
          onChange={(e) => update("brand", e.target.value)}
          placeholder="e.g., Nike, Carhartt"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Default description text for listings using this template..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <Input
          value={form.tags}
          onChange={(e) => update("tags", e.target.value)}
          placeholder="vintage, streetwear, 90s (comma-separated)"
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">
          Separate tags with commas
        </p>
      </div>

      <Button className="w-full h-11" onClick={submit} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Create Template
      </Button>
    </div>
  );
}
