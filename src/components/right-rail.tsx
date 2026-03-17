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
  Pause,
  Trash2,
  Sparkles,
  Eye,
  Heart,
  DollarSign,
  Send,
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
  value: number | null;
  title: string;
  ts: string;
}

/* ── Constants ── */

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];
const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

type FilterType = "all" | "errors" | "success" | "ai" | "publishing";

const EVENT_META: Record<string, { label: string; icon: typeof Activity; filter: FilterType }> = {
  view:    { label: "Viewed",    icon: Eye,          filter: "all" },
  like:    { label: "Liked",     icon: Heart,        filter: "success" },
  offer:   { label: "Offer",     icon: DollarSign,   filter: "success" },
  sale:    { label: "Sold",      icon: CheckCircle2, filter: "success" },
  publish: { label: "Published", icon: Send,         filter: "publishing" },
  draft:   { label: "Drafted",   icon: FileText,     filter: "all" },
  optimize:{ label: "AI Optimized", icon: Sparkles,  filter: "ai" },
  error:   { label: "Failed",    icon: XCircle,      filter: "errors" },
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const fmtUptime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
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
      className="flex w-full items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
    >
      <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform duration-200", !open && "-rotate-90")} />
      <span className="flex-1 text-left">{title}</span>
      {badge != null && (
        <span className={cn("rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none tabular-nums", badgeColor ?? "bg-[var(--accent)] text-[var(--muted-foreground)]")}>
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
    refreshInterval: 30_000,
    dedupingInterval: 15_000,
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

  // Hide on auth routes
  if (AUTH_ROUTES.includes(pathname)) return null;

  // Filter events
  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    if (monitorFilter === "all") return data.events;
    return data.events.filter((e) => {
      const meta = EVENT_META[e.type];
      return meta?.filter === monitorFilter;
    });
  }, [data?.events, monitorFilter]);

  const failCount = data?.failed ?? 0;
  const draftCount = data?.listings.draft ?? 0;
  const scheduledCount = data?.scheduled ?? 0;
  const publishedCount = data?.published ?? 0;

  /* ── Collapsed state: thin icon bar ── */

  if (collapsed) {
    return (
      <aside className="sticky top-0 hidden h-screen w-10 shrink-0 flex-col items-center border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm py-3 gap-3 xl:flex">
        <button onClick={toggleCollapsed} title="Expand ops rail" className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors">
          <PanelRightOpen className="h-3.5 w-3.5" />
        </button>
        <div className="h-px w-5 bg-[var(--border)]" />
        <div title={`${failCount} failed`} className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold", failCount > 0 ? "bg-red-500/15 text-red-400" : "text-[var(--muted-foreground)]/40")}>
          {failCount}
        </div>
        <div title={`${draftCount} drafts`} className="flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold text-[var(--muted-foreground)]/40">
          {draftCount}
        </div>
        <div title={`${scheduledCount} scheduled`} className={cn("flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold", scheduledCount > 0 ? "bg-indigo-500/15 text-indigo-400" : "text-[var(--muted-foreground)]/40")}>
          {scheduledCount}
        </div>
        <div title={`${publishedCount} published`} className="flex h-6 w-6 items-center justify-center rounded-md text-[9px] font-bold text-emerald-400/60">
          {publishedCount}
        </div>
      </aside>
    );
  }

  /* ── Expanded state ── */

  return (
    <aside className="sticky top-0 hidden h-screen w-[300px] shrink-0 flex-col border-l border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-sm xl:flex 2xl:w-[320px]">

      {/* Rail header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 shrink-0">
        <Activity className="h-4 w-4 text-[var(--primary)]" />
        <span className="flex-1 text-[12px] font-bold">Operations</span>
        <button onClick={toggleCollapsed} title="Collapse" className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* ═══ OPS SUMMARY ═══ */}
        <SectionHeader
          title="Ops Summary"
          open={sections.ops}
          onToggle={() => toggleSection("ops")}
          badge={failCount > 0 ? failCount : undefined}
          badgeColor={failCount > 0 ? "bg-red-500/20 text-red-400" : undefined}
        />
        <Collapsible open={sections.ops}>
          <div className="grid grid-cols-2 gap-1.5 px-3 pb-3">
            {/* Failed */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2",
              failCount > 0 ? "border-red-500/20 bg-red-500/5" : "border-[var(--border)] bg-[var(--accent)]/30"
            )}>
              <XCircle className={cn("h-3.5 w-3.5 shrink-0", failCount > 0 ? "text-red-400" : "text-[var(--muted-foreground)]/40")} />
              <div>
                <p className={cn("text-sm font-bold tabular-nums leading-none", failCount > 0 ? "text-red-400" : "")}>{failCount}</p>
                <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">failed</p>
              </div>
            </div>
            {/* Drafts */}
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/30 px-2.5 py-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-bold tabular-nums leading-none">{draftCount}</p>
                <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">drafts</p>
              </div>
            </div>
            {/* Scheduled */}
            <div className={cn(
              "flex items-center gap-2 rounded-lg border px-2.5 py-2",
              scheduledCount > 0 ? "border-indigo-500/20 bg-indigo-500/5" : "border-[var(--border)] bg-[var(--accent)]/30"
            )}>
              <CalendarClock className={cn("h-3.5 w-3.5 shrink-0", scheduledCount > 0 ? "text-indigo-400" : "text-[var(--muted-foreground)]/40")} />
              <div>
                <p className="text-sm font-bold tabular-nums leading-none">{scheduledCount}</p>
                <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">scheduled</p>
              </div>
            </div>
            {/* Published */}
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/30 px-2.5 py-2">
              <Store className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-bold tabular-nums leading-none">{publishedCount}</p>
                <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">published</p>
              </div>
            </div>
          </div>
        </Collapsible>

        <div className="mx-3 border-t border-[var(--border)]" />

        {/* ═══ MONITOR ═══ */}
        <SectionHeader
          title="Monitor"
          open={sections.monitor}
          onToggle={() => toggleSection("monitor")}
        />
        <Collapsible open={sections.monitor}>
          {/* Filter chips */}
          <div className="flex items-center gap-1 px-3 pb-1.5 flex-wrap">
            {(["all", "errors", "success", "ai", "publishing"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setMonitorFilter(f)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors capitalize",
                  monitorFilter === f
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "bg-[var(--accent)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Event list */}
          <div className="max-h-[220px] overflow-y-auto px-1">
            {filteredEvents.length === 0 ? (
              <p className="px-3 py-6 text-center text-[10px] text-[var(--muted-foreground)]/50">No events</p>
            ) : (
              filteredEvents.slice(0, 15).map((event) => {
                const meta = EVENT_META[event.type] ?? { label: event.type, icon: Activity, filter: "all" as const };
                const Icon = meta.icon;
                const dotColor = event.type === "error" ? "bg-red-400"
                  : event.type === "sale" ? "bg-emerald-400"
                  : event.type === "publish" ? "bg-indigo-400"
                  : event.type === "optimize" ? "bg-violet-400"
                  : "bg-slate-400";

                return (
                  <div key={event.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-[var(--accent)]/50">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} />
                    <span className="flex-1 truncate text-[10px]">
                      {meta.label} · {event.title.slice(0, 30)}{event.title.length > 30 ? "…" : ""}
                    </span>
                    <span className="shrink-0 text-[9px] tabular-nums text-[var(--muted-foreground)]/50">{fmtTime(event.ts)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-3 pb-2 pt-1">
            <Link
              href="/diagnostics"
              className="flex items-center justify-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[9px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Full event log <ChevronRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </Collapsible>

        <div className="mx-3 border-t border-[var(--border)]" />

        {/* ═══ COMPUTER / SYSTEM ═══ */}
        <SectionHeader
          title="Computer / System"
          open={sections.system}
          onToggle={() => toggleSection("system")}
        />
        <Collapsible open={sections.system}>
          <div className="space-y-2 px-3 pb-3">
            {!data?.system ? (
              <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-[var(--muted-foreground)]">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
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
                  <div className="h-1.5 rounded-full bg-[var(--accent)]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        data.system.memory.percent > 85 ? "bg-red-400" : data.system.memory.percent > 65 ? "bg-amber-400" : "bg-emerald-400"
                      )}
                      style={{ width: `${Math.min(data.system.memory.percent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* DB latency */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <Database className="h-3 w-3" /> DB latency
                  </span>
                  <span className={cn("font-semibold tabular-nums", data.system.db.latencyMs > 100 ? "text-amber-400" : "text-emerald-400")}>
                    {data.system.db.latencyMs}ms
                  </span>
                </div>

                {/* Uptime */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <Clock className="h-3 w-3" /> Uptime
                  </span>
                  <span className="font-semibold tabular-nums">{fmtUptime(data.system.uptime)}</span>
                </div>

                {/* System health */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
                    <Gauge className="h-3 w-3" /> Health
                  </span>
                  <span className={cn("font-semibold", data.system.db.status === "ok" ? "text-emerald-400" : "text-amber-400")}>
                    {data.system.db.status === "ok" ? "Healthy" : "Degraded"}
                  </span>
                </div>

                {/* Refresh */}
                <button
                  onClick={() => refresh()}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--accent)] px-2 py-1 text-[9px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  <RefreshCw className="h-2.5 w-2.5" /> Refresh
                </button>
              </>
            )}
          </div>
        </Collapsible>

        <div className="mx-3 border-t border-[var(--border)]" />

        {/* ═══ QUICK ACTIONS ═══ */}
        <SectionHeader
          title="Quick Actions"
          open={sections.actions}
          onToggle={() => toggleSection("actions")}
        />
        <Collapsible open={sections.actions}>
          <div className="space-y-1 px-3 pb-3">
            <button
              onClick={async () => {
                try { await fetch("/api/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "retry-failed" }) }); refresh(); } catch {}
              }}
              disabled={failCount === 0}
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] font-medium transition-colors hover:bg-[var(--accent)] disabled:opacity-40 disabled:pointer-events-none"
            >
              <RotateCcw className="h-3.5 w-3.5 text-red-400" />
              Retry Failed Publish
            </button>

            <Link
              href="/workflow"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Workflow className="h-3.5 w-3.5 text-indigo-400" />
              Open Pipeline
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]" />
            </Link>

            <Link
              href="/diagnostics"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <FileText className="h-3.5 w-3.5 text-violet-400" />
              Open Logs
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]" />
            </Link>

            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] font-medium transition-colors hover:bg-[var(--accent)]"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              API Keys & Config
              <ChevronRight className="ml-auto h-3 w-3 text-[var(--muted-foreground)]" />
            </Link>
          </div>
        </Collapsible>
      </div>

      {/* Rail footer */}
      <div className="shrink-0 border-t border-[var(--border)] px-3 py-2">
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
