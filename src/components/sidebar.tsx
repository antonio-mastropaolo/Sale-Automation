"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, BarChart3, Settings, Moon, Sun, Zap,
  Camera, Radar, HelpCircle, DollarSign, FileUp, BookTemplate,
  Truck, Target, Calendar, LogOut, Stethoscope, PanelLeftClose, PanelLeftOpen,
  MessageCircle, FlaskConical, ChevronDown,
} from "lucide-react";
import { useEffect, useState } from "react";
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
      { href: "/scheduler", label: "Scheduler", icon: Calendar },
    ],
  },
  {
    label: "Tools",
    collapsible: true,
    items: [
      { href: "/shipping", label: "Shipping", icon: Truck },
      { href: "/workflow", label: "AI Pipeline", icon: Zap },
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
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [foldedSections, setFoldedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyDesignStyle(getSavedDesignStyle(), d); // base palette first
    applyTheme(getSavedTheme(), d); // accent color on top
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
    // Restore folded sections
    try {
      const saved = localStorage.getItem("sidebar-folded");
      if (saved) setFoldedSections(JSON.parse(saved));
    } catch { /* ignore */ }
    // Check admin status
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      const u = data.user;
      if (u && (u.role === "admin" || u.username === "antonio" || u.email === "admin@listblitz.io")) setIsAdmin(true);
    }).catch(() => {});
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

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
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
    // Auto-expand if a child route is active
    const hasActiveChild = section.items.some(({ href }) => isActive(href));
    if (hasActiveChild) return false;
    return !!foldedSections[section.label];
  };

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
      "bg-[var(--sidebar)] glass border-r border-[var(--sidebar-border)]",
      collapsed ? "w-[68px]" : "w-[220px]",
      className,
    )}>
      {/* Header */}
      <div className={cn("shrink-0 border-b border-[var(--sidebar-border)] overflow-hidden flex items-center", collapsed ? "h-[56px] justify-center p-1" : "h-[56px] px-4", dark ? "bg-[#0d1117]" : "bg-white")}>
        <img
          src={collapsed ? "/logo.png" : dark ? "/logo-full-dark.png" : "/logo-full.png"}
          alt="ListBlitz"
          className={collapsed ? "h-8 w-8 object-contain" : "h-7 max-w-[160px] object-contain object-left"}
        />
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-1.5" : "px-2")}>
        {sections.map((section) => {
          const folded = isSectionFolded(section);
          const visibleItems = section.items.filter(({ href }) => !ADMIN_ONLY_PATHS.includes(href) || isAdmin);

          return (
            <div key={section.label} className="mb-3">
              {!collapsed && (
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
              {collapsed && <div className="h-px bg-[var(--sidebar-border)] mx-2 my-1.5" />}
              <div
                className={cn(
                  "space-y-[2px] overflow-hidden transition-all duration-200",
                  collapsed && "flex flex-col items-center",
                  !collapsed && folded && "max-h-0 opacity-0",
                  !collapsed && !folded && "max-h-[500px] opacity-100",
                )}
              >
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "flex items-center rounded-[10px] transition-all duration-150",
                        collapsed ? "justify-center h-[38px] w-[38px]" : "gap-2.5 px-2.5 py-[7px]",
                        active
                          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-semibold"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                      )}
                    >
                      <Icon className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-[16px] w-[16px]", active && "text-[var(--primary)]")} />
                      {!collapsed && <span className="text-[13px] truncate">{label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={cn(
        "border-t border-[var(--sidebar-border)] bg-[var(--sidebar-accent)]/40 py-2 gap-1",
        collapsed ? "px-1.5 flex flex-col items-center" : "px-2 flex flex-col"
      )}>
        {collapsed ? (
          <>
            <button onClick={toggleCollapse} title="Expand sidebar"
              className="h-[34px] w-[34px] rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
            <button onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}
              className="h-[34px] w-[34px] rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }} title="Sign out"
              className="h-[34px] w-[34px] rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-red-500/10 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleCollapse}
              className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[8px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
              <PanelLeftClose className="h-[15px] w-[15px] shrink-0" />
              <span className="text-[12px]">Collapse</span>
            </button>
            <button onClick={toggleDark}
              className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[8px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
              {dark ? <Sun className="h-[15px] w-[15px] shrink-0" /> : <Moon className="h-[15px] w-[15px] shrink-0" />}
              <span className="text-[12px]">{dark ? "Light mode" : "Dark mode"}</span>
            </button>
            <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
              className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-[8px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-red-500/10 transition-colors">
              <LogOut className="h-[15px] w-[15px] shrink-0" />
              <span className="text-[12px]">Sign out</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
