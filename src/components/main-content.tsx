"use client";

import { useEffect, useState } from "react";

export function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    // Read initial state
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    setIsDesktop(window.innerWidth >= 1024);

    // Listen for sidebar toggle (dispatched via setTimeout in sidebar to avoid render conflicts)
    const onToggle = (e: Event) => {
      setCollapsed((e as CustomEvent).detail.collapsed);
    };

    const onResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener("sidebar-toggle", onToggle);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("sidebar-toggle", onToggle);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const ml = isDesktop ? (collapsed ? "4rem" : "14rem") : "0";

  return (
    <div
      className="flex flex-1 flex-col overflow-x-hidden transition-all duration-300 ease-in-out"
      style={{ marginLeft: ml }}
    >
      <main className="flex-1">
        <div className="w-full px-4 pb-10 pt-16 sm:px-6 sm:pt-16 md:pt-8 lg:px-8 lg:pt-6 2xl:px-12 2xl:pb-12">
          {children}
        </div>
      </main>
    </div>
  );
}
