"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Settings,
  Moon,
  Sun,
  Zap,
  Camera,
  Radar,
  HelpCircle,
  DollarSign,
  FileUp,
  BookTemplate,
  Truck,
  Target,
  Calendar,
  LogOut,
  Stethoscope,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getSavedTheme } from "@/lib/themes";

const listingLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/listings/smart", label: "Smart List", icon: Camera },
  { href: "/listings/new", label: "New Listing", icon: PlusCircle },
  { href: "/bulk-import", label: "Bulk Import", icon: FileUp },
  { href: "/templates", label: "Templates", icon: BookTemplate },
];

const insightLinks = [
  { href: "/inventory", label: "Inventory & P/L", icon: DollarSign },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/trends", label: "Trends", icon: Radar },
  { href: "/competitor", label: "Competitor Spy", icon: Target },
  { href: "/scheduler", label: "Scheduler", icon: Calendar },
];

const toolLinks = [
  { href: "/shipping", label: "Shipping", icon: Truck },
  { href: "/tools", label: "Seller Tools", icon: HelpCircle },
  { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const isDark = stored === "dark";
    setDark(isDark);
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyTheme(getSavedTheme(), isDark);

    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed === "true") setCollapsed(true);
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      applyTheme(getSavedTheme(), next);
      return next;
    });
  };

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      // Dispatch in next tick to avoid setState-during-render conflict
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { collapsed: next } }));
      }, 0);
      return next;
    });
  };

  const renderLink = (link: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const { href, label, icon: Icon } = link;
    const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center rounded-xl transition-all duration-200",
          collapsed ? "justify-center h-10 w-10 mx-auto" : "gap-2.5 px-3 py-2",
          active
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md nav-active-glow"
            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        )}
      >
        <Icon className={cn("shrink-0", collapsed ? "h-[18px] w-[18px]" : "h-4 w-4")} />
        {!collapsed && <span className="text-[13px] font-medium truncate">{label}</span>}
      </Link>
    );
  };

  const renderSection = (title: string, links: typeof listingLinks) => (
    <div>
      {!collapsed && (
        <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)]/60">
          {title}
        </p>
      )}
      {collapsed && <div className="h-px bg-[var(--sidebar-border)] mx-3 my-1" />}
      <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center")}>
        {links.map(renderLink)}
      </div>
    </div>
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] flex flex-col transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-56",
        className
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn("flex items-center border-b border-[var(--sidebar-border)]", collapsed ? "justify-center h-14" : "justify-between px-4 h-14")}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "var(--primary)" }}>
              <Zap className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight text-[var(--foreground)] block truncate">
                CrossList
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)" }}>
            <Zap className="h-4 w-4" style={{ color: "var(--primary-foreground)" }} />
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3 top-[18px] z-50 h-6 w-6 rounded-full border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors shadow-sm"
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>

      {/* Navigation */}
      <nav className={cn("flex-1 py-3 overflow-y-auto", collapsed ? "px-1" : "px-2", "space-y-3")}>
        {renderSection("Listings", listingLinks)}
        {renderSection("Insights", insightLinks)}
        {renderSection("Tools", toolLinks)}
      </nav>

      {/* Bottom controls */}
      <div className={cn("border-t border-[var(--sidebar-border)] py-2", collapsed ? "px-1 flex flex-col items-center gap-1" : "px-3 flex items-center justify-between")}>
        <button
          onClick={toggleDark}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          onClick={() => {
            fetch("/api/auth/logout", { method: "POST" }).then(() => {
              window.location.href = "/login";
            });
          }}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
