"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  Clock,
  Moon,
  Sun,
  Settings2,
  LogOut,
  ChevronUp,
  Columns2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, useMemo } from "react";
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

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitials = useMemo(() => {
    if (userName) {
      const parts = userName.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : userName.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [userName]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setUserName(d.user.name || d.user.username || "User");
        setUserEmail(d.user.email || "");
      }
    }).catch(() => {});

    return () => observer.disconnect();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (AUTH_ROUTES.includes(pathname)) return null;

  const connectedCount = data?.platforms?.connected?.length ?? 0;
  const platformTotal = data?.platforms?.total ?? 8;

  return (
    <footer className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-1 sm:px-4 lg:px-5 overflow-x-auto">

        {/* ── Left: user avatar + menu ── */}
        <div ref={menuRef} className="flex items-center gap-2.5 shrink-0 relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--accent)]"
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
              {userInitials}
            </div>
            <span className="text-[11px] font-medium text-[var(--foreground)] hidden sm:inline truncate max-w-[80px]">{userName || "User"}</span>
            <ChevronUp className={cn("h-2.5 w-2.5 text-[var(--muted-foreground)] transition-transform duration-200", !menuOpen && "rotate-180")} />
          </button>

          {/* User popover menu */}
          {menuOpen && (
            <div className="absolute bottom-full mb-1 left-0 w-[200px] rounded-xl bg-[#1c1c1e] dark:bg-[#111113] border border-white/10 shadow-2xl overflow-hidden z-50" style={{ animation: "fadeIn 150ms ease-out" }}>
              <div className="px-3 py-2 border-b border-white/[0.08]">
                <p className="text-[11px] font-semibold text-white truncate">{userName}</p>
                <p className="text-[9px] text-white/40 truncate">{userEmail}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    const next = !dark;
                    document.documentElement.classList.toggle("dark", next);
                    localStorage.setItem("theme", next ? "dark" : "light");
                    // Re-apply design style for the new mode
                    import("@/lib/themes").then(({ applyDesignStyle, getSavedDesignStyle, applyTheme, getSavedTheme }) => {
                      applyDesignStyle(getSavedDesignStyle(), next);
                      applyTheme(getSavedTheme(), next);
                    });
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                >
                  {dark ? <Sun className="h-3 w-3 text-amber-400" /> : <Moon className="h-3 w-3 text-amber-400" />}
                  {dark ? "Light mode" : "Dark mode"}
                </button>
                <button
                  onClick={() => {
                    const next = localStorage.getItem("sidebar-collapsed") !== "true";
                    localStorage.setItem("sidebar-collapsed", String(next));
                    window.location.reload();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors"
                >
                  <Columns2 className="h-3 w-3 text-blue-400" />
                  Toggle sidebar
                </button>
                <div className="h-px bg-white/[0.08] my-0.5" />
                <button onClick={() => { setMenuOpen(false); window.location.href = "/settings"; }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors">
                  <Settings2 className="h-3 w-3 text-white/40" />
                  Settings
                </button>
                <div className="h-px bg-white/[0.08] my-0.5" />
                <button
                  onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/15 transition-colors"
                >
                  <LogOut className="h-3 w-3" />
                  Sign out
                </button>
              </div>
            </div>
          )}

          <span className="h-3 w-px bg-[var(--border)]" />

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

          <span className="h-3 w-px bg-[var(--border)] hidden sm:block" />

          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
              <span className="font-semibold tabular-nums">{data?.listings?.total ?? 0}</span>
              <span>listings</span>
            </span>
            <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
              <span className="font-semibold tabular-nums">{data?.published ?? 0}</span>
              <span>live</span>
            </span>
            {data?.ai?.configured && (
              <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                <Zap className="h-3 w-3 text-amber-400" />
                <span className="capitalize">{data.ai.provider}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Right: links + branding ── */}
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
