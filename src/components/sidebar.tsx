"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, BarChart3, Settings, Moon, Sun, Zap,
  Camera, Radar, HelpCircle, DollarSign, FileUp, BookTemplate,
  Truck, Target, Calendar, LogOut, Stethoscope, Columns2,
  MessageCircle, FlaskConical, ChevronDown, KeyRound, ImagePlus,
  ChevronUp, Flame, Layers,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { applyTheme, getSavedTheme, applyDesignStyle, getSavedDesignStyle } from "@/lib/themes";

const sections = [
  {
    label: "Listings",
    collapsible: false,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/listings/smart", label: "Smart List", icon: Camera },
      { href: "/listings/new", label: "New Listing", icon: PlusCircle },
      { href: "/bulk-import", label: "Bulk Import", icon: FileUp },
      { href: "/templates", label: "Templates", icon: BookTemplate },
    ],
  },
  {
    label: "Insights",
    collapsible: true,
    items: [
      { href: "/inbox", label: "Inbox", icon: MessageCircle },
      { href: "/inventory", label: "Inventory & P/L", icon: DollarSign },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/trends", label: "Trends", icon: Radar },
      { href: "/competitor", label: "Competitor Spy", icon: Target },
      { href: "/drops", label: "Drop Feed", icon: Flame },
      { href: "/scheduler", label: "Scheduler", icon: Calendar },
    ],
  },
  {
    label: "Tools",
    collapsible: true,
    items: [
      { href: "/shipping", label: "Shipping", icon: Truck },
      { href: "/workflow", label: "AI Pipeline", icon: Zap },
      { href: "/alignment", label: "Store Alignment", icon: Layers },
      { href: "/tools", label: "Seller Tools", icon: HelpCircle },
      { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
      { href: "/diagnostics/tests", label: "Test Suite", icon: FlaskConical },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const ADMIN_ONLY_PATHS = ["/diagnostics", "/diagnostics/tests"];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [compact, setCompact] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [foldedSections, setFoldedSections] = useState<Record<string, boolean>>({});
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyDesignStyle(getSavedDesignStyle(), d); // base palette first
    applyTheme(getSavedTheme(), d); // accent color on top
    if (localStorage.getItem("sidebar-compact") === "true") setCompact(true);
    // Restore folded sections
    try {
      const saved = localStorage.getItem("sidebar-folded");
      if (saved) setFoldedSections(JSON.parse(saved));
    } catch { /* ignore */ }
    // Fetch user info
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      const u = data.user;
      if (u) {
        if (u.role === "admin" || u.username === "antonio" || u.email === "admin@listblitz.io") setIsAdmin(true);
        setUserName(u.name || u.username || "User");
        setUserEmail(u.email || "");
      }
    }).catch(() => {});
  }, []);

  // Close user menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      applyDesignStyle(getSavedDesignStyle(), next); // base palette first
      applyTheme(getSavedTheme(), next); // accent color on top
      return next;
    });
  };

  const toggleCompact = () => {
    setCompact((c) => {
      const next = !c;
      localStorage.setItem("sidebar-compact", String(next));
      setTimeout(() => window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { collapsed: next } })), 0);
      return next;
    });
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const toggleFold = (label: string) => {
    setFoldedSections((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem("sidebar-folded", JSON.stringify(next));
      return next;
    });
  };

  const isSectionFolded = (section: typeof sections[number]) => {
    if (!section.collapsible) return false;
    return !!foldedSections[section.label];
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
      "bg-[var(--sidebar)] glass border-r border-[var(--sidebar-border)]",
      compact ? "w-[60px]" : "w-[192px]",
      className,
    )}>
      {/* Header */}
      <div className={cn(
        "shrink-0 h-[56px] border-b border-[var(--sidebar-border)] overflow-hidden flex items-center",
        compact ? "justify-center p-1" : "px-4"
      )}>
        <img
          src={compact ? "/logo.png" : "/logo-full.png"}
          alt="ListBlitz"
          className={cn(
            compact ? "h-8 w-8 object-contain" : "h-7 max-w-[160px] object-contain object-left",
            dark && "brightness-[1.8] contrast-[1.1]"
          )}
        />
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-1.5", compact ? "px-1.5" : "px-2")}>
        {sections.map((section) => {
          const folded = isSectionFolded(section);
          const visibleItems = section.items.filter(({ href }) => !ADMIN_ONLY_PATHS.includes(href) || isAdmin);

          return (
            <div key={section.label} className="mb-1.5">
              {!compact && (
                section.collapsible ? (
                  <button
                    onClick={() => toggleFold(section.label)}
                    className="flex items-center justify-between w-full px-3 mb-1 group"
                  >
                    <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)] group-hover:text-[var(--sidebar-accent-foreground)] transition-colors">
                      {section.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-[var(--muted-foreground)] transition-transform duration-200",
                      folded && "-rotate-90"
                    )} />
                  </button>
                ) : (
                  <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                    {section.label}
                  </p>
                )
              )}
              {compact && <div className="h-px bg-[var(--sidebar-border)] mx-2 my-1" />}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-200",
                  compact ? "flex flex-col items-center space-y-[2px]" : "space-y-[2px]",
                  !compact && folded && "max-h-0 opacity-0",
                  !compact && !folded && "max-h-[500px] opacity-100",
                )}
              >
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={compact ? label : undefined}
                      className={cn(
                        "flex items-center rounded-[10px] transition-all duration-150",
                        compact ? "justify-center h-[34px] w-[34px]" : "gap-2.5 px-2.5 py-[5px]",
                        active
                          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-semibold"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                      )}
                    >
                      <Icon className={cn("shrink-0", compact ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]", active && "text-[var(--primary)]")} />
                      {!compact && <span className="text-[13px] truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom — user avatar with popover menu */}
      <div ref={menuRef} className="shrink-0 border-t border-[var(--sidebar-border)] relative">
        <button
          onClick={() => setUserMenuOpen((o) => !o)}
          className={cn(
            "w-full flex items-center gap-2.5 transition-colors hover:bg-[var(--sidebar-accent)]",
            compact ? "justify-center p-2.5" : "px-3 py-2.5"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-[12px] font-bold shrink-0">
            {userName ? userName[0].toUpperCase() : "U"}
          </div>
          {!compact && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-semibold truncate text-[var(--sidebar-foreground)]">{userName || "User"}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] truncate">{userEmail || "Not signed in"}</p>
              </div>
              <ChevronUp className={cn("h-3 w-3 text-[var(--muted-foreground)] transition-transform", !userMenuOpen && "rotate-180")} />
            </>
          )}
        </button>

        {/* Popover menu */}
        {userMenuOpen && (
          <div className={cn(
            "absolute bottom-full mb-1 rounded-xl bg-[#1c1c1e] dark:bg-[#111113] border border-white/10 shadow-2xl overflow-hidden animate-fade-in z-50",
            compact ? "left-1 w-[200px]" : "left-2 right-2"
          )}>
            {/* User info header */}
            <div className="px-3 py-2.5 border-b border-white/8">
              <p className="text-[12px] font-semibold text-white">{userName || "User"}</p>
              <p className="text-[10px] text-white/50">{userEmail}</p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button onClick={toggleDark} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors">
                {dark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-amber-400" />}
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <button onClick={toggleCompact} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors">
                <Columns2 className="h-3.5 w-3.5 text-blue-400" />
                {compact ? "Expand sidebar" : "Compact sidebar"}
              </button>

              <div className="h-px bg-white/8 my-1" />

              <button onClick={() => { setUserMenuOpen(false); window.location.href = "/settings"; }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors">
                <KeyRound className="h-3.5 w-3.5 text-white/40" />
                Change password
              </button>
              <button onClick={() => { setUserMenuOpen(false); window.location.href = "/settings"; }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors">
                <ImagePlus className="h-3.5 w-3.5 text-white/40" />
                Change picture
              </button>
              <button onClick={() => { setUserMenuOpen(false); window.location.href = "/settings"; }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-white/80 hover:bg-white/8 transition-colors">
                <Settings className="h-3.5 w-3.5 text-white/40" />
                Settings
              </button>

              <div className="h-px bg-white/8 my-1" />

              <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/15 transition-colors">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
