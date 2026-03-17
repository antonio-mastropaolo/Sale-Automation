"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAdmin } from "@/lib/use-admin";
import {
  Shield, Database, Brain, Globe, Package, FileCode, Gauge,
  Play, Loader2, CheckCircle2, XCircle, AlertTriangle, MinusCircle,
  ChevronRight, Stethoscope, Workflow, Clock, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DIAGNOSTIC_CATEGORIES,
  getAggregateStatus,
  type CategoryDefinition,
  type CategoryResult,
  type CheckResult,
  type CheckStatus,
} from "@/lib/diagnostics/check-registry";

const ICON_MAP: Record<string, LucideIcon> = {
  Shield, Database, Brain, Globe, Package, FileCode, Gauge,
};

const STORAGE_KEY = "listblitz:diagnostics:results";

function loadFromLocalStorage(): Map<string, CategoryResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw)));
  } catch { return new Map(); }
}

function saveToLocalStorage(results: Map<string, CategoryResult>) {
  try {
    const obj: Record<string, CategoryResult> = {};
    results.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
}

function statusDotColor(result: CategoryResult | null): string {
  if (!result) return "bg-slate-300 dark:bg-slate-600";
  const agg = getAggregateStatus(result);
  return agg === "pass" ? "bg-emerald-500" : agg === "fail" ? "bg-red-500" : agg === "warn" ? "bg-amber-500" : "bg-slate-400";
}

function statusIcon(status: CheckStatus) {
  switch (status) {
    case "pass": return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
    case "fail": return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
    case "warn": return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    case "skip": return <MinusCircle className="h-4 w-4 text-slate-400 shrink-0" />;
  }
}

function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function CheckResultRow({ check }: { check: CheckResult }) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
        {statusIcon(check.status)}
        <span className="text-sm font-medium min-w-0 flex-1 truncate">{check.name}</span>
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0">{check.latencyMs}ms</span>
        {check.message && <span className="hidden text-xs text-muted-foreground sm:block max-w-[280px] truncate">{check.message}</span>}
        {check.detail && (
          <button onClick={() => setShowDetail(!showDetail)} className="text-[10px] font-medium uppercase tracking-wider text-primary hover:underline shrink-0">
            {showDetail ? "Hide" : "Details"}
          </button>
        )}
      </div>
      {check.message && <p className="px-4 pb-1 text-xs text-muted-foreground sm:hidden">{check.message}</p>}
      {showDetail && check.detail && (
        <div className="mx-4 mb-2 sm:mx-5 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-mono whitespace-pre-wrap animate-fade-in">{check.detail}</div>
      )}
    </div>
  );
}

function CategoryRow({
  category, result, isExpanded, isRunning, isRunAllActive, onToggleExpand, onRun,
}: {
  category: CategoryDefinition; result: CategoryResult | null;
  isExpanded: boolean; isRunning: boolean; isRunAllActive: boolean;
  onToggleExpand: () => void; onRun: () => void;
}) {
  const Icon = ICON_MAP[category.icon] || Stethoscope;
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <button onClick={onToggleExpand} className="flex w-full items-center gap-3 px-4 py-2.5 sm:px-5 text-left transition-colors hover:bg-muted/30">
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 transition-colors ${statusDotColor(result)}`} />
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-sm font-semibold flex-1 min-w-0 truncate">{category.label}</span>
        {result && <span className="hidden text-[11px] text-muted-foreground sm:block shrink-0">{relativeTime(result.ranAt)}</span>}
        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{category.checks.length} checks</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRun(); }}
          disabled={isRunning || isRunAllActive}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${
            isRunning ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80 disabled:opacity-40"
          }`}
        >
          {isRunning ? <><Loader2 className="h-3 w-3 animate-spin" /><span className="hidden sm:inline">Running</span></> : <><Play className="h-3 w-3" />Run</>}
        </button>
      </button>
      {isExpanded && (
        <div className="border-t border-border animate-fade-in">
          {result ? (
            <div className="divide-y divide-border/50">{result.checks.map((c) => <CheckResultRow key={c.id} check={c} />)}</div>
          ) : (
            <div className="px-4 py-6 sm:px-5 text-center text-sm text-muted-foreground/60 italic">Not tested yet — click Run</div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryFooter({ results }: { results: Map<string, CategoryResult> }) {
  let total = 0, passed = 0, failed = 0, warned = 0, skipped = 0;
  results.forEach((r) => r.checks.forEach((c) => { total++; if (c.status === "pass") passed++; else if (c.status === "fail") failed++; else if (c.status === "warn") warned++; else skipped++; }));
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl border border-border bg-card/50 px-5 py-3 text-xs text-muted-foreground">
      <span className="font-medium">{total} total</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{passed} passed</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />{failed} failed</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{warned} warnings</span>
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />{skipped} skipped</span>
    </div>
  );
}

export default function DiagnosticsPage() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [runningCategories, setRunningCategories] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, CategoryResult>>(new Map());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setResults(loadFromLocalStorage()); }, []);

  const runCategory = useCallback(async (categoryId: string) => {
    setRunningCategories((prev) => new Set(prev).add(categoryId));
    try {
      const res = await fetch("/api/diagnostics/run-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: categoryId }),
      });
      if (res.ok) {
        const data = await res.json();
        const catResult: CategoryResult = { categoryId: data.category, checks: data.checks, ranAt: data.ranAt, durationMs: data.durationMs };
        setResults((prev) => { const next = new Map(prev); next.set(categoryId, catResult); saveToLocalStorage(next); return next; });
        if (data.checks.some((c: CheckResult) => c.status === "fail")) {
          setExpandedCategories((prev) => new Set(prev).add(categoryId));
        }
      }
    } catch { /* ignore */ }
    finally { setRunningCategories((prev) => { const next = new Set(prev); next.delete(categoryId); return next; }); }
  }, []);

  const runAll = useCallback(async () => {
    setIsRunningAll(true); setRunAllProgress(0);
    abortRef.current = new AbortController();
    for (let i = 0; i < DIAGNOSTIC_CATEGORIES.length; i++) {
      if (abortRef.current.signal.aborted) break;
      setRunAllProgress(i + 1);
      await runCategory(DIAGNOSTIC_CATEGORIES[i].id);
    }
    setIsRunningAll(false); setRunAllProgress(0); abortRef.current = null;
  }, [runCategory]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedCategories((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const [activeTab, setActiveTab] = useState<"health" | "pipeline" | "audit">("health");

  if (adminLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Admin access required</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Stethoscope className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Diagnostics</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">Health checks, AI pipeline, and full audit log</p>
          </div>
        </div>
        {activeTab === "health" && (
          <button
            onClick={runAll} disabled={isRunningAll}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all ${isRunningAll ? "bg-emerald-600/80 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
          >
            {isRunningAll ? <><Loader2 className="h-4 w-4 animate-spin" />Running... ({runAllProgress}/{DIAGNOSTIC_CATEGORIES.length})</> : <><Play className="h-4 w-4" />Run All</>}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {([
          { key: "health" as const, label: "Health Checks", icon: Stethoscope },
          { key: "pipeline" as const, label: "AI Pipeline", icon: Workflow },
          { key: "audit" as const, label: "Audit Log", icon: Activity },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Health Checks tab */}
      {activeTab === "health" && (
        <>
          <div className="space-y-2">
            {DIAGNOSTIC_CATEGORIES.map((cat) => (
              <CategoryRow key={cat.id} category={cat} result={results.get(cat.id) ?? null}
                isExpanded={expandedCategories.has(cat.id)} isRunning={runningCategories.has(cat.id)}
                isRunAllActive={isRunningAll} onToggleExpand={() => toggleExpand(cat.id)} onRun={() => runCategory(cat.id)} />
            ))}
          </div>
          <SummaryFooter results={results} />
        </>
      )}

      {/* AI Pipeline tab */}
      {activeTab === "pipeline" && (
        <div className="rounded-xl bg-card border border-border p-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Workflow className="h-7 w-7 text-indigo-500" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">AI Pipeline</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure and run the 8-stage AI workflow — from photo upload to cross-platform publishing.
            </p>
          </div>
          <a
            href="/workflow"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 text-white px-6 py-2.5 text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-md"
          >
            <Play className="h-4 w-4" />
            Open Pipeline
          </a>
        </div>
      )}

      {/* Audit Log tab */}
      {activeTab === "audit" && <AuditLogTab />}
    </div>
  );
}

/* ── Audit Log Tab ── */

function AuditLogTab() {
  const [events, setEvents] = useState<{ id: string; type: string; title: string; platform: string; detail: string; severity: string; ts: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "error" | "success" | "info">("all");

  useEffect(() => {
    fetch("/api/ops/summary").then((r) => r.json()).then((d) => {
      setEvents(d.events || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.severity === filter);
  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  const severityDot: Record<string, string> = {
    info: "bg-slate-400", success: "bg-emerald-400", warning: "bg-amber-400", error: "bg-red-400",
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-1">
        {(["all", "error", "success", "info"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize transition-colors ${
              filter === f ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[12px] text-muted-foreground">{filtered.length} events</span>
      </div>

      {/* Events table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No events found</div>
      ) : (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            <span className="w-2" />
            <span>Event</span>
            <span className="hidden sm:block">Platform</span>
            <span>Severity</span>
            <span>Time</span>
          </div>

          {/* Rows */}
          {filtered.map((event) => (
            <div key={event.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors items-center">
              <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot[event.severity] || "bg-slate-400"}`} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium truncate">{event.type.replace(/_/g, " ")} — {event.title}</p>
                {event.detail && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{event.detail}</p>}
              </div>
              <span className="text-[11px] text-muted-foreground capitalize hidden sm:block">{event.platform || "—"}</span>
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                event.severity === "error" ? "bg-red-500/10 text-red-500" :
                event.severity === "success" ? "bg-emerald-500/10 text-emerald-500" :
                event.severity === "warning" ? "bg-amber-500/10 text-amber-500" :
                "bg-muted text-muted-foreground"
              }`}>{event.severity}</span>
              <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{fmtDate(event.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
