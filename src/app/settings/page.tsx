"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Shield,
  CheckCircle2,
  XCircle,
  Key,
  Brain,
  Sparkles,
  Settings2,
  Plug,
  Eye,
  EyeOff,
  RotateCcw,
  Play,
  Save,
  ChevronDown,
  ChevronRight,
  Wand2,
  AlertCircle,
  Check,
  Star,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";
import { THEMES as THEME_MAP, applyTheme as applyThemeFromLib, saveTheme as saveThemeToStorage, getSavedTheme as getSavedThemeFromStorage } from "@/lib/themes";

// ── Types ───────────────────────────────────────────────────────────

interface PlatformStatus {
  platform: string;
  connected: boolean;
  username: string | null;
  updatedAt: string | null;
}

interface PromptEntry {
  featureKey: string;
  label: string;
  description: string;
  category: string;
  variables: string[];
  sampleVars: Record<string, string>;
  defaultPrompt: string;
  customPrompt: string | null;
  isCustomized: boolean;
  updatedAt: string | null;
}

interface TestResult {
  output: string;
  model: string;
  interpolatedPrompt: string;
  tokensUsed: number | null;
}

// ── Provider definitions (client-side mirror) ───────────────────────

const AI_DIRECT_PROVIDERS = [
  { id: "openai", name: "OpenAI", defaultModel: "gpt-5.4", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.1", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "o4-mini", "o3", "o3-mini", "o1"] },
  { id: "google", name: "Google Gemini", defaultModel: "gemini-2.5-flash", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  { id: "groq", name: "Groq", defaultModel: "llama-3.3-70b-versatile", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"] },
  { id: "together", name: "Together AI", defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"] },
  { id: "custom", name: "Custom (OpenAI-compatible)", defaultModel: "", models: [] },
];

const AI_ROUTERS = [
  { id: "openrouter", name: "OpenRouter", defaultModel: "anthropic/claude-sonnet-4", models: ["anthropic/claude-sonnet-4", "anthropic/claude-haiku-4", "openai/gpt-5.4", "openai/gpt-5-mini", "google/gemini-3.1-pro-preview", "google/gemini-2.5-flash", "meta-llama/llama-3.3-70b", "mistralai/mistral-large"] },
  { id: "litellm", name: "LiteLLM Proxy", defaultModel: "gpt-5.4", models: ["gpt-5.4", "gpt-5-mini", "claude-sonnet-4", "claude-haiku-4", "gemini-2.5-flash", "gemini-2.5-pro", "llama-3.3-70b"] },
];

const AI_PROVIDERS = [...AI_DIRECT_PROVIDERS, ...AI_ROUTERS];

// Keep backward compat — the flat array is still used for key lookups
const ALL_PROVIDER_IDS = AI_PROVIDERS.map((p) => p.id);

const CATEGORY_LABELS: Record<string, string> = {
  listing: "Listing & Optimization",
  pricing: "Pricing",
  analytics: "Analytics",
  trends: "Trends",
  negotiation: "Negotiation",
};

const CATEGORY_ORDER = ["listing", "pricing", "analytics", "trends", "negotiation"];

// ── Helpers ─────────────────────────────────────────────────────────

const platformInfo = Object.fromEntries(
  Object.entries(platformBranding).map(([k, v]) => [
    k,
    { name: v.label, color: v.color, bg: v.bg, icon: v.icon },
  ])
) as Record<string, { name: string; color: string; bg: string; icon: string }>;

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your AI provider, customize prompts, connect platforms, and configure defaults
        </p>
      </div>

      <Tabs defaultValue="ai">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="ai" className="gap-1.5">
            <Brain className="h-4 w-4" />
            AI Provider
          </TabsTrigger>
          <TabsTrigger value="prompts" className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            Prompt Studio
          </TabsTrigger>
          <TabsTrigger value="platforms" className="gap-1.5">
            <Plug className="h-4 w-4" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai">
          <AIProviderTab />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptStudioTab />
        </TabsContent>
        <TabsContent value="platforms">
          <PlatformsTab />
        </TabsContent>
        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — AI PROVIDER
// ═══════════════════════════════════════════════════════════════════

// Pipeline stages for smart AI configuration
const AI_STAGES = [
  { id: "smart_list", label: "AI Vision", description: "Photo → full listing" },
  { id: "enhance", label: "Description", description: "Polish & SEO optimize" },
  { id: "optimize", label: "Platform Optimize", description: "Rewrite per marketplace" },
  { id: "price_intel", label: "Price Intelligence", description: "Competitor analysis & pricing" },
  { id: "health_score", label: "Health Score", description: "Grade listing quality" },
  { id: "negotiate", label: "Negotiation", description: "Draft buyer responses" },
  { id: "trends", label: "Market Trends", description: "Trend reports & picks" },
];

function AIProviderTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [defaultProvider, setDefaultProvider] = useState("openai");
  const [model, setModel] = useState("");
  const [baseURL, setBaseURL] = useState("");

  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [showKeyFor, setShowKeyFor] = useState<Record<string, boolean>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Routing mode: "fixed" = one model for all, "smart" = per-stage assignment
  const [routingMode, setRoutingMode] = useState<"fixed" | "smart">("fixed");
  const [stageAssignments, setStageAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const prov = data.ai_provider || "openai";
        setDefaultProvider(prov);
        setModel(data.ai_model || "");
        setBaseURL(data.ai_base_url || "");
        setRoutingMode(data.ai_smart_suggestions === "true" ? "smart" : "fixed");
        const loaded: Record<string, string> = {};
        for (const pid of ALL_PROVIDER_IDS) {
          const k = data[`ai_api_key_${pid}`];
          if (k) loaded[pid] = k;
        }
        if (data.ai_api_key && !loaded[prov]) loaded[prov] = data.ai_api_key;
        setKeys(loaded);
        setSavedKeys({ ...loaded });
        const assignments: Record<string, string> = {};
        for (const stage of AI_STAGES) {
          const v = data[`ai_stage_${stage.id}`];
          if (v) assignments[stage.id] = v;
        }
        setStageAssignments(assignments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectedProviderObj = AI_PROVIDERS.find((p) => p.id === defaultProvider) || AI_PROVIDERS[0];
  // Which router (if any) has a key set
  const activeRouter = AI_ROUTERS.find((r) => !!keys[r.id]);
  // Models available for routing (from the active router)
  const routerModels = activeRouter?.models || [];

  const updateKey = (pid: string, value: string) => {
    setKeys((prev) => ({ ...prev, [pid]: value }));
  };
  const setAsDefault = (pid: string) => {
    setDefaultProvider(pid);
    const p = AI_PROVIDERS.find((x) => x.id === pid);
    if (p) setModel(p.defaultModel);
    setTestResult(null);
  };
  const toggleExpand = (pid: string) => {
    setExpandedProvider((prev) => (prev === pid ? null : pid));
  };

  const save = async () => {
    setSaving(true);
    const payload: Record<string, string> = {
      ai_provider: defaultProvider,
      ai_model: model,
      ai_smart_suggestions: routingMode === "smart" ? "true" : "false",
    };
    for (const pid of ALL_PROVIDER_IDS) {
      if (keys[pid]) payload[`ai_api_key_${pid}`] = keys[pid];
    }
    if (keys[defaultProvider]) payload.ai_api_key = keys[defaultProvider];
    if (defaultProvider === "custom" && baseURL) payload.ai_base_url = baseURL;
    for (const stage of AI_STAGES) {
      if (stageAssignments[stage.id]) {
        payload[`ai_stage_${stage.id}`] = stageAssignments[stage.id];
      }
    }
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      if (!res.ok) throw new Error();
      setSavedKeys({ ...keys });
      toast.success("AI settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const currentKey = keys[defaultProvider];
    if (!currentKey) {
      setTestResult(`Error: No API key for ${selectedProviderObj.name}. Enter a key first.`);
      setTesting(false);
      return;
    }
    try {
      const res = await fetch("/api/settings/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Say 'Connection successful!' in exactly 3 words. Nothing else.",
          variables: {},
          provider: defaultProvider,
          apiKey: currentKey,
          model: model || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data.error ? `Error: ${data.error}` : `Model: ${data.model}\nResponse: ${data.output}\nTokens: ${data.tokensUsed ?? "N/A"}`);
    } catch {
      setTestResult("Error: Failed to reach the API");
    }
    setTesting(false);
  };

  // Shared provider card renderer
  const renderProvider = (p: typeof AI_PROVIDERS[number]) => {
    const hasKey = !!keys[p.id];
    const isDefault = defaultProvider === p.id;
    const isExpanded = expandedProvider === p.id;
    const wasSaved = !!savedKeys[p.id];
    const keyChanged = keys[p.id] !== savedKeys[p.id];

    return (
      <div
        key={p.id}
        className={`rounded-xl border-2 transition-all ${
          isDefault ? "border-primary bg-primary/5" : hasKey ? "border-emerald-500/30 bg-emerald-500/5" : "border-transparent bg-muted/30"
        }`}
      >
        <button onClick={() => toggleExpand(p.id)} className="w-full flex items-center gap-2 p-2.5 text-left">
          {isExpanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          <span className="font-semibold text-sm flex-1">{p.name}</span>
          {hasKey && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
          {isDefault && (
            <Badge variant="outline" className="text-[10px] h-5 border-primary text-primary gap-1">
              <Star className="h-2.5 w-2.5 fill-current" /> Default
            </Badge>
          )}
        </button>
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2.5">
            <div className="relative">
              <Input
                type={showKeyFor[p.id] ? "text" : "password"}
                value={keys[p.id] || ""}
                onChange={(e) => updateKey(p.id, e.target.value)}
                placeholder={`Enter your ${p.name} API key`}
                className={`h-9 pr-9 font-mono text-xs ${wasSaved && !keyChanged ? "border-emerald-500/40 bg-emerald-500/5" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowKeyFor((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeyFor[p.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {isDefault && p.models.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Default Model</Label>
                <div className="flex flex-wrap gap-1">
                  {p.models.map((m) => (
                    <button key={m} onClick={() => setModel(m)} className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                      model === m ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}>{m}</button>
                  ))}
                </div>
              </div>
            )}
            {p.id === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Base URL</Label>
                <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="https://your-api.example.com/v1" className="h-9 font-mono text-xs" />
              </div>
            )}
            {!isDefault && (
              <button onClick={() => setAsDefault(p.id)} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                <Star className="h-3 w-3" /> Set as default provider
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Service Providers
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Configure API keys for direct providers, or use an AI router for access to many models with a single key.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-5">
            {/* ─── LEFT: Provider List (fixed height) ─── */}
            <div className="flex-1 min-w-0 flex flex-col h-[540px]">
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {/* Direct Providers */}
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">Direct Providers</p>
                {AI_DIRECT_PROVIDERS.map(renderProvider)}

                {/* AI Routers */}
                <div className="pt-3 mt-3 border-t border-border/50">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-1">AI Routers</p>
                  <p className="text-[10px] text-muted-foreground mb-2 px-1 leading-relaxed">
                    Routers give you access to models from many providers through a single API key. Set one up to enable per-stage model routing.
                  </p>
                  {AI_ROUTERS.map(renderProvider)}
                </div>
              </div>

              {/* Actions — pinned at bottom */}
              <div className="flex items-center gap-3 pt-3 border-t border-border/30 mt-3 shrink-0">
                <Button onClick={save} disabled={saving} size="sm" className="h-9">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save
                </Button>
                <Button variant="outline" onClick={testConnection} disabled={testing} size="sm" className="h-9">
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                  Test
                </Button>
              </div>
              {testResult && (
                <div className={`p-2.5 rounded-lg text-xs font-mono whitespace-pre-wrap mt-2 ${
                  testResult.startsWith("Error") ? "bg-red-500/10 text-red-700 dark:text-red-400" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                }`}>{testResult}</div>
              )}
            </div>

            {/* ─── RIGHT: Routing Panel (fixed height) ─── */}
            <div className="w-[340px] shrink-0 hidden lg:block h-[540px]">
              <div className={`rounded-xl border-2 h-full flex flex-col transition-all ${
                activeRouter ? "border-primary/30 bg-gradient-to-b from-primary/5 to-transparent" : "border-dashed border-border bg-muted/20"
              }`}>
                {/* Header */}
                <div className="p-4 border-b border-border/50 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${activeRouter ? "bg-primary/10" : "bg-muted/50"}`}>
                      <Lightbulb className={`h-4 w-4 ${activeRouter ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">Model Routing</p>
                      <p className="text-[11px] text-muted-foreground">
                        {activeRouter ? `Via ${activeRouter.name}` : "Requires an AI Router"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                  {!activeRouter ? (
                    /* ── No router configured ── */
                    <div className="text-center py-8 space-y-3">
                      <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                        <Brain className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Single Model Mode</p>
                        <p className="text-xs text-muted-foreground/70 mt-1.5 max-w-[240px] mx-auto leading-relaxed">
                          All stages use your default provider (<span className="font-medium text-foreground/60">{selectedProviderObj.name}</span>).
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-3 max-w-[240px] mx-auto leading-relaxed">
                          Add an <span className="font-medium text-foreground/60">OpenRouter</span> or <span className="font-medium text-foreground/60">LiteLLM</span> key to unlock per-stage routing — one key, many models.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* ── Router configured — show routing options ── */
                    <div className="space-y-4">
                      {/* Mode toggle */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setRoutingMode("fixed")}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            routingMode === "fixed" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <Star className={`h-4 w-4 mx-auto mb-1 ${routingMode === "fixed" ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-xs font-semibold">Fixed</p>
                          <p className="text-[10px] text-muted-foreground">One model for all</p>
                        </button>
                        <button
                          onClick={() => setRoutingMode("smart")}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            routingMode === "smart" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <Lightbulb className={`h-4 w-4 mx-auto mb-1 ${routingMode === "smart" ? "text-primary" : "text-muted-foreground"}`} />
                          <p className="text-xs font-semibold">Smart</p>
                          <p className="text-[10px] text-muted-foreground">Per-stage routing</p>
                        </button>
                      </div>

                      {routingMode === "fixed" ? (
                        /* ── Fixed: pick one model ── */
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold">Router Model</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              All pipeline stages will use this model via {activeRouter.name}.
                            </p>
                          </div>
                          <div className="space-y-1">
                            {routerModels.map((m) => (
                              <button
                                key={m}
                                onClick={() => setModel(m)}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs ${
                                  model === m
                                    ? "bg-primary/10 border border-primary/30 font-medium"
                                    : "bg-muted/30 hover:bg-muted/50"
                                }`}
                              >
                                {model === m && <Check className="h-3 w-3 text-primary shrink-0" />}
                                <span className="font-mono truncate">{m}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        /* ── Smart: assign per stage ── */
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold">Per-Stage Assignment</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Pick the best model for each pipeline stage via {activeRouter.name}.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {AI_STAGES.map((stage) => (
                              <div key={stage.id} className="rounded-lg bg-muted/30 p-2.5 space-y-1.5">
                                <div>
                                  <p className="text-xs font-semibold">{stage.label}</p>
                                  <p className="text-[10px] text-muted-foreground">{stage.description}</p>
                                </div>
                                <select
                                  value={stageAssignments[stage.id] || ""}
                                  onChange={(e) => setStageAssignments((prev) => ({ ...prev, [stage.id]: e.target.value }))}
                                  className="w-full h-7 rounded-md border border-border bg-background px-2 text-[11px] font-mono"
                                >
                                  <option value="">Use default ({model || selectedProviderObj.defaultModel})</option>
                                  {routerModels.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Save routing */}
                      <Button onClick={save} disabled={saving} size="sm" className="w-full h-9 text-xs">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                        Save Routing
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — PROMPT STUDIO
// ═══════════════════════════════════════════════════════════════════

function PromptStudioTab() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchPrompts = useCallback(() => {
    fetch("/api/settings/prompts")
      .then((r) => r.json())
      .then((data: PromptEntry[]) => {
        setPrompts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    prompts: prompts.filter((p) => p.category === cat),
  })).filter((g) => g.prompts.length > 0);

  const customizedCount = prompts.filter((p) => p.isCustomized).length;

  return (
    <div className="space-y-4 pt-2">
      {/* Summary */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Prompt Studio</h3>
              <p className="text-sm text-muted-foreground">
                {customizedCount} of {prompts.length} prompts customized
              </p>
            </div>
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-xs">
                {prompts.length} prompts
              </Badge>
              {customizedCount > 0 && (
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  {customizedCount} custom
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompt groups */}
      {grouped.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">
            {group.label}
          </h3>
          <div className="space-y-2">
            {group.prompts.map((prompt) => (
              <PromptCard
                key={prompt.featureKey}
                prompt={prompt}
                expanded={expandedKey === prompt.featureKey}
                onToggle={() =>
                  setExpandedKey(expandedKey === prompt.featureKey ? null : prompt.featureKey)
                }
                onSaved={fetchPrompts}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Prompt Card (expandable) ────────────────────────────────────────

function PromptCard({
  prompt,
  expanded,
  onToggle,
  onSaved,
}: {
  prompt: PromptEntry;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [editedPrompt, setEditedPrompt] = useState(prompt.customPrompt || prompt.defaultPrompt);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Reset editor when prompt data changes
  useEffect(() => {
    setEditedPrompt(prompt.customPrompt || prompt.defaultPrompt);
  }, [prompt.customPrompt, prompt.defaultPrompt]);

  const hasChanges = editedPrompt !== (prompt.customPrompt || prompt.defaultPrompt);
  const isModifiedFromDefault = editedPrompt !== prompt.defaultPrompt;

  const savePrompt = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureKey: prompt.featureKey, prompt: editedPrompt }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Saved "${prompt.label}" prompt`);
      onSaved();
    } catch {
      toast.error("Failed to save prompt");
    }
    setSaving(false);
  };

  const resetPrompt = async () => {
    if (!prompt.isCustomized) {
      setEditedPrompt(prompt.defaultPrompt);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`/api/settings/prompts?featureKey=${prompt.featureKey}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setEditedPrompt(prompt.defaultPrompt);
      toast.success(`Reset "${prompt.label}" to default`);
      onSaved();
    } catch {
      toast.error("Failed to reset prompt");
    }
    setResetting(false);
  };

  const testPrompt = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch("/api/settings/test-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: editedPrompt,
          variables: prompt.sampleVars,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setTestError(data.error);
      } else {
        setTestResult(data);
      }
    } catch {
      setTestError("Failed to reach the API");
    }
    setTesting(false);
  };

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      {/* Header (clickable) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{prompt.label}</p>
            {prompt.isCustomized && (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-0 text-[10px] px-1.5">
                Customized
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{prompt.description}</p>
        </div>
        {prompt.variables.length > 0 && (
          <span className="text-[10px] text-muted-foreground/50 shrink-0">
            {prompt.variables.length} vars
          </span>
        )}
      </button>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          {/* Variables */}
          {prompt.variables.length > 0 && (
            <div className="pt-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Template Variables
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {prompt.variables.map((v) => (
                  <code
                    key={v}
                    className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono"
                  >
                    {`{{${v}}}`}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Editor */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Prompt Text</Label>
              {isModifiedFromDefault && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  Modified from default
                </span>
              )}
            </div>
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              rows={Math.min(20, Math.max(6, editedPrompt.split("\n").length + 2))}
              className="font-mono text-xs leading-relaxed resize-y"
              spellCheck={false}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={testPrompt}
              disabled={testing}
              variant="outline"
              className="h-8"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test
            </Button>
            <Button
              size="sm"
              onClick={savePrompt}
              disabled={saving || !hasChanges}
              className="h-8"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Save className="h-3.5 w-3.5 mr-1.5" />
              )}
              Save as Default
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={resetPrompt}
              disabled={resetting || (!prompt.isCustomized && editedPrompt === prompt.defaultPrompt)}
              className="h-8 text-muted-foreground"
            >
              {resetting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Reset to Default
            </Button>
          </div>

          {/* Test result */}
          {testError && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-700 dark:text-red-400 text-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{testError}</p>
              </div>
            </div>
          )}
          {testResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Model: {testResult.model}</span>
                {testResult.tokensUsed && <span>| Tokens: {testResult.tokensUsed}</span>}
              </div>
              <div className="p-3 rounded-xl bg-muted/30 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                {testResult.output}
              </div>
              {/* Interpolated prompt preview */}
              <details className="text-xs">
                <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                  View interpolated prompt
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-muted/20 whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">
                  {testResult.interpolatedPrompt}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — PLATFORMS
// ═══════════════════════════════════════════════════════════════════

function PlatformsTab() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [credentials, setCredentials] = useState<Record<string, { username: string; password: string }>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPlatforms = useCallback(() => {
    fetch("/api/platforms/connect")
      .then((r) => r.json())
      .then((data: PlatformStatus[]) => {
        setPlatforms(data);
        // Pre-fill usernames for connected platforms
        setCredentials((prev) => {
          const next = { ...prev };
          for (const p of data) {
            if (p.connected && p.username && !next[p.platform]) {
              next[p.platform] = { username: p.username, password: "" };
            }
          }
          return next;
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const updateCred = (platform: string, field: "username" | "password", value: string) => {
    setCredentials((prev) => ({
      ...prev,
      [platform]: { username: prev[platform]?.username || "", password: prev[platform]?.password || "", [field]: value },
    }));
  };

  const saveCredentials = async (platform: string) => {
    const cred = credentials[platform];
    if (!cred?.username || !cred?.password) {
      toast.error("Both username and password are required");
      return;
    }
    setSaving(platform);
    try {
      const res = await fetch("/api/platforms/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username: cred.username, password: cred.password }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${platformInfo[platform]?.name} credentials saved`);
      // Clear password from local state after saving (it's stored encrypted server-side)
      setCredentials((prev) => ({ ...prev, [platform]: { username: cred.username, password: "" } }));
      fetchPlatforms();
    } catch {
      toast.error("Failed to save credentials");
    }
    setSaving(null);
  };

  const disconnect = async (platform: string) => {
    if (!confirm(`Disconnect from ${platformInfo[platform]?.name}?`)) return;
    try {
      await fetch(`/api/platforms/connect?platform=${platform}`, { method: "DELETE" });
      toast.success(`Disconnected from ${platformInfo[platform]?.name}`);
      setCredentials((prev) => {
        const next = { ...prev };
        delete next[platform];
        return next;
      });
      fetchPlatforms();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const connectedCount = platforms.filter((p) => p.connected).length;

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-5">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Platform Connections</h3>
              <p className="text-sm text-muted-foreground">
                {connectedCount} of {platforms.length} platforms connected
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>Enter your marketplace username and password for each platform you sell on.</p>
            <p>Credentials are encrypted with AES-256 and only used when publishing listings.</p>
          </div>
        </CardContent>
      </Card>

      {/* Platform list */}
      <div className="space-y-2">
        {platforms.map((p) => {
          const info = platformInfo[p.platform];
          if (!info) return null;
          const cred = credentials[p.platform] || { username: "", password: "" };
          const isSaving = saving === p.platform;

          return (
            <Card key={p.platform} className="border-0 shadow-sm">
              <CardContent className="py-4 space-y-3">
                {/* Platform header row */}
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${info.bg} ${info.color} flex items-center justify-center font-bold text-sm shrink-0`}>
                    {info.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{info.name}</p>
                    {p.connected ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected{p.username && p.username !== "extension-session" ? ` as ${p.username}` : ""}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    )}
                  </div>
                  {p.connected && (
                    <Button variant="outline" size="sm" className="h-7 text-xs text-destructive shrink-0" onClick={() => disconnect(p.platform)}>
                      Disconnect
                    </Button>
                  )}
                </div>

                {/* Credential fields */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Username / Email</Label>
                    <Input
                      value={cred.username}
                      onChange={(e) => updateCred(p.platform, "username", e.target.value)}
                      placeholder={`${info.name} username`}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword[p.platform] ? "text" : "password"}
                        value={cred.password}
                        onChange={(e) => updateCred(p.platform, "password", e.target.value)}
                        placeholder={p.connected ? "Saved — enter new to update" : `${info.name} password`}
                        className="h-9 text-sm pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => ({ ...prev, [p.platform]: !prev[p.platform] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword[p.platform] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-9 text-xs"
                    disabled={isSaving || !cred.username || !cred.password}
                    onClick={() => saveCredentials(p.platform)}
                  >
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {p.connected ? "Update" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — GENERAL
// ═══════════════════════════════════════════════════════════════════

function GeneralTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [defaultCondition, setDefaultCondition] = useState("Good");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [listingExpiry, setListingExpiry] = useState("30");
  const [themeColor, setThemeColor] = useState("teal");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        if (data.default_condition) setDefaultCondition(data.default_condition);
        if (data.default_category) setDefaultCategory(data.default_category);
        if (data.currency) setCurrency(data.currency);
        if (data.listing_expiry_days) setListingExpiry(data.listing_expiry_days);
        setThemeColor(getSavedThemeFromStorage());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            default_condition: defaultCondition,
            default_category: defaultCategory,
            currency,
            listing_expiry_days: listingExpiry,
            theme_color: themeColor,
          },
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("General settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const conditions = ["New with tags", "Like new", "Good", "Fair", "Poor"];
  const categories = [
    "", "Tops", "Bottoms", "Outerwear", "Footwear", "Accessories",
    "Dresses", "Activewear", "Bags", "Jewelry", "Streetwear",
    "Vintage", "Designer", "Sportswear", "Other",
  ];
  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];

  const handleApplyTheme = (colorId: string) => {
    setThemeColor(colorId);
    const isDark = document.documentElement.classList.contains("dark");
    applyThemeFromLib(colorId, isDark);
    saveThemeToStorage(colorId);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Theme Color */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Accent Color
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Choose the primary accent color used across the entire platform
          </p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {Object.entries(THEME_MAP).map(([id, theme]) => (
              <button
                key={id}
                onClick={() => handleApplyTheme(id)}
                className="group flex flex-col items-center gap-1.5"
              >
                <div
                  className={`relative h-10 w-10 rounded-xl transition-all duration-200 group-hover:scale-110 group-hover:shadow-md ${
                    themeColor === id ? "ring-2 ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{
                    backgroundColor: theme.light,
                    boxShadow: themeColor === id ? `0 0 0 2px var(--background), 0 0 0 4px ${theme.light}` : undefined,
                  }}
                >
                  {themeColor === id && (
                    <Check className="h-4 w-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{theme.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listing Defaults */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Listing Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Condition */}
            <div className="space-y-2">
              <Label>Default Condition</Label>
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDefaultCondition(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      defaultCondition === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Category */}
            <div className="space-y-2">
              <Label>Default Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.slice(0, 8).map((c) => (
                  <button
                    key={c || "__none__"}
                    onClick={() => setDefaultCategory(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      defaultCategory === c
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {c || "None"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <div className="flex flex-wrap gap-1.5">
              {currencies.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currency === c
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Listing Expiry */}
          <div className="space-y-2">
            <Label>Auto-stale after (days)</Label>
            <p className="text-xs text-muted-foreground">
              Listings older than this will be flagged for repricing
            </p>
            <Input
              type="number"
              value={listingExpiry}
              onChange={(e) => setListingExpiry(e.target.value)}
              min={1}
              max={365}
              className="h-11 w-32"
            />
          </div>

          <Button onClick={save} disabled={saving} className="h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">About ListBlitz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">ListBlitz</span> — AI-Powered Cross-Platform Listing Tool
            </p>
            <p>List once, sell everywhere. Optimized for Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook Marketplace, and Vestiaire Collective.</p>
            <p className="text-xs">Version 0.1.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
