"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ImagePlus, Wand2, Sparkles, Download, RotateCcw,
  Layers, Crop, Contrast, PaintBucket,
  Maximize2, Grid3X3, Shield, Camera,
  Check, X, Loader2, Copy, Palette,
  SunMedium, Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Types ──

interface PhotoFile {
  id: string;
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
  editedUrl?: string;
}

type Tool =
  | "select"
  | "bg-remove"
  | "bg-replace"
  | "enhance"
  | "crop"
  | "watermark"
  | "flatlay"
  | "resize"
  | "adjust"
  | "batch";

interface ToolDef {
  id: Tool;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const TOOLS: ToolDef[] = [
  { id: "bg-remove", label: "Remove Background", description: "AI removes the background, leaving just the product", icon: Layers, badge: "AI" },
  { id: "bg-replace", label: "Replace Background", description: "Swap background with studio white, gradient, or lifestyle scene", icon: PaintBucket, badge: "AI" },
  { id: "enhance", label: "Auto Enhance", description: "AI adjusts brightness, contrast, sharpness, and color balance", icon: Sparkles, badge: "AI" },
  { id: "flatlay", label: "Flatlay Generator", description: "AI arranges your product in a professional flatlay composition", icon: Grid3X3, badge: "AI" },
  { id: "crop", label: "Smart Crop", description: "Auto-crop to platform-optimal ratios (1:1, 4:5, 3:4)", icon: Crop },
  { id: "resize", label: "Multi-Platform Resize", description: "Generate optimized sizes for every marketplace at once", icon: Maximize2 },
  { id: "watermark", label: "Watermark", description: "Add your brand watermark to protect photos", icon: Shield },
  { id: "adjust", label: "Manual Adjust", description: "Fine-tune brightness, contrast, saturation, warmth", icon: Sun },
  { id: "batch", label: "Batch Process", description: "Apply the same edits to all uploaded photos at once", icon: Copy, badge: "PRO" },
];

const BG_PRESETS = [
  { id: "white", label: "Pure White", color: "#ffffff" },
  { id: "offwhite", label: "Off White", color: "#f5f5f0" },
  { id: "lightgray", label: "Light Gray", color: "#e8e8e8" },
  { id: "gradient-blue", label: "Blue Gradient", color: "linear-gradient(180deg, #e0f2fe, #bfdbfe)" },
  { id: "gradient-warm", label: "Warm Gradient", color: "linear-gradient(180deg, #fef3c7, #fde68a)" },
  { id: "gradient-pink", label: "Rose Gradient", color: "linear-gradient(180deg, #fce7f3, #fbcfe8)" },
  { id: "concrete", label: "Concrete", color: "#c4c4c4" },
  { id: "wood", label: "Light Wood", color: "#d4a574" },
  { id: "lifestyle", label: "AI Lifestyle", color: "linear-gradient(135deg, #f0f4f8, #d9e2ec)" },
];

const CROP_RATIOS = [
  { label: "1:1", w: 1, h: 1, desc: "Depop, Instagram" },
  { label: "4:5", w: 4, h: 5, desc: "Poshmark, Stories" },
  { label: "3:4", w: 3, h: 4, desc: "Grailed, Vinted" },
  { label: "16:9", w: 16, h: 9, desc: "eBay Banner" },
  { label: "Free", w: 0, h: 0, desc: "Custom" },
];

const PLATFORM_SIZES = [
  { platform: "Depop", size: "1080×1080", w: 1080, h: 1080 },
  { platform: "Poshmark", size: "1200×1500", w: 1200, h: 1500 },
  { platform: "Grailed", size: "1200×1600", w: 1200, h: 1600 },
  { platform: "eBay", size: "1600×1600", w: 1600, h: 1600 },
  { platform: "Mercari", size: "1080×1080", w: 1080, h: 1080 },
  { platform: "Vinted", size: "800×1067", w: 800, h: 1067 },
  { platform: "Facebook", size: "1200×1200", w: 1200, h: 1200 },
  { platform: "Vestiaire", size: "1000×1000", w: 1000, h: 1000 },
];

// ═══════════════════════════════════════════════════════════════

export default function PhotoStudioPage() {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [processing, setProcessing] = useState(false);
  const [selectedBg, setSelectedBg] = useState("white");
  const [selectedCrop, setSelectedCrop] = useState("1:1");
  const [adjustments, setAdjustments] = useState({ brightness: 100, contrast: 100, saturation: 100, warmth: 0 });
  const [watermarkText, setWatermarkText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePhoto = photos.find((p) => p.id === selectedPhoto);

  const handleUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const photo: PhotoFile = {
          id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          file, url, name: file.name,
          width: img.naturalWidth, height: img.naturalHeight,
        };
        setPhotos((prev) => [...prev, photo]);
        if (!selectedPhoto) setSelectedPhoto(photo.id);
      };
      img.src = url;
    });
  }, [selectedPhoto]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const simulateProcess = async (toolName: string) => {
    setProcessing(true);
    toast.info(`Processing: ${toolName}...`);
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    // In production, this would call an AI API (remove.bg, Photoroom, etc.)
    // For now, simulate by applying CSS filter to generate "edited" version
    if (activePhoto) {
      setPhotos((prev) => prev.map((p) => p.id === activePhoto.id ? { ...p, editedUrl: p.url } : p));
    }
    setProcessing(false);
    toast.success(`${toolName} complete`);
  };

  const downloadPhoto = () => {
    if (!activePhoto) return;
    const link = document.createElement("a");
    link.href = activePhoto.editedUrl || activePhoto.url;
    link.download = `listblitz-${activePhoto.name}`;
    link.click();
  };

  const downloadAll = () => {
    PLATFORM_SIZES.forEach((ps) => {
      toast.success(`Generated ${ps.platform} (${ps.size})`);
    });
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto === id) setSelectedPhoto(photos.find((p) => p.id !== id)?.id || null);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Photo Studio</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Professional product photography — background removal, enhancement, multi-platform export
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={downloadAll} disabled={photos.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export All Sizes
          </Button>
          <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-3.5 w-3.5" /> Upload Photos
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </div>

      {photos.length === 0 ? (
        /* ── Upload area ── */
        <div
          className="rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Upload Product Photos</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Drag & drop photos or click to browse. AI will help you create marketplace-ready images.
            </p>
            <div className="flex flex-wrap justify-center gap-2 text-[10px]">
              {["Background Removal", "Auto Enhancement", "Smart Crop", "8-Platform Export", "Watermarking", "Flatlay Generator"].map((f) => (
                <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Editor layout ── */
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-4" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
          {/* LEFT: Photo strip + tools */}
          <div className="space-y-4">
            {/* Photo strip */}
            <div className="rounded-xl bg-card border border-[var(--border)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold">Photos ({photos.length})</span>
                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-[var(--primary)] font-medium">+ Add</button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <button
                      onClick={() => setSelectedPhoto(photo.id)}
                      className={cn("w-full aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        selectedPhoto === photo.id ? "border-[var(--primary)] shadow-md" : "border-transparent hover:border-[var(--muted-foreground)]/20"
                      )}
                    >
                      <img src={photo.editedUrl || photo.url} alt="" className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tool list */}
            <div className="rounded-xl bg-card border border-[var(--border)] p-3 space-y-1">
              <span className="text-[12px] font-semibold block mb-2">Tools</span>
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setActiveTool(tool.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-[12px]",
                      isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm" : "hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 font-medium">{tool.label}</span>
                    {tool.badge && (
                      <Badge className={cn("text-[8px] px-1 py-0 h-3.5 border-0",
                        tool.badge === "AI" ? "bg-violet-500/20 text-violet-500" : "bg-amber-500/20 text-amber-500"
                      )}>{tool.badge}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CENTER: Main editor canvas */}
          <div className="space-y-4">
            {/* Canvas */}
            <div className="rounded-xl bg-card border border-[var(--border)] overflow-hidden">
              <div className="aspect-square max-h-[600px] bg-[repeating-conic-gradient(#80808012_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] flex items-center justify-center relative">
                {activePhoto ? (
                  <img
                    src={activePhoto.editedUrl || activePhoto.url}
                    alt={activePhoto.name}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">Select a photo</p>
                )}

                {processing && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white mb-2" />
                    <p className="text-white text-sm font-medium">Processing...</p>
                  </div>
                )}
              </div>

              {/* Photo info bar */}
              {activePhoto && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] text-[11px] text-muted-foreground">
                  <span>{activePhoto.name}</span>
                  <span>{activePhoto.width} × {activePhoto.height}px</span>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={downloadPhoto}>
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100, warmth: 0 })}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Reset
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Tool settings panel */}
          <div className="rounded-xl bg-card border border-[var(--border)] p-4 space-y-4">
            <h3 className="text-[13px] font-semibold">{TOOLS.find((t) => t.id === activeTool)?.label || "Select a tool"}</h3>
            <p className="text-[11px] text-muted-foreground">{TOOLS.find((t) => t.id === activeTool)?.description}</p>

            {/* Tool-specific controls */}
            {activeTool === "bg-remove" && (
              <div className="space-y-3">
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Background Removal")} disabled={processing || !activePhoto}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Remove Background
                </Button>
                <p className="text-[10px] text-muted-foreground">Uses AI to detect and remove the background, leaving a transparent product cutout.</p>
              </div>
            )}

            {activeTool === "bg-replace" && (
              <div className="space-y-3">
                <span className="text-[11px] font-medium">Choose Background</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {BG_PRESETS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBg(bg.id)}
                      className={cn("h-12 rounded-lg border-2 transition-all",
                        selectedBg === bg.id ? "border-[var(--primary)] shadow-sm" : "border-transparent hover:border-[var(--muted-foreground)]/20"
                      )}
                      style={{ background: bg.color }}
                      title={bg.label}
                    />
                  ))}
                </div>
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Background Replace")} disabled={processing || !activePhoto}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PaintBucket className="h-4 w-4" />}
                  Apply Background
                </Button>
              </div>
            )}

            {activeTool === "enhance" && (
              <div className="space-y-3">
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Auto Enhancement")} disabled={processing || !activePhoto}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Auto Enhance
                </Button>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {["Brightness", "Contrast", "Sharpness", "White Balance", "Noise Reduction", "Color Correction"].map((f) => (
                    <div key={f} className="flex items-center gap-1 px-2 py-1.5 rounded bg-muted/30">
                      <Check className="h-3 w-3 text-emerald-500" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTool === "crop" && (
              <div className="space-y-3">
                <span className="text-[11px] font-medium">Aspect Ratio</span>
                <div className="space-y-1">
                  {CROP_RATIOS.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setSelectedCrop(r.label)}
                      className={cn("w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-colors",
                        selectedCrop === r.label ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-muted"
                      )}
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] opacity-70">{r.desc}</span>
                    </button>
                  ))}
                </div>
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Smart Crop")} disabled={processing || !activePhoto}>
                  <Crop className="h-4 w-4" /> Apply Crop
                </Button>
              </div>
            )}

            {activeTool === "resize" && (
              <div className="space-y-3">
                <span className="text-[11px] font-medium">Platform Sizes</span>
                <div className="space-y-1">
                  {PLATFORM_SIZES.map((ps) => (
                    <div key={ps.platform} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 text-[12px]">
                      <span className="font-medium capitalize">{ps.platform}</span>
                      <span className="text-muted-foreground font-mono text-[10px]">{ps.size}</span>
                    </div>
                  ))}
                </div>
                <Button className="w-full h-10 gap-2" onClick={() => { simulateProcess("Multi-Platform Resize"); downloadAll(); }} disabled={processing || !activePhoto}>
                  <Maximize2 className="h-4 w-4" /> Generate All Sizes
                </Button>
              </div>
            )}

            {activeTool === "watermark" && (
              <div className="space-y-3">
                <Input value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} placeholder="Your brand name" className="h-9 text-[12px]" />
                <div className="flex gap-1.5">
                  {["Bottom Right", "Bottom Left", "Center", "Tiled"].map((pos) => (
                    <button key={pos} className="flex-1 px-2 py-1.5 rounded-md bg-muted text-[10px] font-medium hover:bg-[var(--primary)]/10 transition-colors">
                      {pos}
                    </button>
                  ))}
                </div>
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Watermark")} disabled={processing || !activePhoto || !watermarkText}>
                  <Shield className="h-4 w-4" /> Apply Watermark
                </Button>
              </div>
            )}

            {activeTool === "flatlay" && (
              <div className="space-y-3">
                <Button className="w-full h-10 gap-2" onClick={() => simulateProcess("Flatlay Generation")} disabled={processing || !activePhoto}>
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Grid3X3 className="h-4 w-4" />}
                  Generate Flatlay
                </Button>
                <p className="text-[10px] text-muted-foreground">AI arranges your product with complementary items in a professional overhead composition. Works best with clothing and accessories.</p>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {["Minimal", "Lifestyle", "Seasonal", "Brand Story"].map((style) => (
                    <button key={style} className="px-3 py-2 rounded-lg bg-muted/30 font-medium hover:bg-[var(--primary)]/10 transition-colors">{style}</button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === "adjust" && (
              <div className="space-y-4">
                {[
                  { label: "Brightness", key: "brightness" as const, icon: SunMedium, min: 50, max: 150 },
                  { label: "Contrast", key: "contrast" as const, icon: Contrast, min: 50, max: 150 },
                  { label: "Saturation", key: "saturation" as const, icon: Palette, min: 0, max: 200 },
                ].map((ctrl) => (
                  <div key={ctrl.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 font-medium"><ctrl.icon className="h-3.5 w-3.5" /> {ctrl.label}</span>
                      <span className="tabular-nums text-muted-foreground">{adjustments[ctrl.key]}%</span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      value={adjustments[ctrl.key]}
                      onChange={(e) => setAdjustments((prev) => ({ ...prev, [ctrl.key]: Number(e.target.value) }))}
                      className="w-full accent-[var(--primary)]"
                    />
                  </div>
                ))}
                <Button variant="outline" className="w-full h-8 text-[11px]" onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100, warmth: 0 })}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset All
                </Button>
              </div>
            )}

            {activeTool === "batch" && (
              <div className="space-y-3">
                <p className="text-[11px] text-muted-foreground">Apply the same processing to all {photos.length} photos at once.</p>
                <div className="space-y-1.5">
                  {["Remove Background", "Auto Enhance", "Smart Crop (1:1)", "Add Watermark"].map((action) => (
                    <Button key={action} variant="outline" className="w-full h-9 text-[11px] justify-start gap-2" onClick={() => simulateProcess(`Batch: ${action}`)} disabled={processing}>
                      <Wand2 className="h-3.5 w-3.5" /> {action} ({photos.length} photos)
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {activeTool === "select" && (
              <div className="text-center py-6">
                <Wand2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">Select a tool from the left panel to start editing.</p>
              </div>
            )}

            {/* No photo selected warning */}
            {!activePhoto && activeTool !== "select" && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
                <p className="text-[11px] text-amber-500 font-medium">Select a photo from the left panel first.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
