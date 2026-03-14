"use client";

import { useState } from "react";
import { Menu, Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import { motion } from "framer-motion";

export function TopHeader() {
  const [open, setOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-40 h-16 border-b border-border/60 bg-background flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile hamburger */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="p-0 w-64 bg-sidebar" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar className="relative w-full" />
        </SheetContent>
      </Sheet>

      {/* Search — with focus expand animation */}
      <motion.div
        className="relative flex-1"
        animate={{
          maxWidth: searchFocused ? "32rem" : "28rem",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <input
          placeholder="Search task"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className={`w-full h-10 pl-11 pr-4 sm:pr-20 bg-muted/40 border rounded-2xl text-sm placeholder:text-muted-foreground/60 focus:outline-none transition-all duration-300 ${
            searchFocused
              ? "border-ring/40 ring-3 ring-ring/10 bg-background shadow-sm"
              : "border-border/50"
          }`}
        />
        <kbd className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-6 select-none items-center gap-1 rounded-md border border-border bg-muted/80 px-2 font-mono text-[11px] font-medium text-muted-foreground">
          <span className="text-xs">&#8984;</span>F
        </kbd>
      </motion.div>

      {/* Right side — bell + avatar only (matches Donezo) */}
      <div className="ml-auto flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors notif-dot"
        >
          <Bell className="h-[18px] w-[18px]" />
        </motion.button>
        <div className="flex items-center gap-2.5 ml-1">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-amber-100 flex items-center justify-center ring-2 ring-primary/10">
            <span className="text-sm font-bold text-amber-800">U</span>
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-semibold text-foreground leading-none">User</p>
            <p className="text-xs text-muted-foreground mt-0.5">user@cross...</p>
          </div>
        </div>
      </div>
    </header>
  );
}
