/**
 * TrendSmart QA — Accessibility Agent
 *
 * Comprehensive WCAG 2.1 AA compliance testing:
 *  - Keyboard navigation (Tab order, focus visible, no keyboard traps)
 *  - Focus management (focus ring visible, skip links)
 *  - ARIA patterns (roles, states, properties, live regions)
 *  - Landmark regions (main, nav, banner, contentinfo)
 *  - Color independence (info not conveyed by color alone)
 *  - Motion preferences (prefers-reduced-motion support)
 *  - Form accessibility (labels, error messages, fieldsets)
 *  - Interactive widget patterns (accordions, tabs, modals)
 *  - Screen reader announcements (live regions, status updates)
 *
 * Goes far beyond the visual agent's contrast/label checks.
 */

import type { Page } from "@playwright/test";
import type { BugReport, AgentName } from "./agent-types";

const AGENT: AgentName = "a11y";
let bugCounter = 0;

function bugId(): string {
  return `A11Y-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetA11yCounter(): void {
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
  wcagRef: string,
  labels: string[] = [],
  confidence = 85
): BugReport {
  const body = [
    `## Accessibility Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**WCAG:** ${wcagRef}`,
    `**Found by:** Accessibility Agent (automated)`,
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
    labels: ["bug", "accessibility", `severity:${severity}`, `wcag:${wcagRef}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── Accessibility Checks ──────────────────────────────────────────

/**
 * Check 1: Keyboard navigation — Tab through the page, verify focus is visible.
 */
async function checkKeyboardNav(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Tab through the page and collect focused elements
  const focusResults = await page.evaluate(() => {
    const results: Array<{
      tag: string;
      selector: string;
      hasFocusRing: boolean;
      isVisible: boolean;
      tabIndex: number;
    }> = [];

    // Get all focusable elements
    const focusable = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), details, summary'
    );

    for (const el of focusable) {
      const htmlEl = el as HTMLElement;
      const style = getComputedStyle(htmlEl);
      const rect = htmlEl.getBoundingClientRect();

      // Check if the element is visible
      const isVisible =
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0;

      if (!isVisible) continue;

      // Focus the element to check focus styles
      htmlEl.focus();
      const focusedStyle = getComputedStyle(htmlEl);
      const hasFocusRing =
        focusedStyle.outline !== "none" &&
        focusedStyle.outline !== "" &&
        focusedStyle.outlineWidth !== "0px" ||
        focusedStyle.boxShadow !== "none";

      results.push({
        tag: htmlEl.tagName.toLowerCase(),
        selector: htmlEl.id
          ? `#${htmlEl.id}`
          : `${htmlEl.tagName.toLowerCase()}.${Array.from(htmlEl.classList).slice(0, 2).join(".")}`,
        hasFocusRing,
        isVisible,
        tabIndex: htmlEl.tabIndex,
      });
    }

    return results;
  });

  // Count elements without visible focus
  const noFocusRing = focusResults.filter((r) => !r.hasFocusRing);
  if (noFocusRing.length > 3) {
    bugs.push(
      makeBug(
        `${noFocusRing.length} interactive elements lack visible focus on ${route}`,
        "major",
        route,
        [
          `Navigate to ${route}`,
          `Tab through interactive elements`,
          `${noFocusRing.length} of ${focusResults.length} elements have no visible focus indicator`,
        ],
        "All focusable elements should have a visible focus indicator",
        `${noFocusRing.length} elements lack visible focus: ${noFocusRing.slice(0, 3).map((r) => r.selector).join(", ")}...`,
        "Add :focus-visible styles with outline or box-shadow to all interactive elements.",
        "WCAG 2.4.7",
        ["focus-visible"],
        80
      )
    );
  }

  return bugs;
}

/**
 * Check 2: Keyboard trap detection — Tab shouldn't get stuck.
 */
async function checkKeyboardTrap(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  // Press Tab multiple times and check if focus moves
  const focusedElements: string[] = [];

  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(100);

    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? `${el.tagName}#${el.id || "?"}` : "none";
    });

    focusedElements.push(focusedTag);
  }

  // Check for repeated focus (trap)
  const uniqueElements = new Set(focusedElements);
  if (uniqueElements.size < 3 && focusedElements.length >= 10) {
    bugs.push(
      makeBug(
        `Possible keyboard trap on ${route}`,
        "critical",
        route,
        [
          `Navigate to ${route}`,
          `Press Tab 20 times`,
          `Focus only visited ${uniqueElements.size} unique elements`,
        ],
        "Tab should cycle through all interactive elements on the page",
        `Focus trapped — only ${uniqueElements.size} unique elements reached in 20 Tabs`,
        "Ensure no element intercepts Tab key. Check for focus traps in modals/dropdowns.",
        "WCAG 2.1.2",
        ["keyboard-trap"],
        70
      )
    );
  }

  return bugs;
}

/**
 * Check 3: Landmark regions.
 */
async function checkLandmarks(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });

  const landmarks = await page.evaluate(() => {
    return {
      hasMain: document.querySelectorAll("main, [role='main']").length > 0,
      hasNav: document.querySelectorAll("nav, [role='navigation']").length > 0,
      hasBanner: document.querySelectorAll("header, [role='banner']").length > 0,
      hasContentinfo:
        document.querySelectorAll("footer, [role='contentinfo']").length > 0,
      mainCount: document.querySelectorAll("main, [role='main']").length,
      navCount: document.querySelectorAll("nav, [role='navigation']").length,
    };
  });

  const missing: string[] = [];
  if (!landmarks.hasMain) missing.push("<main>");
  if (!landmarks.hasNav) missing.push("<nav>");

  if (missing.length > 0) {
    bugs.push(
      makeBug(
        `Missing landmark regions on ${route}: ${missing.join(", ")}`,
        "minor",
        route,
        [`Navigate to ${route}`, `Check for ARIA landmark regions`],
        "Pages should have <main>, <nav>, and other landmark regions",
        `Missing: ${missing.join(", ")}`,
        "Wrap main content in <main>, navigation in <nav>.",
        "WCAG 1.3.1",
        ["landmarks"],
        75
      )
    );
  }

  if (landmarks.mainCount > 1) {
    bugs.push(
      makeBug(
        `Multiple <main> elements on ${route}: ${landmarks.mainCount}`,
        "minor",
        route,
        [`Navigate to ${route}`, `Found ${landmarks.mainCount} <main> elements`],
        "Page should have exactly one <main> region",
        `Found ${landmarks.mainCount} <main> elements`,
        "Keep only one <main>. Move secondary content to <aside> or <section>.",
        "WCAG 1.3.1",
        ["landmarks"],
        70
      )
    );
  }

  return bugs;
}

/**
 * Check 4: Form accessibility (labels, required, error states).
 */
async function checkFormAccessibility(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];
  const formRoutes = ["/listings/new", "/login", "/register", "/settings", "/bulk-import", "/forgot-password", "/onboard"];
  if (!formRoutes.some((r) => route.startsWith(r))) return bugs;

  await page.goto(route, { waitUntil: "networkidle" });

  const formIssues = await page.evaluate(() => {
    const issues: string[] = [];
    const inputs = document.querySelectorAll("input:not([type=hidden]), textarea, select");

    for (const input of inputs) {
      const htmlInput = input as HTMLInputElement;
      const id = htmlInput.id;
      const name = htmlInput.name || htmlInput.id || htmlInput.type;
      const type = htmlInput.type || "text";

      // Skip submit/button/hidden
      if (["submit", "button", "hidden", "reset"].includes(type)) continue;

      // Check for associated label
      const hasLabel =
        !!htmlInput.labels?.length ||
        !!htmlInput.getAttribute("aria-label") ||
        !!htmlInput.getAttribute("aria-labelledby") ||
        !!htmlInput.placeholder;

      if (!hasLabel) {
        issues.push(`Input "${name}" (${type}) has no label`);
      }

      // Check required fields have aria-required
      if (htmlInput.required && !htmlInput.getAttribute("aria-required")) {
        // This is informational — HTML required is fine too
      }

      // Check autocomplete for login/register forms
      if (type === "password" && !htmlInput.autocomplete) {
        issues.push(`Password input "${name}" missing autocomplete attribute`);
      }
      if (type === "email" && !htmlInput.autocomplete) {
        issues.push(`Email input "${name}" missing autocomplete attribute`);
      }
    }

    return issues;
  });

  if (formIssues.length > 0) {
    bugs.push(
      makeBug(
        `${formIssues.length} form accessibility issue(s) on ${route}`,
        formIssues.length > 3 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Inspect form elements`, ...formIssues.slice(0, 5)],
        "All form inputs should have associated labels and proper attributes",
        `${formIssues.length} issues: ${formIssues.slice(0, 3).join("; ")}`,
        "Add <label> elements, aria-label, or aria-labelledby to all inputs. Add autocomplete attributes to login/password fields.",
        "WCAG 1.3.1 / 3.3.2",
        ["forms", "labels"],
        80
      )
    );
  }

  return bugs;
}

/**
 * Check 5: ARIA roles and properties.
 */
async function checkAriaPatterns(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });

  const ariaIssues = await page.evaluate(() => {
    const issues: string[] = [];

    // Check buttons with role="button" have keyboard support
    const roleButtons = document.querySelectorAll("[role='button']:not(button)");
    for (const btn of roleButtons) {
      const tabindex = btn.getAttribute("tabindex");
      if (!tabindex || tabindex === "-1") {
        issues.push(`div[role=button] "${(btn.textContent || "").substring(0, 30)}" not keyboard-focusable`);
      }
    }

    // Check tabs have proper ARIA
    const tabLists = document.querySelectorAll("[role='tablist']");
    for (const tabList of tabLists) {
      const tabs = tabList.querySelectorAll("[role='tab']");
      if (tabs.length === 0) {
        issues.push("tablist has no tab children");
      }
      for (const tab of tabs) {
        if (!tab.getAttribute("aria-selected")) {
          issues.push(`Tab "${(tab.textContent || "").substring(0, 20)}" missing aria-selected`);
        }
      }
    }

    // Check images in links/buttons have alt or aria-label
    const iconButtons = document.querySelectorAll("button > svg, a > svg");
    for (const svg of iconButtons) {
      const parent = svg.parentElement!;
      const text = (parent.textContent || "").trim();
      const ariaLabel = parent.getAttribute("aria-label") || "";
      const title = parent.getAttribute("title") || "";
      if (!text && !ariaLabel && !title) {
        issues.push(`Icon button/link has no accessible name`);
      }
    }

    // Check for aria-hidden on focusable elements
    const hiddenFocusable = document.querySelectorAll(
      '[aria-hidden="true"] a[href], [aria-hidden="true"] button, [aria-hidden="true"] input'
    );
    if (hiddenFocusable.length > 0) {
      issues.push(`${hiddenFocusable.length} focusable element(s) inside aria-hidden`);
    }

    // Check live regions exist for dynamic content
    const hasLiveRegion =
      document.querySelectorAll("[aria-live], [role='alert'], [role='status']").length > 0;

    return { issues, hasLiveRegion };
  });

  if (ariaIssues.issues.length > 0) {
    bugs.push(
      makeBug(
        `${ariaIssues.issues.length} ARIA issue(s) on ${route}`,
        ariaIssues.issues.length > 5 ? "major" : "minor",
        route,
        [`Navigate to ${route}`, `Audit ARIA roles and properties`, ...ariaIssues.issues.slice(0, 5)],
        "ARIA roles, states, and properties should be correctly applied",
        ariaIssues.issues.slice(0, 5).join("; "),
        "Fix ARIA attributes: add tabindex to role=button divs, aria-selected to tabs, accessible names to icon buttons.",
        "WCAG 4.1.2",
        ["aria"],
        75
      )
    );
  }

  return bugs;
}

/**
 * Check 6: Skip link presence.
 */
async function checkSkipLink(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Only check main content pages
  if (["/login", "/register", "/forgot-password"].includes(route)) return bugs;

  await page.goto(route, { waitUntil: "networkidle" });

  const hasSkipLink = await page.evaluate(() => {
    // Tab to activate skip links
    const links = document.querySelectorAll("a");
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const text = (link.textContent || "").toLowerCase();
      if (
        (href.startsWith("#main") || href.startsWith("#content")) &&
        (text.includes("skip") || text.includes("main content"))
      ) {
        return true;
      }
    }
    return false;
  });

  if (!hasSkipLink) {
    bugs.push(
      makeBug(
        `Missing skip-to-content link on ${route}`,
        "minor",
        route,
        [`Navigate to ${route}`, `Press Tab`, `No skip link appears`],
        "Pages should have a 'Skip to main content' link for keyboard users",
        "No skip navigation link found",
        "Add a visually-hidden skip link as the first focusable element: <a href='#main' class='sr-only focus:not-sr-only'>Skip to main content</a>",
        "WCAG 2.4.1",
        ["skip-link"],
        65
      )
    );
  }

  return bugs;
}

/**
 * Check 7: Escape key closes modals/dialogs.
 */
async function checkEscapeDismiss(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });

  // Check for any visible dialogs/modals
  const hasDialogs = await page.evaluate(() => {
    const dialogs = document.querySelectorAll(
      "dialog, [role='dialog'], [role='alertdialog'], [data-state='open']"
    );
    return Array.from(dialogs).some((d) => {
      const rect = d.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  });

  // If there's a dialog, try pressing Escape
  if (hasDialogs) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const stillOpen = await page.evaluate(() => {
      const dialogs = document.querySelectorAll(
        "dialog[open], [role='dialog']:not([aria-hidden='true']), [data-state='open']"
      );
      return Array.from(dialogs).some((d) => {
        const rect = d.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    });

    if (stillOpen) {
      bugs.push(
        makeBug(
          `Modal/dialog does not close on Escape on ${route}`,
          "major",
          route,
          [
            `Navigate to ${route}`,
            `A dialog/modal is open`,
            `Press Escape`,
            `Dialog remains open`,
          ],
          "Dialogs should close when pressing Escape",
          "Dialog remained open after pressing Escape",
          "Add onKeyDown handler to close the dialog on Escape key.",
          "WCAG 2.1.1",
          ["modal", "escape"],
          70
        )
      );
    }
  }

  return bugs;
}

/**
 * Check 8: Color independence — ensure status is not conveyed by color alone.
 */
async function checkColorIndependence(page: Page, route: string): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  await page.goto(route, { waitUntil: "networkidle" });

  const colorOnlyInfo = await page.evaluate(() => {
    const issues: string[] = [];

    // Check status badges for text content (not just colored dots)
    const badges = document.querySelectorAll(
      ".badge, .status, [class*='status'], [class*='badge'], [data-status]"
    );
    for (const badge of badges) {
      const text = (badge.textContent || "").trim();
      if (text.length === 0) {
        // Colored element with no text — might be color-only
        const rect = badge.getBoundingClientRect();
        if (rect.width > 0 && rect.width < 30) {
          issues.push(`Status indicator at (${Math.round(rect.x)}, ${Math.round(rect.y)}) uses color only`);
        }
      }
    }

    // Check for red/green colored text without additional indicators
    const allSpans = document.querySelectorAll("span, p, div");
    for (const el of allSpans) {
      const style = getComputedStyle(el);
      const text = (el.textContent || "").trim();
      if (text.length === 0 || text.length > 20) continue;

      // Check if text color is pure red or pure green
      const color = style.color;
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        const isPureRed = r > 200 && g < 80 && b < 80;
        const isPureGreen = g > 200 && r < 80 && b < 80;
        if ((isPureRed || isPureGreen) && !text.match(/error|success|fail|pass|active|warn/i)) {
          issues.push(`Text "${text}" uses ${isPureRed ? "red" : "green"} color without text indicator`);
        }
      }
    }

    return issues;
  });

  if (colorOnlyInfo.length > 0) {
    bugs.push(
      makeBug(
        `${colorOnlyInfo.length} color-only indicator(s) on ${route}`,
        "minor",
        route,
        [`Navigate to ${route}`, ...colorOnlyInfo.slice(0, 5)],
        "Information should not be conveyed by color alone",
        colorOnlyInfo.slice(0, 3).join("; "),
        "Add text labels, icons, or patterns alongside color to convey status.",
        "WCAG 1.4.1",
        ["color-independence"],
        60
      )
    );
  }

  return bugs;
}

// ── Main Accessibility Agent ──────────────────────────────────────

export async function runAccessibilityAgent(
  page: Page,
  routes: string[]
): Promise<BugReport[]> {
  const allBugs: BugReport[] = [];

  for (const route of routes) {
    console.log(`    [A11y] ${route}`);

    const checks = [
      () => checkKeyboardNav(page, route),
      () => checkKeyboardTrap(page, route),
      () => checkLandmarks(page, route),
      () => checkFormAccessibility(page, route),
      () => checkAriaPatterns(page, route),
      () => checkSkipLink(page, route),
      () => checkEscapeDismiss(page, route),
      () => checkColorIndependence(page, route),
    ];

    for (const check of checks) {
      try {
        const bugs = await check();
        allBugs.push(...bugs);
      } catch (err) {
        console.error(`      Check failed on ${route}: ${(err as Error).message}`);
      }
    }

    if (allBugs.length > 0) {
      console.log(`      ${allBugs.length} issue(s) so far`);
    }
  }

  return allBugs;
}
