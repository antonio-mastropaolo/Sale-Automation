"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  HardDrive,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Timer,
  Workflow,
  Zap,
  XCircle,
  FileText,
  Sparkles,
  DollarSign,
  Send,
  LogIn,
  Settings2,
  Trash2,
  Upload,
  ExternalLink,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";

/* ── Types ── */

interface OpsSummary {
  listings: { total: number; active: number; draft: number; sold: number };
  published: number;
  scheduled: number;
  failed: number;
  events: OpsEvent[];
  system: {
    memory: { usedMB: number; totalMB: number; percent: number };
    db: { latencyMs: number; status: string };
    uptime: number;
    responseMs: number;
  };
  platforms: { connected: string[]; total: number };
  ai: { configured: boolean; provider: string };
}

interface OpsEvent {
  id: string;
  type: string;
  platform: string;
  title: string;
  detail: string;
  severity: string;
  ts: string;
}

/* ── Constants ── */

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

type FilterKey = "all" | "errors" | "success" | "ai" | "publishing";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "errors", label: "Errors" },
  { key: "success", label: "Success" },
  { key: "ai", label: "AI" },
  { key: "publishing", label: "Publish" },
];

const EVENT_META: Record<string, { label: string; dot: string; filter: FilterKey }> = {
  listing_created:  { label: "Created",       dot: "bg-emerald-400", filter: "success" },
  listing_updated:  { label: "Updated",       dot: "bg-white/30",    filter: "all" },
  listing_deleted:  { label: "Deleted",        dot: "bg-red-400",     filter: "errors" },
  optimize:         { label: "AI Optimized",   dot: "bg-violet-400",  filter: "ai" },
  publish_success:  { label: "Published",      dot: "bg-emerald-400", filter: "publishing" },
  publish_failed:   { label: "Publish failed", dot: "bg-red-400",     filter: "errors" },
  import_completed: { label: "Imported",       dot: "bg-emerald-400", filter: "success" },
  schedule_created: { label: "Scheduled",      dot: "bg-indigo-400",  filter: "publishing" },
  settings_changed: { label: "Settings",       dot: "bg-white/30",    filter: "all" },
  sale_recorded:    { label: "Sale",           dot: "bg-emerald-400", filter: "success" },
  login:            { label: "Login",          dot: "bg-white/20",    filter: "all" },
  batch_action:     { label: "Action",         dot: "bg-blue-400",    filter: "all" },
};

const fmtAgo = (iso: string): string => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const fmtUptime = (s: number): string => {
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

/* ── Main Component ── */

export function RightRail() {
  const pathname = usePathname();
  const { data, mutate: refresh } = useSWR<OpsSummary>("/api/ops/summary", fetcher, { refreshInterval: 15_000, dedupingInterval: 10_000 });

  const [monitorFilter, setMonitorFilter] = useState<FilterKey>("all");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try { const s = localStorage.getItem("right-rail-collapsed"); if (s === "true") setCollapsed(true); } catch {}
    const mq = window.matchMedia("(min-width: 1536px)");
    const h = (e: MediaQueryListEvent | MediaQueryList) => { if (localStorage.getItem("right-rail-collapsed") === null) setCollapsed(!e.matches); };
    h(mq); mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  const toggleCollapsed = () => { const n = !collapsed; setCollapsed(n); try { localStorage.setItem("right-rail-collapsed", String(n)); } catch {} };

  if (AUTH_ROUTES.includes(pathname)) return null;

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    if (monitorFilter === "all") return data.events;
    return data.events.filter((e) => {
      const meta = EVENT_META[e.type];
      if (!meta) return monitorFilter === "errors" ? e.severity === "error" : monitorFilter === "success" ? e.severity === "success" : false;
      return meta.filter === monitorFilter;
    });
  }, [data?.events, monitorFilter]);

  const connectedCount = data?.platforms?.connected?.length ?? 0;

  /* ── Collapsed ── */
  if (collapsed) {
    return (
      <aside className="sticky top-0 hidden h-screen w-10 shrink-0 flex-col items-center border-l border-white/[0.06] bg-[var(--card)]/60 backdrop-blur-sm py-3 gap-2.5 xl:flex">
        <button onClick={toggleCollapsed} title="Expand" className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/[0.06] hover:text-white/70 transition-colors">
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-white/[0.06]" />
        <div title={`${data?.failed ?? 0} failed`} className={cn("flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums", (data?.failed ?? 0) > 0 ? "bg-red-500/10 text-red-400" : "text-white/20")}>{data?.failed ?? 0}</div>
        <div title={`${connectedCount}/8 platforms`} className={cn("flex h-6 w-6 items-center justify-center rounded", connectedCount > 0 ? "text-emerald-400" : "text-white/20")}>
          {connectedCount > 0 ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        </div>
        <div className="flex-1" />
        {(data?.events?.length ?? 0) > 0 && <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />}
      </aside>
    );
  }

  /* ── Expanded ── */
  return (
    <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col border-l border-white/[0.06] bg-[var(--card)]/60 backdrop-blur-sm xl:flex 2xl:w-[280px]">

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5 py-2.5 shrink-0">
        <Activity className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="text-[13px] font-bold tracking-wide text-white">OPS</span>
        <div className="flex-1" />
        <button onClick={toggleCollapsed} className="flex h-6 w-6 items-center justify-center rounded-md text-white/30 hover:bg-white/[0.06] hover:text-white/60 transition-colors">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body — NO SCROLL, everything fits */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ═══ MONITOR ═══ */}
        <div className="px-3.5 pt-2.5 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Monitor</p>
          <div className="flex items-center gap-1 mb-2">
            {FILTER_CHIPS.map(({ key, label }) => (
              <button key={key} onClick={() => setMonitorFilter(key)}
                className={cn("rounded px-2 py-[3px] text-[10px] font-semibold transition-all",
                  monitorFilter === key ? "bg-white/[0.12] text-white shadow-sm" : "text-white/30 hover:text-white/50"
                )}>{label}</button>
            ))}
          </div>
        </div>

        {/* Event list — limited height, not flex-1 */}
        <div className="max-h-[200px] overflow-y-auto min-h-0 px-1">
          {filteredEvents.length === 0 ? (
            <p className="px-3 py-4 text-center text-[11px] text-white/20">No events</p>
          ) : (
            filteredEvents.slice(0, 12).map((event) => {
              const meta = EVENT_META[event.type] ?? { label: event.type.replace(/_/g, " "), dot: "bg-white/20", filter: "all" as const };
              const isExpanded = expandedEventId === event.id;
              return (
                <div key={event.id}>
                  <button onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                    className={cn("flex w-full items-center gap-2 px-2.5 py-[5px] text-left transition-colors rounded-md hover:bg-white/[0.04]", isExpanded && "bg-white/[0.04]")}>
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                    <span className="flex-1 truncate text-[11px] text-white/70">
                      <span className="font-medium text-white/90">{meta.label}</span>
                      <span className="text-white/40"> · {event.title.slice(0, 20)}{event.title.length > 20 ? "…" : ""}</span>
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums text-white/20">{fmtAgo(event.ts)}</span>
                  </button>
                  {isExpanded && (
                    <div className="mx-2.5 mb-1 rounded border border-white/[0.06] bg-white/[0.02] p-2 space-y-1 text-[10px] animate-fade-in">
                      <p className="text-white/90 font-medium">{event.title}</p>
                      <p className="text-white/30 font-mono text-[9px]">{event.type} · {new Date(event.ts).toLocaleString()}</p>
                      {event.detail && (
                        event.severity === "error" ? (
                          <div className="flex items-start gap-1.5 rounded bg-red-500/5 border border-red-500/10 p-1.5">
                            <AlertTriangle className="h-3 w-3 shrink-0 text-red-400 mt-0.5" />
                            <div>
                              <p className="text-red-400/80 break-all text-[10px]">{event.detail.slice(0, 150)}</p>
                              <button onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("toggle-help-assistant")); }}
                                className="mt-1 text-[9px] font-semibold text-blue-400 hover:text-blue-300">
                                <Sparkles className="h-2.5 w-2.5 inline mr-0.5" /> Ask AI to fix
                              </button>
                            </div>
                          </div>
                        ) : <p className="text-white/30 break-all">{event.detail.slice(0, 150)}</p>
                      )}
                      {event.platform && <p className="text-white/20 capitalize text-[9px]">Platform: {event.platform}</p>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-3.5 pb-1.5 pt-1 shrink-0">
          <Link href="/diagnostics?tab=audit" className="flex items-center justify-center gap-1 rounded bg-white/[0.04] px-2 py-1.5 text-[9px] font-medium text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/50">
            Full audit log <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>

        <div className="mx-3.5 border-t border-white/[0.04] shrink-0" />

        {/* ═══ SYSTEM — expanded dashboard ═══ */}
        <div className="px-3.5 py-3 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">System</p>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
              data?.system?.db?.status === "ok" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
            )}>
              {data?.system?.db?.status === "ok" ? "● Healthy" : "● Degraded"}
            </span>
          </div>

          {data?.system && (
            <>
              {/* Memory bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-white/50">
                    <HardDrive className="h-3 w-3" /> Memory
                  </span>
                  <span className="font-semibold tabular-nums text-white/80">
                    {data.system.memory.usedMB} <span className="text-white/25 font-normal">/ {data.system.memory.totalMB} MB</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500",
                    data.system.memory.percent > 85 ? "bg-red-400" : data.system.memory.percent > 65 ? "bg-amber-400" : "bg-emerald-400"
                  )} style={{ width: `${Math.min(data.system.memory.percent, 100)}%` }} />
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Database className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] text-white/30">Database</span>
                  </div>
                  <p className={cn("text-[15px] font-bold tabular-nums", data.system.db.latencyMs > 100 ? "text-amber-400" : "text-emerald-400")}>{data.system.db.latencyMs}ms</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Timer className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] text-white/30">API Response</span>
                  </div>
                  <p className="text-[15px] font-bold tabular-nums text-white/80">{data.system.responseMs}ms</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] text-white/30">Uptime</span>
                  </div>
                  <p className="text-[15px] font-bold tabular-nums text-white/80">{fmtUptime(data.system.uptime)}</p>
                </div>
                <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-3 w-3 text-white/30" />
                    <span className="text-[9px] text-white/30">AI Provider</span>
                  </div>
                  <p className={cn("text-[15px] font-bold capitalize", data?.ai?.configured ? "text-emerald-400" : "text-white/25")}>
                    {data?.ai?.configured ? data.ai.provider : "None"}
                  </p>
                </div>
              </div>

              {/* Platform connections */}
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.04] px-2.5 py-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-semibold text-white/30">Platforms</span>
                  <span className="text-[9px] tabular-nums text-white/40">{connectedCount}/8 connected</span>
                </div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${(connectedCount / 8) * 100}%` }} />
                </div>
              </div>

              {/* Listings summary */}
              {data?.listings && (
                <div className="flex items-center justify-between text-[10px] text-white/40">
                  <span>{data.listings.total} listings</span>
                  <span>{data.listings.active} active</span>
                  <span>{data.published} published</span>
                </div>
              )}

              <button onClick={() => refresh()}
                className="flex w-full items-center justify-center gap-1.5 rounded bg-white/[0.04] px-2 py-1.5 text-[9px] font-medium text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white/50">
                <RefreshCw className="h-2.5 w-2.5" /> Refresh
              </button>
            </>
          )}
        </div>

        <div className="mx-3.5 border-t border-white/[0.04] shrink-0" />

        {/* ═══ ACTIONS — compact ═══ */}
        <div className="px-3.5 py-2 shrink-0 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1.5">Actions</p>
          <Link href="/workflow" className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
            <Workflow className="h-3.5 w-3.5 text-indigo-400" /> AI Pipeline <ChevronRight className="ml-auto h-3 w-3 text-white/15" />
          </Link>
          <Link href="/diagnostics" className="flex w-full items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
            <FileText className="h-3.5 w-3.5 text-violet-400" /> Diagnostics <ChevronRight className="ml-auto h-3 w-3 text-white/15" />
          </Link>
          <button onClick={() => window.dispatchEvent(new CustomEvent("toggle-help-assistant"))}
            className="flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 px-2.5 py-1.5 text-[11px] font-medium text-blue-400 hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors">
            <Sparkles className="h-3.5 w-3.5" /> AI Assistant
          </button>
        </div>
      </div>
    </aside>
  );
}
