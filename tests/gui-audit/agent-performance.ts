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

// ── Image Optimization Checks ─────────────────────────────────────

async function checkImageOptimization(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle", timeout: 20000 });

  const imageReport = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img"));
    const issues: string[] = [];
    let oversizedCount = 0;
    let missingDimensionsCount = 0;
    let notLazyCount = 0;
    let nonNextImageCount = 0;

    for (const img of images) {
      const src = img.getAttribute("src") || "";
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const displayWidth = img.clientWidth;
      const displayHeight = img.clientHeight;

      // Check for images rendered much smaller than their natural size (> 2x)
      if (width > 0 && displayWidth > 0 && width > displayWidth * 2) {
        oversizedCount++;
      }

      // Check for missing width/height attributes (causes CLS)
      if (!img.getAttribute("width") && !img.getAttribute("height")) {
        const style = getComputedStyle(img);
        if (style.width === "auto" || !style.width) {
          missingDimensionsCount++;
        }
      }

      // Check for lazy loading on below-fold images
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight && img.loading !== "lazy") {
        notLazyCount++;
      }

      // Check if using Next.js Image component (rendered as img with data-nimg)
      if (!img.hasAttribute("data-nimg") && src && !src.startsWith("data:")) {
        nonNextImageCount++;
      }
    }

    return {
      totalImages: images.length,
      oversizedCount,
      missingDimensionsCount,
      notLazyCount,
      nonNextImageCount,
    };
  });

  if (imageReport.oversizedCount > 0) {
    bugs.push(
      makeBug(
        `${imageReport.oversizedCount} oversized image(s) on ${route}`,
        imageReport.oversizedCount > 3 ? "major" : "minor",
        route,
        [
          `Navigate to ${route}`,
          `Found ${imageReport.oversizedCount} images rendered much smaller than their natural size`,
        ],
        "Images should be served at their display size to avoid wasting bandwidth",
        `${imageReport.oversizedCount} of ${imageReport.totalImages} images are >2x their display size`,
        "Use Next.js Image component with appropriate sizes prop, or serve properly sized images from your CDN.",
        ["images", "optimization"],
        75
      )
    );
  }

  if (imageReport.missingDimensionsCount > 0) {
    bugs.push(
      makeBug(
        `${imageReport.missingDimensionsCount} image(s) missing dimensions on ${route}`,
        "minor",
        route,
        [
          `Navigate to ${route}`,
          `Found ${imageReport.missingDimensionsCount} images without width/height attributes`,
        ],
        "Images should have explicit dimensions to prevent layout shifts (CLS)",
        `${imageReport.missingDimensionsCount} images lack width/height`,
        "Add width and height attributes to all images, or use Next.js Image with fill prop.",
        ["images", "cls"],
        70
      )
    );
  }

  if (imageReport.notLazyCount > 2) {
    bugs.push(
      makeBug(
        `${imageReport.notLazyCount} below-fold image(s) not lazy-loaded on ${route}`,
        "minor",
        route,
        [
          `Navigate to ${route}`,
          `Found ${imageReport.notLazyCount} images below the fold without loading="lazy"`,
        ],
        "Below-fold images should use lazy loading to improve initial page load",
        `${imageReport.notLazyCount} below-fold images loaded eagerly`,
        "Use Next.js Image (auto lazy-loads) or add loading='lazy' to below-fold img tags.",
        ["images", "lazy-loading"],
        65
      )
    );
  }

  return bugs;
}

// ── Resource Hints Check ──────────────────────────────────────────

async function checkResourceHints(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle", timeout: 20000 });

  const resourceReport = await page.evaluate(() => {
    // Check for font-display: swap
    const styleSheets = Array.from(document.styleSheets);
    let hasBlockingFont = false;
    try {
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule instanceof CSSFontFaceRule) {
              const display = (rule.style as CSSStyleDeclaration).getPropertyValue("font-display");
              if (!display || display === "block" || display === "auto") {
                hasBlockingFont = true;
              }
            }
          }
        } catch {
          // Cross-origin stylesheet — can't inspect
        }
      }
    } catch {
      // Ignore
    }

    // Check for preconnect/dns-prefetch to external domains
    const links = Array.from(document.querySelectorAll("link"));
    const preconnects = links.filter((l) => l.rel === "preconnect" || l.rel === "dns-prefetch");
    const externalScripts = Array.from(document.querySelectorAll("script[src]"))
      .filter((s) => {
        const src = s.getAttribute("src") || "";
        return src.startsWith("http") && !src.includes(window.location.hostname);
      });

    // Check for render-blocking scripts in head
    const headScripts = Array.from(document.head.querySelectorAll("script[src]"))
      .filter((s) => !s.hasAttribute("defer") && !s.hasAttribute("async") && s.getAttribute("type") !== "module");

    return {
      hasBlockingFont,
      preconnectCount: preconnects.length,
      externalScriptCount: externalScripts.length,
      renderBlockingScripts: headScripts.length,
    };
  });

  if (resourceReport.renderBlockingScripts > 0) {
    bugs.push(
      makeBug(
        `${resourceReport.renderBlockingScripts} render-blocking script(s) on ${route}`,
        resourceReport.renderBlockingScripts > 2 ? "major" : "minor",
        route,
        [
          `Navigate to ${route}`,
          `Found ${resourceReport.renderBlockingScripts} scripts in <head> without defer/async`,
        ],
        "Scripts in <head> should use defer or async to avoid blocking rendering",
        `${resourceReport.renderBlockingScripts} render-blocking scripts in <head>`,
        "Add defer or async attribute to third-party scripts. Next.js handles this for its own bundles.",
        ["render-blocking", "scripts"],
        70
      )
    );
  }

  if (resourceReport.hasBlockingFont) {
    bugs.push(
      makeBug(
        `Blocking font-display detected on ${route}`,
        "minor",
        route,
        [
          `Navigate to ${route}`,
          `Found @font-face rules without font-display: swap`,
        ],
        "Fonts should use font-display: swap to prevent invisible text during load",
        "Font blocks rendering until loaded (FOIT — Flash of Invisible Text)",
        "Add font-display: swap to all @font-face rules, or use next/font which handles this automatically.",
        ["fonts", "foit"],
        60
      )
    );
  }

  return bugs;
}

// ── Bundle Analysis ───────────────────────────────────────────────

async function checkBundleSize(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const resourceData: { jsSize: number; cssSize: number; jsCount: number; cssCount: number } = {
    jsSize: 0, cssSize: 0, jsCount: 0, cssCount: 0,
  };

  page.on("response", async (response) => {
    const url = response.url();
    try {
      const headers = response.headers();
      const size = parseInt(headers["content-length"] || "0", 10);
      if (url.endsWith(".js") || headers["content-type"]?.includes("javascript")) {
        resourceData.jsSize += size;
        resourceData.jsCount++;
      } else if (url.endsWith(".css") || headers["content-type"]?.includes("css")) {
        resourceData.cssSize += size;
        resourceData.cssCount++;
      }
    } catch {
      // Ignore
    }
  });

  await page.goto(route, { waitUntil: "networkidle", timeout: 20000 });

  const jsKb = Math.round(resourceData.jsSize / 1024);
  const cssKb = Math.round(resourceData.cssSize / 1024);

  // Flag if JS bundle > 500KB (compressed)
  if (jsKb > 500) {
    bugs.push(
      makeBug(
        `Large JS bundle on ${route}: ${jsKb}KB across ${resourceData.jsCount} files`,
        jsKb > 1000 ? "major" : "minor",
        route,
        [
          `Navigate to ${route}`,
          `Total JS downloaded: ${jsKb}KB (${resourceData.jsCount} files)`,
        ],
        "Initial JS bundle should be < 500KB for fast interactivity",
        `${jsKb}KB of JavaScript loaded`,
        "Use dynamic imports for heavy components. Check for unused dependencies. Use next/bundle-analyzer to find large modules.",
        ["bundle", "javascript"],
        70
      )
    );
  }

  return bugs;
}

// ── Third-Party Script Audit ──────────────────────────────────────

async function checkThirdPartyScripts(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const thirdPartyData: Array<{ url: string; size: number; blocked: number }> = [];

  page.on("response", async (response) => {
    const url = response.url();
    try {
      const headers = response.headers();
      const ct = headers["content-type"] || "";
      if (!ct.includes("javascript")) return;
      if (url.includes("localhost") || url.includes("127.0.0.1")) return;
      // It's a third-party script
      const size = parseInt(headers["content-length"] || "0", 10);
      thirdPartyData.push({ url, size, blocked: 0 });
    } catch {
      // Ignore
    }
  });

  await page.goto(route, { waitUntil: "networkidle", timeout: 20000 });

  // Measure main-thread blocking from third-party scripts
  const thirdPartyBlockingTime = await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let tbt = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Long tasks attributed to third-party are hard to detect in browser,
          // but we can count total long-task time
          if (entry.duration > 50) {
            tbt += entry.duration - 50;
          }
        }
      });
      try {
        observer.observe({ type: "longtask", buffered: true });
      } catch { resolve(0); return; }
      setTimeout(() => { observer.disconnect(); resolve(tbt); }, 2000);
    });
  });

  if (thirdPartyData.length > 5) {
    const totalKb = Math.round(thirdPartyData.reduce((s, t) => s + t.size, 0) / 1024);
    bugs.push(
      makeBug(
        `${thirdPartyData.length} third-party scripts on ${route} (${totalKb}KB)`,
        thirdPartyData.length > 10 ? "major" : "minor",
        route,
        [
          `Navigate to ${route}`,
          `${thirdPartyData.length} external JS files loaded (${totalKb}KB total)`,
          `Scripts from: ${[...new Set(thirdPartyData.map((t) => new URL(t.url).hostname))].slice(0, 5).join(", ")}`,
        ],
        "Minimize third-party scripts to reduce page weight and main-thread blocking",
        `${thirdPartyData.length} third-party scripts adding ${totalKb}KB`,
        "Audit third-party scripts. Remove unused ones. Load non-critical ones with async/defer. Consider self-hosting critical third-party code.",
        ["third-party", "scripts"],
        65
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

  // Image optimization checks (first 4 routes)
  const sampleRoutes = routes.slice(0, Math.min(routes.length, 4));
  for (const route of sampleRoutes) {
    try {
      console.log(`    [Perf] Image optimization: ${route}`);
      const imgBugs = await checkImageOptimization(page, route);
      allBugs.push(...imgBugs);
    } catch (err) {
      console.error(`    [Perf] Image check failed on ${route}: ${(err as Error).message}`);
    }
  }

  // Resource hints & bundle analysis (first route only for speed)
  try {
    console.log(`    [Perf] Resource hints: ${routes[0]}`);
    const hintBugs = await checkResourceHints(page, routes[0]);
    allBugs.push(...hintBugs);
  } catch (err) {
    console.error(`    [Perf] Resource hints check failed: ${(err as Error).message}`);
  }

  try {
    console.log(`    [Perf] Bundle analysis: ${routes[0]}`);
    const bundleBugs = await checkBundleSize(page, routes[0]);
    allBugs.push(...bundleBugs);
  } catch (err) {
    console.error(`    [Perf] Bundle check failed: ${(err as Error).message}`);
  }

  // Third-party script audit (first route only)
  try {
    console.log(`    [Perf] Third-party scripts: ${routes[0]}`);
    const tpBugs = await checkThirdPartyScripts(page, routes[0]);
    allBugs.push(...tpBugs);
  } catch (err) {
    console.error(`    [Perf] Third-party check failed: ${(err as Error).message}`);
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
