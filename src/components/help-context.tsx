"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface HelpError {
  message: string;
  page: string;
  details?: string;
  timestamp: number;
}

export type HelpMode = "ask" | "error" | "contact";

interface HelpContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  errors: HelpError[];
  pushError: (message: string, details?: string) => void;
  clearErrors: () => void;
  openWithError: (message: string, details?: string) => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  mode: HelpMode;
  setMode: (mode: HelpMode) => void;
  hasUnreadErrors: boolean;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<HelpError[]>([]);
  const [currentPage, setCurrentPage] = useState("");
  const [mode, setMode] = useState<HelpMode>("ask");
  const [hasUnreadErrors, setHasUnreadErrors] = useState(false);

  const pushError = useCallback((message: string, details?: string) => {
    setErrors((prev) => [
      ...prev.slice(-19), // keep last 20
      { message, details, page: currentPage, timestamp: Date.now() },
    ]);
    setHasUnreadErrors(true);
  }, [currentPage]);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setHasUnreadErrors(false);
  }, []);

  const openWithError = useCallback((message: string, details?: string) => {
    pushError(message, details);
    setMode("error");
    setIsOpen(true);
    setHasUnreadErrors(false);
  }, [pushError]);

  const handleSetIsOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open && mode === "error") setHasUnreadErrors(false);
  }, [mode]);

  return (
    <HelpContext.Provider value={{
      isOpen, setIsOpen: handleSetIsOpen,
      errors, pushError, clearErrors, openWithError,
      currentPage, setCurrentPage,
      mode, setMode,
      hasUnreadErrors,
    }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used within HelpProvider");
  return ctx;
}
