"use client";

import { useEffect, useState } from "react";

export function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "true");
    setIsDesktop(window.innerWidth >= 1024);

    const onToggle = (e: Event) => setCollapsed((e as CustomEvent).detail.collapsed);
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);

    window.addEventListener("sidebar-toggle", onToggle);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("sidebar-toggle", onToggle);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      className="flex flex-1 flex-col overflow-x-hidden transition-all duration-300 ease-in-out"
      style={{ marginLeft: isDesktop ? (collapsed ? "68px" : "220px") : "0" }}
    >
      <main className="flex-1">
        <div className="w-full px-4 pb-10 pt-16 sm:px-5 sm:pt-14 md:pt-8 lg:px-6 lg:pt-5 xl:px-8 2xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
