"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Wand2, Target, DollarSign, ShieldCheck, Send, MessageCircle,
  Radar, ChevronRight, Check, Loader2, Sparkles, Eye, EyeOff,
  Zap, RotateCcw, Play, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";

// ── Pipeline stages ─────────────────────────────────────────

interface Stage {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  aiFeature: string;
  inputLabel: string;
  inputExample: string;
  outputLabel: string;
  outputExample: string;
}

const STAGES: Stage[] = [
  {
    id: "smart_list", label: "AI Vision", shortLabel: "Vision",
    description: "Upload a photo — AI identifies the item, brand, condition, and generates a full listing draft with pricing suggestions.",
    icon: Camera, color: "#007AFF", aiFeature: "smart_list_system",
    inputLabel: "Product Photo",
    inputExample: "JPEG/PNG image of the item from multiple angles",
    outputLabel: "Listing Draft",
    outputExample: '{ title, description, brand, category, size, condition, price, hashtags[] }',
  },
  {
    id: "enhance", label: "Description", shortLabel: "Desc",
    description: "Rough notes are polished into a professional, SEO-optimized listing description with keywords.",
    icon: Wand2, color: "#34C759", aiFeature: "enhance",
    inputLabel: "Rough Notes",
    inputExample: '"vintage nike windbreaker, 90s colorblock, size L, good condition"',
    outputLabel: "Polished Description",
    outputExample: "A full-length, SEO-rich product description ready for any marketplace.",
  },
  {
    id: "optimize", label: "Platform Optimize", shortLabel: "Optimize",
    description: "The listing is rewritten for each marketplace's tone, audience, character limits, and algorithm.",
    icon: Target, color: "#FF9500", aiFeature: "optimize",
    inputLabel: "Base Listing",
    inputExample: "Title + description + category + brand + price",
    outputLabel: "8 Platform Versions",
    outputExample: "Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, Vestiaire — each with optimized title, description, hashtags, suggested price.",
  },
  {
    id: "price_intel", label: "Price Intelligence", shortLabel: "Price",
    description: "AI analyzes competitor pricing, sell-through rates, and suggests optimal price per platform.",
    icon: DollarSign, color: "#AF52DE", aiFeature: "price_intel",
    inputLabel: "Item Details",
    inputExample: "Brand, category, condition, size, your asking price",
    outputLabel: "Pricing Strategy",
    outputExample: "Per-platform price recommendations, market analysis, pricing psychology tips, competitor data.",
  },
  {
    id: "health_score", label: "Health Score", shortLabel: "Health",
    description: "Grades your listing on title quality, description, photos, pricing strategy, and platform coverage.",
    icon: ShieldCheck, color: "#FF3B30", aiFeature: "health_score",
    inputLabel: "Complete Listing",
    inputExample: "The full listing with all fields filled",
    outputLabel: "Score & Improvements",
    outputExample: "Overall score (0-100), per-category grades, actionable improvement recommendations.",
  },
  {
    id: "publish", label: "Cross-Publish", shortLabel: "Publish",
    description: "Publishes optimized listings to all connected platforms using your saved credentials.",
    icon: Send, color: "#0A84FF", aiFeature: "",
    inputLabel: "Optimized Listings",
    inputExample: "Platform-specific listing versions from the Optimize stage",
    outputLabel: "Live on 8 Platforms",
    outputExample: "Published URLs for each connected platform, status (active/pending/failed).",
  },
  {
    id: "negotiate", label: "Negotiation", shortLabel: "Negotiate",
    description: "AI drafts responses to buyer messages with 3 strategy options per conversation.",
    icon: MessageCircle, color: "#30D158", aiFeature: "negotiate_response",
    inputLabel: "Buyer Message",
    inputExample: '"Would you take $120 for this?" + listing context',
    outputLabel: "3 Reply Options",
    outputExample: "FIRM (hold price), NEGOTIATE (counter-offer), ACCEPT (close the deal) — each with a ready-to-send reply.",
  },
  {
    id: "trends", label: "Market Trends", shortLabel: "Trends",
    description: "Real-time trend reports with category heat, brand rankings, sleeper picks, and seasonal advice.",
    icon: Radar, color: "#FF9F0A", aiFeature: "trends",
    inputLabel: "Market Data",
    inputExample: "Current date, resale market conditions, seasonal context",
    outputLabel: "Trend Report",
    outputExample: "Trending categories, hot brands, sleeper picks with ROI estimates, seasonal forecast.",
  },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function WorkflowPage() {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [stageConfigs, setStageConfigs] = useState<Record<string, { provider: string; model: string; apiKey: string }>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState("gpt-5.4");

  // Load configs + prompts
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setDefaultModel(data.ai_model || "gpt-5.4");
        const configs: Record<string, { provider: string; model: string; apiKey: string }> = {};
        for (const stage of STAGES) {
          configs[stage.id] = {
            provider: data[`workflow_${stage.id}_provider`] || data.ai_provider || "openai",
            model: data[`workflow_${stage.id}_model`] || "",
            apiKey: data[`workflow_${stage.id}_key`] || "",
          };
        }
        setStageConfigs(configs);
      })
      .catch(() => {});

    fetch("/api/settings/prompts")
      .then((r) => r.json())
      .then((data: { featureKey: string; prompt: string }[]) => {
        const map: Record<string, string> = {};
        for (const p of data) map[p.featureKey] = p.prompt;
        setPrompts(map);
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
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const savePrompt = async (featureKey: string) => {
    setSaving(true);
    try {
      await fetch("/api/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey, prompt: promptDraft }),
      });
      setPrompts((prev) => ({ ...prev, [featureKey]: promptDraft }));
      setEditingPrompt(null);
      toast.success("Prompt saved");
    } catch { toast.error("Failed to save prompt"); }
    setSaving(false);
  };

  const resetPrompt = async (featureKey: string) => {
    try {
      await fetch(`/api/settings/prompts?featureKey=${featureKey}`, { method: "DELETE" });
      setPrompts((prev) => { const next = { ...prev }; delete next[featureKey]; return next; });
      setEditingPrompt(null);
      toast.success("Prompt reset to default");
      // Reload prompts to get the default back
      const res = await fetch("/api/settings/prompts");
      const data = await res.json();
      const map: Record<string, string> = {};
      for (const p of data) map[p.featureKey] = p.prompt;
      setPrompts(map);
    } catch { toast.error("Failed to reset"); }
  };

  const testStage = async (stage: Stage) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: stage.aiFeature }),
      });
      const data = await res.json();
      setTestResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch { setTestResult("Test failed — check your API key and provider settings."); }
    setTesting(false);
  };

  const active = STAGES.find((s) => s.id === selectedStage);
  const activeConfig = selectedStage ? stageConfigs[selectedStage] : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            {STAGES.length} stages &middot; Default model: <span className="font-mono text-foreground">{defaultModel}</span> &middot; Click any stage to configure
          </p>
        </div>
      </div>

      {/* ── Horizontal Pipeline ─────────────────────────────── */}
      <div className="rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="flex items-center gap-0 px-4 py-5 min-w-max">
            {STAGES.map((stage, i) => {
              const Icon = stage.icon;
              const isSelected = selectedStage === stage.id;
              const config = stageConfigs[stage.id];
              const hasCustomModel = config?.model && config.model !== defaultModel && config.model !== "";
              const isAI = !!stage.aiFeature;

              return (
                <div key={stage.id} className="flex items-center">
                  {/* Stage card */}
                  <button
                    onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                    className={`relative flex flex-col items-center w-[120px] p-3 rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "ring-2 shadow-lg bg-card scale-105"
                        : "hover:bg-muted/50 hover:scale-[1.02]"
                    }`}
                    style={{
                      boxShadow: isSelected ? `0 0 0 2px ${stage.color}` : undefined,
                    }}
                  >
                    {/* Step number */}
                    <span className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white" style={{ background: stage.color }}>
                      {i + 1}
                    </span>

                    {/* Icon */}
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Label */}
                    <span className="text-[11px] font-semibold text-center leading-tight">{stage.shortLabel}</span>

                    {/* Model badge */}
                    <span className={`mt-1.5 text-[8px] font-mono px-1.5 py-0.5 rounded-md ${
                      isAI
                        ? hasCustomModel
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    }`}>
                      {isAI ? (hasCustomModel ? config.model : "default") : "auto"}
                    </span>
                  </button>

                  {/* Arrow connector */}
                  {i < STAGES.length - 1 && (
                    <div className="flex items-center px-1">
                      <div className="w-6 h-px bg-border" />
                      <ChevronRight className="h-3 w-3 text-muted-foreground/30 -ml-1" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Detail Panel (below pipeline) ─────────────────── */}
        {active && activeConfig && (
          <div className="border-t border-border p-5 space-y-5 animate-fade-in">
            {/* Stage header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${active.color}15`, color: active.color }}
                >
                  <active.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{active.label}</h3>
                    {active.aiFeature ? (
                      <Badge className="text-[9px] px-1.5 py-0 h-4 border-0" style={{ backgroundColor: `${active.color}20`, color: active.color }}>AI</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Auto</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{active.description}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedStage(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Three-column: Input → Prompt → Output */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* INPUT */}
              <div className="rounded-xl bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Input</span>
                </div>
                <p className="text-xs font-semibold">{active.inputLabel}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{active.inputExample}</p>
              </div>

              {/* PROMPT */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${active.color}15` }}>
                      <Sparkles className="h-3 w-3" style={{ color: active.color }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prompt</span>
                  </div>
                  {active.aiFeature && (
                    <div className="flex gap-1">
                      {editingPrompt === active.aiFeature ? (
                        <>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => resetPrompt(active.aiFeature)}>
                            <RotateCcw className="h-2.5 w-2.5 mr-1" />Reset
                          </Button>
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => savePrompt(active.aiFeature)} disabled={saving}>
                            {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Check className="h-2.5 w-2.5 mr-1" />}Save
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setEditingPrompt(active.aiFeature); setPromptDraft(prompts[active.aiFeature] || ""); }}>
                          <Pencil className="h-2.5 w-2.5 mr-1" />Edit
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {active.aiFeature ? (
                  editingPrompt === active.aiFeature ? (
                    <textarea
                      value={promptDraft}
                      onChange={(e) => setPromptDraft(e.target.value)}
                      className="w-full h-[200px] rounded-lg border border-border bg-background p-3 text-[11px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  ) : (
                    <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {(prompts[active.aiFeature] || "Loading...").slice(0, 500)}
                      {(prompts[active.aiFeature] || "").length > 500 && "..."}
                    </pre>
                  )
                ) : (
                  <p className="text-[11px] text-muted-foreground">This stage uses platform automation — no AI prompt needed.</p>
                )}

                {/* Variables */}
                {active.aiFeature && prompts[active.aiFeature] && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[...new Set((prompts[active.aiFeature] || "").match(/\{\{(\w+)\}\}/g) || [])].map((v) => (
                      <span key={v} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* OUTPUT */}
              <div className="rounded-xl bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ backgroundColor: `${active.color}15` }}>
                    <ChevronRight className="h-3 w-3" style={{ color: active.color }} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Output</span>
                </div>
                <p className="text-xs font-semibold" style={{ color: active.color }}>{active.outputLabel}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{active.outputExample}</p>
              </div>
            </div>

            {/* Model config bar */}
            {active.aiFeature && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                {/* Provider pills */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1">Provider</span>
                  {Object.entries(AI_MODELS).map(([id, p]) => (
                    <button
                      key={id}
                      onClick={() => {
                        updateStageConfig(active.id, "provider", id);
                        updateStageConfig(active.id, "model", p.models[0]);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                        activeConfig.provider === id
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Model dropdown */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1">Model</span>
                  <select
                    value={activeConfig.model || ""}
                    onChange={(e) => updateStageConfig(active.id, "model", e.target.value)}
                    className="h-7 rounded-lg border border-border bg-background px-2 text-[10px] font-mono"
                  >
                    <option value="">Default ({defaultModel})</option>
                    {(AI_MODELS[activeConfig.provider]?.models || []).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* API key override */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium mr-1">Key</span>
                  <div className="relative">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={activeConfig.apiKey}
                      onChange={(e) => updateStageConfig(active.id, "apiKey", e.target.value)}
                      placeholder="Global key"
                      className="h-7 text-[10px] font-mono w-[160px] pr-7"
                    />
                    <button onClick={() => setShowKey(!showKey)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Test button */}
                  <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => testStage(active)} disabled={testing}>
                    {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Test
                  </Button>

                  {/* Save button */}
                  <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => saveStageConfig(active.id)} disabled={saving}>
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                </div>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Test Result</span>
                  <button onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
                <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">{testResult}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
