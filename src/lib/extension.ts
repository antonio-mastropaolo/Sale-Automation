/**
 * ListBlitz Extension Bridge
 *
 * Client-side SDK for communicating with the ListBlitz Chrome extension.
 * The web app uses this to check platform connections, publish listings, etc.
 */

let extensionReady = false;
let pendingCallbacks = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

// Listen for extension messages
if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== "listblitz-extension") return;

    if (event.data.action === "EXTENSION_READY") {
      extensionReady = true;
      window.dispatchEvent(new CustomEvent("listblitz-extension-ready"));
      return;
    }

    if (event.data.action === "PUBLISH_CONFIRMED") {
      window.dispatchEvent(
        new CustomEvent("listblitz-publish-confirmed", { detail: event.data.data })
      );
      return;
    }

    // Route response to pending callback
    const { requestId, response, error } = event.data;
    if (requestId && pendingCallbacks.has(requestId)) {
      const cb = pendingCallbacks.get(requestId)!;
      pendingCallbacks.delete(requestId);
      if (error) cb.reject(new Error(error));
      else cb.resolve(response);
    }
  });
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Send a message to the extension and wait for a response
 */
function sendToExtension(action: string, data: Record<string, unknown> = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!extensionReady) {
      reject(new Error("Extension not installed or not ready"));
      return;
    }
    const requestId = generateId();
    pendingCallbacks.set(requestId, { resolve, reject });

    window.postMessage({ source: "listblitz-app", action, data, requestId }, "*");

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingCallbacks.has(requestId)) {
        pendingCallbacks.delete(requestId);
        reject(new Error("Extension request timed out"));
      }
    }, 30_000);
  });
}

// ── Public API ────────────────────────────────────────────────

export function isExtensionInstalled(): boolean {
  return extensionReady;
}

export function waitForExtension(timeout = 3000): Promise<boolean> {
  if (extensionReady) return Promise.resolve(true);
  return new Promise((resolve) => {
    const handler = () => { resolve(true); cleanup(); };
    const timer = setTimeout(() => { resolve(false); cleanup(); }, timeout);
    const cleanup = () => {
      window.removeEventListener("listblitz-extension-ready", handler);
      clearTimeout(timer);
    };
    window.addEventListener("listblitz-extension-ready", handler);
  });
}

export interface PlatformSession {
  connected: boolean;
  hasCookies?: boolean;
  cookieCount?: number;
  platform?: string;
  error?: string;
}

export async function checkPlatformSession(platform: string): Promise<PlatformSession> {
  const result = await sendToExtension("CHECK_SESSION", { platform });
  return result as PlatformSession;
}

export async function checkAllSessions(): Promise<Record<string, PlatformSession>> {
  const result = await sendToExtension("CHECK_ALL_SESSIONS");
  return result as Record<string, PlatformSession>;
}

export async function loginToPlatform(platform: string): Promise<void> {
  await sendToExtension("LOGIN_TO_PLATFORM", { platform });
}

export interface ListingData {
  title: string;
  description: string;
  price: number;
  brand?: string;
  category?: string;
  size?: string;
  condition?: string;
  images?: string[];
}

export async function publishToplatform(
  platform: string,
  listing: ListingData
): Promise<{ success: boolean; tabId?: number; error?: string }> {
  const result = await sendToExtension("PUBLISH_TO_PLATFORM", { platform, listing });
  return result as { success: boolean; tabId?: number; error?: string };
}

export async function publishToMultiple(
  platforms: string[],
  listing: ListingData
): Promise<Record<string, { success: boolean; error?: string }>> {
  const result = await sendToExtension("PUBLISH_TO_MULTIPLE", { platforms, listing });
  return result as Record<string, { success: boolean; error?: string }>;
}

export function onPublishConfirmed(
  callback: (data: { platform: string; url: string; success: boolean }) => void
): () => void {
  const handler = (e: Event) => callback((e as CustomEvent).detail);
  window.addEventListener("listblitz-publish-confirmed", handler);
  return () => window.removeEventListener("listblitz-publish-confirmed", handler);
}
