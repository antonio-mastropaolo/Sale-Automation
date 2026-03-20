/**
 * GUI Watch — Session Recorder
 *
 * Opens a Chromium browser you control. Records every interaction:
 *   - Clicks, typing, navigation, scrolling, key presses
 *   - Performance metrics at each page navigation
 *   - Console logs (errors, warnings)
 *   - Network requests (URL, status, duration, size)
 *
 * Usage:
 *   npx ts-node tests/gui-watch/session-recorder.ts [session-name]
 *
 * Press Ctrl+C to stop recording. The session JSON is saved to
 * docs/gui-watch/sessions/<session-id>.json
 */

import { chromium } from "@playwright/test";
import type { Page, BrowserContext } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import type {
  RecordingSession,
  RecordedAction,
  PerformanceSnapshot,
  ConsoleEntry,
  NetworkEntry,
  ActionType,
} from "./types";
import { ActionType as AT } from "./types";

// ── Config ───────────────────────────────────────────────────────

const BASE_URL = process.env.WATCH_URL || "http://localhost:3000";
const SESSION_NAME = process.argv[2] || `session-${Date.now()}`;
const OUTPUT_DIR = path.join(process.cwd(), "docs", "gui-watch", "sessions");
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "gui-watch", "screenshots");

// ── Helpers ──────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateSessionId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const time = now.toISOString().slice(11, 19).replace(/:/g, "");
  const rand = Math.random().toString(36).substring(2, 6);
  return `WS-${date}-${time}-${rand}`;
}

function selectorFromElement(tag: string, id: string, classes: string[], text: string): string {
  if (id) return `#${id}`;
  const base = tag.toLowerCase();
  if (classes.length > 0) {
    const cls = classes.slice(0, 3).join(".");
    return `${base}.${cls}`;
  }
  if (text && text.length < 50) {
    return `${base}:has-text("${text.substring(0, 30)}")`;
  }
  return base;
}

// ── Performance Collector ────────────────────────────────────────

async function capturePerformanceSnapshot(page: Page, startTime: number): Promise<PerformanceSnapshot> {
  const url = page.url();

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

    // LCP
    let lcp = 0;
    try {
      const entries = performance.getEntriesByType("largest-contentful-paint");
      if (entries.length > 0) lcp = entries[entries.length - 1].startTime;
    } catch { /* not supported */ }

    // CLS
    let cls = 0;
    try {
      const entries = performance.getEntriesByType("layout-shift");
      for (const entry of entries) {
        if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
          cls += (entry as unknown as { value: number }).value;
        }
      }
    } catch { /* not supported */ }

    // Long tasks
    let longTasks = 0;
    let tbt = 0;
    try {
      const entries = performance.getEntriesByType("longtask");
      longTasks = entries.length;
      for (const entry of entries) {
        if (entry.duration > 50) tbt += entry.duration - 50;
      }
    } catch { /* not supported */ }

    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
      fcp: fcp ? fcp.startTime : 0,
      lcp,
      cls: Math.round(cls * 1000) / 1000,
      tbt: Math.round(tbt),
      domNodes: document.querySelectorAll("*").length,
      jsHeapSize: mem ? mem.usedJSHeapSize : 0,
      longTasks,
    };
  });

  return {
    url,
    timestamp: Date.now() - startTime,
    ...metrics,
    requestCount: 0, // filled by network listener
    transferSize: 0, // filled by network listener
  };
}

// ── Main Recorder ────────────────────────────────────────────────

async function startRecording(): Promise<void> {
  ensureDir(OUTPUT_DIR);
  ensureDir(SCREENSHOT_DIR);

  const sessionId = generateSessionId();
  const startTime = Date.now();

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  GUI Watch — Session Recorder`);
  console.log(`${"═".repeat(65)}`);
  console.log(`  Session:  ${sessionId}`);
  console.log(`  Name:     ${SESSION_NAME}`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Output:   ${OUTPUT_DIR}`);
  console.log(`${"═".repeat(65)}`);
  console.log(`\n  🔴 RECORDING — interact with the app in the browser.`);
  console.log(`  Press Ctrl+C to stop and save the session.\n`);

  // State
  const actions: RecordedAction[] = [];
  const perfSnapshots: PerformanceSnapshot[] = [];
  const consoleEntries: ConsoleEntry[] = [];
  const networkEntries: NetworkEntry[] = [];
  const pagesVisited = new Set<string>();
  let actionCounter = 0;

  // Launch browser in headed mode (user controls it)
  const browser = await chromium.launch({
    headless: false,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: undefined,
  });

  const page = await context.newPage();

  // ── Console Listener ──
  page.on("console", (msg) => {
    const level = msg.type() as ConsoleEntry["level"];
    if (["log", "warn", "error", "info"].includes(level)) {
      consoleEntries.push({
        level,
        text: msg.text(),
        timestamp: Date.now() - startTime,
        url: page.url(),
      });
      if (level === "error") {
        console.log(`    ⚠ Console error: ${msg.text().substring(0, 80)}`);
      }
    }
  });

  // ── Network Listener ──
  const requestTimings = new Map<string, number>();

  page.on("request", (req) => {
    requestTimings.set(req.url(), Date.now());
  });

  page.on("response", async (response) => {
    const url = response.url();
    const reqStart = requestTimings.get(url) || Date.now();
    const duration = Date.now() - reqStart;
    requestTimings.delete(url);

    let size = 0;
    try {
      const headers = response.headers();
      size = parseInt(headers["content-length"] || "0", 10);
    } catch { /* ignore */ }

    networkEntries.push({
      url,
      method: response.request().method(),
      status: response.status(),
      duration,
      size,
      contentType: response.headers()["content-type"] || "",
      timestamp: Date.now() - startTime,
      failed: false,
    });
  });

  page.on("requestfailed", (req) => {
    networkEntries.push({
      url: req.url(),
      method: req.method(),
      status: 0,
      duration: 0,
      size: 0,
      contentType: "",
      timestamp: Date.now() - startTime,
      failed: true,
    });
  });

  // ── Inject Recording Script ──
  // This script runs in the browser and sends events back via console
  async function injectRecorder(p: Page): Promise<void> {
    await p.evaluate(() => {
      if ((window as unknown as { __guiWatchInjected?: boolean }).__guiWatchInjected) return;
      (window as unknown as { __guiWatchInjected?: boolean }).__guiWatchInjected = true;

      function getElementInfo(el: Element): {
        tag: string; id: string; classes: string[];
        text: string; x: number; y: number; w: number; h: number;
      } {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          id: el.id || "",
          classes: Array.from(el.classList),
          text: (el.textContent || "").trim().substring(0, 60),
          x: Math.round(rect.x), y: Math.round(rect.y),
          w: Math.round(rect.width), h: Math.round(rect.height),
        };
      }

      // Click events
      document.addEventListener("click", (e) => {
        const el = e.target as Element;
        if (!el) return;
        const info = getElementInfo(el);
        console.log(`__WATCH_EVENT__:CLICK:${JSON.stringify(info)}`);
      }, true);

      // Input events (typing)
      document.addEventListener("input", (e) => {
        const el = e.target as HTMLInputElement;
        if (!el) return;
        const info = getElementInfo(el);
        console.log(`__WATCH_EVENT__:TYPE:${JSON.stringify({ ...info, value: el.value })}`);
      }, true);

      // Change events (select, checkbox)
      document.addEventListener("change", (e) => {
        const el = e.target as HTMLSelectElement;
        if (!el) return;
        const info = getElementInfo(el);
        console.log(`__WATCH_EVENT__:SELECT:${JSON.stringify({ ...info, value: el.value })}`);
      }, true);

      // Keyboard events (special keys only)
      document.addEventListener("keydown", (e) => {
        if (["Enter", "Escape", "Tab", "Backspace", "Delete", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
          const el = e.target as Element;
          const info = el ? getElementInfo(el) : { tag: "BODY", id: "", classes: [], text: "", x: 0, y: 0, w: 0, h: 0 };
          console.log(`__WATCH_EVENT__:KEY_PRESS:${JSON.stringify({ ...info, value: e.key })}`);
        }
      }, true);

      // Scroll events (debounced)
      let scrollTimer: ReturnType<typeof setTimeout>;
      document.addEventListener("scroll", () => {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          console.log(`__WATCH_EVENT__:SCROLL:${JSON.stringify({
            tag: "DOCUMENT", id: "", classes: [], text: "",
            x: window.scrollX, y: window.scrollY, w: window.innerWidth, h: window.innerHeight,
            value: `${window.scrollX},${window.scrollY}`,
          })}`);
        }, 300);
      }, true);
    });
  }

  // ── Parse Injected Events ──
  page.on("console", (msg) => {
    const text = msg.text();
    if (!text.startsWith("__WATCH_EVENT__:")) return;

    const [, typeStr, jsonStr] = text.split("__WATCH_EVENT__:")[1].split(/:(.+)/);
    if (!typeStr || !jsonStr) return;

    try {
      const data = JSON.parse(jsonStr);
      const actionType = AT[typeStr as keyof typeof AT] || AT.CLICK;

      const action: RecordedAction = {
        index: ++actionCounter,
        type: actionType,
        selector: selectorFromElement(data.tag, data.id, data.classes, data.text),
        elementDescription: `${data.tag.toLowerCase()}${data.id ? "#" + data.id : ""} "${data.text?.substring(0, 30) || ""}"`,
        value: data.value || "",
        timestamp: Date.now() - startTime,
        url: page.url(),
        viewport: { width: 1440, height: 900 },
      };

      actions.push(action);

      // Log to terminal
      const icon = {
        CLICK: "🖱 ",
        TYPE: "⌨ ",
        KEY_PRESS: "⌨ ",
        SCROLL: "📜",
        SELECT: "📋",
        NAVIGATE: "🔗",
        HOVER: "👆",
        DRAG: "↔ ",
        FILE_UPLOAD: "📁",
        WAIT: "⏳",
      }[typeStr] || "  ";

      console.log(
        `  ${icon} ${String(action.index).padStart(4, " ")} | ${typeStr.padEnd(10)} | ${action.selector.substring(0, 40).padEnd(40)} | ${(action.value || "").substring(0, 20)}`
      );
    } catch {
      // malformed event — skip
    }
  });

  // ── Navigation Listener ──
  page.on("load", async () => {
    const url = page.url();
    const urlPath = new URL(url).pathname;
    pagesVisited.add(urlPath);

    // Record navigation action
    actions.push({
      index: ++actionCounter,
      type: AT.NAVIGATE,
      selector: "",
      elementDescription: `Navigate to ${urlPath}`,
      value: url,
      timestamp: Date.now() - startTime,
      url,
      viewport: { width: 1440, height: 900 },
    });

    console.log(`  🔗 ${String(actionCounter).padStart(4, " ")} | NAVIGATE   | ${urlPath}`);

    // Capture performance snapshot
    try {
      await page.waitForTimeout(1500); // Let metrics settle
      const snapshot = await capturePerformanceSnapshot(page, startTime);
      perfSnapshots.push(snapshot);
      console.log(`        Perf: LCP=${snapshot.lcp}ms FCP=${snapshot.fcp}ms CLS=${snapshot.cls} DOM=${snapshot.domNodes}`);
    } catch {
      // page might have navigated away
    }

    // Re-inject recorder on each navigation
    try {
      await injectRecorder(page);
    } catch {
      // page navigated during injection
    }
  });

  // ── Start ──
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await injectRecorder(page);

  // ── Graceful Shutdown ──
  const saveSession = async () => {
    console.log(`\n${"═".repeat(65)}`);
    console.log(`  ⏹  STOPPING — saving session...`);

    // Take final screenshot
    try {
      const finalScreenshot = path.join(SCREENSHOT_DIR, `${sessionId}-final.png`);
      await page.screenshot({ fullPage: true, path: finalScreenshot });
    } catch { /* browser might be closed */ }

    // Build session object
    const session: RecordingSession = {
      id: sessionId,
      name: SESSION_NAME,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date().toISOString(),
      duration: Date.now() - startTime,
      baseUrl: BASE_URL,
      actions,
      performanceSnapshots: perfSnapshots,
      consoleEntries,
      networkEntries,
      pagesVisited: Array.from(pagesVisited),
      viewport: { width: 1440, height: 900 },
    };

    // Save session
    const sessionFile = path.join(OUTPUT_DIR, `${sessionId}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));

    console.log(`\n  Session saved: ${sessionFile}`);
    console.log(`  Actions:      ${actions.length}`);
    console.log(`  Pages:        ${pagesVisited.size}`);
    console.log(`  Duration:     ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
    console.log(`  Console errs: ${consoleEntries.filter((c) => c.level === "error").length}`);
    console.log(`  Network reqs: ${networkEntries.length}`);
    console.log(`  Perf snaps:   ${perfSnapshots.length}`);
    console.log(`${"═".repeat(65)}\n`);
    console.log(`  Next step: analyze the session`);
    console.log(`    npx ts-node tests/gui-watch/session-analyzer.ts ${sessionId}`);
    console.log(``);

    await browser.close();
    process.exit(0);
  };

  process.on("SIGINT", saveSession);
  process.on("SIGTERM", saveSession);

  // Keep process alive
  await new Promise(() => {});
}

// ── Entry Point ──────────────────────────────────────────────────

startRecording().catch((err) => {
  console.error("Recorder failed:", err);
  process.exit(1);
});

export { startRecording };
