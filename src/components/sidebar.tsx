"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, BarChart3, Settings, Moon, Sun, Zap,
  Camera, Radar, HelpCircle, DollarSign, FileUp, BookTemplate,
  Truck, Target, Calendar, LogOut, Stethoscope,
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [foldedSections, setFoldedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyDesignStyle(getSavedDesignStyle(), d); // base palette first
    applyTheme(getSavedTheme(), d); // accent color on top
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
      "fixed inset-y-0 left-0 z-50 flex flex-col w-[220px]",
      "bg-[var(--sidebar)] glass border-r border-[var(--sidebar-border)]",
      className,
    )}>
      {/* Header */}
      <div className="shrink-0 h-[56px] border-b border-[var(--sidebar-border)] overflow-hidden flex items-center px-4">
        <img
          src="/logo-full.png"
          alt="ListBlitz"
          className={cn(
            "h-7 max-w-[160px] object-contain object-left",
            dark && "brightness-[1.8] contrast-[1.1]"
          )}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {sections.map((section) => {
          const folded = isSectionFolded(section);
          const visibleItems = section.items.filter(({ href }) => !ADMIN_ONLY_PATHS.includes(href) || isAdmin);

          return (
            <div key={section.label} className="mb-3">
              {section.collapsible ? (
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
              )}
              <div
                className={cn(
                  "space-y-[2px] overflow-hidden transition-all duration-200",
                  folded && "max-h-0 opacity-0",
                  !folded && "max-h-[500px] opacity-100",
                )}
              >
                {visibleItems.map(({ href, label, icon: Icon }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-[7px] rounded-[10px] transition-all duration-150",
                        active
                          ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-semibold"
                          : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                      )}
                    >
                      <Icon className={cn("h-[16px] w-[16px] shrink-0", active && "text-[var(--primary)]")} />
                      <span className="text-[13px] truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom — theme + sign out, big and clear */}
      <div className="shrink-0 border-t-2 border-[var(--sidebar-border)] px-2 py-3 flex items-center gap-2">
        <button onClick={toggleDark} title={dark ? "Light mode" : "Dark mode"}
          className="flex-1 h-[38px] rounded-[10px] flex items-center justify-center gap-2 text-amber-500 bg-amber-500/10 hover:bg-amber-500 hover:text-white transition-colors">
          {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          <span className="text-[12px] font-medium">{dark ? "Light" : "Dark"}</span>
        </button>
        <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }} title="Sign out"
          className="flex-1 h-[38px] rounded-[10px] flex items-center justify-center gap-2 text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white transition-colors">
          <LogOut className="h-[18px] w-[18px]" />
          <span className="text-[12px] font-medium">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
