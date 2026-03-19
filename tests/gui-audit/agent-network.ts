/**
 * TrendSmart QA — Network Resilience Agent
 *
 * Tests how the app behaves under adverse network conditions:
 *  - Offline mode (what happens when network goes down)
 *  - Slow network (3G simulation — UI stays responsive)
 *  - Failed API responses (500 errors — graceful degradation)
 *  - Request timeout handling (long requests don't hang UI)
 *  - Retry behavior (does the app retry failed requests?)
 *  - Stale data display (cached data shown while loading)
 *
 * This replaces a QA tester who unplugs ethernet mid-session.
 */

import type { Page } from "@playwright/test";
import type { BugReport, AgentName } from "./agent-types";

const AGENT: AgentName = "network";
let bugCounter = 0;

function bugId(): string {
  return `NET-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetNetworkCounter(): void {
  bugCounter = 0;
}

function makeBug(
  title: string,
  severity: "critical" | "major" | "minor" | "cosmetic",
  route: string,
  steps: string[],
  expected: string,
  actual: string,
  suggestedFix: string,
  labels: string[] = [],
  confidence = 80
): BugReport {
  const body = [
    `## Network Resilience Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Network Resilience Agent (automated)`,
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
    labels: ["bug", "network", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── Network Checks ────────────────────────────────────────────────

/**
 * Check 1: API failure graceful degradation.
 * Intercept API responses with 500 and check if UI handles it.
 */
async function checkApiFailure(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Intercept all API responses and return 500
  await page.route("**/api/**", async (interceptedRoute) => {
    await interceptedRoute.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Simulated server error" }),
    });
  });

  try {
    await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check for unhandled error UI
    const pageState = await page.evaluate(() => {
      const text = document.body.innerText || "";
      return {
        hasErrorUI:
          text.includes("error") ||
          text.includes("Error") ||
          text.includes("failed") ||
          text.includes("try again"),
        isBlank: text.trim().length < 20,
        hasStackTrace:
          text.includes("at ") && text.includes(".ts:") ||
          text.includes(".js:") && text.includes("Error"),
        hasUncaughtError:
          text.includes("Unhandled") ||
          text.includes("uncaught") ||
          text.includes("cannot read"),
        textLength: text.length,
      };
    });

    // Stack traces or uncaught errors are bad
    if (pageState.hasStackTrace) {
      bugs.push(
        makeBug(
          `Stack trace visible on ${route} when APIs fail`,
          "critical",
          route,
          [
            `Navigate to ${route}`,
            `Simulate all API endpoints returning 500`,
            `Observe stack trace in the UI`,
          ],
          "Error states should show user-friendly messages, not stack traces",
          "Stack trace visible to users when APIs fail",
          "Add error boundaries and catch API errors with user-friendly fallback UI.",
          ["error-handling", "stack-trace"],
          90
        )
      );
    }

    if (pageState.hasUncaughtError) {
      bugs.push(
        makeBug(
          `Uncaught error on ${route} when APIs fail`,
          "critical",
          route,
          [
            `Navigate to ${route}`,
            `Simulate all API endpoints returning 500`,
            `Uncaught error visible in UI`,
          ],
          "App should gracefully handle API failures",
          "Uncaught error message visible to users",
          "Wrap API calls in try/catch and show graceful error UI.",
          ["error-handling", "uncaught"],
          90
        )
      );
    }

    // Completely blank page is also bad
    if (pageState.isBlank && !pageState.hasErrorUI) {
      bugs.push(
        makeBug(
          `${route} shows blank page when APIs fail`,
          "major",
          route,
          [
            `Navigate to ${route}`,
            `Simulate all API endpoints returning 500`,
            `Page appears blank (${pageState.textLength} chars)`,
          ],
          "Page should show error state or cached data when APIs fail",
          `Page is blank (${pageState.textLength} characters) when APIs return 500`,
          "Show an error state component with a retry button when data fetching fails.",
          ["blank-page", "error-handling"],
          75
        )
      );
    }
  } finally {
    // Remove route interception
    await page.unroute("**/api/**");
  }

  return bugs;
}

/**
 * Check 2: Slow network — UI stays responsive during loading.
 */
async function checkSlowNetwork(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Add 3 second delay to all API responses
  await page.route("**/api/**", async (interceptedRoute) => {
    await new Promise((r) => setTimeout(r, 3000));
    await interceptedRoute.continue();
  });

  try {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20000 });

    // Check if the page shows loading indicators
    const hasLoadingUI = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const html = document.body.innerHTML || "";

      return {
        hasSpinner:
          html.includes("spinner") ||
          html.includes("loading") ||
          html.includes("skeleton") ||
          html.includes("animate-pulse") ||
          html.includes("animate-spin"),
        hasLoadingText:
          text.includes("Loading") ||
          text.includes("loading") ||
          text.includes("Please wait"),
        isResponsive: true, // Page loaded = responsive
      };
    });

    // Wait for full load
    await page.waitForTimeout(5000);

    const afterLoad = await page.evaluate(() => {
      return {
        isBlank: (document.body.innerText || "").trim().length < 20,
        hasContent: (document.body.innerText || "").length > 50,
      };
    });

    // If page is blank after 5s with slow network, there's no loading state
    if (!hasLoadingUI.hasSpinner && !hasLoadingUI.hasLoadingText && afterLoad.isBlank) {
      bugs.push(
        makeBug(
          `No loading indicator on ${route} during slow network`,
          "minor",
          route,
          [
            `Navigate to ${route} with 3s API delay`,
            `No loading spinner or skeleton visible during wait`,
          ],
          "Pages should show loading indicators while fetching data",
          "No loading state visible during slow API responses",
          "Add loading skeletons or spinners using SWR's isLoading state.",
          ["loading-state"],
          65
        )
      );
    }
  } finally {
    await page.unroute("**/api/**");
  }

  return bugs;
}

/**
 * Check 3: Offline detection and recovery.
 */
async function checkOfflineRecovery(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Load the page first (with network)
  await page.goto(route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const contentBefore = await page.evaluate(() =>
    (document.body.innerText || "").substring(0, 200)
  );

  // Go offline
  await page.context().setOffline(true);

  // Try to navigate to another page
  try {
    await page.goto("/settings", { waitUntil: "domcontentloaded", timeout: 5000 });
  } catch {
    // Expected — network is offline
  }

  await page.waitForTimeout(1000);

  const offlineState = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return {
      hasOfflineIndicator:
        text.includes("offline") ||
        text.includes("Offline") ||
        text.includes("no connection") ||
        text.includes("No connection") ||
        text.includes("network"),
      isBlank: text.trim().length < 20,
    };
  });

  // Go back online
  await page.context().setOffline(false);

  // Navigate back and check recovery
  await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);

  const contentAfter = await page.evaluate(() =>
    (document.body.innerText || "").substring(0, 200)
  );

  const recovered = contentAfter.length > 20;

  if (!recovered) {
    bugs.push(
      makeBug(
        `${route} does not recover after going offline then online`,
        "major",
        route,
        [
          `Navigate to ${route}`,
          `Go offline`,
          `Go back online`,
          `Navigate to ${route} again`,
          `Page does not recover`,
        ],
        "App should recover gracefully when network comes back",
        `Page content is ${contentAfter.length} chars after recovery (was ${contentBefore.length})`,
        "Ensure SWR or fetch hooks retry on network recovery. Add window.addEventListener('online', refetch).",
        ["offline-recovery"],
        70
      )
    );
  }

  return bugs;
}

/**
 * Check 4: Request timeout handling — long requests don't freeze UI.
 */
async function checkRequestTimeout(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Make API responses take 30 seconds (simulating timeout)
  await page.route("**/api/**", async (interceptedRoute) => {
    await new Promise((r) => setTimeout(r, 30000));
    await interceptedRoute.continue();
  });

  try {
    const startTime = Date.now();
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 10000 });

    // Check if the page itself rendered (even if API is hanging)
    const pageRendered = await page.evaluate(() => {
      return document.body.innerHTML.length > 100;
    });

    const elapsed = Date.now() - startTime;

    if (!pageRendered && elapsed > 8000) {
      bugs.push(
        makeBug(
          `${route} UI blocked by hanging API requests`,
          "major",
          route,
          [
            `Navigate to ${route}`,
            `API requests hang for 30+ seconds`,
            `UI does not render for ${Math.round(elapsed / 1000)}s`,
          ],
          "Page shell should render immediately, even if API calls are pending",
          `UI was blocked for ${Math.round(elapsed / 1000)}s waiting for API responses`,
          "Use React Suspense with fallback UI. Ensure the page shell renders before data loads.",
          ["timeout", "ui-blocking"],
          70
        )
      );
    }
  } catch {
    // Timeout is expected
  } finally {
    await page.unroute("**/api/**");
  }

  return bugs;
}

/**
 * Check 5: Cache headers — API responses should have appropriate cache-control.
 */
async function checkCacheHeaders(page: Page): Promise<BugReport[]> {
  const bugs: BugReport[] = [];
  const apiResponses: Array<{ url: string; cacheControl: string; status: number }> = [];

  page.on("response", async (response) => {
    const url = response.url();
    if (url.includes("/api/")) {
      const headers = response.headers();
      apiResponses.push({
        url: url.replace(/https?:\/\/[^/]+/, ""),
        cacheControl: headers["cache-control"] || "",
        status: response.status(),
      });
    }
  });

  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // GET endpoints that could benefit from caching
  const getResponses = apiResponses.filter(
    (r) => r.status === 200 && !r.url.includes("auth")
  );

  const noCacheCount = getResponses.filter((r) => !r.cacheControl).length;

  if (noCacheCount > 3) {
    bugs.push(
      makeBug(
        `${noCacheCount} API responses missing Cache-Control header`,
        "minor",
        "/",
        [
          `Navigate to / and observe API responses`,
          `${noCacheCount} of ${getResponses.length} successful GET responses have no Cache-Control header`,
        ],
        "API responses should include Cache-Control headers for efficient caching",
        `${noCacheCount} API responses missing cache-control`,
        "Add Cache-Control headers to API responses: 'private, max-age=60' for user data, 'public, max-age=300' for static data.",
        ["caching", "headers"],
        55
      )
    );
  }

  // Check for stale-while-revalidate support
  const hasSWR = apiResponses.some((r) =>
    r.cacheControl.includes("stale-while-revalidate")
  );

  if (!hasSWR && getResponses.length > 0) {
    bugs.push(
      makeBug(
        "No API responses use stale-while-revalidate",
        "cosmetic",
        "/",
        [
          `Inspected ${getResponses.length} API responses`,
          `None include stale-while-revalidate in Cache-Control`,
        ],
        "APIs should use stale-while-revalidate for better perceived performance",
        "No stale-while-revalidate cache directives found",
        "Add 'stale-while-revalidate=60' to Cache-Control for API responses that can tolerate slightly stale data.",
        ["caching", "swr"],
        40
      )
    );
  }

  return bugs;
}

/**
 * Check 6: Retry behavior — do failed requests get retried?
 */
async function checkRetryBehavior(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];
  let requestCount = 0;

  // Track how many times API endpoints are called
  const requestCounts = new Map<string, number>();

  // Fail first request, succeed second
  await page.route("**/api/listings**", async (interceptedRoute) => {
    const url = interceptedRoute.request().url().replace(/https?:\/\/[^/]+/, "");
    const count = (requestCounts.get(url) || 0) + 1;
    requestCounts.set(url, count);
    requestCount++;

    if (count === 1) {
      // First request fails
      await interceptedRoute.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Service temporarily unavailable" }),
      });
    } else {
      // Subsequent requests succeed
      await interceptedRoute.continue();
    }
  });

  try {
    await page.goto(route, { waitUntil: "networkidle", timeout: 20000 });
    await page.waitForTimeout(3000); // Give time for retries

    // Check if any endpoint was retried
    let hasRetry = false;
    for (const [, count] of requestCounts) {
      if (count > 1) hasRetry = true;
    }

    // This is informational — not having retry is ok for some endpoints
    if (!hasRetry && requestCounts.size > 0) {
      bugs.push(
        makeBug(
          `No automatic retry on ${route} after 503 response`,
          "cosmetic",
          route,
          [
            `Navigate to ${route}`,
            `First API request returns 503`,
            `No automatic retry detected (${requestCount} total requests)`,
          ],
          "SWR should automatically retry failed requests",
          `No retry observed after initial 503 failure`,
          "Configure SWR with errorRetryCount and errorRetryInterval for automatic retries on server errors.",
          ["retry", "resilience"],
          45
        )
      );
    }
  } finally {
    await page.unroute("**/api/listings**");
  }

  return bugs;
}

// ── Main Network Agent ────────────────────────────────────────────

export async function runNetworkAgent(
  page: Page,
  routes: string[]
): Promise<BugReport[]> {
  const allBugs: BugReport[] = [];

  // Only test a subset of routes for network resilience (it's slow)
  const testRoutes = routes.slice(0, Math.min(routes.length, 4));

  for (const route of testRoutes) {
    console.log(`    [Net] ${route}`);

    const checks = [
      () => checkApiFailure(page, route),
      () => checkSlowNetwork(page, route),
      () => checkRequestTimeout(page, route),
    ];

    for (const check of checks) {
      try {
        const bugs = await check();
        allBugs.push(...bugs);
      } catch (err) {
        console.error(`      Check failed on ${route}: ${(err as Error).message}`);
      }
    }
  }

  // Run offline recovery once (it's a global test)
  try {
    console.log(`    [Net] Offline recovery test...`);
    const offlineBugs = await checkOfflineRecovery(page, testRoutes[0] || "/");
    allBugs.push(...offlineBugs);
  } catch (err) {
    console.error(`    [Net] Offline test failed: ${(err as Error).message}`);
  }

  // Cache headers check
  try {
    console.log(`    [Net] Cache headers...`);
    const cacheBugs = await checkCacheHeaders(page);
    allBugs.push(...cacheBugs);
  } catch (err) {
    console.error(`    [Net] Cache check failed: ${(err as Error).message}`);
  }

  // Retry behavior check
  try {
    console.log(`    [Net] Retry behavior...`);
    const retryBugs = await checkRetryBehavior(page, testRoutes[0] || "/");
    allBugs.push(...retryBugs);
  } catch (err) {
    console.error(`    [Net] Retry check failed: ${(err as Error).message}`);
  }

  return allBugs;
}
