"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { platformBranding } from "@/lib/colors";

interface ConversationSnapshot {
  id: string;
  platform: string;
  buyerName: string;
  listingTitle: string;
  lastMessage: string;
  lastMessageAt: string;
  unread: boolean;
}

const POLL_INTERVAL = 15_000; // 15 seconds

/**
 * InboxNotifications — polls for new messages and fires toast
 * notifications with an AI-generated summary and platform icon.
 * Rendered once in the root layout (not per page).
 */
export function InboxNotifications() {
  const pathname = usePathname();
  const knownRef = useRef<Map<string, string>>(new Map()); // id -> lastMessageAt
  const initializedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Broadcast unread count so TopHeader can pick it up
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("inbox-unread", { detail: { count: unreadCount } })
    );
  }, [unreadCount]);

  const checkInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      if (!res.ok) return;
      const data = await res.json();
      const conversations: ConversationSnapshot[] = data.conversations || [];
      setUnreadCount(data.unreadCount || 0);

      // On first load, just snapshot — don't fire notifications
      if (!initializedRef.current) {
        for (const c of conversations) {
          knownRef.current.set(c.id, c.lastMessageAt);
        }
        initializedRef.current = true;
        return;
      }

      // Detect new or updated conversations
      for (const c of conversations) {
        const prev = knownRef.current.get(c.id);
        const isNew = !prev;
        const isUpdated = prev && prev !== c.lastMessageAt;

        if ((isNew || isUpdated) && c.unread) {
          // Skip if user is already on the inbox page
          if (pathname === "/inbox") {
            knownRef.current.set(c.id, c.lastMessageAt);
            continue;
          }

          fireNotification(c);
        }

        knownRef.current.set(c.id, c.lastMessageAt);
      }
    } catch {
      // Silently ignore fetch errors
    }
  }, [pathname]);

  useEffect(() => {
    checkInbox();
    const interval = setInterval(checkInbox, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkInbox]);

  return null; // No UI — this component only fires toasts
}

/**
 * Fire a rich toast notification for a new message.
 * Gets an AI summary, then shows the toast with platform icon.
 */
async function fireNotification(conv: {
  platform: string;
  buyerName: string;
  listingTitle: string;
  lastMessage: string;
}) {
  const branding = platformBranding[conv.platform];
  const platformLabel = branding?.label || conv.platform;
  const logoSrc = branding?.logo || "";

  // Get AI summary (non-blocking — show fallback if slow)
  let summary = conv.lastMessage.slice(0, 80);
  try {
    const res = await fetch("/api/inbox/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerMessage: conv.lastMessage,
        buyerName: conv.buyerName,
        platform: conv.platform,
        listingTitle: conv.listingTitle,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.summary) summary = data.summary;
    }
  } catch {
    // Use raw message as fallback
  }

  // Fire toast with platform icon
  toast(conv.buyerName, {
    description: summary,
    duration: 8000,
    icon: logoSrc ? (
      <img
        src={logoSrc}
        alt={platformLabel}
        width={20}
        height={20}
        style={{ borderRadius: 5 }}
      />
    ) : (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: 5,
          fontSize: 10,
          fontWeight: 700,
          color: "#fff",
          background: branding?.accent?.replace("bg-", "").includes("500")
            ? `var(--primary)`
            : "#666",
        }}
      >
        {(branding?.icon || conv.platform[0]).toUpperCase()}
      </span>
    ),
    action: {
      label: "View",
      onClick: () => {
        window.location.href = "/inbox";
      },
    },
  });

  // Also try browser Notification API (if permission granted)
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification(`${conv.buyerName} on ${platformLabel}`, {
      body: summary,
      icon: logoSrc || "/logo-icon.svg",
      tag: `inbox-${conv.platform}-${conv.buyerName}`,
    });
  }
}
