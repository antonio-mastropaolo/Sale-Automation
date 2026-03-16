"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu, Bell, Zap } from "lucide-react";
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
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Listen for unread count broadcasts from InboxNotifications
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setUnreadCount(detail?.count || 0);
    };
    window.addEventListener("inbox-unread", handler);

    // Also do an initial fetch
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((data) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});

    return () => window.removeEventListener("inbox-unread", handler);
  }, []);

  // Request browser notification permission on first interaction
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      // Defer to avoid blocking — request after 3 seconds
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="lg:hidden">
      {/* Mobile top bar */}
      <header className="fixed top-0 right-0 left-0 z-40 h-14 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between px-4 gap-3">
        <div className="flex items-center gap-3">
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
        </div>

        {/* Notification bell */}
        <button
          onClick={() => router.push("/inbox")}
          className="relative h-9 w-9 rounded-[8px] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--accent)] transition-colors"
          title="Inbox"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 rounded-full bg-[var(--destructive)] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </header>
    </div>
  );
}
