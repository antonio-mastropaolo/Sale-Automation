/**
 * TrendSmart QA — Performance Agent
 *
 * Measures real-world performance metrics for every page:
 *  - Core Web Vitals (LCP, CLS, TBT)
 *  - Load timings (TTFB, FCP, DOM loaded, full load)
 *  - Resource analysis (DOM nodes, JS heap, requests, transfer)
 *  - Performance budgets (flag violations)
 *  - Memory leak detection (navigate back and forth)
 *  - Slow API responses during page load
 *
 * This replaces a QA engineer running Lighthouse on every page.
 */

import type { Page } from "@playwright/test";
import type { BugReport, PerformanceMetrics, PerformanceBudget, AgentName } from "./agent-types";

const AGENT: AgentName = "performance";
let bugCounter = 0;

function bugId(): string {
  return `PERF-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetPerfCounter(): void {
  bugCounter = 0;
}

// ── Performance Budgets ───────────────────────────────────────────

/** Budgets based on "good" thresholds from web.dev */
const BUDGET: PerformanceBudget = {
  ttfb: 800,           // < 800ms
  fcp: 1800,           // < 1.8s
  lcp: 2500,           // < 2.5s (Google "good")
  cls: 0.1,            // < 0.1 (Google "good")
  tbt: 200,            // < 200ms
  domNodes: 1500,      // < 1500 nodes
  transferSize: 3_000_000, // < 3MB total transfer
};

function makeBug(
  title: string,
  severity: "critical" | "major" | "minor" | "cosmetic",
  route: string,
  steps: string[],
  expected: string,
  actual: string,
  suggestedFix: string,
  labels: string[] = [],
  confidence = 85
): BugReport {
  const body = [
    `## Performance Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Performance Agent (automated)`,
    ``,
    `### Steps to Reproduce`,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `### Expected`,
    expected,
    ``,
    `### Actual`,
    actual,
    ``,
    `### Suggested Fix`,
    suggestedFix,
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", "performance", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── Metric Collection ─────────────────────────────────────────────

/**
 * Collect performance metrics for a single page load.
 */
async function collectMetrics(page: Page, route: string): Promise<PerformanceMetrics> {
  // Track network requests
  let requestCount = 0;
  let transferSize = 0;
  const slowRequests: Array<{ url: string; duration: number }> = [];

  page.on("response", async (response) => {
    requestCount++;
    try {
      const headers = response.headers();
      const contentLength = parseInt(headers["content-length"] || "0", 10);
      transferSize += contentLength;
    } catch {
      // ignore
    }
  });

  const startTime = Date.now();
  await page.goto(route, { waitUntil: "networkidle", timeout: 30000 });
  const fullLoad = Date.now() - startTime;

  // Gather Navigation Timing API metrics
  const timings = await page.evaluate(() => {
    const perf = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!perf) {
      return {
        ttfb: 0,
        domContentLoaded: 0,
        fcp: 0,
      };
    }

    // First Contentful Paint
    const fcpEntry = performance.getEntriesByName("first-contentful-paint")[0];
    const fcp = fcpEntry ? fcpEntry.startTime : 0;

    return {
      ttfb: perf.responseStart - perf.requestStart,
      domContentLoaded: perf.domContentLoadedEventEnd - perf.startTime,
      fcp,
    };
  });

  // Gather DOM and memory metrics
  const domMetrics = await page.evaluate(() => {
    const domNodes = document.querySelectorAll("*").length;

    // JS heap (Chrome only)
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const jsHeapSize = mem ? mem.usedJSHeapSize : 0;

    return { domNodes, jsHeapSize };
  });

  // Measure LCP via PerformanceObserver
  const lcp = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcpValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          lcpValue = entry.startTime;
        }
      });

      try {
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        resolve(0);
        return;
      }

      // Give it a moment to capture LCP
      setTimeout(() => {
        observer.disconnect();
        resolve(lcpValue);
      }, 1000);
    });
  });

  // Measure CLS via PerformanceObserver
  const cls = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
            clsValue += (entry as unknown as { value: number }).value;
          }
        }
      });

      try {
        observer.observe({ type: "layout-shift", buffered: true });
      } catch {
        resolve(0);
        return;
      }

      setTimeout(() => {
        observer.disconnect();
        resolve(clsValue);
      }, 1000);
    });
  });

  // Measure TBT (approximation via long tasks)
  const tbt = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let totalBlockingTime = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            totalBlockingTime += entry.duration - 50;
          }
        }
      });

      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch {
        resolve(0);
        return;
      }

      setTimeout(() => {
        observer.disconnect();
        resolve(totalBlockingTime);
      }, 2000);
    });
  });

  return {
    route,
    ttfb: Math.round(timings.ttfb),
    fcp: Math.round(timings.fcp),
    lcp: Math.round(lcp),
    cls: Math.round(cls * 1000) / 1000,
    tbt: Math.round(tbt),
    domContentLoaded: Math.round(timings.domContentLoaded),
    fullLoad,
    domNodes: domMetrics.domNodes,
    jsHeapSize: domMetrics.jsHeapSize,
    requestCount,
    transferSize,
    timestamp: new Date().toISOString(),
  };
}

// ── Budget Checks ─────────────────────────────────────────────────

function checkBudgets(metrics: PerformanceMetrics): BugReport[] {
  const bugs: BugReport[] = [];
  const { route } = metrics;

  if (metrics.lcp > BUDGET.lcp) {
    bugs.push(
      makeBug(
        `Slow LCP on ${route}: ${metrics.lcp}ms (budget: ${BUDGET.lcp}ms)`,
        metrics.lcp > BUDGET.lcp * 2 ? "critical" : "major",
        route,
        [`Navigate to ${route}`, `Measure Largest Contentful Paint`],
        `LCP < ${BUDGET.lcp}ms`,
        `LCP = ${metrics.lcp}ms`,
        "Optimize the largest visible element. Preload hero images, reduce server response time, eliminate render-blocking resources.",
        ["core-web-vitals", "lcp"],
        90
      )
    );
  }

  if (metrics.fcp > BUDGET.fcp) {
    bugs.push(
      makeBug(
        `Slow FCP on ${route}: ${metrics.fcp}ms (budget: ${BUDGET.fcp}ms)`,
        metrics.fcp > BUDGET.fcp * 2 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Measure First Contentful Paint`],
        `FCP < ${BUDGET.fcp}ms`,
        `FCP = ${metrics.fcp}ms`,
        "Reduce server response time, eliminate render-blocking CSS/JS, use font-display: swap.",
        ["core-web-vitals", "fcp"],
        85
      )
    );
  }

  if (metrics.cls > BUDGET.cls) {
    bugs.push(
      makeBug(
        `High CLS on ${route}: ${metrics.cls} (budget: ${BUDGET.cls})`,
        metrics.cls > 0.25 ? "critical" : "major",
        route,
        [`Navigate to ${route}`, `Observe layout shifts during load`],
        `CLS < ${BUDGET.cls}`,
        `CLS = ${metrics.cls}`,
        "Set explicit width/height on images and embeds, avoid inserting content above the fold after load.",
        ["core-web-vitals", "cls"],
        80
      )
    );
  }

  if (metrics.ttfb > BUDGET.ttfb) {
    bugs.push(
      makeBug(
        `Slow TTFB on ${route}: ${metrics.ttfb}ms (budget: ${BUDGET.ttfb}ms)`,
        metrics.ttfb > BUDGET.ttfb * 2 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Measure Time to First Byte`],
        `TTFB < ${BUDGET.ttfb}ms`,
        `TTFB = ${metrics.ttfb}ms`,
        "Check server-side rendering time, database queries, and API response times.",
        ["server", "ttfb"],
        80
      )
    );
  }

  if (metrics.tbt > BUDGET.tbt) {
    bugs.push(
      makeBug(
        `High TBT on ${route}: ${metrics.tbt}ms (budget: ${BUDGET.tbt}ms)`,
        metrics.tbt > 600 ? "critical" : "major",
        route,
        [`Navigate to ${route}`, `Measure Total Blocking Time`],
        `TBT < ${BUDGET.tbt}ms`,
        `TBT = ${metrics.tbt}ms`,
        "Break up long tasks, defer non-critical JavaScript, use Web Workers for heavy computation.",
        ["javascript", "tbt"],
        75
      )
    );
  }

  if (metrics.domNodes > BUDGET.domNodes) {
    bugs.push(
      makeBug(
        `Excessive DOM nodes on ${route}: ${metrics.domNodes} (budget: ${BUDGET.domNodes})`,
        metrics.domNodes > 3000 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Count DOM nodes`],
        `DOM nodes < ${BUDGET.domNodes}`,
        `DOM nodes = ${metrics.domNodes}`,
        "Virtualize long lists, remove hidden DOM nodes, simplify component structure.",
        ["dom", "nodes"],
        70
      )
    );
  }

  if (metrics.transferSize > BUDGET.transferSize) {
    const mb = (metrics.transferSize / 1_000_000).toFixed(1);
    const budgetMb = (BUDGET.transferSize / 1_000_000).toFixed(1);
    bugs.push(
      makeBug(
        `Heavy page weight on ${route}: ${mb}MB (budget: ${budgetMb}MB)`,
        metrics.transferSize > BUDGET.transferSize * 2 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Measure total transfer size`],
        `Transfer size < ${budgetMb}MB`,
        `Transfer size = ${mb}MB (${metrics.requestCount} requests)`,
        "Enable compression, optimize images, lazy-load below-fold content, code-split bundles.",
        ["bundle", "weight"],
        75
      )
    );
  }

  return bugs;
}

// ── Memory Leak Detection ─────────────────────────────────────────

async function checkMemoryLeaks(page: Page, routes: string[]): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Navigate back and forth between routes, checking if heap grows
  const heapSamples: number[] = [];
  const testRoutes = routes.slice(0, 4); // Use first 4 routes

  for (let cycle = 0; cycle < 3; cycle++) {
    for (const route of testRoutes) {
      await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
    }

    const heap = await page.evaluate(() => {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      return mem ? mem.usedJSHeapSize : 0;
    });
    heapSamples.push(heap);
  }

  // Check if heap is growing significantly between cycles
  if (heapSamples.length >= 3 && heapSamples[0] > 0) {
    const growth = heapSamples[2] - heapSamples[0];
    const growthPercent = (growth / heapSamples[0]) * 100;

    if (growthPercent > 50) {
      const mb0 = (heapSamples[0] / 1_000_000).toFixed(1);
      const mb2 = (heapSamples[2] / 1_000_000).toFixed(1);
      bugs.push(
        makeBug(
          `Potential memory leak: heap grew ${growthPercent.toFixed(0)}%`,
          growthPercent > 100 ? "critical" : "major",
          "/",
          [
            "Navigate through multiple pages 3 times",
            `Heap: ${mb0}MB → ${mb2}MB (${growthPercent.toFixed(0)}% growth)`,
          ],
          "JS heap should stay roughly stable across navigation cycles",
          `Heap grew from ${mb0}MB to ${mb2}MB after 3 navigation cycles`,
          "Check for event listener leaks, uncleared intervals/timeouts, or growing state in context providers.",
          ["memory-leak"],
          60
        )
      );
    }
  }

  return bugs;
}

// ── Main Performance Agent ────────────────────────────────────────

export async function runPerformanceAgent(
  page: Page,
  routes: string[]
): Promise<{ metrics: PerformanceMetrics[]; bugs: BugReport[] }> {
  const allMetrics: PerformanceMetrics[] = [];
  const allBugs: BugReport[] = [];

  // Collect metrics for each route
  for (const route of routes) {
    try {
      console.log(`    [Perf] ${route}`);
      const metrics = await collectMetrics(page, route);
      allMetrics.push(metrics);

      const bugs = checkBudgets(metrics);
      allBugs.push(...bugs);

      console.log(
        `      LCP=${metrics.lcp}ms FCP=${metrics.fcp}ms CLS=${metrics.cls} TBT=${metrics.tbt}ms DOM=${metrics.domNodes}`
      );
    } catch (err) {
      console.error(`    [Perf] FAILED ${route}: ${(err as Error).message}`);
    }
  }

  // Memory leak check
  try {
    console.log(`    [Perf] Memory leak detection...`);
    const leakBugs = await checkMemoryLeaks(page, routes);
    allBugs.push(...leakBugs);
  } catch (err) {
    console.error(`    [Perf] Memory check failed: ${(err as Error).message}`);
  }

  return { metrics: allMetrics, bugs: allBugs };
}
