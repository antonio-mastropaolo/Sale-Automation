"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function Footer() {
  const pathname = usePathname();

  if (AUTH_ROUTES.includes(pathname)) return null;

  return (
    <footer className="sticky bottom-0 z-30 border-t border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 lg:px-6 overflow-x-auto">

        {/* Left: platform info */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-[var(--accent)]"
            title="Platform integrations — click to configure"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] font-medium text-[var(--muted-foreground)]">
              8 platforms
            </span>
          </Link>

          <span className="h-4 w-px bg-[var(--border)] hidden sm:block" />

          <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">AI-optimized cross-listing</span>
          </span>
        </div>

        {/* Right: branding */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-[var(--muted-foreground)]">
            &copy; {new Date().getFullYear()}
          </span>
          <span className="hidden sm:inline text-[11px] font-medium bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            ListBlitz
          </span>
          <img src="/logo-icon.svg" alt="ListBlitz" className="h-5 w-5 opacity-70" />
        </div>
      </div>
    </footer>
  );
}
