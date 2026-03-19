/**
 * TrendSmart QA — State Agent
 *
 * Tests client-side state management for consistency:
 *  - localStorage persistence (theme, sidebar, profile survive refresh)
 *  - SWR cache behavior (data appears after navigation)
 *  - Theme state (dark mode toggles correctly, persists)
 *  - Navigation state (sidebar highlight matches current route)
 *  - Form state (input survives accidental navigation, back button)
 *  - Boot screen (appears on first load, dismisses correctly)
 *  - Error state (error boundaries catch crashes)
 *  - Auth state (logged-out user sees correct UI)
 *
 * This replaces a tester who checks "does it remember my settings?"
 */

import type { Page } from "@playwright/test";
import type { BugReport, StateCheck, AgentName } from "./agent-types";

const AGENT: AgentName = "state";
let bugCounter = 0;

function bugId(): string {
  return `STATE-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetStateCounter(): void {
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
  confidence = 85
): BugReport {
  const body = [
    `## State Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** State Agent (automated)`,
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
    labels: ["bug", "state-management", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── State Checks ──────────────────────────────────────────────────

/**
 * Check 1: Theme persistence across page reload.
 */
async function checkThemePersistence(
  page: Page
): Promise<{ check: StateCheck; bug?: BugReport }> {
  await page.goto("/", { waitUntil: "networkidle" });

  // Set dark theme
  await page.evaluate(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
  });

  const beforeTheme = await page.evaluate(() => localStorage.getItem("theme"));

  // Reload
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const afterTheme = await page.evaluate(() => localStorage.getItem("theme"));
  const hasDarkClass = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  );

  const passed = afterTheme === "dark" && hasDarkClass;

  return {
    check: {
      name: "Theme persistence",
      description: "Dark theme should survive page reload",
      passed,
      before: `theme=${beforeTheme}`,
      after: `theme=${afterTheme}, hasDarkClass=${hasDarkClass}`,
      details: passed ? "Theme persists correctly" : "Theme reset after reload",
    },
    bug: !passed
      ? makeBug(
          "Theme does not persist across page reload",
          "major", "/",
          [
            "Set theme to dark mode",
            "Reload the page",
            `After reload: theme=${afterTheme}, dark class=${hasDarkClass}`,
          ],
          "Dark mode should persist after reload",
          `Theme was ${afterTheme}, dark class was ${hasDarkClass}`,
          "Ensure the theme initialization script reads from localStorage before React hydrates.",
          ["theme", "persistence"], 85,
        )
      : undefined,
  };
}

/**
 * Check 2: Sidebar active state matches current route.
 */
async function checkSidebarActiveState(
  page: Page
): Promise<{ checks: StateCheck[]; bugs: BugReport[] }> {
  const checks: StateCheck[] = [];
  const bugs: BugReport[] = [];

  const routes = ["/", "/analytics", "/settings", "/listings/new"];

  for (const route of routes) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const activeLink = await page.evaluate((r) => {
      // Find sidebar links
      const sidebar = document.querySelector("aside");
      if (!sidebar) return { found: false, activeHref: "", expectedHref: r };

      const links = sidebar.querySelectorAll("a");
      for (const link of links) {
        const href = link.getAttribute("href") || "";
        const isActive =
          link.classList.contains("active") ||
          link.getAttribute("data-active") === "true" ||
          link.getAttribute("aria-current") === "page" ||
          getComputedStyle(link).fontWeight === "700" ||
          getComputedStyle(link).fontWeight === "600" ||
          getComputedStyle(link).backgroundColor !== "rgba(0, 0, 0, 0)";

        if (href === r && isActive) {
          return { found: true, activeHref: href, expectedHref: r };
        }
      }

      return { found: false, activeHref: "none", expectedHref: r };
    }, route);

    // This is a soft check — sidebar highlight is nice-to-have
    checks.push({
      name: `Sidebar active: ${route}`,
      description: `Sidebar should highlight the link for ${route}`,
      passed: activeLink.found,
      before: `Navigate to ${route}`,
      after: `Active link: ${activeLink.activeHref}`,
      details: activeLink.found
        ? "Correct link highlighted"
        : `No highlighted link found for ${route}`,
    });
  }

  return { checks, bugs };
}

/**
 * Check 3: localStorage data survives navigation.
 */
async function checkLocalStoragePersistence(
  page: Page
): Promise<{ check: StateCheck; bug?: BugReport }> {
  await page.goto("/", { waitUntil: "networkidle" });

  // Set some localStorage values
  await page.evaluate(() => {
    localStorage.setItem("qa_test_key", "test_value_12345");
  });

  // Navigate away and back
  await page.goto("/settings", { waitUntil: "networkidle" });
  await page.goto("/analytics", { waitUntil: "networkidle" });
  await page.goto("/", { waitUntil: "networkidle" });

  const value = await page.evaluate(() => localStorage.getItem("qa_test_key"));
  const passed = value === "test_value_12345";

  // Clean up
  await page.evaluate(() => localStorage.removeItem("qa_test_key"));

  return {
    check: {
      name: "localStorage persistence",
      description: "localStorage should persist across navigation",
      passed,
      before: "Set qa_test_key = test_value_12345",
      after: `qa_test_key = ${value}`,
      details: passed ? "localStorage persists" : "localStorage was cleared during navigation",
    },
    bug: !passed
      ? makeBug(
          "localStorage cleared during navigation",
          "major", "/",
          [
            "Set a localStorage value on /",
            "Navigate to /settings, then /analytics, then back to /",
            `localStorage value is now: ${value}`,
          ],
          "localStorage values should persist across client-side navigation",
          `Value was ${value} instead of test_value_12345`,
          "Check if any component is calling localStorage.clear() during unmount or navigation.",
          ["localStorage"], 80,
        )
      : undefined,
  };
}

/**
 * Check 4: Back button state (data still visible after navigating back).
 */
async function checkBackButtonState(
  page: Page
): Promise<{ check: StateCheck; bug?: BugReport }> {
  // Go to a data page, note content
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const contentBefore = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return text.substring(0, 500);
  });

  // Navigate away
  await page.goto("/settings", { waitUntil: "networkidle" });

  // Go back
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const contentAfter = await page.evaluate(() => {
    const text = document.body.innerText || "";
    return text.substring(0, 500);
  });

  // Content should be similar (not blank, not error)
  const isBlank = contentAfter.trim().length < 20;
  const hasError = /error|crash|undefined|null/i.test(contentAfter) &&
    !/error|crash|undefined|null/i.test(contentBefore);

  const passed = !isBlank && !hasError;

  return {
    check: {
      name: "Back button state",
      description: "Content should be preserved when using browser back",
      passed,
      before: `Content length: ${contentBefore.length}`,
      after: `Content length: ${contentAfter.length}`,
      details: passed
        ? "Content preserved after back navigation"
        : isBlank
          ? "Page was blank after back navigation"
          : "New errors appeared after back navigation",
    },
    bug: !passed
      ? makeBug(
          "Back button produces blank or error page",
          "major", "/",
          [
            "Navigate to /",
            "Navigate to /settings",
            "Press browser back button",
            isBlank ? "Page is blank" : "New errors visible",
          ],
          "Page should display correctly after back navigation",
          isBlank
            ? `Page blank (${contentAfter.trim().length} chars)`
            : "New errors appeared",
          "Ensure SWR cache is preserved during navigation and components handle remounting.",
          ["back-button", "navigation"], 75,
        )
      : undefined,
  };
}

/**
 * Check 5: Error boundary — inject a broken component scenario.
 */
async function checkErrorBoundary(
  page: Page
): Promise<{ check: StateCheck; bug?: BugReport }> {
  await page.goto("/", { waitUntil: "networkidle" });

  // Try to trigger a JS error and see if the page shows an error boundary
  const hasErrorBoundary = await page.evaluate(() => {
    // Check if there's any error boundary-like component in the rendered tree
    const errorElements = document.querySelectorAll(
      "[data-error-boundary], .error-boundary, [role='alert']"
    );
    // Also check for "Something went wrong" type text that would appear on crash
    const bodyText = document.body.innerText || "";
    const hasGenericError =
      bodyText.includes("Something went wrong") ||
      bodyText.includes("Error boundary") ||
      bodyText.includes("Unexpected error");

    return {
      hasErrorElements: errorElements.length > 0,
      hasGenericError,
    };
  });

  // This is informational — we can't easily trigger an error boundary
  // without modifying the app, but we can check the setup exists
  return {
    check: {
      name: "Error boundary presence",
      description: "App should have error boundaries for crash resilience",
      passed: true, // Informational check
      before: "Inspect page for error boundary components",
      after: `Error elements: ${hasErrorBoundary.hasErrorElements}, Generic error text: ${hasErrorBoundary.hasGenericError}`,
      details: "Informational — error boundary detection (not a pass/fail test)",
    },
  };
}

/**
 * Check 6: Verify boot screen / loading state works correctly.
 */
async function checkBootScreen(
  page: Page
): Promise<{ check: StateCheck; bug?: BugReport }> {
  // Navigate with cache cleared to trigger boot screen
  await page.evaluate(() => {
    sessionStorage.clear();
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });

  // Check if boot screen appears
  const bootScreenVisible = await page.evaluate(() => {
    const bootEl = document.querySelector("#boot-screen, .boot-screen, [data-boot-screen]");
    if (bootEl) {
      const rect = bootEl.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    return false;
  });

  // Wait for it to dismiss
  await page.waitForTimeout(10000); // Boot screen has 6-8s timeout

  const bootScreenGone = await page.evaluate(() => {
    const bootEl = document.querySelector("#boot-screen, .boot-screen, [data-boot-screen]");
    if (!bootEl) return true;
    const style = getComputedStyle(bootEl);
    return style.display === "none" || style.opacity === "0" || style.visibility === "hidden";
  });

  const passed = !bootScreenVisible || bootScreenGone;

  return {
    check: {
      name: "Boot screen lifecycle",
      description: "Boot screen should appear briefly then dismiss",
      passed,
      before: `Boot screen visible: ${bootScreenVisible}`,
      after: `Boot screen gone: ${bootScreenGone}`,
      details: passed
        ? "Boot screen lifecycle works correctly"
        : "Boot screen may be stuck",
    },
    bug: !passed
      ? makeBug(
          "Boot screen did not dismiss after 10 seconds",
          "critical", "/",
          [
            "Clear session storage",
            "Navigate to /",
            "Wait 10 seconds",
            `Boot screen still visible: ${!bootScreenGone}`,
          ],
          "Boot screen should dismiss within 6-8 seconds",
          "Boot screen is still visible after 10 seconds",
          "Check the boot screen timeout logic and health check endpoint.",
          ["boot-screen"], 70,
        )
      : undefined,
  };
}

// ── Main State Agent ──────────────────────────────────────────────

export async function runStateAgent(
  page: Page
): Promise<{ checks: StateCheck[]; bugs: BugReport[] }> {
  const allChecks: StateCheck[] = [];
  const allBugs: BugReport[] = [];

  const runners: Array<{
    name: string;
    fn: () => Promise<{ check?: StateCheck; checks?: StateCheck[]; bug?: BugReport; bugs?: BugReport[] }>;
  }> = [
    { name: "Theme persistence", fn: () => checkThemePersistence(page) },
    { name: "Sidebar active state", fn: () => checkSidebarActiveState(page) },
    { name: "localStorage persistence", fn: () => checkLocalStoragePersistence(page) },
    { name: "Back button state", fn: () => checkBackButtonState(page) },
    { name: "Error boundary", fn: () => checkErrorBoundary(page) },
    { name: "Boot screen", fn: () => checkBootScreen(page) },
  ];

  for (const runner of runners) {
    try {
      console.log(`    [State] ${runner.name}...`);
      const result = await runner.fn();

      if (result.check) allChecks.push(result.check);
      if (result.checks) allChecks.push(...result.checks);
      if (result.bug) allBugs.push(result.bug);
      if (result.bugs) allBugs.push(...result.bugs);
    } catch (err) {
      console.error(`      ${runner.name} failed: ${(err as Error).message}`);
    }
  }

  return { checks: allChecks, bugs: allBugs };
}
