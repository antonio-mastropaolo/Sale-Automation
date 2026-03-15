"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Wand2, Target, DollarSign, ShieldCheck, Send, MessageCircle,
  Radar, ChevronRight, Settings2, Check, X, Loader2, Sparkles, Eye, EyeOff,
  ArrowDown, Zap, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ── Pipeline stages ─────────────────────────────────────────

interface Stage {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  aiFeature: string; // maps to the prompt feature key
  inputLabel: string;
  outputLabel: string;
}

const STAGES: Stage[] = [
  {
    id: "smart_list",
    label: "AI Vision",
    description: "Upload a photo → AI identifies the item, brand, condition, and generates a full listing",
    icon: Camera,
    color: "#007AFF",
    aiFeature: "smart_list_system",
    inputLabel: "Product Photo",
    outputLabel: "Listing Draft",
  },
  {
    id: "enhance",
    label: "Description",
    description: "Rough notes are polished into a professional, SEO-optimized listing description",
    icon: Wand2,
    color: "#34C759",
    aiFeature: "enhance",
    inputLabel: "Rough Notes",
    outputLabel: "Polished Description",
  },
  {
    id: "optimize",
    label: "Platform Optimize",
    description: "The listing is rewritten for each marketplace's tone, audience, and algorithm",
    icon: Target,
    color: "#FF9500",
    aiFeature: "optimize",
    inputLabel: "Base Listing",
    outputLabel: "8 Platform Versions",
  },
  {
    id: "price_intel",
    label: "Price Intelligence",
    description: "AI analyzes competitor pricing, sell-through rates, and suggests optimal price per platform",
    icon: DollarSign,
    color: "#AF52DE",
    aiFeature: "price_intel",
    inputLabel: "Item Details",
    outputLabel: "Pricing Strategy",
  },
  {
    id: "health_score",
    label: "Health Score",
    description: "Grades your listing on title, description, photos, pricing, and platform coverage",
    icon: ShieldCheck,
    color: "#FF3B30",
    aiFeature: "health_score",
    inputLabel: "Complete Listing",
    outputLabel: "Score & Improvements",
  },
  {
    id: "publish",
    label: "Cross-Publish",
    description: "One click publishes to all connected platforms via the browser extension",
    icon: Send,
    color: "#0A84FF",
    aiFeature: "",
    inputLabel: "Optimized Listings",
    outputLabel: "Live on 8 Platforms",
  },
  {
    id: "negotiate",
    label: "Negotiation",
    description: "AI drafts responses to buyer messages with 3 strategy options per conversation",
    icon: MessageCircle,
    color: "#30D158",
    aiFeature: "negotiate_response",
    inputLabel: "Buyer Message",
    outputLabel: "3 Reply Options",
  },
  {
    id: "trends",
    label: "Market Trends",
    description: "Real-time trend reports, sleeper picks, and per-platform selling strategies",
    icon: Radar,
    color: "#FF9F0A",
    aiFeature: "trends",
    inputLabel: "Market Data",
    outputLabel: "Trend Report",
  },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.2", "gpt-5-mini", "gpt-4o", "gpt-4o-mini", "o4-mini"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function WorkflowPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [stageConfigs, setStageConfigs] = useState<Record<string, { provider: string; model: string; apiKey: string }>>({});
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Load saved per-stage configs
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const configs: Record<string, { provider: string; model: string; apiKey: string }> = {};
        for (const stage of STAGES) {
          configs[stage.id] = {
            provider: data[`workflow_${stage.id}_provider`] || data.ai_provider || "openai",
            model: data[`workflow_${stage.id}_model`] || data.ai_model || "gpt-4o",
            apiKey: data[`workflow_${stage.id}_key`] || "",
          };
        }
        setStageConfigs(configs);
      })
      .catch(() => {});
  }, []);

  const updateStageConfig = (stageId: string, field: string, value: string) => {
    setStageConfigs((prev) => ({
      ...prev,
      [stageId]: { ...prev[stageId], [field]: value },
    }));
  };

  const saveStageConfig = async (stageId: string) => {
    setSaving(true);
    const config = stageConfigs[stageId];
    if (!config) { setSaving(false); return; }
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            [`workflow_${stageId}_provider`]: config.provider,
            [`workflow_${stageId}_model`]: config.model,
            ...(config.apiKey ? { [`workflow_${stageId}_key`]: config.apiKey } : {}),
          },
        }),
      });
      toast.success(`Saved ${STAGES.find((s) => s.id === stageId)?.label} config`);
    } catch {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const active = STAGES.find((s) => s.id === selectedStage);
  const activeConfig = selectedStage ? stageConfigs[selectedStage] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          Visualize the listing lifecycle. Click any stage to configure which AI model powers it.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left: Pipeline visualization ──────────────── */}
        <div className="flex-1 space-y-0">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isSelected = selectedStage === stage.id;
            const config = stageConfigs[stage.id];
            const isAI = !!stage.aiFeature;

            return (
              <div key={stage.id}>
                {/* Stage node */}
                <button
                  onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                  className={`w-full text-left rounded-xl p-4 transition-all duration-200 ${
                    isSelected
                      ? "bg-card ring-2 shadow-lg"
                      : "bg-card hover:shadow-md"
                  }`}
                  style={{
                    ringColor: isSelected ? stage.color : undefined,
                    boxShadow: isSelected ? `0 0 0 2px ${stage.color}` : undefined,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon circle */}
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{stage.label}</h3>
                        {isAI && (
                          <Badge className="text-[9px] px-1.5 py-0 h-4" style={{ backgroundColor: `${stage.color}20`, color: stage.color, border: "none" }}>
                            AI
                          </Badge>
                        )}
                        {!isAI && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Extension</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{stage.description}</p>

                      {/* Data flow indicators */}
                      <div className="flex items-center gap-2 mt-2 text-[10px]">
                        <span className="bg-muted px-2 py-0.5 rounded-md text-muted-foreground">{stage.inputLabel}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                        <span className="px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: `${stage.color}10`, color: stage.color }}>
                          {stage.outputLabel}
                        </span>
                      </div>

                      {/* Current model badge */}
                      {isAI && config && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Sparkles className="h-3 w-3 text-muted-foreground/40" />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {config.model || "default"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={`h-4 w-4 text-muted-foreground/30 shrink-0 mt-3 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {/* Connector line between stages */}
                {i < STAGES.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="flex flex-col items-center">
                      <ArrowDown className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right: Stage config panel ─────────────────── */}
        <div className="lg:w-[380px] shrink-0">
          {active && activeConfig ? (
            <div className="rounded-xl bg-card p-5 sticky top-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${active.color}15`, color: active.color }}
                >
                  <active.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">{active.label}</h3>
                  <p className="text-[11px] text-muted-foreground">Configure AI for this stage</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">{active.description}</p>

              {active.aiFeature ? (
                <>
                  {/* Provider */}
                  <div className="space-y-2">
                    <Label className="text-xs">AI Provider</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {Object.entries(AI_MODELS).map(([id, p]) => (
                        <button
                          key={id}
                          onClick={() => {
                            updateStageConfig(active.id, "provider", id);
                            updateStageConfig(active.id, "model", p.models[0]);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            activeConfig.provider === id
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Model */}
                  <div className="space-y-2">
                    <Label className="text-xs">Model</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(AI_MODELS[activeConfig.provider]?.models || []).map((m) => (
                        <button
                          key={m}
                          onClick={() => updateStageConfig(active.id, "model", m)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
                            activeConfig.model === m
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                              : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API Key (optional override for this stage) */}
                  <div className="space-y-2">
                    <Label className="text-xs">API Key <span className="text-muted-foreground font-normal">(optional — overrides global)</span></Label>
                    <div className="relative">
                      <Input
                        type={showKey ? "text" : "password"}
                        value={activeConfig.apiKey}
                        onChange={(e) => updateStageConfig(active.id, "apiKey", e.target.value)}
                        placeholder="Leave empty to use global key"
                        className="h-9 text-xs font-mono pr-8"
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Save */}
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => saveStageConfig(active.id)}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                    Save Stage Config
                  </Button>
                </>
              ) : (
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <Send className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    This stage uses the browser extension — no AI key needed. Connect your platforms in Settings.
                  </p>
                </div>
              )}

              {/* Data flow viz */}
              <div className="pt-3 border-t border-border">
                <p className="text-[10px] font-semibold text-muted-foreground mb-2">DATA FLOW</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg bg-muted p-2 text-center">
                    <p className="text-[10px] font-medium">{active.inputLabel}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ChevronRight className="h-4 w-4" style={{ color: active.color }} />
                  </div>
                  <div className="flex-1 rounded-lg p-2 text-center" style={{ backgroundColor: `${active.color}10` }}>
                    <p className="text-[10px] font-semibold" style={{ color: active.color }}>{active.label}</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <ChevronRight className="h-4 w-4" style={{ color: active.color }} />
                  </div>
                  <div className="flex-1 rounded-lg bg-muted p-2 text-center">
                    <p className="text-[10px] font-medium">{active.outputLabel}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-card p-8 text-center sticky top-6">
              <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <h3 className="text-sm font-semibold mb-1">Select a Stage</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Click any stage in the pipeline to see its details, configure which AI model it uses, and set a custom API key.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
