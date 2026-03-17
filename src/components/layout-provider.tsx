"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LayoutStyle =
  | "default"
  | "ios"
  | "material"
  | "flat"
  | "neumorphism"
  | "glassmorphism";

const VALID_STYLES: LayoutStyle[] = [
  "default",
  "ios",
  "material",
  "flat",
  "neumorphism",
  "glassmorphism",
];

interface LayoutContextType {
  layoutStyle: LayoutStyle;
  setLayoutStyle: (style: LayoutStyle) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function useLayoutStyle() {
  const context = useContext(LayoutContext);
  if (!context) throw new Error("useLayoutStyle must be used within LayoutProvider");
  return context;
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layoutStyle, setLayoutStyleState] = useState<LayoutStyle>("default");

  // Hydrate from localStorage (instant, no flash)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("listblitz-layout") as LayoutStyle | null;
      if (stored && VALID_STYLES.includes(stored)) {
        setLayoutStyleState(stored);
        document.documentElement.setAttribute("data-layout", stored);
      }
    } catch {}
  }, []);

  const setLayoutStyle = (style: LayoutStyle) => {
    setLayoutStyleState(style);
    document.documentElement.setAttribute("data-layout", style);
    try {
      localStorage.setItem("listblitz-layout", style);
    } catch {}
  };

  const value = useMemo(
    () => ({ layoutStyle, setLayoutStyle }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutStyle]
  );

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
