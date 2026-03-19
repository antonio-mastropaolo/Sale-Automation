/**
 * GUI Audit System — Orchestrator
 *
 * Ties together the page extractor, consistency checker, second-opinion agent,
 * and test-case generator into a single pipeline that can be invoked from
 * Playwright specs or run as a standalone audit.
 *
 * Pipeline:
 *  1. For each page × viewport × colorScheme:
 *     a. Extract page snapshot (elements, screenshot)
 *     b. Run consistency checks
 *  2. Optionally request second opinion
 *  3. Generate test plan with manual test cases
 *  4. Save full report to docs/gui-audit/
 */

import type { Page } from "@playwright/test";
import type {
  AuditReport,
  AuditIssue,
  PageSnapshot,
  SecondOpinionResult,
} from "./types";
import { extractPageSnapshot } from "./page-extractor";
import {
  runConsistencyChecks,
  resetIssueCounter,
} from "./consistency-checker";
import { getSecondOpinion, resetSopCounter } from "./second-opinion";
import { generateTestPlan, formatTestPlanSummary } from "./test-case-generator";
import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.join(process.cwd(), "docs", "gui-audit");

// ── Configuration ─────────────────────────────────────────────────

export interface AuditConfig {
  /** Routes to audit */
  routes: string[];
  /** Viewports to test */
  viewports: Array<{ width: number; height: number }>;
  /** Color schemes to test */
  colorSchemes: Array<"light" | "dark">;
  /** Whether to run the second-opinion agent */
  enableSecondOpinion: boolean;
  /** Minimum severity to include in the report ("critical" | "major" | "minor" | "info") */
  minSeverity: "critical" | "major" | "minor" | "info";
}

/** All ListBlitz page routes */
export const ALL_ROUTES: string[] = [
  "/",
  "/listings/new",
  "/listings/smart",
  "/analytics",
  "/settings",
  "/inbox",
  "/inventory",
  "/offers",
  "/repricing",
  "/scheduler",
  "/trends",
  "/competitor",
  "/drops",
  "/bulk-import",
  "/templates",
  "/tools",
  "/shipping",
  "/workflow",
  "/diagnostics",
  "/search",
  "/report",
  "/alignment",
  "/studio",
  "/showcase",
  "/login",
  "/register",
  "/forgot-password",
  "/onboard",
];

/** Default audit configuration */
export const DEFAULT_CONFIG: AuditConfig = {
  routes: ALL_ROUTES,
  viewports: [
    { width: 1280, height: 800 },  // Desktop
    { width: 768, height: 1024 },   // Tablet
    { width: 375, height: 812 },    // Mobile
  ],
  colorSchemes: ["light", "dark"],
  enableSecondOpinion: true,
  minSeverity: "minor",
};

/** Quick audit: just a few key pages at desktop resolution */
export const QUICK_CONFIG: AuditConfig = {
  routes: ["/", "/listings/new", "/settings", "/analytics"],
  viewports: [{ width: 1280, height: 800 }],
  colorSchemes: ["light", "dark"],
  enableSecondOpinion: true,
  minSeverity: "major",
};

// ── Severity Filter ───────────────────────────────────────────────

const SEVERITY_ORDER = { critical: 0, major: 1, minor: 2, info: 3 };

function filterBySeverity(
  issues: AuditIssue[],
  minSeverity: string
): AuditIssue[] {
  const minLevel = SEVERITY_ORDER[minSeverity as keyof typeof SEVERITY_ORDER] ?? 3;
  return issues.filter(
    (i) => (SEVERITY_ORDER[i.severity] ?? 3) <= minLevel
  );
}

// ── Main Orchestrator ─────────────────────────────────────────────

/**
 * Run the full GUI audit pipeline.
 *
 * @param page - Playwright Page instance
 * @param config - Audit configuration
 * @returns Full audit report
 */
export async function runGUIAudit(
  page: Page,
  config: AuditConfig = DEFAULT_CONFIG
): Promise<AuditReport> {
  resetIssueCounter();
  resetSopCounter();

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const snapshots: PageSnapshot[] = [];
  const allIssues: AuditIssue[] = [];

  // Phase 1: Extract & Check each page combination
  const totalCombinations =
    config.routes.length * config.viewports.length * config.colorSchemes.length;
  let progress = 0;

  for (const route of config.routes) {
    for (const viewport of config.viewports) {
      for (const scheme of config.colorSchemes) {
        progress++;
        const label = `[${progress}/${totalCombinations}] ${route} @ ${viewport.width}x${viewport.height} (${scheme})`;
        console.log(`  Auditing: ${label}`);

        try {
          // Extract
          const snapshot = await extractPageSnapshot(
            page,
            route,
            scheme,
            viewport
          );
          snapshots.push(snapshot);

          // Check
          const issues = runConsistencyChecks(snapshot);
          allIssues.push(...issues);

          console.log(`    → Found ${issues.length} issues`);
        } catch (err) {
          console.error(`    ✗ Failed: ${(err as Error).message}`);
        }
      }
    }
  }

  // Phase 2: Filter by severity
  const filteredIssues = filterBySeverity(allIssues, config.minSeverity);

  // Phase 3: Second opinion (optional)
  let secondOpinion: SecondOpinionResult | undefined;
  if (config.enableSecondOpinion && snapshots.length > 0) {
    console.log("\n  Running second-opinion analysis...");
    // Run second opinion on the first (main) snapshot for focused analysis
    const mainSnapshot = snapshots.find((s) => s.route === "/" && s.colorScheme === "light")
      || snapshots[0];

    secondOpinion = getSecondOpinion({
      issues: filteredIssues,
      snapshot: mainSnapshot,
    });

    console.log(`    → Confirmed: ${secondOpinion.confirmed.length}`);
    console.log(`    → Disputed: ${secondOpinion.disputed.length}`);
    console.log(`    → Additional: ${secondOpinion.additional.length}`);
    console.log(`    → Confidence: ${secondOpinion.confidence}%`);
  }

  // Phase 4: Generate test plan
  console.log("\n  Generating test plan...");
  const testPlan = generateTestPlan(filteredIssues, snapshots, secondOpinion);

  // Print summary
  const summary = formatTestPlanSummary(testPlan);
  console.log("\n" + summary);

  // Phase 5: Build report
  const report: AuditReport = {
    meta: {
      timestamp: new Date().toISOString(),
      pagesAudited: config.routes.length,
      viewports: config.viewports,
      colorSchemes: config.colorSchemes,
    },
    snapshots,
    issues: filteredIssues,
    secondOpinion,
    testPlan,
  };

  // Save report to disk
  const reportPath = path.join(OUTPUT_DIR, "audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Save test plan as a separate readable file
  const planPath = path.join(OUTPUT_DIR, "test-plan.txt");
  fs.writeFileSync(planPath, summary);

  // Save CSV of test cases for spreadsheet import
  const csvPath = path.join(OUTPUT_DIR, "test-cases.csv");
  const csvHeader =
    "ID,Title,Priority,Category,Route,ColorScheme,EstimatedMinutes,Steps,ExpectedResult\n";
  const csvRows = testPlan.cases
    .map((tc) =>
      [
        tc.id,
        `"${tc.title.replace(/"/g, '""')}"`,
        tc.priority,
        tc.category,
        tc.route,
        tc.colorScheme,
        tc.estimatedMinutes,
        `"${tc.steps.join(" → ").replace(/"/g, '""')}"`,
        `"${tc.expectedResult.replace(/"/g, '""')}"`,
      ].join(",")
    )
    .join("\n");
  fs.writeFileSync(csvPath, csvHeader + csvRows);

  console.log(`\n  Report saved to: ${reportPath}`);
  console.log(`  Test plan saved to: ${planPath}`);
  console.log(`  CSV test cases saved to: ${csvPath}`);
  console.log(`  Screenshots saved to: ${OUTPUT_DIR}/`);

  return report;
}
