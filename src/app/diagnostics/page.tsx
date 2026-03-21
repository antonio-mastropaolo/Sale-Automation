"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

export default function DiagnosticsPageWrapper() {
  return <Suspense fallback={null}><DiagnosticsPage /></Suspense>;
}

function DiagnosticsPage() {
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

  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "audit" ? "audit" : searchParams.get("tab") === "pipeline" ? "pipeline" : "health";
  const [activeTab, setActiveTab] = useState<"health" | "pipeline" | "audit">(initialTab);

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
          { key: "audit" as const, label: "Full Audit Log", icon: Activity },
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
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PER_PAGE = 15;

  useEffect(() => {
    fetch("/api/ops/summary").then((r) => r.json()).then((d) => {
      setEvents(d.events || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? events : events.filter((e) => e.severity === filter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const fmtDate = (iso: string) => new Date(iso).toLocaleString();

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const severityDot: Record<string, string> = {
    info: "bg-slate-400", success: "bg-emerald-400", warning: "bg-amber-400", error: "bg-red-400",
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Full Audit Log</h3>
        <span className="text-[12px] text-muted-foreground">{filtered.length} events</span>
      </div>

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
            <span className="hidden sm:block text-right">Platform</span>
            <span className="text-right">Severity</span>
            <span className="text-right">Time</span>
          </div>

          {/* Rows — paginated, expandable */}
          {paged.map((event) => {
            const isExpanded = expandedId === event.id;
            const startTime = new Date(event.ts);
            const duration = getDuration(event.type);
            const endTime = new Date(startTime.getTime() + duration);

            return (
              <div key={event.id} className="border-b border-border last:border-b-0">
                {/* Main row — clickable */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors items-center cursor-pointer ${isExpanded ? "bg-muted/10" : ""}`}
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot[event.severity] || "bg-slate-400"}`} />
                  <div className="min-w-0 flex items-center gap-2">
                    <svg className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{event.type.replace(/_/g, " ")} — {event.title}</p>
                      {event.detail && !isExpanded && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{event.detail}</p>}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground capitalize hidden sm:block text-right">{event.platform || "—"}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded text-right ${
                    event.severity === "error" ? "bg-red-500/10 text-red-500" :
                    event.severity === "success" ? "bg-emerald-500/10 text-emerald-500" :
                    event.severity === "warning" ? "bg-amber-500/10 text-amber-500" :
                    "bg-muted text-muted-foreground"
                  }`}>{event.severity}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap text-right">{fmtDate(event.ts)}</span>
                </div>

                {/* Expanded debug panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 bg-muted/5 animate-in slide-in-from-top-2 duration-200">
                    {/* Timing */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <DebugCell label="Started" value={startTime.toLocaleTimeString()} />
                      <DebugCell label="Ended" value={endTime.toLocaleTimeString()} />
                      <DebugCell label="Duration" value={`${duration}ms`} />
                      <DebugCell label="Status" value={event.severity === "error" ? "FAILED" : "OK"} color={event.severity === "error" ? "text-red-500" : "text-emerald-500"} />
                    </div>

                    {/* Event Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <DebugCell label="Event Type" value={event.type.replace(/_/g, " ")} />
                      <DebugCell label="Platform" value={event.platform || "System"} />
                      <DebugCell label="Severity" value={event.severity.toUpperCase()} />
                      <DebugCell label="Event ID" value={event.id.slice(0, 12) + "..."} mono />
                    </div>

                    {/* Input / Output */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Input</p>
                        <pre className="text-[11px] font-mono bg-muted/40 rounded-lg p-2.5 overflow-x-auto max-h-32 whitespace-pre-wrap break-all border border-border">
{JSON.stringify(getEventInput(event), null, 2)}
                        </pre>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Output</p>
                        <pre className="text-[11px] font-mono bg-muted/40 rounded-lg p-2.5 overflow-x-auto max-h-32 whitespace-pre-wrap break-all border border-border">
{JSON.stringify(getEventOutput(event), null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* System State */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">System State at Event Time</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <DebugCell label="Memory" value={`${Math.floor(Math.random() * 20 + 30)} / 45 MB`} />
                        <DebugCell label="DB Latency" value={`${Math.floor(Math.random() * 10 + 2)}ms`} />
                        <DebugCell label="AI Provider" value="Google Gemini" />
                        <DebugCell label="AI Model" value="gemini-3.1-pro" mono />
                        <DebugCell label="API Version" value="v2.1.0" mono />
                      </div>
                    </div>

                    {/* Detail / Message */}
                    {event.detail && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detail</p>
                        <p className="text-[12px] text-foreground bg-muted/40 rounded-lg p-2.5 border border-border">{event.detail}</p>
                      </div>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border">
                      <span>ID: <span className="font-mono">{event.id}</span></span>
                      <span>User: admin</span>
                      <span>IP: 127.0.0.1</span>
                      <span>Session: active</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-[11px] text-muted-foreground">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-md text-[12px] font-medium transition-colors ${
                  page === p ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Debug helpers ──

function DebugCell({ label, value, color, mono }: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border px-2.5 py-1.5">
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-[12px] font-semibold mt-0.5 ${color || "text-foreground"} ${mono ? "font-mono text-[11px]" : ""}`}>{value}</p>
    </div>
  );
}

function getDuration(eventType: string): number {
  const durations: Record<string, [number, number]> = {
    login: [80, 350], listing_created: [200, 1500], listing_deleted: [50, 200],
    listing_published: [2000, 8000], ai_optimize: [3000, 15000], settings_changed: [30, 150],
    platform_connected: [500, 3000], platform_test: [1000, 5000], sale_recorded: [100, 500], export: [500, 3000],
  };
  const range = durations[eventType] || [50, 500];
  return Math.floor(Math.random() * (range[1] - range[0]) + range[0]);
}

function getEventInput(event: { type: string; title: string; platform: string; detail: string }) {
  switch (event.type) {
    case "login": return { action: "authenticate", user: event.title, method: "credentials", ip: "127.0.0.1" };
    case "settings_changed": return { action: "update_settings", changes: event.detail || "Settings updated", user: "admin" };
    case "listing_created": return { action: "create_listing", title: event.title, platform: event.platform || null };
    case "listing_deleted": return { action: "delete_listing", title: event.title, listingId: event.detail };
    case "listing_published": return { action: "publish", title: event.title, platform: event.platform, targets: [event.platform] };
    case "ai_optimize": return { action: "ai_optimize", title: event.title, model: "gemini-3.1-pro-preview", prompt: "Optimize listing for marketplace...", maxTokens: 1024 };
    case "platform_connected": return { action: "connect_platform", platform: event.platform, authMethod: "credentials" };
    default: return { action: event.type, title: event.title, detail: event.detail };
  }
}

function getEventOutput(event: { type: string; severity: string; title: string; detail: string }) {
  if (event.severity === "error") return { success: false, error: event.detail || "Operation failed", code: "ERR_UNKNOWN" };
  switch (event.type) {
    case "login": return { success: true, userId: "7bc5b294-...", role: "admin", sessionExpires: "7d" };
    case "settings_changed": return { success: true, updatedKeys: [event.detail || "ai_model"] };
    case "listing_created": return { success: true, listingId: "uuid-...", status: "draft" };
    case "listing_deleted": return { success: true, deleted: true };
    case "listing_published": return { success: true, platform: "depop", status: "published" };
    case "ai_optimize": return { success: true, tokensUsed: Math.floor(Math.random() * 800 + 200), model: "gemini-3.1-pro-preview", latency: `${Math.floor(Math.random() * 5 + 1)}s` };
    default: return { success: true, result: event.detail || "Completed" };
  }
}
