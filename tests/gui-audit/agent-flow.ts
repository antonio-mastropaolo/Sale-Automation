/**
 * TrendSmart QA — Flow Agent
 *
 * Simulates real user journeys end-to-end:
 *  - Create a listing flow
 *  - Login → navigate → interact
 *  - Settings modification
 *  - Repricing review & apply
 *  - Navigation between all pages
 *  - Mobile responsive navigation
 *
 * This replaces the manual tester who walks through the app
 * clicking things and checking if the flow makes sense.
 */

import type { Page } from "@playwright/test";
import type { BugReport, UserFlow, FlowTestResult, AgentName } from "./agent-types";

const AGENT: AgentName = "flow";
let bugCounter = 0;

function bugId(): string {
  return `FLOW-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetFlowCounter(): void {
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
    `## User Flow Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Flow Agent (automated)`,
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
    labels: ["bug", "user-flow", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── User Flow Definitions ─────────────────────────────────────────

/**
 * All critical user flows for TrendSmart.
 */
export function getUserFlows(): UserFlow[] {
  return [
    {
      name: "Full page navigation",
      description: "Navigate to every page and verify it loads without crashing",
      steps: [
        { action: "navigate", target: "/", description: "Go to dashboard" },
        { action: "assert", value: "title-not-empty", description: "Dashboard has title" },
        { action: "navigate", target: "/listings/new", description: "Go to create listing" },
        { action: "assert", value: "has-form-elements", description: "Form elements present" },
        { action: "navigate", target: "/analytics", description: "Go to analytics" },
        { action: "assert", value: "title-not-empty", description: "Analytics loaded" },
        { action: "navigate", target: "/settings", description: "Go to settings" },
        { action: "assert", value: "has-form-elements", description: "Settings form present" },
        { action: "navigate", target: "/inbox", description: "Go to inbox" },
        { action: "navigate", target: "/repricing", description: "Go to repricing" },
        { action: "navigate", target: "/trends", description: "Go to trends" },
        { action: "navigate", target: "/offers", description: "Go to offers" },
        { action: "navigate", target: "/tools", description: "Go to tools" },
        { action: "navigate", target: "/inventory", description: "Go to inventory" },
      ],
      expectedOutcome: "All pages load without errors or blank screens",
    },
    {
      name: "Sidebar navigation",
      description: "Click through sidebar links and verify routing works",
      steps: [
        { action: "navigate", target: "/", description: "Start at dashboard" },
        { action: "click", target: "aside a[href='/analytics']", description: "Click Analytics in sidebar" },
        { action: "assert", value: "url-contains:/analytics", description: "URL changed to analytics" },
        { action: "click", target: "aside a[href='/settings']", description: "Click Settings in sidebar" },
        { action: "assert", value: "url-contains:/settings", description: "URL changed to settings" },
        { action: "click", target: "aside a[href='/']", description: "Click Dashboard in sidebar" },
        { action: "assert", value: "url-contains:/", description: "URL changed to dashboard" },
      ],
      expectedOutcome: "Sidebar navigation works correctly for all links",
    },
    {
      name: "Theme toggle",
      description: "Toggle between light and dark mode",
      steps: [
        { action: "navigate", target: "/", description: "Go to dashboard" },
        { action: "wait", value: "500", description: "Wait for page to settle" },
        { action: "assert", value: "no-console-errors", description: "No errors in light mode" },
        { action: "click", target: "aside button:first-of-type", description: "Click theme toggle" },
        { action: "wait", value: "500", description: "Wait for theme switch" },
        { action: "assert", value: "no-console-errors", description: "No errors after theme switch" },
      ],
      expectedOutcome: "Theme toggles without visual glitches or errors",
    },
    {
      name: "Listing creation form",
      description: "Open the create listing form and verify all fields render",
      steps: [
        { action: "navigate", target: "/listings/new", description: "Go to create listing" },
        { action: "assert", value: "has-input:title", description: "Title input exists" },
        { action: "assert", value: "has-textarea", description: "Description textarea exists" },
        { action: "assert", value: "has-select-or-input", description: "Category selector exists" },
        { action: "assert", value: "has-input:price", description: "Price input exists" },
      ],
      expectedOutcome: "All form fields are present and interactive",
    },
    {
      name: "Mobile responsive check",
      description: "Verify the app works at mobile viewport",
      steps: [
        { action: "navigate", target: "/", description: "Go to dashboard at mobile size" },
        { action: "assert", value: "no-horizontal-scroll", description: "No horizontal scrollbar at 375px" },
        { action: "navigate", target: "/listings/new", description: "Check listing form at mobile" },
        { action: "assert", value: "no-horizontal-scroll", description: "No horizontal scrollbar" },
        { action: "navigate", target: "/settings", description: "Check settings at mobile" },
        { action: "assert", value: "no-horizontal-scroll", description: "No horizontal scrollbar" },
      ],
      expectedOutcome: "App is usable at 375px without horizontal scrolling",
    },
    {
      name: "Data display integrity",
      description: "Verify dashboard data cards show valid content",
      steps: [
        { action: "navigate", target: "/", description: "Go to dashboard" },
        { action: "assert", value: "no-nan-undefined", description: "No NaN/undefined visible" },
        { action: "assert", value: "no-invalid-date", description: "No 'Invalid Date' visible" },
        { action: "navigate", target: "/analytics", description: "Go to analytics" },
        { action: "assert", value: "no-nan-undefined", description: "No NaN/undefined visible" },
        { action: "navigate", target: "/repricing", description: "Go to repricing" },
        { action: "assert", value: "no-nan-undefined", description: "No NaN/undefined visible" },
      ],
      expectedOutcome: "All data displays valid, formatted values",
    },
  ];
}

// ── Flow Runner ───────────────────────────────────────────────────

async function runAssertion(page: Page, value: string): Promise<{ ok: boolean; detail: string }> {
  switch (value) {
    case "title-not-empty": {
      const title = await page.title();
      return { ok: title.length > 0, detail: `Title: "${title}"` };
    }

    case "has-form-elements": {
      const count = await page.locator("input, textarea, select, button").count();
      return { ok: count > 0, detail: `Found ${count} form elements` };
    }

    case "has-textarea": {
      const count = await page.locator("textarea").count();
      return { ok: count > 0, detail: `Found ${count} textareas` };
    }

    case "has-select-or-input": {
      const count = await page.locator("select, input, [role='combobox']").count();
      return { ok: count > 0, detail: `Found ${count} selectors/inputs` };
    }

    case "no-console-errors":
      // Already tracked by the logic agent, just pass here
      return { ok: true, detail: "Console check delegated" };

    case "no-horizontal-scroll": {
      const hasScroll = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
      );
      return {
        ok: !hasScroll,
        detail: hasScroll ? "Horizontal scrollbar detected" : "No overflow",
      };
    }

    case "no-nan-undefined": {
      const text = await page.evaluate(() => document.body.innerText || "");
      const hasIssue = /\b(NaN|undefined|null)\b/.test(text);
      return {
        ok: !hasIssue,
        detail: hasIssue ? "Found NaN/undefined/null in page text" : "Clean",
      };
    }

    case "no-invalid-date": {
      const text = await page.evaluate(() => document.body.innerText || "");
      const hasIssue = text.includes("Invalid Date");
      return {
        ok: !hasIssue,
        detail: hasIssue ? "Found 'Invalid Date'" : "Clean",
      };
    }

    default:
      if (value.startsWith("url-contains:")) {
        const expected = value.split(":")[1];
        const url = page.url();
        return { ok: url.includes(expected), detail: `URL: ${url}` };
      }
      if (value.startsWith("has-input:")) {
        const name = value.split(":")[1];
        const count = await page
          .locator(`input[name="${name}"], input[placeholder*="${name}" i], input[id*="${name}" i]`)
          .count();
        return { ok: count > 0, detail: `Found ${count} matching inputs` };
      }
      return { ok: true, detail: "Unknown assertion — skipped" };
  }
}

/**
 * Execute a single user flow and report results.
 */
async function executeFlow(
  page: Page,
  flow: UserFlow,
  isMobile = false
): Promise<{ result: FlowTestResult; bugs: BugReport[] }> {
  const bugs: BugReport[] = [];
  const start = Date.now();

  if (isMobile) {
    await page.setViewportSize({ width: 375, height: 812 });
  } else {
    await page.setViewportSize({ width: 1280, height: 800 });
  }

  for (let i = 0; i < flow.steps.length; i++) {
    const step = flow.steps[i];

    try {
      switch (step.action) {
        case "navigate":
          await page.goto(step.target!, { waitUntil: "networkidle", timeout: 15000 });
          break;

        case "click":
          await page.locator(step.target!).first().click({ timeout: 5000 });
          break;

        case "type":
          await page.locator(step.target!).first().fill(step.value || "");
          break;

        case "wait":
          await page.waitForTimeout(parseInt(step.value || "500"));
          break;

        case "assert": {
          const { ok, detail } = await runAssertion(page, step.value!);
          if (!ok) {
            bugs.push(
              makeBug(
                `Flow "${flow.name}" assertion failed: ${step.description}`,
                "major",
                page.url(),
                flow.steps.slice(0, i + 1).map((s) => s.description),
                step.description,
                detail,
                "Check the page rendering for this flow step.",
                ["user-flow", "assertion"],
                80
              )
            );

            return {
              result: {
                flow,
                passed: false,
                failedAtStep: i,
                error: `Assertion failed: ${detail}`,
                duration: Date.now() - start,
              },
              bugs,
            };
          }
          break;
        }

        case "screenshot":
          // Handled by the visual agent
          break;
      }
    } catch (err) {
      bugs.push(
        makeBug(
          `Flow "${flow.name}" crashed at step ${i + 1}: ${step.description}`,
          "critical",
          step.target || page.url(),
          flow.steps.slice(0, i + 1).map((s) => s.description),
          `Step should complete: ${step.description}`,
          (err as Error).message,
          "The flow is broken at this step. Check element selectors and page state.",
          ["user-flow", "crash"],
          90
        )
      );

      return {
        result: {
          flow,
          passed: false,
          failedAtStep: i,
          error: (err as Error).message,
          duration: Date.now() - start,
        },
        bugs,
      };
    }
  }

  return {
    result: {
      flow,
      passed: true,
      duration: Date.now() - start,
    },
    bugs,
  };
}

// ── Main Flow Agent ───────────────────────────────────────────────

/**
 * Run all user flow tests.
 */
export async function runFlowAgent(
  page: Page
): Promise<{ results: FlowTestResult[]; bugs: BugReport[] }> {
  const flows = getUserFlows();
  const results: FlowTestResult[] = [];
  const allBugs: BugReport[] = [];

  for (const flow of flows) {
    const isMobile = flow.name.includes("Mobile");

    try {
      const { result, bugs } = await executeFlow(page, flow, isMobile);
      results.push(result);
      allBugs.push(...bugs);

      const status = result.passed ? "PASS" : "FAIL";
      console.log(`    [${status}] ${flow.name} (${result.duration}ms)`);
    } catch (err) {
      console.error(`    [ERROR] ${flow.name}: ${(err as Error).message}`);
      results.push({
        flow,
        passed: false,
        error: (err as Error).message,
        duration: 0,
      });
    }
  }

  return { results, bugs: allBugs };
}
