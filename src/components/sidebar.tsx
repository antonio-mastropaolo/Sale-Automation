"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, BarChart3, Settings, Moon, Sun, Zap,
  Camera, Radar, HelpCircle, DollarSign, FileUp, BookTemplate,
  Truck, Target, Calendar, LogOut, Stethoscope, PanelLeftClose, PanelLeftOpen,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, getSavedTheme } from "@/lib/themes";

const sections = [
  {
    label: "Listings",
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
    items: [
      { href: "/shipping", label: "Shipping", icon: Truck },
      { href: "/tools", label: "Seller Tools", icon: HelpCircle },
      { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyTheme(getSavedTheme(), d);
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
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
      setTimeout(() => window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { collapsed: next } })), 0);
      return next;
    });
  };

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out",
      "bg-[var(--sidebar)] glass border-r border-[var(--sidebar-border)]",
      collapsed ? "w-[68px]" : "w-[220px]",
      className,
    )}>
      {/* Header */}
      <div className={cn("flex items-center shrink-0 border-b border-[var(--sidebar-border)]", collapsed ? "justify-center h-[52px] px-1" : "h-[52px] px-3")}>
        <img src="/logo.png" alt="ListBlitz" className={cn("shrink-0 object-contain", collapsed ? "h-7 w-7" : "max-h-[28px] max-w-full")} />
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-[13px] top-[19px] z-50 h-[26px] w-[26px] rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shadow-sm"
      >
        {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
      </button>

      {/* Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-1.5" : "px-2")}>
        {sections.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                {section.label}
              </p>
            )}
            {collapsed && <div className="h-px bg-[var(--sidebar-border)] mx-2 my-1.5" />}
            <div className={cn("space-y-[2px]", collapsed && "flex flex-col items-center")}>
              {section.items.map(({ href, label, icon: Icon }) => {
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
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn("border-t border-[var(--sidebar-border)] py-2", collapsed ? "px-1.5 flex flex-col items-center gap-1" : "px-2 flex items-center gap-1")}>
        <button onClick={toggleDark} title={dark ? "Light" : "Dark"}
          className="h-[34px] w-[34px] rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }} title="Sign out"
          className="h-[34px] w-[34px] rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-red-500/10 transition-colors">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
