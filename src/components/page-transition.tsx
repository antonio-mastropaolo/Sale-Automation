"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * PageTransition wraps the main content area.
 * On every route change it re-triggers the CSS fade-in animation by
 * toggling a class, giving a smooth ~220ms fade between pages.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Use rAF double-frame to restart animation without synchronous reflow
    el.classList.remove("page-enter");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("page-enter");
      });
    });
  }, [pathname]);

  return (
    <div ref={ref} className="page-enter">
      {children}
    </div>
  );
}
