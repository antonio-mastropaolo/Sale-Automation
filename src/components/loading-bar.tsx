"use client";

import { useEffect, useState } from "react";

/**
 * Slim animated loading bar at the very top of the viewport.
 * Shows indeterminate progress — the bar slides back and forth.
 */
export function LoadingBar({ active }: { active: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
    } else {
      // Keep visible briefly for the finish animation
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] overflow-hidden">
      <div
        className={`h-full rounded-r-full transition-all duration-300 ${
          active ? "animate-loading-bar" : "w-full opacity-0"
        }`}
        style={{ background: "var(--primary)" }}
      />
      <style>{`
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          25% { width: 40%; margin-left: 10%; }
          50% { width: 30%; margin-left: 50%; }
          75% { width: 40%; margin-left: 40%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
