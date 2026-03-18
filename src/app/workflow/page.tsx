"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, Wand2, Target, DollarSign, ShieldCheck, Send, MessageCircle,
  Radar, Check, Loader2, Sparkles, Eye, EyeOff,
  RotateCcw, Play, X, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PipelineNode } from "@/components/pipeline/pipeline-node";
import { PipelineToolbar } from "@/components/pipeline/pipeline-toolbar";
import { DataInspector } from "@/components/pipeline/data-inspector";
import { usePipelineReducer } from "@/components/pipeline/use-pipeline-reducer";
import type { StageStatus } from "@/components/pipeline/use-pipeline-reducer";

// ── Stages ──

interface Stage {
  id: string; label: string; shortLabel: string; description: string;
  icon: React.ComponentType<{ className?: string }>; color: string; aiFeature: string;
  inputLabel: string; inputExample: string; outputLabel: string; outputExample: string;
}

const STAGES: Stage[] = [
  { id: "smart_list", label: "AI Vision", shortLabel: "Vision", description: "Upload a photo — AI identifies the item and generates a listing draft.", icon: Camera, color: "#007AFF", aiFeature: "smart_list_system", inputLabel: "Product Photo", inputExample: "JPEG/PNG image", outputLabel: "Listing Draft", outputExample: '{ "title": "Nike Air Max 90", "price": 120 }' },
  { id: "enhance", label: "Description", shortLabel: "Desc", description: "Rough notes polished into SEO-optimized descriptions.", icon: Wand2, color: "#34C759", aiFeature: "enhance", inputLabel: "Rough Notes", inputExample: "vintage nike windbreaker", outputLabel: "Polished Text", outputExample: "Full SEO description." },
  { id: "optimize", label: "Optimize", shortLabel: "Optimize", description: "Listing rewritten for each marketplace's algorithm.", icon: Target, color: "#FF9500", aiFeature: "optimize", inputLabel: "Base Listing", inputExample: "Title + description", outputLabel: "8 Versions", outputExample: "Per-platform listings." },
  { id: "price_intel", label: "Price Intel", shortLabel: "Price", description: "AI analyzes competitor pricing per platform.", icon: DollarSign, color: "#AF52DE", aiFeature: "price_intel", inputLabel: "Item Details", inputExample: "Brand, condition, size", outputLabel: "Pricing", outputExample: "Price recommendations." },
  { id: "health_score", label: "Health Score", shortLabel: "Health", description: "Grades listing quality and suggests fixes.", icon: ShieldCheck, color: "#FF3B30", aiFeature: "health_score", inputLabel: "Full Listing", inputExample: "All fields filled", outputLabel: "Score", outputExample: "87/100 + improvements." },
  { id: "publish", label: "Publish", shortLabel: "Publish", description: "Publishes to all connected platforms.", icon: Send, color: "#0A84FF", aiFeature: "", inputLabel: "Optimized Listings", inputExample: "Platform versions", outputLabel: "Live URLs", outputExample: "Published links." },
  { id: "negotiate", label: "Negotiate", shortLabel: "Negotiate", description: "AI drafts buyer message responses.", icon: MessageCircle, color: "#30D158", aiFeature: "negotiate_response", inputLabel: "Buyer Message", inputExample: '"Would you take $120?"', outputLabel: "3 Replies", outputExample: "FIRM, NEGOTIATE, ACCEPT." },
  { id: "trends", label: "Trends", shortLabel: "Trends", description: "Real-time market trend reports.", icon: Radar, color: "#FF9F0A", aiFeature: "trends", inputLabel: "Market Data", inputExample: "Current conditions", outputLabel: "Report", outputExample: "Trending categories." },
];

const AI_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: { label: "OpenAI", models: ["gpt-5.4", "gpt-5.4-pro", "gpt-5.2", "gpt-5-mini"] },
  google: { label: "Gemini", models: ["gemini-3.1-pro-preview", "gemini-2.5-pro", "gemini-2.5-flash"] },
  groq: { label: "Groq", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
};

const STORAGE_KEY = "listblitz-pipeline-positions";

/** Generate default positions: serpentine flow */
function defaultPositions(): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  const cols = 3;
  const gapX = 260;
  const gapY = 170;
  const startX = 30;
  const startY = 15;
  STAGES.forEach((s, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 === 0 ? i % cols : cols - 1 - (i % cols); // serpentine
    pos[s.id] = { x: startX + col * gapX, y: startY + row * gapY };
  });
  return pos;
}

function loadPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === "undefined") return defaultPositions();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return defaultPositions();
}

// ═══════════════════════════════════════════════════════════════

export default function WorkflowPage() {
  const [pipelineState, dispatch] = usePipelineReducer(STAGES.map((s) => s.id));
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(defaultPositions);
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
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load saved positions
  useEffect(() => { setPositions(loadPositions()); }, []);

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

  // Drag handlers
  const handleDrag = useCallback((stageId: string, dx: number, dy: number) => {
    setPositions((prev) => ({
      ...prev,
      [stageId]: { x: Math.max(0, prev[stageId].x + dx), y: Math.max(0, prev[stageId].y + dy) },
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setPositions((prev) => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prev)); } catch {}
      return prev;
    });
  }, []);

  const resetPositions = useCallback(() => {
    const pos = defaultPositions();
    setPositions(pos);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Pipeline execution
  const runPipeline = useCallback(async () => {
    dispatch({ type: "RUN_PIPELINE", stageIds: STAGES.map((s) => s.id) });
    const runId = crypto.randomUUID();
    runRef.current = runId;
    const delay = [2000, 1000, 500][pipelineState.speed - 1] || 2000;

    for (let i = 0; i < STAGES.length; i++) {
      if (runRef.current !== runId) return;
      dispatch({ type: "STAGE_START", stageId: STAGES[i].id, index: i });

      if (pipelineState.breakpoints.has(STAGES[i].id)) {
        dispatch({ type: "STAGE_PAUSE", stageId: STAGES[i].id, data: STAGES[i].outputExample });
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (runRef.current !== runId) { clearInterval(check); resolve(); }
          }, 200);
          // Also listen for resume via custom event
          const handler = () => { clearInterval(check); resolve(); };
          window.addEventListener(`pipeline-resume-${STAGES[i].id}`, handler, { once: true });
        });
        if (runRef.current !== runId) return;
      }

      await new Promise((r) => setTimeout(r, delay));
      if (runRef.current !== runId) return;
      dispatch({ type: "STAGE_COMPLETE", stageId: STAGES[i].id });
      await new Promise((r) => setTimeout(r, 200));
    }
    toast.success("Pipeline completed!");
  }, [pipelineState.speed, pipelineState.breakpoints, dispatch]);

  const handleResume = useCallback((stageId: string) => {
    dispatch({ type: "STAGE_RESUME", stageId });
    window.dispatchEvent(new Event(`pipeline-resume-${stageId}`));
  }, [dispatch]);

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

  // Compute canvas height from node positions
  const canvasHeight = Math.max(500, ...Object.values(positions).map((p) => p.y + 200));

  // Build SVG paths
  const svgPaths = STAGES.slice(0, -1).map((stage, i) => {
    const from = positions[stage.id];
    const to = positions[STAGES[i + 1].id];
    if (!from || !to) return null;
    const nodeW = 220;
    const x1 = from.x + nodeW / 2;
    const y1 = from.y + 110; // bottom of node
    const x2 = to.x + nodeW / 2;
    const y2 = to.y - 6; // top of node

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cp = Math.max(Math.abs(dy) * 0.4, 30);

    const path = `M ${x1} ${y1} C ${x1 + dx * 0.1} ${y1 + cp}, ${x2 - dx * 0.1} ${y2 - cp}, ${x2} ${y2}`;

    const status = pipelineState.stages[stage.id] as StageStatus;
    const nextStatus = pipelineState.stages[STAGES[i + 1].id] as StageStatus;
    const isFlowing = status === "completed" && (nextStatus === "running" || nextStatus === "completed" || nextStatus === "paused");
    const isComplete = status === "completed" && nextStatus === "completed";

    return { path, color: stage.color, isFlowing, isComplete, index: i };
  }).filter(Boolean) as { path: string; color: string; isFlowing: boolean; isComplete: boolean; index: number }[];

  const pausedStageId = Object.entries(pipelineState.stages).find(([, s]) => s === "paused")?.[0];
  const pausedStage = pausedStageId ? STAGES.find((s) => s.id === pausedStageId) : null;
  const configuredStage = configStage ? STAGES.find((s) => s.id === configStage) : null;
  const configuredConfig = configStage ? stageConfigs[configStage] : null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">AI Workflow Pipeline</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Drag nodes to rearrange &middot; Set breakpoints to intercept data &middot; <button onClick={resetPositions} className="underline hover:text-foreground transition-colors">Reset layout</button>
          </p>
        </div>
      </div>

      <PipelineToolbar
        state={pipelineState}
        totalStages={STAGES.length}
        onRun={runPipeline}
        onStop={stopPipeline}
        onReset={() => { dispatch({ type: "RESET", stageIds: STAGES.map((s) => s.id) }); resetPositions(); }}
        onResume={() => { if (pausedStageId) handleResume(pausedStageId); }}
        onSpeedChange={(s) => dispatch({ type: "SET_SPEED", speed: s })}
        onModeChange={(m) => dispatch({ type: "SET_MODE", mode: m })}
      />

      {/* ═══ NODE GRAPH CANVAS ═══ */}
      <div
        ref={canvasRef}
        className="relative rounded-2xl border border-[var(--border)] bg-card/30 overflow-hidden"
        style={{ minHeight: canvasHeight }}
      >
        {/* Grid background pattern */}
        <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
          <defs>
            <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* SVG Connection Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]" style={{ overflow: "visible" }}>
          <defs>
            {STAGES.map((s) => (
              <filter key={s.id} id={`glow-${s.id}`}>
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>
          {svgPaths.map((p) => (
            <g key={p.index}>
              {/* Shadow path */}
              {p.isFlowing && (
                <path d={p.path} stroke={p.color} strokeWidth={4} fill="none" opacity={0.08} filter={`url(#glow-${STAGES[p.index].id})`} />
              )}
              {/* Main path */}
              <path
                d={p.path}
                stroke={p.color}
                strokeWidth={p.isFlowing ? 2.5 : 1.5}
                strokeDasharray={p.isComplete ? "none" : p.isFlowing ? "none" : "6 4"}
                fill="none"
                opacity={p.isFlowing ? 0.7 : p.isComplete ? 0.5 : 0.15}
                strokeLinecap="round"
                className={!p.isFlowing && !p.isComplete ? "animate-dash" : ""}
              />
              {/* Flowing particles */}
              {p.isFlowing && (
                <>
                  <circle r="4" fill={p.color} opacity="0.9" filter={`url(#glow-${STAGES[p.index].id})`}>
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={p.path} />
                  </circle>
                  <circle r="2" fill="white" opacity="0.8">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={p.path} />
                  </circle>
                  <circle r="3" fill={p.color} opacity="0.6">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path={p.path} begin="0.6s" />
                  </circle>
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Draggable nodes */}
        {STAGES.map((stage, i) => (
          <PipelineNode
            key={stage.id}
            index={i}
            label={stage.label}
            icon={stage.icon}
            color={stage.color}
            status={pipelineState.stages[stage.id] as StageStatus}
            isAI={!!stage.aiFeature}
            hasBreakpoint={pipelineState.breakpoints.has(stage.id)}
            x={positions[stage.id]?.x ?? 0}
            y={positions[stage.id]?.y ?? 0}
            onDrag={(dx, dy) => handleDrag(stage.id, dx, dy)}
            onDragEnd={handleDragEnd}
            onToggleBreakpoint={() => dispatch({ type: "SET_BREAKPOINT", stageId: stage.id })}
            onClick={() => { setConfigStage(configStage === stage.id ? null : stage.id); setTestResult(null); setEditingPrompt(null); }}
            isSelected={configStage === stage.id}
          />
        ))}
      </div>

      {/* ═══ DATA INSPECTOR ═══ */}
      {pausedStage && pausedStageId && (
        <DataInspector
          stageLabel={pausedStage.label}
          stageColor={pausedStage.color}
          data={pipelineState.interceptedData[pausedStageId] || pausedStage.outputExample}
          onDataChange={(data) => dispatch({ type: "SET_INTERCEPTED_DATA", stageId: pausedStageId, data })}
          onContinue={() => handleResume(pausedStageId)}
          onAbort={stopPipeline}
        />
      )}

      {/* ═══ CONFIG PANEL ═══ */}
      {configuredStage && configuredConfig && (
        <div className="rounded-2xl border border-[var(--border)] bg-card p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${configuredStage.color}15`, color: configuredStage.color }}>
                <configuredStage.icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{configuredStage.label}</h3>
                <p className="text-[10px] text-muted-foreground">{configuredStage.description}</p>
              </div>
            </div>
            <button onClick={() => setConfigStage(null)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>

          {configuredStage.aiFeature ? (
            <>
              {/* Prompt */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prompt Template</span>
                  {editingPrompt === configuredStage.aiFeature ? (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => resetPrompt(configuredStage.aiFeature)}><RotateCcw className="h-2.5 w-2.5 mr-0.5" />Reset</Button>
                      <Button size="sm" className="h-5 text-[9px] px-1.5" onClick={() => savePrompt(configuredStage.aiFeature)} disabled={saving}>{saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5 mr-0.5" />}Save</Button>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5" onClick={() => { setEditingPrompt(configuredStage.aiFeature); setPromptDraft(prompts[configuredStage.aiFeature] || ""); }}><Pencil className="h-2.5 w-2.5 mr-0.5" />Edit</Button>
                  )}
                </div>
                {editingPrompt === configuredStage.aiFeature ? (
                  <textarea value={promptDraft} onChange={(e) => setPromptDraft(e.target.value)} className="w-full h-[140px] rounded border border-border bg-background p-2 text-[10px] font-mono resize-y focus:outline-none focus:ring-1 focus:ring-[var(--primary)]" />
                ) : (
                  <pre className="text-[9px] font-mono text-muted-foreground whitespace-pre-wrap max-h-[100px] overflow-y-auto">{(prompts[configuredStage.aiFeature] || "Loading...").slice(0, 400)}</pre>
                )}
              </div>

              {/* Provider / model / key */}
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(AI_MODELS).map(([id, p]) => (
                  <button key={id} onClick={() => { updateStageConfig(configuredStage.id, "provider", id); updateStageConfig(configuredStage.id, "model", p.models[0]); }}
                    className={cn("px-2 py-1 rounded-md text-[10px] font-medium", configuredConfig.provider === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground")}>{p.label}</button>
                ))}
                <select value={configuredConfig.model || ""} onChange={(e) => updateStageConfig(configuredStage.id, "model", e.target.value)} className="h-6 rounded border border-border bg-background px-1.5 text-[10px] font-mono">
                  <option value="">Default</option>
                  {(AI_MODELS[configuredConfig.provider]?.models || []).map((m) => (<option key={m} value={m}>{m}</option>))}
                </select>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} value={configuredConfig.apiKey} onChange={(e) => updateStageConfig(configuredStage.id, "apiKey", e.target.value)} placeholder="Key" className="h-6 text-[10px] font-mono w-[100px] pr-6" />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground">{showKey ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}</button>
                </div>
              </div>

              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => testStage(configuredStage)} disabled={testing}>{testing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Play className="h-2.5 w-2.5" />}Test</Button>
                <Button size="sm" className="h-6 text-[10px] gap-1" onClick={() => saveStageConfig(configuredStage.id)} disabled={saving}>{saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}Save</Button>
              </div>

              {testResult && (
                <div className="rounded-lg bg-muted/50 p-2">
                  <div className="flex items-center justify-between mb-1"><span className="text-[9px] font-bold uppercase text-muted-foreground">Result</span><button onClick={() => setTestResult(null)}><X className="h-2.5 w-2.5 text-muted-foreground" /></button></div>
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
}
