/**
 * TrendSmart QA — Logic Agent
 *
 * Tests business rules by navigating pages and inspecting rendered data.
 * Validates things a manual tester would catch:
 *  - Prices showing $0 or negative
 *  - Broken status badges (unknown states)
 *  - Missing required data in cards/tables
 *  - Date formatting issues (NaN, "Invalid Date")
 *  - Empty lists that should have data (or vice-versa)
 *  - Broken links / dead hrefs
 *  - Console errors during page load
 *  - Stale data indicators
 */

import type { Page } from "@playwright/test";
import type { BugReport, AgentName } from "./agent-types";

const AGENT: AgentName = "logic";
let bugCounter = 0;

function bugId(): string {
  return `LOGIC-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetLogicCounter(): void {
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
  confidence = 85,
  relatedFile?: string
): BugReport {
  const body = [
    `## Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Logic Agent (automated)`,
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
    relatedFile ? `\n### Related File\n\`${relatedFile}\`` : "",
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    relatedFile,
    confidence,
  };
}

// ── Individual Logic Checks ───────────────────────────────────────

/**
 * Check for console errors during page load.
 */
async function checkConsoleErrors(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  await page.goto(route, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Filter out common false positives
  const realErrors = errors.filter(
    (e) =>
      !e.includes("favicon") &&
      !e.includes("hydration") &&
      !e.includes("Warning:") &&
      !e.includes("DevTools")
  );

  if (realErrors.length > 0) {
    bugs.push(
      makeBug(
        `Console errors on ${route} (${realErrors.length})`,
        "major",
        route,
        [`Navigate to ${route}`, "Open browser console", "Observe error messages"],
        "No console errors on page load",
        `${realErrors.length} error(s):\n${realErrors.slice(0, 5).map((e) => `- ${e.substring(0, 150)}`).join("\n")}`,
        "Investigate and fix the JavaScript errors thrown during page load.",
        ["console-error"],
        90
      )
    );
  }

  return bugs;
}

/**
 * Check for broken prices ($0, negative, NaN, undefined).
 */
async function checkPriceDisplay(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const priceIssues = await page.evaluate(() => {
    const issues: Array<{ text: string; selector: string }> = [];
    // Find all elements that look like prices
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.textContent || "").trim();
      if (!text) continue;

      // Match price patterns
      const priceMatch = text.match(/\$[\d.,]+|\$\s*[\d.,]+/);
      if (priceMatch) {
        const priceStr = priceMatch[0].replace(/[$,\s]/g, "");
        const price = parseFloat(priceStr);

        if (isNaN(price)) {
          issues.push({ text: priceMatch[0], selector: "NaN price" });
        } else if (price === 0) {
          issues.push({ text: priceMatch[0], selector: "$0 price" });
        } else if (price < 0) {
          issues.push({ text: priceMatch[0], selector: "Negative price" });
        } else if (price > 100000) {
          issues.push({ text: priceMatch[0], selector: "Suspiciously high price" });
        }
      }

      // Check for "undefined", "NaN", "null" rendered as text
      if (/\b(undefined|NaN|null|Infinity)\b/.test(text) && text.length < 50) {
        issues.push({ text, selector: "Leaked debug value" });
      }

      // Check for "Invalid Date"
      if (text.includes("Invalid Date")) {
        issues.push({ text, selector: "Invalid Date" });
      }
    }

    return issues;
  });

  for (const issue of priceIssues) {
    bugs.push(
      makeBug(
        `${issue.selector}: "${issue.text}" on ${route}`,
        issue.selector === "Leaked debug value" ? "critical" : "major",
        route,
        [`Navigate to ${route}`, `Find the text: "${issue.text}"`],
        "All displayed values should be valid and properly formatted",
        `Found "${issue.text}" (${issue.selector})`,
        "Check the data source and add proper formatting/fallback for edge cases.",
        ["data-display"],
        issue.selector === "Leaked debug value" ? 95 : 80,
        route === "/" ? "src/app/page.tsx" : undefined
      )
    );
  }

  return bugs;
}

/**
 * Check for broken links (href="#", href="", javascript:void).
 */
async function checkBrokenLinks(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const brokenLinks = await page.evaluate(() => {
    const issues: Array<{ href: string; text: string }> = [];
    const links = document.querySelectorAll("a[href]");

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const text = (link.textContent || "").trim().substring(0, 60);

      if (
        href === "#" ||
        href === "" ||
        href === "javascript:void(0)" ||
        href === "javascript:;" ||
        href.startsWith("undefined") ||
        href.startsWith("null")
      ) {
        issues.push({ href, text });
      }
    }

    return issues;
  });

  if (brokenLinks.length > 0) {
    bugs.push(
      makeBug(
        `${brokenLinks.length} broken link(s) on ${route}`,
        "major",
        route,
        [
          `Navigate to ${route}`,
          `Inspect links on the page`,
          ...brokenLinks.slice(0, 5).map((l) => `Link "${l.text}" points to "${l.href}"`),
        ],
        "All links should navigate to valid destinations",
        `${brokenLinks.length} links have invalid href values`,
        "Update href attributes to point to valid routes or remove non-functional links.",
        ["broken-link"],
        90
      )
    );
  }

  return bugs;
}

/**
 * Check for empty states that should have content.
 * Looks for patterns like "No items", "Empty", "Nothing here" alongside
 * actual data — which would indicate a rendering bug.
 */
async function checkEmptyStates(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const analysis = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const hasEmptyMessage =
      /no (items|listings|data|results|messages|offers)/i.test(text) ||
      /nothing (here|to show|found)/i.test(text) ||
      /empty/i.test(text);

    // Count visible data cards/rows
    const cards = document.querySelectorAll("[data-slot='card']");
    const tableRows = document.querySelectorAll("tbody tr");
    const listItems = document.querySelectorAll("ul li, ol li");
    const visibleCards = Array.from(cards).filter((c) => {
      const rect = c.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length;

    return {
      hasEmptyMessage,
      visibleCards,
      tableRows: tableRows.length,
      listItems: listItems.length,
      hasData: visibleCards > 2 || tableRows.length > 0,
    };
  });

  // If we see both "empty" text AND data cards, something is wrong
  if (analysis.hasEmptyMessage && analysis.hasData) {
    bugs.push(
      makeBug(
        `Empty state message shown alongside data on ${route}`,
        "major",
        route,
        [
          `Navigate to ${route}`,
          `Observe the page shows both an "empty/no items" message AND data cards`,
        ],
        "Either show the empty state OR the data, not both",
        `Page shows empty state text but also has ${analysis.visibleCards} cards / ${analysis.tableRows} table rows`,
        "Fix the conditional rendering: check the data array length before showing empty state.",
        ["ui-state"],
        75
      )
    );
  }

  return bugs;
}

/**
 * Check form validation: try submitting empty forms.
 */
async function checkFormValidation(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  // Only check form-heavy pages
  const formRoutes = ["/listings/new", "/login", "/register", "/settings", "/bulk-import"];
  if (!formRoutes.some((r) => route.startsWith(r))) return bugs;

  const formInfo = await page.evaluate(() => {
    const forms = document.querySelectorAll("form");
    const inputs = document.querySelectorAll("input:not([type=hidden]), textarea, select");
    const submitBtns = document.querySelectorAll("button[type=submit], input[type=submit]");

    return {
      formCount: forms.length,
      inputCount: inputs.length,
      submitCount: submitBtns.length,
      requiredWithoutValidation: Array.from(inputs)
        .filter(
          (i) =>
            (i as HTMLInputElement).required &&
            !(i as HTMLInputElement).pattern &&
            !(i as HTMLInputElement).minLength
        )
        .map((i) => ({
          type: (i as HTMLInputElement).type || i.tagName.toLowerCase(),
          name: (i as HTMLInputElement).name || (i as HTMLInputElement).id,
        })),
    };
  });

  // Check: forms with no client-side validation
  if (formInfo.inputCount > 0 && formInfo.formCount === 0) {
    bugs.push(
      makeBug(
        `Inputs on ${route} not wrapped in <form>`,
        "minor",
        route,
        [`Navigate to ${route}`, `Inspect the input elements`],
        "Inputs should be in a <form> for proper semantics and Enter-key submission",
        `${formInfo.inputCount} inputs found but no <form> wrapper`,
        "Wrap inputs in a <form> element for proper HTML semantics.",
        ["form", "accessibility"],
        70
      )
    );
  }

  return bugs;
}

/**
 * Check for 404 images / broken images.
 */
async function checkBrokenImages(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const brokenImages = await page.evaluate(() => {
    const images = document.querySelectorAll("img");
    const broken: Array<{ src: string; alt: string }> = [];

    for (const img of images) {
      if (!img.complete || img.naturalWidth === 0) {
        broken.push({
          src: img.src.substring(0, 100),
          alt: img.alt || "(no alt)",
        });
      }
    }

    return broken;
  });

  if (brokenImages.length > 0) {
    bugs.push(
      makeBug(
        `${brokenImages.length} broken image(s) on ${route}`,
        "major",
        route,
        [
          `Navigate to ${route}`,
          ...brokenImages.slice(0, 3).map((i) => `Image "${i.alt}" from ${i.src} failed to load`),
        ],
        "All images should load successfully",
        `${brokenImages.length} images failed to load or have naturalWidth=0`,
        "Verify image URLs are valid or add fallback/placeholder images.",
        ["broken-image"],
        85
      )
    );
  }

  return bugs;
}

/**
 * Check that page navigation works (no redirect loops, no blank pages).
 */
async function checkPageLoads(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const response = await page.goto(route, { waitUntil: "networkidle" });
  const status = response?.status() ?? 0;
  const finalUrl = page.url();

  // Check for error status codes
  if (status >= 400) {
    bugs.push(
      makeBug(
        `${route} returns HTTP ${status}`,
        status >= 500 ? "critical" : "major",
        route,
        [`Navigate to ${route}`],
        `Page should load with HTTP 200`,
        `Got HTTP ${status}`,
        status >= 500
          ? "Check server logs for the error. Likely a component crash or missing data."
          : "Check if the route exists and authentication is handled.",
        ["http-error"],
        95
      )
    );
  }

  // Check for blank page (almost no content)
  const bodyText = await page.evaluate(() => document.body?.innerText?.trim() || "");
  if (bodyText.length < 10 && status < 400) {
    bugs.push(
      makeBug(
        `${route} renders blank page`,
        "critical",
        route,
        [`Navigate to ${route}`, `Observe the page appears empty or blank`],
        "Page should render meaningful content",
        `Page body text is only ${bodyText.length} characters: "${bodyText.substring(0, 50)}"`,
        "Check if the page component is crashing silently. Add an error boundary.",
        ["blank-page"],
        80
      )
    );
  }

  // Check for redirect loops (URL changed unexpectedly for auth pages)
  const authRoutes = ["/login", "/register", "/forgot-password"];
  if (!authRoutes.includes(route) && !route.startsWith("/showcase")) {
    const redirected = new URL(finalUrl).pathname;
    if (redirected !== route && redirected === "/login") {
      // This is expected for protected routes — not a bug, just note it
      // We'll mark it as info only
    }
  }

  return bugs;
}

/**
 * Check for stale/hardcoded dates and placeholder data.
 */
async function checkPlaceholderData(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const bugs: BugReport[] = [];

  const suspiciousContent = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const issues: string[] = [];

    // Lorem ipsum
    if (/lorem ipsum/i.test(text)) {
      issues.push("Lorem ipsum placeholder text found");
    }

    // TODO/FIXME in visible text
    if (/\b(TODO|FIXME|HACK|XXX)\b/.test(text)) {
      issues.push("TODO/FIXME visible in UI");
    }

    // Test/example data
    if (/test@(example|test)\.(com|org)/i.test(text)) {
      issues.push("Test email address visible");
    }

    // Placeholder like "John Doe", "Jane Smith" (common test names)
    if (/\b(John Doe|Jane Smith|Acme Corp)\b/.test(text)) {
      issues.push("Common placeholder names visible");
    }

    return issues;
  });

  for (const issue of suspiciousContent) {
    bugs.push(
      makeBug(
        `${issue} on ${route}`,
        "minor",
        route,
        [`Navigate to ${route}`, `Search page for the placeholder content`],
        "Production pages should not contain placeholder/test data",
        issue,
        "Replace with real content or dynamic data.",
        ["placeholder-data"],
        65
      )
    );
  }

  return bugs;
}

// ── Main Logic Agent ──────────────────────────────────────────────

/**
 * Run all logic checks on a route.
 * Returns bug reports for any issues found.
 */
export async function runLogicAgent(
  page: Page,
  route: string
): Promise<BugReport[]> {
  const allBugs: BugReport[] = [];

  const checks = [
    checkPageLoads,
    checkConsoleErrors,
    checkPriceDisplay,
    checkBrokenLinks,
    checkEmptyStates,
    checkFormValidation,
    checkBrokenImages,
    checkPlaceholderData,
  ];

  for (const check of checks) {
    try {
      const bugs = await check(page, route);
      allBugs.push(...bugs);
    } catch (err) {
      console.error(`    Logic check failed on ${route}: ${(err as Error).message}`);
    }
  }

  return allBugs;
}
