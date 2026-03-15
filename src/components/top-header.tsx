"use client";

import { useState } from "react";
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

        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ListBlitz" className="h-7 object-contain" />
          <span className="font-bold text-sm tracking-tight">ListBlitz</span>
        </div>
      </header>
    </div>
  );
}
