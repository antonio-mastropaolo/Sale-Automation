"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

const APP_VERSION = "1.0.0";

const fetcher = (url: string) => fetch(url).then((r) => (r.ok ? r.json() : null));

interface FooterData {
  listings?: { total: number; active: number };
  published?: number;
  system?: { db: { status: string }; uptime: number };
  platforms?: { connected: string[]; total: number };
  ai?: { configured: boolean; provider: string };
}

export function Footer() {
  const pathname = usePathname();
  const { data } = useSWR<FooterData>("/api/ops/summary", fetcher, {
    refreshInterval: 30_000,
    dedupingInterval: 15_000,
  });

  if (AUTH_ROUTES.includes(pathname)) return null;

  const connectedCount = data?.platforms?.connected?.length ?? 0;
  const platformTotal = data?.platforms?.total ?? 8;

  return (
    <footer className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-1.5 sm:px-5 lg:px-6 overflow-x-auto">

        {/* Left: platform health + system status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Platform dots */}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--accent)]"
            title={`${connectedCount}/${platformTotal} platforms connected`}
          >
            {(data?.platforms?.connected ?? []).length > 0 ? (
              (data?.platforms?.connected ?? []).slice(0, 4).map((p) => (
                <span key={p} className="flex items-center gap-1" title={`${p}: Connected`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
                  <span className="text-[10px] font-medium text-emerald-500 hidden sm:inline capitalize">{p}</span>
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-foreground)]/20" />
                <span className="text-[10px] text-[var(--muted-foreground)]/40">{connectedCount}/{platformTotal} platforms</span>
              </span>
            )}
            {connectedCount > 4 && (
              <span className="text-[9px] text-[var(--muted-foreground)]/40">+{connectedCount - 4}</span>
            )}
          </Link>

          <span className="h-3 w-px bg-[var(--border)] hidden sm:block" />

          {/* System health */}
          <div className="flex items-center gap-1.5 text-[10px]">
            {data?.system?.db?.status === "ok" ? (
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            ) : (
              <Clock className="h-3 w-3 text-[var(--muted-foreground)]/40" />
            )}
            <span className={cn("font-medium", data?.system?.db?.status === "ok" ? "text-emerald-500" : "text-[var(--muted-foreground)]/40")}>
              {data?.system ? "Healthy" : "..."}
            </span>
          </div>

          <span className="h-3 w-px bg-[var(--border)] hidden md:block" />

          {/* Quick stats */}
          <div className="hidden md:flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]" title="Total listings">
              <span className="font-semibold tabular-nums">{data?.listings?.total ?? 0}</span>
              <span>listings</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]" title="Published">
              <span className="font-semibold tabular-nums">{data?.published ?? 0}</span>
              <span>live</span>
            </span>
            {data?.ai?.configured && (
              <span className="flex items-center gap-1 text-[var(--muted-foreground)]" title="AI provider">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="capitalize">{data.ai.provider}</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: links + branding */}
        <div className="flex items-center gap-2.5 shrink-0 text-[10px]">
          <nav className="hidden lg:flex items-center gap-2 text-[var(--muted-foreground)]/40">
            <Link href="/tools" className="hover:text-[var(--muted-foreground)] transition-colors">Support</Link>
            <span className="text-[var(--border)]">·</span>
            <Link href="/diagnostics" className="hover:text-[var(--muted-foreground)] transition-colors">Status</Link>
          </nav>

          <span className="h-3 w-px bg-[var(--border)] hidden lg:block" />

          <span className="font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            ListBlitz
          </span>
          <span className="text-[var(--muted-foreground)]/25 tabular-nums">v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
