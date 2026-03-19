/**
 * GUI Audit System — Test Case Generator
 *
 * Converts discovered issues into actionable manual test cases.
 * Also estimates the total number of test cases needed for full coverage
 * and the time required to execute them.
 */

import type {
  AuditIssue,
  SecondOpinionResult,
  ManualTestCase,
  TestPlan,
  TestCasePriority,
  IssueCategory,
  PageSnapshot,
} from "./types";

// ── Priority Mapping ──────────────────────────────────────────────

const SEVERITY_TO_PRIORITY: Record<string, TestCasePriority> = {
  critical: "P0",
  major: "P1",
  minor: "P2",
  info: "P3",
};

// ── Time Estimates per Category (minutes) ─────────────────────────

const CATEGORY_TIME_ESTIMATE: Record<IssueCategory, number> = {
  contrast: 2,
  overlap: 3,
  truncation: 2,
  "tiny-text": 1,
  "tiny-target": 2,
  "missing-label": 3,
  "invisible-interactive": 3,
  "z-fighting": 4,
  offscreen: 2,
  "empty-container": 1,
  "color-clash": 2,
  responsive: 5,
  "orphan-text": 2,
};

// ── Test Case Templates ───────────────────────────────────────────

function generateStepsForCategory(
  issue: AuditIssue
): { steps: string[]; expectedResult: string } {
  const el = issue.elements[0];
  const elDesc = el ? `<${el.tag}> "${el.text || "unnamed"}"` : "the flagged element";

  switch (issue.category) {
    case "contrast":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Set color scheme to ${issue.colorScheme} mode`,
          `Locate ${elDesc} at approximately (${el?.rect.x}, ${el?.rect.y})`,
          `Visually verify text readability against its background`,
          `Use a color contrast checker tool to measure the actual ratio`,
        ],
        expectedResult: `Text should be easily readable. Contrast ratio should be at least 4.5:1 for normal text or 3:1 for large text (WCAG AA).`,
      };

    case "overlap":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Set color scheme to ${issue.colorScheme} mode`,
          `Locate the area around (${el?.rect.x}, ${el?.rect.y})`,
          `Check if ${issue.elements.map((e) => `<${e.tag}> "${e.text}"`).join(" and ")} overlap`,
          `Try clicking each overlapping element to verify interactivity`,
        ],
        expectedResult: `Elements should not overlap. Each element should be independently clickable without obstruction.`,
      };

    case "truncation":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate ${elDesc}`,
          `Verify all text content is fully visible`,
          `Resize the browser window to check responsive behavior`,
          `Hover over the element to check for tooltip with full text`,
        ],
        expectedResult: `Text should be fully visible or truncated with ellipsis and a tooltip showing the complete text.`,
      };

    case "tiny-text":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate ${elDesc}`,
          `Verify the text is readable at normal viewing distance`,
          `Use browser DevTools to confirm font size`,
        ],
        expectedResult: `Font size should be at least 12px. Text should be comfortably readable.`,
      };

    case "tiny-target":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate the interactive ${elDesc}`,
          `Attempt to click/tap the element on both desktop and mobile viewport`,
          `Use DevTools to measure the clickable area`,
        ],
        expectedResult: `Interactive elements should have a minimum touch target of 44x44px.`,
      };

    case "missing-label":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate ${elDesc}`,
          `Tab to the element using keyboard navigation`,
          `Enable a screen reader and verify the element is announced correctly`,
          `Check DevTools for aria-label, aria-labelledby, or associated <label>`,
        ],
        expectedResult: `The element should have a descriptive label announced by screen readers.`,
      };

    case "invisible-interactive":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Use DevTools to find ${elDesc} in the DOM`,
          `Check if the element becomes visible on hover/focus/scroll`,
          `Verify whether the element is intentionally hidden or a bug`,
        ],
        expectedResult: `Interactive elements should be visible and reachable, or removed from the tab order if intentionally hidden.`,
      };

    case "z-fighting":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate the overlapping area around (${el?.rect.x}, ${el?.rect.y})`,
          `Check which element appears on top`,
          `Resize/scroll to see if the stacking order changes`,
        ],
        expectedResult: `Elements should have a clear, consistent stacking order.`,
      };

    case "offscreen":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Search for ${elDesc} using DevTools`,
          `Verify if the element is accessible via scrolling`,
          `Check if the element becomes visible at different viewports`,
        ],
        expectedResult: `Interactive elements should be within the visible viewport or reachable by scrolling.`,
      };

    case "empty-container":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate the empty container at (${el?.rect.x}, ${el?.rect.y})`,
          `Verify whether it's a loading state, placeholder, or bug`,
          `Wait for page to fully load and re-check`,
        ],
        expectedResult: `Container should either have content, show a loading state, or be hidden if unused.`,
      };

    case "color-clash":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Compare the colors of the flagged elements visually`,
          `Use a color picker tool to verify the exact color values`,
          `Check if these should be the same design token`,
        ],
        expectedResult: `Similar colors should be consolidated into a single design token for consistency.`,
      };

    case "responsive":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Test at viewports: 375px, 768px, 1024px, 1280px, 1920px`,
          `Verify the flagged inconsistency at each breakpoint`,
          `Check that elements remain properly aligned and sized`,
        ],
        expectedResult: `Layout should be consistent and well-structured at all standard breakpoints.`,
      };

    case "orphan-text":
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Locate the orphaned text "${el?.text}"`,
          `Verify it belongs to a semantic container (paragraph, heading, etc.)`,
        ],
        expectedResult: `All text should be inside appropriate semantic HTML elements.`,
      };

    default:
      return {
        steps: [
          `Navigate to ${issue.route}`,
          `Set color scheme to ${issue.colorScheme} mode`,
          `Locate and inspect the flagged element`,
          `Verify the reported issue: ${issue.message}`,
        ],
        expectedResult: `The reported issue should be resolved or confirmed as acceptable.`,
      };
  }
}

// ── Core Generator ────────────────────────────────────────────────

/**
 * Generate manual test cases from audit issues.
 */
export function generateTestCases(
  issues: AuditIssue[],
  secondOpinion?: SecondOpinionResult
): ManualTestCase[] {
  // Merge additional issues from second opinion
  const allIssues = [...issues];
  if (secondOpinion) {
    allIssues.push(...secondOpinion.additional);
  }

  // Remove disputed issues
  const disputedSet = new Set(secondOpinion?.disputed || []);
  const confirmedIssues = allIssues.filter((i) => !disputedSet.has(i.id));

  // Deduplicate: group issues that affect the same element + same category
  const deduped = new Map<string, AuditIssue>();
  for (const issue of confirmedIssues) {
    const key = `${issue.route}:${issue.category}:${issue.elements[0]?.selector || "global"}`;
    if (!deduped.has(key)) {
      deduped.set(key, issue);
    }
  }

  const testCases: ManualTestCase[] = [];
  let caseCounter = 0;

  for (const issue of deduped.values()) {
    caseCounter++;
    const { steps, expectedResult } = generateStepsForCategory(issue);
    const priority = SEVERITY_TO_PRIORITY[issue.severity] || "P2";
    const estimatedMinutes = CATEGORY_TIME_ESTIMATE[issue.category] || 3;

    testCases.push({
      id: `TC-${String(caseCounter).padStart(4, "0")}`,
      title: `[${issue.category.toUpperCase()}] ${issue.message.substring(0, 80)}`,
      relatedIssueIds: [issue.id],
      priority,
      steps,
      expectedResult,
      route: issue.route,
      viewport: { width: 1280, height: 800 },
      colorScheme: issue.colorScheme,
      category: issue.category,
      estimatedMinutes,
    });
  }

  // Sort by priority (P0 first)
  testCases.sort((a, b) => a.priority.localeCompare(b.priority));

  return testCases;
}

/**
 * Generate the full test plan with statistics.
 */
export function generateTestPlan(
  issues: AuditIssue[],
  snapshots: PageSnapshot[],
  secondOpinion?: SecondOpinionResult
): TestPlan {
  const cases = generateTestCases(issues, secondOpinion);

  const byPriority: Record<TestCasePriority, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  };

  const byCategory: Record<string, number> = {};
  const byPage: Record<string, number> = {};
  let totalMinutes = 0;

  for (const tc of cases) {
    byPriority[tc.priority]++;
    byCategory[tc.category] = (byCategory[tc.category] || 0) + 1;
    byPage[tc.route] = (byPage[tc.route] || 0) + 1;
    totalMinutes += tc.estimatedMinutes;
  }

  // Add base overhead per page (navigation, setup, etc.)
  const uniquePages = new Set(cases.map((c) => c.route));
  totalMinutes += uniquePages.size * 2; // 2 min per page for setup

  return {
    totalCases: cases.length,
    byPriority,
    byCategory,
    byPage,
    estimatedTotalMinutes: totalMinutes,
    cases,
  };
}

/**
 * Print a human-readable summary of the test plan.
 */
export function formatTestPlanSummary(plan: TestPlan): string {
  const lines: string[] = [
    "╔══════════════════════════════════════════════════════════════╗",
    "║           GUI AUDIT — MANUAL TEST PLAN SUMMARY             ║",
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    `Total Test Cases: ${plan.totalCases}`,
    `Estimated Time:   ${plan.estimatedTotalMinutes} minutes (~${(plan.estimatedTotalMinutes / 60).toFixed(1)} hours)`,
    "",
    "── By Priority ──────────────────────────────────────────────",
    `  P0 (Critical):  ${plan.byPriority.P0}`,
    `  P1 (Major):     ${plan.byPriority.P1}`,
    `  P2 (Minor):     ${plan.byPriority.P2}`,
    `  P3 (Info):      ${plan.byPriority.P3}`,
    "",
    "── By Category ──────────────────────────────────────────────",
  ];

  for (const [cat, count] of Object.entries(plan.byCategory).sort(
    (a, b) => b[1] - a[1]
  )) {
    lines.push(`  ${cat.padEnd(25)} ${count}`);
  }

  lines.push("");
  lines.push("── By Page ──────────────────────────────────────────────────");

  for (const [page, count] of Object.entries(plan.byPage).sort(
    (a, b) => b[1] - a[1]
  )) {
    lines.push(`  ${page.padEnd(30)} ${count} cases`);
  }

  lines.push("");
  lines.push("══════════════════════════════════════════════════════════════");

  return lines.join("\n");
}
