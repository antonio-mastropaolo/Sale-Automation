"use client";

import { useState, useEffect } from "react";
import { Menu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";

export function TopHeader() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lg:hidden">
      {/* Mobile top bar */}
      <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--background)] flex items-center px-4 gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
              >
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-56 bg-[var(--sidebar)]" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar className="relative w-full" />
          </SheetContent>
        </Sheet>

        <div className="flex items-center">
          <img src={dark ? "/logo-full-dark.png" : "/logo-full.png"} alt="ListBlitz" className="h-8 sm:h-9 object-contain" />
        </div>
      </header>
    </div>
  );
}
