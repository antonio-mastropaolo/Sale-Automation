"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Settings,
  Calculator,
  FileText,
  Moon,
  Sun,
  Zap,
  Camera,
  Radar,
  HelpCircle,
  LogOut,
  Download,
} from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const menuLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/listings/smart", label: "Smart List", icon: Camera },
  { href: "/listings/new", label: "Manual", icon: PlusCircle },
  { href: "/trends", label: "Trends", icon: Radar },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const generalLinks = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/tools", label: "Help", icon: HelpCircle },
  { href: "/report", label: "Test Report", icon: FileText },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
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
        className={cn(
          "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm nav-active-glow"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl bg-sidebar-primary"
            style={{ zIndex: -1 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className={active ? "font-semibold" : "font-medium"}>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border flex flex-col",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16">
        <motion.div
          className="h-9 w-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center"
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <Zap className="h-4 w-4 text-primary" />
        </motion.div>
        <span className="font-bold text-lg tracking-tight text-foreground">
          CrossList
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
            Menu
          </p>
          <div className="space-y-0.5">
            {menuLinks.map(renderLink)}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
            General
          </p>
          <div className="space-y-0.5">
            {generalLinks.map(renderLink)}
            {/* Dark mode toggle styled as nav item */}
            <button
              onClick={toggleDark}
              className="relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={dark ? "sun" : "moon"}
                  initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.2 }}
                >
                  {dark ? <Sun className="h-[18px] w-[18px] shrink-0" /> : <Moon className="h-[18px] w-[18px] shrink-0" />}
                </motion.div>
              </AnimatePresence>
              <span className="font-semibold">{dark ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Bottom promo card — matches Donezo's "Download Mobile App" card */}
      <div className="px-3 pb-4">
        <div className="bg-gradient-to-br from-[oklch(0.28_0.07_155)] to-[oklch(0.36_0.10_155)] rounded-2xl p-4 text-white">
          <p className="text-sm font-semibold mb-1">Get the Mobile App</p>
          <p className="text-[11px] text-white/70 leading-relaxed mb-3">
            Manage listings on the go with our mobile companion.
          </p>
          <button className="flex items-center gap-2 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold rounded-lg px-3 py-2 w-full justify-center">
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      </div>
    </aside>
  );
}
