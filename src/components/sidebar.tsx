"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, PlusCircle, BarChart3, Settings,
  Camera, Radar, HelpCircle, DollarSign, FileUp, BookTemplate,
  Truck, Target, Calendar, Stethoscope,
  MessageCircle, FlaskConical, ChevronDown, ChevronUp,
  Flame, Layers, Menu, X, Moon, Sun, LogOut, Settings2, Columns2,
  ShoppingBag, Zap, Package, Store, Search, Sparkles, Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { applyTheme, getSavedTheme, applyDesignStyle, getSavedDesignStyle } from "@/lib/themes";

/* ── Nav structure — navigation only, no monitoring ── */

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; icon: LucideIcon; children: NavItem[] };
type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const navStructure: NavEntry[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "listings",
    label: "Listings",
    icon: FileUp,
    children: [
      { href: "/listings/smart", label: "Smart List", icon: Camera },
      { href: "/listings/new", label: "New Listing", icon: PlusCircle },
      { href: "/bulk-import", label: "Bulk Import", icon: FileUp },
      { href: "/templates", label: "Templates", icon: BookTemplate },
    ],
  },
  { href: "/inventory", label: "Products", icon: Package },
  { href: "/search", label: "Cross-Market Search", icon: Search },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: Store,
    children: [
      { href: "/inbox", label: "Inbox", icon: MessageCircle },
      { href: "/alignment", label: "Store Sync", icon: Layers },
      { href: "/shipping", label: "Shipping Hub", icon: Truck },
    ],
  },
  {
    id: "automation",
    label: "Automation",
    icon: Zap,
    children: [
      { href: "/workflow", label: "AI Pipeline", icon: Zap },
      { href: "/scheduler", label: "Scheduler", icon: Calendar },
      { href: "/drops", label: "Drop Feed", icon: Flame },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    children: [
      { href: "/analytics", label: "Overview", icon: BarChart3 },
      { href: "/trends", label: "Trends", icon: Radar },
      { href: "/competitor", label: "Competitor", icon: Target },
    ],
  },
  {
    id: "system",
    label: "System",
    icon: Settings,
    children: [
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/tools", label: "Seller Tools", icon: HelpCircle },
      { href: "/diagnostics", label: "Diagnostics", icon: Stethoscope },
      { href: "/diagnostics/tests", label: "Test Suite", icon: FlaskConical },
    ],
  },
];

/** Flat list of all nav items (used by collapsed sidebar) */
const allNavItems: NavItem[] = navStructure.flatMap((entry) =>
  isGroup(entry) ? entry.children : [entry as NavItem]
);

const ADMIN_ONLY_PATHS = ["/diagnostics", "/diagnostics/tests"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

function findGroupForPath(pathname: string): string | null {
  for (const entry of navStructure) {
    if (isGroup(entry)) {
      for (const child of entry.children) {
        if (pathname === child.href || (child.href !== "/" && pathname.startsWith(child.href))) {
          return entry.id;
        }
      }
    }
  }
  return null;
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [dark, setDark] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const userInitials = useMemo(() => {
    if (userName) {
      const parts = userName.trim().split(/\s+/);
      return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : userName.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [userName]);

  const isAuthPage = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    const d = localStorage.getItem("theme") === "dark";
    setDark(d);
    if (d) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    applyDesignStyle(getSavedDesignStyle(), d);
    applyTheme(getSavedTheme(), d);
    if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
    // Always expand all groups on page load
    const allExpanded: Record<string, boolean> = {};
    navStructure.forEach((e) => { if ("children" in e) allExpanded[e.id] = true; });
    setOpenGroups(allExpanded);
    try { const pic = localStorage.getItem("listblitz-profile-pic"); if (pic) setProfilePic(pic); } catch {}
    fetch("/api/auth/me").then((r) => r.json()).then((data) => {
      const u = data.user;
      if (u) {
        if (u.role === "admin" || u.username === "antonio" || u.email === "admin@listblitz.io") setIsAdmin(true);
        setUserName(u.name || u.username || "User");
        setUserEmail(u.email || "");
      }
    }).catch(() => {});
    window.dispatchEvent(new Event("app:ready"));
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      applyDesignStyle(getSavedDesignStyle(), next);
      applyTheme(getSavedTheme(), next);
      return next;
    });
  };

  const handleProfilePicUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setProfilePic(dataUrl);
        try { localStorage.setItem("listblitz-profile-pic", dataUrl); } catch {}
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  useEffect(() => {
    const groupId = findGroupForPath(pathname);
    if (groupId) {
      setOpenGroups((prev) => {
        if (prev[groupId]) return prev;
        const next = { ...prev, [groupId]: true };
        try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch {}
        return next;
      });
    }
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
  };

  const toggleGroup = useCallback((groupId: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try { localStorage.setItem("sidebar-groups", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isItemActive = useCallback((href: string) => {
    return pathname === href || (href !== "/" && pathname.startsWith(href));
  }, [pathname]);

  const isGroupActive = useCallback((group: NavGroup) => {
    return group.children.some((child) => isItemActive(child.href));
  }, [isItemActive]);

  const renderNavLink = (item: NavItem, indented = false) => {
    if (ADMIN_ONLY_PATHS.includes(item.href) && !isAdmin) return null;
    const isActive = isItemActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-[6px] text-[14px] font-medium transition-all duration-200",
          indented && "pl-6",
          isActive
            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
            : "text-[var(--foreground)]/70 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isOpen = !!openGroups[group.id];
    const hasActive = isGroupActive(group);
    const GroupIcon = group.icon;
    const visibleChildren = group.children.filter(
      (child) => !ADMIN_ONLY_PATHS.includes(child.href) || isAdmin
    );
    if (visibleChildren.length === 0) return null;

    return (
      <div key={group.id}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-2.5 py-[6px] text-[14px] font-medium transition-all duration-200",
            hasActive && !isOpen
              ? "text-[var(--foreground)]"
              : "text-[var(--foreground)]/70 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          <GroupIcon className={cn("h-4 w-4 shrink-0", hasActive && "text-[var(--primary)]")} />
          <span className="truncate">{group.label}</span>
          {hasActive && !isOpen && (
            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          )}
          <ChevronDown className={cn(
            "ml-auto h-3 w-3 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
        <div className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}>
          <div className="overflow-hidden">
            <div className="space-y-px pt-0.5">
              {visibleChildren.map((child) => renderNavLink(child, true))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const navContent = (
    <>
      {/* Logo — compact */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <img src="/logo-icon.svg" alt="ListBlitz" className="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-[13px] font-bold tracking-tight">ListBlitz</h1>
          <p className="truncate text-[8px] font-semibold uppercase tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            AI Cross-Listing
          </p>
        </div>
      </div>

      <div className="mx-3 border-t border-[var(--sidebar-border)]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {navStructure.map((entry) =>
          isGroup(entry) ? renderNavGroup(entry) : renderNavLink(entry as NavItem)
        )}
      </nav>

      {/* User profile */}
      <div ref={menuRef} className="shrink-0 border-t border-[var(--sidebar-border)] relative">
        <button
          onClick={() => setUserMenuOpen((o) => !o)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--muted)]/50"
        >
          {profilePic ? (
            <img src={profilePic} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {userInitials}
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-semibold truncate">{userName || "User"}</p>
            <p className="text-[9px] text-[var(--muted-foreground)] truncate">{userEmail}</p>
          </div>
          <ChevronUp className={cn("h-3 w-3 text-[var(--muted-foreground)] transition-transform", !userMenuOpen && "rotate-180")} />
        </button>

        {userMenuOpen && (
          <div className="absolute bottom-full mb-1 left-2 right-2 rounded-xl bg-[#1c1c1e] dark:bg-[#111113] border border-white/10 shadow-2xl overflow-hidden z-50" style={{ animation: "fadeIn 150ms ease-out" }}>
            <div className="px-3 py-2 border-b border-white/[0.08]">
              <p className="text-[11px] font-semibold text-white truncate">{userName}</p>
              <p className="text-[9px] text-white/40 truncate">{userEmail}</p>
            </div>
            <div className="py-1">
              <button onClick={handleProfilePicUpload} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors">
                <Camera className="h-3 w-3 text-blue-400" />
                {profilePic ? "Change picture" : "Upload picture"}
              </button>
              <button onClick={() => { toggleDark(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors">
                {dark ? <Sun className="h-3 w-3 text-amber-400" /> : <Moon className="h-3 w-3 text-amber-400" />}
                {dark ? "Light mode" : "Dark mode"}
              </button>
              <button onClick={() => { const next = !collapsed; setCollapsed(next); try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {} setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors">
                <Columns2 className="h-3 w-3 text-blue-400" />
                {collapsed ? "Expand sidebar" : "Compact sidebar"}
              </button>
              <div className="h-px bg-white/[0.08] my-0.5" />
              <button onClick={() => { setUserMenuOpen(false); window.location.href = "/settings"; }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.08] transition-colors">
                <Settings2 className="h-3 w-3 text-white/40" />Settings
              </button>
              <div className="h-px bg-white/[0.08] my-0.5" />
              <button onClick={() => { fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.href = "/login"; }); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/15 transition-colors">
                <LogOut className="h-3 w-3" />Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Branding */}
      <div className="shrink-0 px-3 py-2 text-center">
        <p className="text-[9px] text-[var(--muted-foreground)]/30">&copy; {new Date().getFullYear()} <span className="font-semibold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">ListBlitz</span> v1.0.0</p>
      </div>
    </>
  );

  if (isAuthPage) return null;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        className="fixed left-4 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--card)] shadow-lg ring-1 ring-[var(--border)] lg:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--sidebar-bg)", backdropFilter: "var(--sidebar-blur)", WebkitBackdropFilter: "var(--sidebar-blur)" }}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar — 220px expanded, icon-only collapsed */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--sidebar-border)] transition-all duration-300 ease-in-out lg:flex",
          collapsed ? "w-14" : "w-[220px]",
          className,
        )}
        style={{ background: "var(--sidebar-bg)", backdropFilter: "var(--sidebar-blur)", WebkitBackdropFilter: "var(--sidebar-blur)" }}
      >
        {collapsed ? (
          <>
            <div className="flex justify-center px-1 py-3">
              <img src="/logo-icon.svg" alt="ListBlitz" className="h-7 w-7" />
            </div>
            <div className="mx-2 border-t border-[var(--sidebar-border)]" />
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-1.5 py-2">
              {allNavItems.filter((item) => !ADMIN_ONLY_PATHS.includes(item.href) || isAdmin).map((item) => {
                const isActive = isItemActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md mx-auto transition-all duration-200",
                      isActive
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-[var(--primary)]/20"
                        : "text-[var(--foreground)]/70 hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </nav>
            {/* Collapsed user avatar */}
            <div className="shrink-0 border-t border-[var(--sidebar-border)] flex justify-center py-2">
              {profilePic ? (
                <img src={profilePic} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                  {userInitials}
                </div>
              )}
            </div>
          </>
        ) : (
          navContent
        )}
      </aside>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
