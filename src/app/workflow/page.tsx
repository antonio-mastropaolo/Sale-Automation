"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Camera, Wand2, Target, DollarSign, ShieldCheck, Send, MessageCircle,
  Radar, ChevronRight, Check, Loader2, Sparkles, Eye, EyeOff,
  Zap, RotateCcw, Play, X, Pencil,
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
  {
    id: "smart_list", label: "AI Vision", shortLabel: "Vision",
    description: "Upload a photo — AI identifies the item, brand, condition, and generates a full listing draft with pricing suggestions.",
    icon: Camera, color: "#007AFF", aiFeature: "smart_list_system",
    inputLabel: "Product Photo", inputExample: "JPEG/PNG image of the item from multiple angles",
    outputLabel: "Listing Draft", outputExample: '{ title, description, brand, category, size, condition, price, hashtags[] }',
  },
  {
    id: "enhance", label: "Description", shortLabel: "Desc",
    description: "Rough notes are polished into a professional, SEO-optimized listing description with keywords.",
    icon: Wand2, color: "#34C759", aiFeature: "enhance",
    inputLabel: "Rough Notes", inputExample: '"vintage nike windbreaker, 90s colorblock, size L, good condition"',
    outputLabel: "Polished Description", outputExample: "A full-length, SEO-rich product description ready for any marketplace.",
  },
  {
    id: "optimize", label: "Platform Optimize", shortLabel: "Optimize",
    description: "The listing is rewritten for each marketplace's tone, audience, character limits, and algorithm.",
    icon: Target, color: "#FF9500", aiFeature: "optimize",
    inputLabel: "Base Listing", inputExample: "Title + description + category + brand + price",
    outputLabel: "8 Platform Versions", outputExample: "Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, Vestiaire",
  },
  {
    id: "price_intel", label: "Price Intelligence", shortLabel: "Price",
    description: "AI analyzes competitor pricing, sell-through rates, and suggests optimal price per platform.",
    icon: DollarSign, color: "#AF52DE", aiFeature: "price_intel",
    inputLabel: "Item Details", inputExample: "Brand, category, condition, size, your asking price",
    outputLabel: "Pricing Strategy", outputExample: "Per-platform price recommendations, market analysis, competitor data.",
  },
  {
    id: "health_score", label: "Health Score", shortLabel: "Health",
    description: "Grades your listing on title quality, description, photos, pricing strategy, and platform coverage.",
    icon: ShieldCheck, color: "#FF3B30", aiFeature: "health_score",
    inputLabel: "Complete Listing", inputExample: "The full listing with all fields filled",
    outputLabel: "Score & Improvements", outputExample: "Overall score (0-100), per-category grades, improvement recommendations.",
  },
  {
    id: "publish", label: "Cross-Publish", shortLabel: "Publish",
    description: "Publishes optimized listings to all connected platforms using your saved credentials.",
    icon: Send, color: "#0A84FF", aiFeature: "",
    inputLabel: "Optimized Listings", inputExample: "Platform-specific listing versions from the Optimize stage",
    outputLabel: "Live on 8 Platforms", outputExample: "Published URLs for each connected platform.",
  },
  {
    id: "negotiate", label: "Negotiation", shortLabel: "Negotiate",
    description: "AI drafts responses to buyer messages with 3 strategy options per conversation.",
    icon: MessageCircle, color: "#30D158", aiFeature: "negotiate_response",
    inputLabel: "Buyer Message", inputExample: '"Would you take $120 for this?" + listing context',
    outputLabel: "3 Reply Options", outputExample: "FIRM (hold price), NEGOTIATE (counter-offer), ACCEPT (close the deal).",
  },
  {
    id: "trends", label: "Market Trends", shortLabel: "Trends",
    description: "Real-time trend reports with category heat, brand rankings, sleeper picks, and seasonal advice.",
    icon: Radar, color: "#FF9F0A", aiFeature: "trends",
    inputLabel: "Market Data", inputExample: "Current date, resale market conditions, seasonal context",
    outputLabel: "Trend Report", outputExample: "Trending categories, hot brands, sleeper picks with ROI estimates.",
  },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

const COLS = 4; // stages per row on desktop

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
    setStageConfigs((prev) => ({ ...prev, [stageId]: { ...prev[stageId], [field]: value } }));
  };

  const saveStageConfig = async (stageId: string) => {
    setSaving(true);
    const config = stageConfigs[stageId];
    if (!config) { setSaving(false); return; }
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { [`workflow_${stageId}_provider`]: config.provider, [`workflow_${stageId}_model`]: config.model, ...(config.apiKey ? { [`workflow_${stageId}_key`]: config.apiKey } : {}) } }),
      });
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
      setPrompts((prev) => { const next = { ...prev }; delete next[featureKey]; return next; });
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

  const active = STAGES.find((s) => s.id === selectedStage);
  const activeConfig = selectedStage ? stageConfigs[selectedStage] : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          {STAGES.length} stages &middot; Default model: <span className="font-mono text-foreground">{defaultModel}</span> &middot; Click any stage to configure
        </p>
      </div>

      {/* ═══ PIPELINE VISUALIZATION ═══ */}

      {/* ── Desktop: Multi-row grid with animated SVG connectors (lg+) ── */}
      <div className="hidden lg:block">
        {Array.from({ length: Math.ceil(STAGES.length / COLS) }).map((_, rowIdx) => {
          const rowStages = STAGES.slice(rowIdx * COLS, (rowIdx + 1) * COLS);
          const isLastRow = rowIdx === Math.ceil(STAGES.length / COLS) - 1;

          return (
            <div key={rowIdx}>
              {/* Stage row */}
              <div className="grid grid-cols-4 gap-0 relative">
                {rowStages.map((stage, colIdx) => {
                  const globalIdx = rowIdx * COLS + colIdx;
                  const Icon = stage.icon;
                  const isSelected = selectedStage === stage.id;
                  const config = stageConfigs[stage.id];
                  const hasCustomModel = config?.model && config.model !== defaultModel && config.model !== "";
                  const isAI = !!stage.aiFeature;
                  const isLast = colIdx === rowStages.length - 1;

                  return (
                    <div key={stage.id} className="relative flex items-center">
                      {/* Stage card */}
                      <button
                        onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                        className={cn(
                          "relative flex-1 flex flex-col items-center p-5 rounded-2xl transition-all duration-300 mx-1 group",
                          isSelected
                            ? "bg-card shadow-xl scale-[1.03]"
                            : "hover:bg-card/60 hover:shadow-md"
                        )}
                        style={isSelected ? { boxShadow: `0 0 0 2px ${stage.color}, 0 8px 32px ${stage.color}20` } : undefined}
                      >
                        {/* Step badge */}
                        <span
                          className="absolute -top-2 -left-1 h-6 w-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-lg"
                          style={{ background: stage.color, boxShadow: `0 0 12px ${stage.color}40` }}
                        >
                          {globalIdx + 1}
                        </span>

                        {/* Icon */}
                        <div
                          className="h-14 w-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                        >
                          <Icon className="h-7 w-7" />
                        </div>

                        {/* Label */}
                        <span className="text-[13px] font-semibold text-center leading-tight mb-1">{stage.shortLabel}</span>

                        {/* Description snippet */}
                        <span className="text-[10px] text-muted-foreground text-center leading-snug line-clamp-2 px-2 mb-2">
                          {stage.description.split("—")[0] || stage.description.slice(0, 60)}
                        </span>

                        {/* Model badge */}
                        <span className={cn(
                          "text-[8px] font-mono px-2 py-0.5 rounded-full",
                          isAI
                            ? hasCustomModel ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                            : "bg-blue-500/10 text-blue-500"
                        )}>
                          {isAI ? (hasCustomModel ? config.model : "default") : "auto"}
                        </span>
                      </button>

                      {/* Animated horizontal connector */}
                      {!isLast && (
                        <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-8 z-10" style={{ right: "-6px" }} viewBox="0 0 12 32" fill="none">
                          <line x1="0" y1="16" x2="12" y2="16" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 3" className="animate-dash" />
                          <circle cx="10" cy="16" r="2" fill={stage.color} opacity="0.6">
                            <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
                          </circle>
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Animated row-wrap connector (curves from end of row to start of next) */}
              {!isLastRow && (
                <div className="flex justify-center py-2">
                  <svg width="100%" height="32" viewBox="0 0 800 32" fill="none" preserveAspectRatio="none" className="max-w-full">
                    <path
                      d="M 700 2 C 750 2, 780 16, 780 16 C 780 16, 750 30, 700 30 L 100 30 C 50 30, 20 16, 20 16 C 20 16, 50 2, 100 2"
                      stroke="var(--border)"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      fill="none"
                      className="animate-dash"
                      strokeLinecap="round"
                    />
                    <circle r="3" fill="var(--primary)" opacity="0.8">
                      <animateMotion dur="3s" repeatCount="indefinite" path="M 700 2 C 750 2, 780 16, 780 16 C 780 16, 750 30, 700 30 L 100 30 C 50 30, 20 16, 20 16" />
                    </circle>
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile/Tablet: Vertical timeline (< lg) ── */}
      <div className="lg:hidden space-y-0">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const isSelected = selectedStage === stage.id;
          const config = stageConfigs[stage.id];
          const hasCustomModel = config?.model && config.model !== defaultModel && config.model !== "";
          const isAI = !!stage.aiFeature;
          const isLast = i === STAGES.length - 1;

          return (
            <div key={stage.id}>
              <button
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
                  isSelected ? "bg-card shadow-lg" : "hover:bg-card/50"
                )}
                style={isSelected ? { boxShadow: `0 0 0 1.5px ${stage.color}` } : undefined}
              >
                {/* Step + icon */}
                <div className="relative shrink-0">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className="absolute -top-1.5 -left-1.5 h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ background: stage.color }}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{stage.label}</span>
                    {isAI ? (
                      <Badge className="text-[8px] px-1 py-0 h-3.5 border-0" style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>AI</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5">Auto</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{stage.description}</p>
                </div>

                {/* Model badge */}
                <span className={cn(
                  "text-[8px] font-mono px-1.5 py-0.5 rounded-md shrink-0",
                  hasCustomModel ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
                )}>
                  {hasCustomModel ? config.model : "default"}
                </span>

                <ChevronRight className={cn("h-4 w-4 text-muted-foreground/30 shrink-0 transition-transform", isSelected && "rotate-90")} />
              </button>

              {/* Vertical connector */}
              {!isLast && !isSelected && (
                <div className="flex items-center pl-8 py-0">
                  <svg width="2" height="16" viewBox="0 0 2 16" className="ml-3.5">
                    <line x1="1" y1="0" x2="1" y2="16" stroke="var(--border)" strokeWidth="2" strokeDasharray="3 3" className="animate-dash-vertical" />
                  </svg>
                </div>
              )}

              {/* Inline detail panel for mobile */}
              {isSelected && active && activeConfig && (
                <div className="mx-2 mb-2 p-4 rounded-xl bg-card border border-border space-y-4 animate-fade-in">
                  <MobileDetailPanel
                    active={active}
                    activeConfig={activeConfig}
                    prompts={prompts}
                    editingPrompt={editingPrompt}
                    promptDraft={promptDraft}
                    saving={saving}
                    testing={testing}
                    testResult={testResult}
                    showKey={showKey}
                    defaultModel={defaultModel}
                    onClose={() => setSelectedStage(null)}
                    onEditPrompt={(key) => { setEditingPrompt(key); setPromptDraft(prompts[key] || ""); }}
                    onSavePrompt={savePrompt}
                    onResetPrompt={resetPrompt}
                    onPromptDraftChange={setPromptDraft}
                    onUpdateConfig={updateStageConfig}
                    onSaveConfig={saveStageConfig}
                    onTest={testStage}
                    onToggleKey={() => setShowKey(!showKey)}
                    onClearTest={() => setTestResult(null)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ═══ DESKTOP DETAIL PANEL (below pipeline grid) ═══ */}
      {active && activeConfig && (
        <div className="hidden lg:block rounded-2xl bg-card border border-border p-6 space-y-5 animate-fade-in">
          <DesktopDetailPanel
            active={active}
            activeConfig={activeConfig}
            prompts={prompts}
            editingPrompt={editingPrompt}
            promptDraft={promptDraft}
            saving={saving}
            testing={testing}
            testResult={testResult}
            showKey={showKey}
            defaultModel={defaultModel}
            onClose={() => setSelectedStage(null)}
            onEditPrompt={(key) => { setEditingPrompt(key); setPromptDraft(prompts[key] || ""); }}
            onSavePrompt={savePrompt}
            onResetPrompt={resetPrompt}
            onPromptDraftChange={setPromptDraft}
            onUpdateConfig={updateStageConfig}
            onSaveConfig={saveStageConfig}
            onTest={testStage}
            onToggleKey={() => setShowKey(!showKey)}
            onClearTest={() => setTestResult(null)}
          />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED DETAIL PANEL LOGIC
// ═══════════════════════════════════════════════════════════════

interface DetailPanelProps {
  active: Stage;
  activeConfig: { provider: string; model: string; apiKey: string };
  prompts: Record<string, string>;
  editingPrompt: string | null;
  promptDraft: string;
  saving: boolean;
  testing: boolean;
  testResult: string | null;
  showKey: boolean;
  defaultModel: string;
  onClose: () => void;
  onEditPrompt: (key: string) => void;
  onSavePrompt: (key: string) => void;
  onResetPrompt: (key: string) => void;
  onPromptDraftChange: (val: string) => void;
  onUpdateConfig: (stageId: string, field: string, value: string) => void;
  onSaveConfig: (stageId: string) => void;
  onTest: (stage: Stage) => void;
  onToggleKey: () => void;
  onClearTest: () => void;
}

function DesktopDetailPanel(props: DetailPanelProps) {
  const { active, activeConfig } = props;
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${active.color}15`, color: active.color }}>
            <active.icon className="h-5 w-5" />
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
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={props.onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Three-column: Input → Prompt → Output */}
      <div className="grid grid-cols-3 gap-4">
        <IOCard type="input" stage={active} />
        <PromptCard {...props} />
        <IOCard type="output" stage={active} />
      </div>

      {/* Config bar */}
      {active.aiFeature && <ConfigBar {...props} />}

      {/* Test result */}
      {props.testResult && <TestResultPanel result={props.testResult} onClear={props.onClearTest} />}
    </>
  );
}

function MobileDetailPanel(props: DetailPanelProps) {
  const { active } = props;
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${active.color}15`, color: active.color }}>
            <active.icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold">{active.label}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={props.onClose}><X className="h-3 w-3" /></Button>
      </div>

      <div className="space-y-3">
        <IOCard type="input" stage={active} />
        <PromptCard {...props} />
        <IOCard type="output" stage={active} />
      </div>

      {active.aiFeature && <ConfigBar {...props} />}
      {props.testResult && <TestResultPanel result={props.testResult} onClear={props.onClearTest} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function IOCard({ type, stage }: { type: "input" | "output"; stage: Stage }) {
  const isInput = type === "input";
  return (
    <div className="rounded-xl bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <div className="h-5 w-5 rounded-md flex items-center justify-center" style={isInput ? undefined : { backgroundColor: `${stage.color}15` }}>
          {isInput ? <Zap className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3" style={{ color: stage.color }} />}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{type}</span>
      </div>
      <p className={cn("text-xs font-semibold", !isInput && "text-[var(--primary)]")} style={!isInput ? { color: stage.color } : undefined}>
        {isInput ? stage.inputLabel : stage.outputLabel}
      </p>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{isInput ? stage.inputExample : stage.outputExample}</p>
    </div>
  );
}

function PromptCard(props: DetailPanelProps) {
  const { active } = props;
  return (
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
            {props.editingPrompt === active.aiFeature ? (
              <>
                <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => props.onResetPrompt(active.aiFeature)}>
                  <RotateCcw className="h-2.5 w-2.5 mr-1" />Reset
                </Button>
                <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => props.onSavePrompt(active.aiFeature)} disabled={props.saving}>
                  {props.saving ? <Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> : <Check className="h-2.5 w-2.5 mr-1" />}Save
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => props.onEditPrompt(active.aiFeature)}>
                <Pencil className="h-2.5 w-2.5 mr-1" />Edit
              </Button>
            )}
          </div>
        )}
      </div>

      {active.aiFeature ? (
        props.editingPrompt === active.aiFeature ? (
          <textarea
            value={props.promptDraft}
            onChange={(e) => props.onPromptDraftChange(e.target.value)}
            className="w-full h-[200px] rounded-lg border border-border bg-background p-3 text-[11px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        ) : (
          <pre className="text-[10px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
            {(props.prompts[active.aiFeature] || "Loading...").slice(0, 500)}
            {(props.prompts[active.aiFeature] || "").length > 500 && "..."}
          </pre>
        )
      ) : (
        <p className="text-[11px] text-muted-foreground">This stage uses platform automation — no AI prompt needed.</p>
      )}
    </div>
  );
}

function ConfigBar(props: DetailPanelProps) {
  const { active, activeConfig } = props;
  return (
    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Provider</span>
        {Object.entries(AI_MODELS).map(([id, p]) => (
          <button
            key={id}
            onClick={() => { props.onUpdateConfig(active.id, "provider", id); props.onUpdateConfig(active.id, "model", p.models[0]); }}
            className={cn("px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
              activeConfig.provider === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >{p.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Model</span>
        <select
          value={activeConfig.model || ""}
          onChange={(e) => props.onUpdateConfig(active.id, "model", e.target.value)}
          className="h-7 rounded-lg border border-border bg-background px-2 text-[10px] font-mono"
        >
          <option value="">Default ({props.defaultModel})</option>
          {(AI_MODELS[activeConfig.provider]?.models || []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-muted-foreground font-medium mr-1">Key</span>
        <div className="relative">
          <Input type={props.showKey ? "text" : "password"} value={activeConfig.apiKey} onChange={(e) => props.onUpdateConfig(active.id, "apiKey", e.target.value)} placeholder="Global key" className="h-7 text-[10px] font-mono w-[140px] pr-7" />
          <button onClick={props.onToggleKey} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {props.showKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => props.onTest(active)} disabled={props.testing}>
          {props.testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Test
        </Button>
        <Button size="sm" className="h-7 text-[10px] gap-1" onClick={() => props.onSaveConfig(active.id)} disabled={props.saving}>
          {props.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}Save
        </Button>
      </div>
    </div>
  );
}

function TestResultPanel({ result, onClear }: { result: string; onClear: () => void }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Test Result</span>
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
      </div>
      <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">{result}</pre>
    </div>
  );
}
