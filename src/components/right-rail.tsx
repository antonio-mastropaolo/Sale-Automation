"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  Gauge,
  HardDrive,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Workflow,
  Zap,
  XCircle,
  FileText,
  Package,
  CalendarClock,
  Store,
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

const ALL_PLATFORMS = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"];

const EVENT_META: Record<string, { label: string; icon: typeof Activity; filter: FilterKey; dot: string }> = {
  listing_created:  { label: "Created",      icon: FileText,      filter: "success",    dot: "bg-emerald-400" },
  listing_updated:  { label: "Updated",      icon: FileText,      filter: "all",        dot: "bg-slate-400/60" },
  listing_deleted:  { label: "Deleted",       icon: Trash2,        filter: "errors",     dot: "bg-red-400" },
  optimize:         { label: "AI Optimized",  icon: Sparkles,      filter: "ai",         dot: "bg-violet-400" },
  publish_success:  { label: "Published",     icon: Send,          filter: "publishing", dot: "bg-emerald-400" },
  publish_failed:   { label: "Publish failed",icon: XCircle,       filter: "errors",     dot: "bg-red-400" },
  import_started:   { label: "Import started",icon: Upload,        filter: "all",        dot: "bg-blue-400" },
  import_completed: { label: "Imported",      icon: Package,       filter: "success",    dot: "bg-emerald-400" },
  schedule_created: { label: "Scheduled",     icon: CalendarClock, filter: "publishing", dot: "bg-indigo-400" },
  schedule_deleted: { label: "Unscheduled",   icon: CalendarClock, filter: "all",        dot: "bg-slate-400/60" },
  batch_action:     { label: "Batch",         icon: Package,       filter: "all",        dot: "bg-blue-400" },
  settings_changed: { label: "Settings",      icon: Settings2,     filter: "all",        dot: "bg-slate-400/60" },
  sale_recorded:    { label: "Sale",          icon: DollarSign,    filter: "success",    dot: "bg-emerald-400" },
  login:            { label: "Login",         icon: LogIn,         filter: "all",        dot: "bg-slate-400/60" },
  logout:           { label: "Logout",        icon: LogIn,         filter: "all",        dot: "bg-slate-400/60" },
};

/** Compact relative time */
const fmtAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

const fmtUptime = (seconds: number): string => {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
};

/* ── Sub-components ── */

function SectionHeader({
  title, open, onToggle, badge, badgeColor,
}: {
  title: string; open: boolean; onToggle: () => void;
  badge?: string | number; badgeColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]/60 transition-colors hover:text-[var(--muted-foreground)]"
    >
      <ChevronDown className={cn("h-2.5 w-2.5 shrink-0 transition-transform duration-200", !open && "-rotate-90")} />
      <span className="flex-1 text-left">{title}</span>
      {badge != null && (
        <span className={cn("rounded px-1.5 py-px text-[8px] font-bold leading-none tabular-nums", badgeColor ?? "bg-[var(--accent)] text-[var(--muted-foreground)]")}>
          {badge}
        </span>
      )}
    </button>
  );
}

function Collapsible({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("grid transition-all duration-200 ease-in-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function ProviderDot({ name, connected }: { name: string; connected: boolean }) {
  return (
    <div className="flex items-center gap-1" title={`${name}: ${connected ? "Connected" : "Not configured"}`}>
      <span className={cn("h-1.5 w-1.5 rounded-full", connected ? "bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" : "bg-[var(--muted-foreground)]/20")} />
      <span className={cn("text-[9px] capitalize", connected ? "text-emerald-500" : "text-[var(--muted-foreground)]/30")}>{name}</span>
    </div>
  );
}

/* ── Main Component ── */

export function RightRail() {
  const pathname = usePathname();

  const { data, mutate: refresh } = useSWR<OpsSummary>("/api/ops/summary", fetcher, {
    refreshInterval: 15_000,
    dedupingInterval: 10_000,
  });

  const [sections, setSections] = useState({ ops: true, monitor: true, system: true, actions: true });
  const [monitorFilter, setMonitorFilter] = useState<FilterKey>("all");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Responsive auto-collapse + localStorage persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem("right-rail-collapsed");
      if (saved === "true") setCollapsed(true);
      const savedSections = localStorage.getItem("right-rail-sections");
      if (savedSections) setSections(JSON.parse(savedSections));
    } catch {}

    // Auto-collapse below 2xl unless user explicitly set a preference
    const mq = window.matchMedia("(min-width: 1536px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const userPref = localStorage.getItem("right-rail-collapsed");
      if (userPref === null) setCollapsed(!e.matches);
    };
    handleChange(mq);
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("right-rail-collapsed", String(next)); } catch {}
  };

  const toggleSection = useCallback((key: keyof typeof sections) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("right-rail-sections", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  if (AUTH_ROUTES.includes(pathname)) return null;

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    if (monitorFilter === "all") return data.events;
    return data.events.filter((e) => {
      const meta = EVENT_META[e.type];
      if (!meta) {
        if (monitorFilter === "errors") return e.severity === "error" || e.severity === "warning";
        if (monitorFilter === "success") return e.severity === "success";
        return false;
      }
      return meta.filter === monitorFilter;
    });
  }, [data?.events, monitorFilter]);

  const failCount = data?.failed ?? 0;
  const draftCount = data?.listings.draft ?? 0;
  const scheduledCount = data?.scheduled ?? 0;
  const publishedCount = data?.published ?? 0;
  const connectedCount = data?.platforms?.connected?.length ?? 0;
  const platformTotal = data?.platforms?.total ?? 8;

  /* ── Collapsed: thin icon bar ── */

  if (collapsed) {
    return (
      <aside className="sticky top-0 hidden h-screen w-10 shrink-0 flex-col items-center border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm py-3 gap-2.5 xl:flex">
        <button onClick={toggleCollapsed} title="Expand ops rail" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors">
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-[var(--border)]" />
        <div title={`${failCount} failed`} className={cn("flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums", failCount > 0 ? "bg-red-500/10 text-red-400" : "text-[var(--muted-foreground)]/40")}>
          {failCount}
        </div>
        <div title={`${publishedCount} published`} className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums text-emerald-400/60">
          {publishedCount}
        </div>
        <div title={`${connectedCount}/${platformTotal} platforms`} className={cn("flex h-6 w-6 items-center justify-center rounded", connectedCount === platformTotal ? "text-emerald-400" : "text-[var(--muted-foreground)]/30")}>
          {connectedCount === platformTotal ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        </div>
        <div className="flex-1" />
        {(data?.events?.length ?? 0) > 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" title="Events active" />
        )}
      </aside>
    );
  }

  /* ── Expanded: full ops rail ── */

  return (
    <aside className="sticky top-0 hidden h-screen w-[250px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm xl:flex 2xl:w-[280px]">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-2.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-[var(--primary)]" />
          <span className="text-[13px] font-bold tracking-wide">OPS</span>
        </div>
        <div className="flex-1" />
        <button onClick={toggleCollapsed} title="Collapse" className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)]/40 hover:bg-[var(--accent)] hover:text-[var(--muted-foreground)] transition-colors">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ OPS SUMMARY ═══ */}
        <SectionHeader
          title="Summary"
          open={sections.ops}
          onToggle={() => toggleSection("ops")}
          badge={failCount > 0 ? failCount : undefined}
          badgeColor={failCount > 0 ? "bg-red-500/15 text-red-400" : undefined}
        />
        <Collapsible open={sections.ops}>
          <div className="grid grid-cols-3 gap-1.5 px-3.5 pb-3">
            <div className={cn(
              "rounded-lg border px-2.5 py-2 text-center",
              failCount > 0 ? "border-red-500/20 bg-red-500/[0.04]" : "border-[var(--border)] bg-[var(--accent)]/20"
            )}>
              <p className={cn("text-base font-bold tabular-nums leading-none", failCount > 0 ? "text-red-400" : "")}>{failCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/50 mt-1">Errors</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-center">
              <p className="text-base font-bold tabular-nums leading-none">{draftCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/50 mt-1">Drafts</p>
            </div>
            <div className={cn(
              "rounded-lg border px-2.5 py-2 text-center",
              publishedCount > 0 ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-[var(--border)] bg-[var(--accent)]/20"
            )}>
              <p className={cn("text-base font-bold tabular-nums leading-none", publishedCount > 0 ? "text-emerald-400" : "")}>{publishedCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/50 mt-1">Live</p>
            </div>
          </div>
        </Collapsible>

        <div className="mx-3.5 border-t border-[var(--border)]" />

        {/* ═══ MONITOR ═══ */}
        <SectionHeader
          title="Monitor"
          open={sections.monitor}
          onToggle={() => toggleSection("monitor")}
        />
        <Collapsible open={sections.monitor}>
          {/* Filter chips */}
          <div className="flex items-center gap-1 px-3.5 pb-2">
            {FILTER_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMonitorFilter(key)}
                className={cn(
                  "rounded px-2 py-[3px] text-[10px] font-semibold transition-all duration-150",
                  monitorFilter === key
                    ? "bg-[var(--foreground)]/10 text-[var(--foreground)]/80 shadow-sm"
                    : "text-[var(--muted-foreground)]/40 hover:bg-[var(--accent)] hover:text-[var(--muted-foreground)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="max-h-[280px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[10px] text-[var(--muted-foreground)]/30">No events</p>
            ) : (
              filteredEvents.slice(0, 25).map((event) => {
                const meta = EVENT_META[event.type] ?? {
                  label: event.type.replace(/_/g, " "),
                  icon: Activity,
                  filter: "all" as const,
                  dot: event.severity === "error" ? "bg-red-400" : event.severity === "success" ? "bg-emerald-400" : "bg-slate-400/60",
                };
                const isExpanded = expandedEventId === event.id;
                const hasDetail = event.detail && event.detail.length > 0;

                return (
                  <div key={event.id}>
                    <button
                      onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3.5 py-[6px] text-left transition-colors hover:bg-[var(--accent)]/40 cursor-pointer",
                        isExpanded && "bg-[var(--accent)]/40"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                      <span className="flex-1 truncate text-[11px]">
                        <span className="font-medium text-[var(--foreground)]/70">{meta.label}</span>
                        <span className="text-[var(--muted-foreground)]/50"> · {event.title.slice(0, 22)}{event.title.length > 22 ? "…" : ""}</span>
                      </span>
                      <span className="shrink-0 text-[9px] tabular-nums text-[var(--muted-foreground)]/30 w-[22px] text-right">{fmtAgo(event.ts)}</span>
                    </button>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="mx-3.5 mb-1.5 rounded-lg border border-[var(--border)] bg-[var(--accent)]/30 p-3 space-y-2 text-[11px] animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] text-[var(--muted-foreground)]/40">{event.type}</span>
                          <span className="text-[9px] text-[var(--muted-foreground)]/30">{new Date(event.ts).toLocaleString()}</span>
                        </div>
                        <p className="font-medium">{event.title}</p>
                        {event.platform && <p className="text-[var(--muted-foreground)]/50 capitalize text-[10px]">Platform: {event.platform}</p>}
                        {event.detail && (
                          event.severity === "error" ? (
                            <div className="flex items-start gap-1.5 rounded-md bg-red-500/5 border border-red-500/10 p-2">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-red-400/80 break-all leading-snug text-[10px]">{event.detail.slice(0, 200)}</p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("toggle-help-assistant")); }}
                                  className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  <Sparkles className="h-3 w-3" /> Ask AI to help fix this
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[var(--muted-foreground)]/50 leading-snug break-all text-[10px]">{event.detail.slice(0, 200)}</p>
                          )
                        )}
                        {!event.detail && (
                          <p className="text-[var(--muted-foreground)]/30 text-[10px] italic">No additional details recorded.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3.5 pb-2 pt-1">
            <Link
              href="/diagnostics"
              className="flex items-center justify-center gap-1 rounded bg-[var(--accent)]/40 px-2 py-1.5 text-[9px] font-medium text-[var(--muted-foreground)]/50 transition-colors hover:bg-[var(--accent)] hover:text-[var(--muted-foreground)]"
            >
              Full audit log <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
        </Collapsible>

        <div className="mx-3.5 border-t border-[var(--border)]" />

        {/* ═══ SYSTEM & PLATFORMS ═══ */}
        <SectionHeader
          title="System"
          open={sections.system}
          onToggle={() => toggleSection("system")}
          badge={connectedCount < platformTotal ? `${connectedCount}/${platformTotal}` : undefined}
          badgeColor={connectedCount < platformTotal ? "bg-amber-500/15 text-amber-400" : undefined}
        />
        <Collapsible open={sections.system}>
          <div className="space-y-2.5 px-3.5 pb-3">

            {/* Platform health */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-3 py-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]/40">Platforms</span>
                <Link href="/settings" className="text-[8px] text-[var(--muted-foreground)]/30 hover:text-[var(--muted-foreground)]/60 transition-colors">Configure</Link>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {ALL_PLATFORMS.map((p) => (
                  <ProviderDot key={p} name={p} connected={data?.platforms?.connected?.includes(p) ?? false} />
                ))}
              </div>
            </div>

            {/* AI provider status */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                <Sparkles className="h-3 w-3" /> AI
              </span>
              <span className={cn("font-semibold capitalize", data?.ai?.configured ? "text-emerald-400" : "text-[var(--muted-foreground)]/30")}>
                {data?.ai?.configured ? data.ai.provider : "Not set"}
              </span>
            </div>

            {!data?.system ? (
              <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-[var(--muted-foreground)]/40">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                {/* Memory bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                      <HardDrive className="h-3 w-3" /> Server
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--foreground)]/60">
                      {data.system.memory.usedMB} MB <span className="text-[var(--muted-foreground)]/30 font-normal">/ {data.system.memory.totalMB} MB</span>
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[var(--accent)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        data.system.memory.percent > 85 ? "bg-red-400" : data.system.memory.percent > 65 ? "bg-amber-400" : "bg-emerald-400"
                      )}
                      style={{ width: `${Math.min(data.system.memory.percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                      <Database className="h-3 w-3" /> DB
                    </span>
                    <span className={cn("font-semibold tabular-nums", data.system.db.latencyMs > 100 ? "text-amber-400" : "text-emerald-400")}>
                      {data.system.db.latencyMs}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                      <Timer className="h-3 w-3" /> API
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--foreground)]/60">{data.system.responseMs}ms</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                      <Clock className="h-3 w-3" /> Up
                    </span>
                    <span className="font-semibold tabular-nums text-[var(--foreground)]/60">{fmtUptime(data.system.uptime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]/60">
                      <Gauge className="h-3 w-3" /> Health
                    </span>
                    <span className={cn("font-semibold", data.system.db.status === "ok" ? "text-emerald-400" : "text-amber-400")}>
                      {data.system.db.status === "ok" ? "OK" : "Slow"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => refresh()}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-[var(--accent)]/40 px-2 py-1.5 text-[9px] font-medium text-[var(--muted-foreground)]/50 transition-colors hover:bg-[var(--accent)] hover:text-[var(--muted-foreground)]"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Refresh
                </button>
              </>
            )}
          </div>
        </Collapsible>

        <div className="mx-3.5 border-t border-[var(--border)]" />

        {/* ═══ QUICK ACTIONS ═══ */}
        <SectionHeader
          title="Actions"
          open={sections.actions}
          onToggle={() => toggleSection("actions")}
        />
        <Collapsible open={sections.actions}>
          <div className="space-y-1 px-3.5 pb-3">
            <Link
              href="/workflow"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              AI Pipeline
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/20" />
            </Link>

            <Link
              href="/diagnostics"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              Diagnostics
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/20" />
            </Link>

            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              API Keys
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/20" />
            </Link>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent("toggle-help-assistant"))}
              className="flex w-full items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 px-2.5 py-2 text-[11px] font-medium text-blue-400 transition-colors hover:from-blue-500/20 hover:to-indigo-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant
            </button>
          </div>
        </Collapsible>
      </div>

    </aside>
  );
}
