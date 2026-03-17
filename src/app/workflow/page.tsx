"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Wand2, Target, DollarSign, ShieldCheck, Send, MessageCircle,
  Radar, ChevronRight, Check, Loader2, Sparkles, Eye, EyeOff,
  Zap, RotateCcw, Play, X, Pencil, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  { id: "smart_list", label: "AI Vision", shortLabel: "Vision", description: "Upload a photo — AI identifies the item, brand, condition, and generates a full listing draft with pricing suggestions.", icon: Camera, color: "#007AFF", aiFeature: "smart_list_system", inputLabel: "Product Photo", inputExample: "JPEG/PNG image of the item from multiple angles", outputLabel: "Listing Draft", outputExample: "{ title, description, brand, category, size, condition, price, hashtags[] }" },
  { id: "enhance", label: "Description", shortLabel: "Desc", description: "Rough notes are polished into a professional, SEO-optimized listing description with keywords.", icon: Wand2, color: "#34C759", aiFeature: "enhance", inputLabel: "Rough Notes", inputExample: '"vintage nike windbreaker, 90s colorblock, size L, good condition"', outputLabel: "Polished Description", outputExample: "Full-length, SEO-rich product description ready for any marketplace." },
  { id: "optimize", label: "Platform Optimize", shortLabel: "Optimize", description: "The listing is rewritten for each marketplace's tone, audience, character limits, and algorithm.", icon: Target, color: "#FF9500", aiFeature: "optimize", inputLabel: "Base Listing", inputExample: "Title + description + category + brand + price", outputLabel: "8 Platform Versions", outputExample: "Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, Vestiaire" },
  { id: "price_intel", label: "Price Intelligence", shortLabel: "Price", description: "AI analyzes competitor pricing, sell-through rates, and suggests optimal price per platform.", icon: DollarSign, color: "#AF52DE", aiFeature: "price_intel", inputLabel: "Item Details", inputExample: "Brand, category, condition, size, your asking price", outputLabel: "Pricing Strategy", outputExample: "Per-platform price recommendations, market analysis, competitor data." },
  { id: "health_score", label: "Health Score", shortLabel: "Health", description: "Grades your listing on title quality, description, photos, pricing strategy, and platform coverage.", icon: ShieldCheck, color: "#FF3B30", aiFeature: "health_score", inputLabel: "Complete Listing", inputExample: "The full listing with all fields filled", outputLabel: "Score & Improvements", outputExample: "Overall score (0-100), per-category grades, improvement recommendations." },
  { id: "publish", label: "Cross-Publish", shortLabel: "Publish", description: "Publishes optimized listings to all connected platforms using your saved credentials.", icon: Send, color: "#0A84FF", aiFeature: "", inputLabel: "Optimized Listings", inputExample: "Platform-specific listing versions from the Optimize stage", outputLabel: "Live on 8 Platforms", outputExample: "Published URLs for each connected platform." },
  { id: "negotiate", label: "Negotiation", shortLabel: "Negotiate", description: "AI drafts responses to buyer messages with 3 strategy options per conversation.", icon: MessageCircle, color: "#30D158", aiFeature: "negotiate_response", inputLabel: "Buyer Message", inputExample: '"Would you take $120 for this?" + listing context', outputLabel: "3 Reply Options", outputExample: "FIRM (hold price), NEGOTIATE (counter-offer), ACCEPT (close the deal)." },
  { id: "trends", label: "Market Trends", shortLabel: "Trends", description: "Real-time trend reports with category heat, brand rankings, sleeper picks, and seasonal advice.", icon: Radar, color: "#FF9F0A", aiFeature: "trends", inputLabel: "Market Data", inputExample: "Current date, resale market conditions, seasonal context", outputLabel: "Trend Report", outputExample: "Trending categories, hot brands, sleeper picks with ROI estimates." },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

// ═══════════════════════════════════════════════════════════════

export default function WorkflowPage() {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [stageConfigs, setStageConfigs] = useState<Record<string, { provider: string; model: string; apiKey: string }>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState("gpt-5.4");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data: Record<string, string>) => {
      setDefaultModel(data.ai_model || "gpt-5.4");
      const configs: Record<string, { provider: string; model: string; apiKey: string }> = {};
      for (const stage of STAGES) {
        configs[stage.id] = { provider: data[`workflow_${stage.id}_provider`] || data.ai_provider || "openai", model: data[`workflow_${stage.id}_model`] || "", apiKey: data[`workflow_${stage.id}_key`] || "" };
      }
      setStageConfigs(configs);
    }).catch(() => {});
    fetch("/api/settings/prompts").then((r) => r.json()).then((data: { featureKey: string; prompt: string }[]) => {
      const map: Record<string, string> = {};
      for (const p of data) map[p.featureKey] = p.prompt;
      setPrompts(map);
    }).catch(() => {});
  }, []);

  const updateStageConfig = (stageId: string, field: string, value: string) => {
    setStageConfigs((prev) => ({ ...prev, [stageId]: { ...prev[stageId], [field]: value } }));
  };

  const saveStageConfig = async (stageId: string) => {
    setSaving(true);
    const config = stageConfigs[stageId];
    if (!config) { setSaving(false); return; }
    try {
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: { [`workflow_${stageId}_provider`]: config.provider, [`workflow_${stageId}_model`]: config.model, ...(config.apiKey ? { [`workflow_${stageId}_key`]: config.apiKey } : {}) } }) });
      toast.success(`Saved ${STAGES.find((s) => s.id === stageId)?.label} config`);
    } catch { toast.error("Failed to save"); }
    setSaving(false);
  };

  const savePrompt = async (featureKey: string) => {
    setSaving(true);
    try {
      await fetch("/api/settings/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey, prompt: promptDraft }) });
      setPrompts((prev) => ({ ...prev, [featureKey]: promptDraft }));
      setEditingPrompt(null);
      toast.success("Prompt saved");
    } catch { toast.error("Failed to save prompt"); }
    setSaving(false);
  };

  const resetPrompt = async (featureKey: string) => {
    try {
      await fetch(`/api/settings/prompts?featureKey=${featureKey}`, { method: "DELETE" });
      setPrompts((prev) => { const n = { ...prev }; delete n[featureKey]; return n; });
      setEditingPrompt(null);
      toast.success("Prompt reset to default");
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
      const res = await fetch("/api/settings/test-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: stage.aiFeature }) });
      const data = await res.json();
      setTestResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch { setTestResult("Test failed — check your API key and provider settings."); }
    setTesting(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          {STAGES.length} stages &middot; Default model: <span className="font-mono text-foreground">{defaultModel}</span>
        </p>
      </div>

      {/* ═══ PIPELINE GRID — 3 per row on desktop, 2 on md, 1 on mobile ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isExpanded = expandedStage === stage.id;
          const config = stageConfigs[stage.id];
          const hasCustomModel = config?.model && config.model !== defaultModel && config.model !== "";
          const isAI = !!stage.aiFeature;
          const isLast = i === STAGES.length - 1;

          return (
            <div
              key={stage.id}
              className={cn(
                "relative rounded-2xl border transition-all duration-300 overflow-hidden",
                isExpanded
                  ? "border-transparent shadow-xl"
                  : "border-[var(--border)] hover:border-[var(--muted-foreground)]/20 hover:shadow-md"
              )}
              style={isExpanded ? { boxShadow: `0 0 0 2px ${stage.color}40, 0 8px 32px ${stage.color}15` } : undefined}
            >
              {/* ── Card header (always visible) ── */}
              <div className="bg-card p-5">
                {/* Step badge */}
                <span
                  className="absolute top-3 left-3 h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-lg z-10"
                  style={{ background: stage.color, boxShadow: `0 0 12px ${stage.color}40` }}
                >
                  {i + 1}
                </span>

                {/* Top section: icon + title + expand toggle */}
                <div className="flex items-start gap-4 pl-6">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${stage.color}12`, color: stage.color }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{stage.label}</h3>
                      {isAI ? (
                        <Badge className="text-[8px] px-1.5 py-0 h-4 border-0" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>AI</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">Auto</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{stage.description}</p>
                  </div>
                </div>

                {/* Data flow: Input → Output */}
                <div className="mt-4 pl-6 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Input</span>
                    </div>
                    <p className="text-[11px] font-medium">{stage.inputLabel}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{stage.inputExample}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-1 mb-1.5">
                      <ChevronRight className="h-3 w-3" style={{ color: stage.color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Output</span>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: stage.color }}>{stage.outputLabel}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{stage.outputExample}</p>
                  </div>
                </div>

                {/* Model badge + expand button */}
                <div className="mt-3 pl-6 flex items-center justify-between">
                  <span className={cn(
                    "text-[9px] font-mono px-2 py-0.5 rounded-full",
                    isAI
                      ? hasCustomModel ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                      : "bg-blue-500/10 text-blue-500"
                  )}>
                    {isAI ? (hasCustomModel ? config?.model : `default · ${defaultModel}`) : "auto"}
                  </span>

                  <button
                    onClick={() => { setExpandedStage(isExpanded ? null : stage.id); setTestResult(null); setEditingPrompt(null); }}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                      isExpanded
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {isExpanded ? "Close" : "Configure"}
                    <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                  </button>
                </div>
              </div>

              {/* ── Expanded config section (inside card) ── */}
              {isExpanded && config && (
                <div className="border-t border-[var(--border)] bg-card p-5 space-y-4 animate-fade-in">
                  {/* Prompt section */}
                  {isAI && (
                    <div className="rounded-xl border border-[var(--border)] p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" style={{ color: stage.color }} />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt Template</span>
                        </div>
                        <div className="flex gap-1">
                          {editingPrompt === stage.aiFeature ? (
                            <>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => resetPrompt(stage.aiFeature)}>
                                <RotateCcw className="h-2.5 w-2.5 mr-1" />Reset
                              </Button>
                              <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => savePrompt(stage.aiFeature)} disabled={saving}>
                                {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Check className="h-2.5 w-2.5 mr-1" />}Save
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setEditingPrompt(stage.aiFeature); setPromptDraft(prompts[stage.aiFeature] || ""); }}>
                              <Pencil className="h-2.5 w-2.5 mr-1" />Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      {editingPrompt === stage.aiFeature ? (
                        <textarea
                          value={promptDraft}
                          onChange={(e) => setPromptDraft(e.target.value)}
                          className="w-full h-[160px] rounded-lg border border-border bg-background p-3 text-[11px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                      ) : (
                        <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                          {(prompts[stage.aiFeature] || "Loading...").slice(0, 400)}
                          {(prompts[stage.aiFeature] || "").length > 400 && "..."}
                        </pre>
                      )}
                    </div>
                  )}

                  {!isAI && (
                    <div className="rounded-xl bg-muted/30 p-4">
                      <p className="text-[11px] text-muted-foreground">This stage uses platform automation — no AI prompt needed. It runs automatically when listings are published.</p>
                    </div>
                  )}

                  {/* Provider / model / key config */}
                  {isAI && (
                    <div className="space-y-3">
                      {/* Provider pills */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-muted-foreground font-medium">Provider</span>
                        {Object.entries(AI_MODELS).map(([id, p]) => (
                          <button
                            key={id}
                            onClick={() => { updateStageConfig(stage.id, "provider", id); updateStageConfig(stage.id, "model", p.models[0]); }}
                            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                              config.provider === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >{p.label}</button>
                        ))}
                      </div>

                      {/* Model + key row */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Model</span>
                          <select
                            value={config.model || ""}
                            onChange={(e) => updateStageConfig(stage.id, "model", e.target.value)}
                            className="h-7 rounded-lg border border-border bg-background px-2 text-[10px] font-mono"
                          >
                            <option value="">Default ({defaultModel})</option>
                            {(AI_MODELS[config.provider]?.models || []).map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-medium">Key</span>
                          <div className="relative">
                            <Input type={showKey ? "text" : "password"} value={config.apiKey} onChange={(e) => updateStageConfig(stage.id, "apiKey", e.target.value)} placeholder="Global key" className="h-7 text-[10px] font-mono w-[130px] pr-7" />
                            <button onClick={() => setShowKey(!showKey)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                              {showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    {isAI && (
                      <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => testStage(stage)} disabled={testing}>
                        {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Test
                      </Button>
                    )}
                    <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => saveStageConfig(stage.id)} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Save Config
                    </Button>
                  </div>

                  {/* Test result */}
                  {testResult && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Test Result</span>
                        <button onClick={() => setTestResult(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                      </div>
                      <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">{testResult}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* ── Flow connector (between cards) ── */}
              {!isLast && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex items-center justify-center">
                  <div className="h-4 flex items-center">
                    <svg width="2" height="16" viewBox="0 0 2 16">
                      <line x1="1" y1="0" x2="1" y2="16" stroke={stage.color} strokeWidth="2" strokeDasharray="3 3" opacity="0.3" className="animate-dash-vertical" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
