"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { StageCard } from "@/components/pipeline/stage-card";
import { PipelineToolbar } from "@/components/pipeline/pipeline-toolbar";
import { DataInspector } from "@/components/pipeline/data-inspector";
import { usePipelineReducer } from "@/components/pipeline/use-pipeline-reducer";
import type { StageStatus } from "@/components/pipeline/use-pipeline-reducer";

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
  { id: "smart_list", label: "AI Vision", shortLabel: "Vision", description: "Upload a photo — AI identifies the item, brand, condition, and generates a full listing draft with pricing suggestions.", icon: Camera, color: "#007AFF", aiFeature: "smart_list_system", inputLabel: "Product Photo", inputExample: "JPEG/PNG image of the item from multiple angles", outputLabel: "Listing Draft", outputExample: '{ "title": "Nike Air Max 90 OG", "brand": "Nike", "price": 120 }' },
  { id: "enhance", label: "Description", shortLabel: "Desc", description: "Rough notes are polished into a professional, SEO-optimized listing description with keywords.", icon: Wand2, color: "#34C759", aiFeature: "enhance", inputLabel: "Rough Notes", inputExample: '"vintage nike windbreaker, 90s, size L"', outputLabel: "Polished Description", outputExample: "Full SEO-optimized product description." },
  { id: "optimize", label: "Platform Optimize", shortLabel: "Optimize", description: "The listing is rewritten for each marketplace's tone, audience, and algorithm.", icon: Target, color: "#FF9500", aiFeature: "optimize", inputLabel: "Base Listing", inputExample: "Title + description + category + brand", outputLabel: "8 Platform Versions", outputExample: "Depop, Grailed, Poshmark, Mercari..." },
  { id: "price_intel", label: "Price Intelligence", shortLabel: "Price", description: "AI analyzes competitor pricing and suggests optimal price per platform.", icon: DollarSign, color: "#AF52DE", aiFeature: "price_intel", inputLabel: "Item Details", inputExample: "Brand, category, condition, size", outputLabel: "Pricing Strategy", outputExample: "Per-platform price recommendations." },
  { id: "health_score", label: "Health Score", shortLabel: "Health", description: "Grades your listing on title quality, description, photos, pricing, and coverage.", icon: ShieldCheck, color: "#FF3B30", aiFeature: "health_score", inputLabel: "Complete Listing", inputExample: "The full listing with all fields", outputLabel: "Score & Fixes", outputExample: "Score: 87/100, 3 improvements." },
  { id: "publish", label: "Cross-Publish", shortLabel: "Publish", description: "Publishes optimized listings to all connected platforms.", icon: Send, color: "#0A84FF", aiFeature: "", inputLabel: "Optimized Listings", inputExample: "Platform-specific versions", outputLabel: "Live on Platforms", outputExample: "Published URLs for each platform." },
  { id: "negotiate", label: "Negotiation", shortLabel: "Negotiate", description: "AI drafts responses to buyer messages with 3 strategy options.", icon: MessageCircle, color: "#30D158", aiFeature: "negotiate_response", inputLabel: "Buyer Message", inputExample: '"Would you take $120?"', outputLabel: "3 Reply Options", outputExample: "FIRM, NEGOTIATE, ACCEPT." },
  { id: "trends", label: "Market Trends", shortLabel: "Trends", description: "Real-time trend reports with category heat, brand rankings, and seasonal advice.", icon: Radar, color: "#FF9F0A", aiFeature: "trends", inputLabel: "Market Data", inputExample: "Current market conditions", outputLabel: "Trend Report", outputExample: "Trending categories, hot brands." },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5-mini"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

// ═══════════════════════════════════════════════════════════════

export default function WorkflowPage() {
  const [pipelineState, dispatch] = usePipelineReducer(STAGES.map((s) => s.id));
  const [configStage, setConfigStage] = useState<string | null>(null);
  const [stageConfigs, setStageConfigs] = useState<Record<string, { provider: string; model: string; apiKey: string }>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState("gpt-5.4");
  const runRef = useRef<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [connectors, setConnectors] = useState<{ x1: number; y1: number; x2: number; y2: number; color: string }[]>([]);

  // Load settings
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((data: Record<string, string>) => {
      setDefaultModel(data.ai_model || "gpt-5.4");
      const configs: Record<string, { provider: string; model: string; apiKey: string }> = {};
      STAGES.forEach((s) => { configs[s.id] = { provider: data[`workflow_${s.id}_provider`] || data.ai_provider || "openai", model: data[`workflow_${s.id}_model`] || "", apiKey: data[`workflow_${s.id}_key`] || "" }; });
      setStageConfigs(configs);
    }).catch(() => {});
    fetch("/api/settings/prompts").then((r) => r.json()).then((data: { featureKey: string; prompt: string }[]) => {
      const m: Record<string, string> = {};
      data.forEach((p) => { m[p.featureKey] = p.prompt; });
      setPrompts(m);
    }).catch(() => {});
  }, []);

  // Compute SVG connector positions
  useEffect(() => {
    const compute = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const paths: typeof connectors = [];
      for (let i = 0; i < STAGES.length - 1; i++) {
        const from = cardRefs.current[i];
        const to = cardRefs.current[i + 1];
        if (!from || !to) continue;
        const r1 = from.getBoundingClientRect();
        const r2 = to.getBoundingClientRect();
        paths.push({
          x1: r1.left + r1.width / 2 - containerRect.left,
          y1: r1.bottom - containerRect.top,
          x2: r2.left + r2.width / 2 - containerRect.left,
          y2: r2.top - containerRect.top,
          color: STAGES[i].color,
        });
      }
      setConnectors(paths);
    };
    compute();
    window.addEventListener("resize", compute);
    const observer = new MutationObserver(compute);
    if (containerRef.current) observer.observe(containerRef.current, { childList: true, subtree: true, attributes: true });
    return () => { window.removeEventListener("resize", compute); observer.disconnect(); };
  }, [configStage, pipelineState.stages]);

  // Pipeline execution engine
  const runPipeline = useCallback(async () => {
    dispatch({ type: "RUN_PIPELINE", stageIds: STAGES.map((s) => s.id) });
    const runId = crypto.randomUUID();
    runRef.current = runId;
    const delay = [2000, 1000, 500][pipelineState.speed - 1] || 2000;

    for (let i = 0; i < STAGES.length; i++) {
      if (runRef.current !== runId) return; // stopped

      dispatch({ type: "STAGE_START", stageId: STAGES[i].id, index: i });

      // Check for breakpoint BEFORE running
      if (pipelineState.breakpoints.has(STAGES[i].id)) {
        dispatch({ type: "STAGE_PAUSE", stageId: STAGES[i].id, data: STAGES[i].outputExample });
        // Wait for resume — polling approach (reducer will change status)
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (runRef.current !== runId) { clearInterval(check); resolve(); return; }
            // Check if stage was resumed or pipeline stopped
            const el = cardRefs.current[i];
            if (el?.dataset.status === "running" || el?.dataset.status === "completed") { clearInterval(check); resolve(); }
          }, 200);
        });
        if (runRef.current !== runId) return;
      }

      // Simulate work
      await new Promise((r) => setTimeout(r, delay));
      if (runRef.current !== runId) return;

      dispatch({ type: "STAGE_COMPLETE", stageId: STAGES[i].id });
      await new Promise((r) => setTimeout(r, 300)); // brief pause between stages
    }

    toast.success("Pipeline completed!");
  }, [pipelineState.speed, pipelineState.breakpoints, dispatch]);

  const stopPipeline = () => {
    runRef.current = null;
    dispatch({ type: "RESET", stageIds: STAGES.map((s) => s.id) });
  };

  // Config helpers
  const updateStageConfig = (stageId: string, field: string, value: string) => {
    setStageConfigs((prev) => ({ ...prev, [stageId]: { ...prev[stageId], [field]: value } }));
  };

  const saveStageConfig = async (stageId: string) => {
    setSaving(true);
    const config = stageConfigs[stageId];
    if (!config) { setSaving(false); return; }
    try {
      await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: { [`workflow_${stageId}_provider`]: config.provider, [`workflow_${stageId}_model`]: config.model, ...(config.apiKey ? { [`workflow_${stageId}_key`]: config.apiKey } : {}) } }) });
      toast.success("Saved");
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  const savePrompt = async (featureKey: string) => {
    setSaving(true);
    try {
      await fetch("/api/settings/prompts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey, prompt: promptDraft }) });
      setPrompts((prev) => ({ ...prev, [featureKey]: promptDraft }));
      setEditingPrompt(null);
      toast.success("Prompt saved");
    } catch { toast.error("Failed"); }
    setSaving(false);
  };

  const resetPrompt = async (featureKey: string) => {
    try {
      await fetch(`/api/settings/prompts?featureKey=${featureKey}`, { method: "DELETE" });
      setPrompts((prev) => { const n = { ...prev }; delete n[featureKey]; return n; });
      setEditingPrompt(null);
      const res = await fetch("/api/settings/prompts");
      const data = await res.json();
      const m: Record<string, string> = {};
      data.forEach((p: { featureKey: string; prompt: string }) => { m[p.featureKey] = p.prompt; });
      setPrompts(m);
    } catch { toast.error("Failed"); }
  };

  const testStage = async (stage: Stage) => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-prompt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ featureKey: stage.aiFeature }) });
      const data = await res.json();
      setTestResult(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    } catch { setTestResult("Test failed."); }
    setTesting(false);
  };

  const pausedStageId = Object.entries(pipelineState.stages).find(([, s]) => s === "paused")?.[0];
  const pausedStage = pausedStageId ? STAGES.find((s) => s.id === pausedStageId) : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          {STAGES.length} stages &middot; Default model: <span className="font-mono text-foreground">{defaultModel}</span> &middot; Set breakpoints to pause &amp; inspect data
        </p>
      </div>

      {/* Toolbar */}
      <PipelineToolbar
        state={pipelineState}
        totalStages={STAGES.length}
        onRun={runPipeline}
        onStop={stopPipeline}
        onReset={() => dispatch({ type: "RESET", stageIds: STAGES.map((s) => s.id) })}
        onSpeedChange={(s) => dispatch({ type: "SET_SPEED", speed: s })}
        onModeChange={(m) => dispatch({ type: "SET_MODE", mode: m })}
      />

      {/* ═══ PIPELINE CANVAS ═══ */}
      <div ref={containerRef} className="relative">
        {/* SVG connector overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ overflow: "visible" }}>
          {connectors.map((c, i) => {
            const stage = STAGES[i];
            const status = pipelineState.stages[stage.id] as StageStatus;
            const nextStatus = pipelineState.stages[STAGES[i + 1]?.id] as StageStatus;
            const isFlowing = status === "completed" && (nextStatus === "running" || nextStatus === "completed");
            const isCompleted = status === "completed" && nextStatus === "completed";

            // Bezier control points
            const midY = (c.y1 + c.y2) / 2;
            const path = `M ${c.x1} ${c.y1} C ${c.x1} ${midY}, ${c.x2} ${midY}, ${c.x2} ${c.y2}`;

            return (
              <g key={i}>
                {/* Base path */}
                <path
                  d={path}
                  stroke={c.color}
                  strokeWidth={isFlowing ? 2.5 : 1.5}
                  strokeDasharray={isCompleted ? "none" : "6 4"}
                  fill="none"
                  opacity={isFlowing ? 0.6 : isCompleted ? 0.4 : 0.15}
                  className={!isCompleted && !isFlowing ? "animate-dash" : ""}
                  strokeLinecap="round"
                />

                {/* Flowing particle */}
                {isFlowing && (
                  <>
                    <circle r="3" fill={c.color} opacity="0.9">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                    </circle>
                    <circle r="6" fill={c.color} opacity="0.15">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path={path} />
                    </circle>
                    {/* Second particle, staggered */}
                    <circle r="2.5" fill={c.color} opacity="0.7">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path={path} begin="0.7s" />
                    </circle>
                  </>
                )}

                {/* Completed check */}
                {isCompleted && (
                  <circle cx={c.x2} cy={c.y2 - 4} r="0" fill={c.color} opacity="0">
                    {/* invisible — just keeping the structure */}
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {/* Stage cards — zigzag on xl+, 2-col on md, 1-col on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {STAGES.map((stage, i) => {
            const config = stageConfigs[stage.id];
            const hasCustomModel = config?.model && config.model !== defaultModel && config.model !== "";
            const isConfigOpen = configStage === stage.id;

            return (
              <div key={stage.id} ref={(el) => { cardRefs.current[i] = el; }} data-status={pipelineState.stages[stage.id]}>
                <StageCard
                  index={i}
                  label={stage.label}
                  shortLabel={stage.shortLabel}
                  description={stage.description}
                  icon={stage.icon}
                  color={stage.color}
                  status={pipelineState.stages[stage.id] as StageStatus}
                  isAI={!!stage.aiFeature}
                  hasBreakpoint={pipelineState.breakpoints.has(stage.id)}
                  inputLabel={stage.inputLabel}
                  outputLabel={stage.outputLabel}
                  modelBadge={hasCustomModel ? config.model : `default · ${defaultModel}`}
                  onToggleBreakpoint={() => dispatch({ type: "SET_BREAKPOINT", stageId: stage.id })}
                  onClick={() => { setConfigStage(isConfigOpen ? null : stage.id); setTestResult(null); setEditingPrompt(null); }}
                />

                {/* Inline config panel */}
                {isConfigOpen && config && (
                  <div className="mt-2 rounded-xl border border-[var(--border)] bg-card p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color: stage.color }}>Configure {stage.label}</span>
                      <button onClick={() => setConfigStage(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                    </div>

                    {stage.aiFeature ? (
                      <>
                        {/* Prompt */}
                        <div className="rounded-lg border border-border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt</span>
                            {editingPrompt === stage.aiFeature ? (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => resetPrompt(stage.aiFeature)}><RotateCcw className="h-2.5 w-2.5 mr-0.5" />Reset</Button>
                                <Button size="sm" className="h-5 text-[9px] px-1.5" onClick={() => savePrompt(stage.aiFeature)} disabled={saving}>{saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5 mr-0.5" />}Save</Button>
                              </div>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => { setEditingPrompt(stage.aiFeature); setPromptDraft(prompts[stage.aiFeature] || ""); }}><Pencil className="h-2.5 w-2.5 mr-0.5" />Edit</Button>
                            )}
                          </div>
                          {editingPrompt === stage.aiFeature ? (
                            <textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} className="w-full h-[140px] rounded border border-border bg-background p-2 text-[10px] font-mono resize-y focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                          ) : (
                            <pre className="text-[9px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[100px] overflow-y-auto">{(prompts[stage.aiFeature] || "Loading...").slice(0, 300)}{(prompts[stage.aiFeature] || "").length > 300 ? "..." : ""}</pre>
                          )}
                        </div>

                        {/* Provider + model */}
                        <div className="flex flex-wrap items-center gap-2">
                          {Object.entries(AI_MODELS).map(([id, p]) => (
                            <button key={id} onClick={() => { updateStageConfig(stage.id, "provider", id); updateStageConfig(stage.id, "model", p.models[0]); }}
                              className={cn("px-2 py-1 rounded-md text-[10px] font-medium", config.provider === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground")}>{p.label}</button>
                          ))}
                          <select value={config.model || ""} onChange={(e) => updateStageConfig(stage.id, "model", e.target.value)} className="h-6 rounded border border-border bg-background px-1.5 text-[10px] font-mono">
                            <option value="">Default</option>
                            {(AI_MODELS[config.provider]?.models || []).map((m) => (<option key={m} value={m}>{m}</option>))}
                          </select>
                          <div className="relative">
                            <Input type={showKey ? "text" : "password"} value={config.apiKey} onChange={(e) => updateStageConfig(stage.id, "apiKey", e.target.value)} placeholder="Key" className="h-6 text-[10px] font-mono w-[100px] pr-6" />
                            <button onClick={() => setShowKey(!showKey)} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">{showKey ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}</button>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => testStage(stage)} disabled={testing}>{testing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}Test</Button>
                          <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => saveStageConfig(stage.id)} disabled={saving}>{saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}Save</Button>
                        </div>

                        {testResult && (
                          <div className="rounded-lg bg-muted/50 p-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-bold uppercase text-muted-foreground">Result</span>
                              <button onClick={() => setTestResult(null)}><X className="h-2.5 w-2.5 text-muted-foreground" /></button>
                            </div>
                            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[150px] overflow-y-auto">{testResult}</pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">This stage uses platform automation — no AI prompt needed.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ DATA INSPECTOR (breakpoint hit) ═══ */}
      {pausedStage && pausedStageId && (
        <DataInspector
          stageLabel={pausedStage.label}
          stageColor={pausedStage.color}
          data={pipelineState.interceptedData[pausedStageId] || pausedStage.outputExample}
          onDataChange={(data) => dispatch({ type: "SET_INTERCEPTED_DATA", stageId: pausedStageId, data })}
          onContinue={() => dispatch({ type: "STAGE_RESUME", stageId: pausedStageId })}
          onAbort={stopPipeline}
        />
      )}
    </div>
  );
}
