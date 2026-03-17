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
  RefreshCw,
  RotateCcw,
  Workflow,
  Zap,
  XCircle,
  FileText,
  Package,
  CalendarClock,
  Store,
  Sparkles,
  Eye,
  DollarSign,
  Send,
  LogIn,
  Settings2,
  Trash2,
  Upload,
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
  };
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

type FilterType = "all" | "errors" | "success" | "ai" | "publishing";

const FILTER_CHIPS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "errors", label: "Errors" },
  { key: "success", label: "Success" },
  { key: "ai", label: "AI" },
  { key: "publishing", label: "Publishing" },
];

/* Maps ActivityLog.type → display metadata */
const EVENT_META: Record<string, { label: string; icon: typeof Activity; filter: FilterType; dot: string }> = {
  listing_created:  { label: "Created",     icon: FileText,      filter: "success",    dot: "bg-emerald-400" },
  listing_updated:  { label: "Updated",     icon: FileText,      filter: "all",        dot: "bg-slate-400" },
  listing_deleted:  { label: "Deleted",     icon: Trash2,        filter: "errors",     dot: "bg-red-400" },
  optimize:         { label: "AI Optimized",icon: Sparkles,      filter: "ai",         dot: "bg-violet-400" },
  publish_success:  { label: "Published",   icon: Send,          filter: "publishing", dot: "bg-emerald-400" },
  publish_failed:   { label: "Publish fail",icon: XCircle,       filter: "errors",     dot: "bg-red-400" },
  import_started:   { label: "Import",      icon: Upload,        filter: "all",        dot: "bg-blue-400" },
  import_completed: { label: "Imported",    icon: Package,       filter: "success",    dot: "bg-emerald-400" },
  schedule_created: { label: "Scheduled",   icon: CalendarClock, filter: "publishing", dot: "bg-indigo-400" },
  schedule_deleted: { label: "Unscheduled", icon: CalendarClock, filter: "all",        dot: "bg-slate-400" },
  batch_action:     { label: "Batch",       icon: Package,       filter: "all",        dot: "bg-blue-400" },
  settings_changed: { label: "Settings",    icon: Settings2,     filter: "all",        dot: "bg-slate-400" },
  sale_recorded:    { label: "Sale",        icon: DollarSign,    filter: "success",    dot: "bg-emerald-400" },
  login:            { label: "Login",       icon: LogIn,         filter: "all",        dot: "bg-slate-400" },
  logout:           { label: "Logout",      icon: LogIn,         filter: "all",        dot: "bg-slate-400" },
};

/** Compact relative time: "now", "2m", "1h", "3d" */
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

/* ── Section header ── */

function SectionHeader({
  title, open, onToggle, badge, badgeColor,
}: {
  title: string; open: boolean; onToggle: () => void;
  badge?: string | number; badgeColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-2 px-3.5 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
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

/* ── Main Component ── */

export function RightRail() {
  const pathname = usePathname();

  const { data, mutate: refresh } = useSWR<OpsSummary>("/api/ops/summary", fetcher, {
    refreshInterval: 15_000,
    dedupingInterval: 10_000,
  });

  const [sections, setSections] = useState({ ops: true, monitor: true, system: false, actions: true });
  const [monitorFilter, setMonitorFilter] = useState<FilterType>("all");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("right-rail-collapsed");
      if (saved === "true") setCollapsed(true);
      const savedSections = localStorage.getItem("right-rail-sections");
      if (savedSections) setSections(JSON.parse(savedSections));
    } catch {}
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

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    if (monitorFilter === "all") return data.events;
    return data.events.filter((e) => {
      const meta = EVENT_META[e.type];
      if (!meta) {
        // Fallback: use severity
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

  /* ── Collapsed state ── */

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
        <div title={`${draftCount} drafts`} className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums text-[var(--muted-foreground)]/40">
          {draftCount}
        </div>
        <div title={`${scheduledCount} scheduled`} className={cn("flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums", scheduledCount > 0 ? "bg-indigo-500/10 text-indigo-400" : "text-[var(--muted-foreground)]/40")}>
          {scheduledCount}
        </div>
        <div title={`${publishedCount} published`} className="flex h-6 w-6 items-center justify-center rounded text-[9px] font-bold tabular-nums text-emerald-400/60">
          {publishedCount}
        </div>
        <div className="flex-1" />
        <div title={`${data?.events?.length ?? 0} events`} className={cn("flex h-6 w-6 items-center justify-center rounded", (data?.events?.length ?? 0) > 0 ? "text-indigo-400" : "text-[var(--muted-foreground)]/20")}>
          <Activity className="h-3 w-3" />
        </div>
      </aside>
    );
  }

  /* ── Expanded state ── */

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm xl:flex 2xl:w-[300px]">

      {/* Rail header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3.5 py-2.5 shrink-0">
        <Activity className="h-3.5 w-3.5 text-[var(--primary)]" />
        <span className="flex-1 text-[11px] font-bold tracking-wide">Operations</span>
        <button onClick={toggleCollapsed} title="Collapse" className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
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
          <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-3">
            <div className={cn(
              "rounded-lg border px-2.5 py-2 text-center",
              failCount > 0 ? "border-red-500/20 bg-red-500/[0.04]" : "border-[var(--border)] bg-[var(--accent)]/20"
            )}>
              <p className={cn("text-base font-bold tabular-nums leading-none", failCount > 0 ? "text-red-400" : "")}>{failCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mt-1">Failed</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-center">
              <p className="text-base font-bold tabular-nums leading-none">{draftCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mt-1">Drafts</p>
            </div>
            <div className={cn(
              "rounded-lg border px-2.5 py-2 text-center",
              scheduledCount > 0 ? "border-indigo-500/20 bg-indigo-500/[0.04]" : "border-[var(--border)] bg-[var(--accent)]/20"
            )}>
              <p className={cn("text-base font-bold tabular-nums leading-none", scheduledCount > 0 ? "text-indigo-400" : "")}>{scheduledCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mt-1">Scheduled</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-center">
              <p className="text-base font-bold tabular-nums leading-none text-emerald-500">{publishedCount}</p>
              <p className="text-[8px] font-medium uppercase tracking-wider text-[var(--muted-foreground)] mt-1">Published</p>
            </div>
          </div>
        </Collapsible>

        <div className="mx-3.5 border-t border-[var(--border)]" />

        {/* ═══ MONITOR ═══ */}
        <SectionHeader
          title="Monitor"
          open={sections.monitor}
          onToggle={() => toggleSection("monitor")}
          badge={data?.events?.length ?? undefined}
        />
        <Collapsible open={sections.monitor}>
          {/* Filter chips */}
          <div className="flex items-center gap-1 px-3.5 pb-2">
            {FILTER_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setMonitorFilter(key)}
                className={cn(
                  "rounded px-2 py-[3px] text-[9px] font-semibold transition-all duration-150",
                  monitorFilter === key
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--accent)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="max-h-[260px] overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[10px] text-[var(--muted-foreground)]/50">No events</p>
            ) : (
              filteredEvents.slice(0, 25).map((event) => {
                const meta = EVENT_META[event.type] ?? {
                  label: event.type.replace(/_/g, " "),
                  icon: Activity,
                  filter: "all" as const,
                  dot: event.severity === "error" ? "bg-red-400" : event.severity === "success" ? "bg-emerald-400" : "bg-slate-400",
                };

                return (
                  <div
                    key={event.id}
                    className="flex w-full items-center gap-2 px-3.5 py-[5px] text-left transition-colors hover:bg-[var(--accent)]/50"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                    <span className="flex-1 truncate text-[10px] text-[var(--foreground)]/70">
                      <span className="font-medium">{meta.label}</span>
                      <span className="text-[var(--muted-foreground)]"> · {event.title.slice(0, 28)}{event.title.length > 28 ? "…" : ""}</span>
                    </span>
                    {event.platform && (
                      <span className="shrink-0 text-[8px] text-[var(--muted-foreground)]/50 capitalize">{event.platform}</span>
                    )}
                    <span className="shrink-0 text-[8px] tabular-nums text-[var(--muted-foreground)]/40 w-[22px] text-right">{fmtAgo(event.ts)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3.5 pb-2 pt-1">
            <Link
              href="/diagnostics"
              className="flex items-center justify-center gap-1 rounded bg-[var(--accent)] px-2 py-1.5 text-[9px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Full event log <ChevronRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </Collapsible>

        <div className="mx-3.5 border-t border-[var(--border)]" />

        {/* ═══ COMPUTER / SYSTEM ═══ */}
        <SectionHeader
          title="System"
          open={sections.system}
          onToggle={() => toggleSection("system")}
        />
        <Collapsible open={sections.system}>
          <div className="space-y-2.5 px-3.5 pb-3">
            {!data?.system ? (
              <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-[var(--muted-foreground)]">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading...
              </div>
            ) : (
              <>
                {/* Memory */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <HardDrive className="h-3 w-3" /> Memory
                    </span>
                    <span className="font-semibold tabular-nums">{data.system.memory.usedMB}/{data.system.memory.totalMB} MB</span>
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
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Database className="h-3 w-3" /> DB
                    </span>
                    <span className={cn("font-semibold tabular-nums", data.system.db.latencyMs > 100 ? "text-amber-400" : "text-emerald-400")}>
                      {data.system.db.latencyMs}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Clock className="h-3 w-3" /> Up
                    </span>
                    <span className="font-semibold tabular-nums">{fmtUptime(data.system.uptime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                      <Gauge className="h-3 w-3" /> Health
                    </span>
                    <span className={cn("font-semibold", data.system.db.status === "ok" ? "text-emerald-400" : "text-amber-400")}>
                      {data.system.db.status === "ok" ? "OK" : "Slow"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => refresh()}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-[var(--accent)] px-2 py-1.5 text-[9px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
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
            <button
              onClick={async () => {
                try { await fetch("/api/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry-failed" }) }); refresh(); } catch {}
              }}
              disabled={failCount === 0}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[10px] font-medium transition-colors hover:bg-[var(--accent)] disabled:opacity-30 disabled:pointer-events-none"
            >
              <RotateCcw className="h-3.5 w-3.5 text-red-400" />
              Retry Failed
            </button>

            <Link
              href="/workflow"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[10px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              Open Pipeline
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/30" />
            </Link>

            <Link
              href="/diagnostics"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[10px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              Diagnostics
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/30" />
            </Link>

            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/20 px-2.5 py-2 text-[10px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              API Keys
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]/30" />
            </Link>
          </div>
        </Collapsible>
      </div>

      {/* Rail footer */}
      <div className="shrink-0 border-t border-[var(--border)] px-3.5 py-2">
        <div className="flex items-center justify-between text-[9px] text-[var(--muted-foreground)]">
          <span className="font-medium bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            ListBlitz
          </span>
          <span className="tabular-nums">
            {data?.listings.total ?? 0} listings · {data?.published ?? 0} live
          </span>
        </div>
      </div>
    </aside>
  );
}
