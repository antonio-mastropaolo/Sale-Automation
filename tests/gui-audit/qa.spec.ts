/**
 * TrendSmart QA — Multi-Agent Test Runner
 *
 * This is the entry point. Run it with:
 *
 *   npx playwright test tests/gui-audit/qa.spec.ts --project=gui-audit
 *
 * Or with npm scripts:
 *
 *   npm run qa              # Quick run (4 key pages)
 *   npm run qa:full         # Full run (all pages)
 *   npm run qa:visual       # Visual agent only
 *   npm run qa:api          # API agent only
 *   npm run qa:flow         # Flow agent only
 *   npm run qa:page /route  # Single page deep-dive
 *
 * Outputs are saved to docs/gui-audit/:
 *   - qa-report.json        Full machine-readable report
 *   - qa-dashboard.md       Human-readable summary
 *   - bugs.csv              Spreadsheet import
 *   - issues/               One markdown file per bug (GitHub-issue-ready)
 *   - *.png                 Screenshots
 */

import { test, expect } from "@playwright/test";
import { extractPageSnapshot } from "./page-extractor";
import { runConsistencyChecks, resetIssueCounter } from "./consistency-checker";
import { getSecondOpinion, resetSopCounter } from "./second-opinion";
import { runLogicAgent, resetLogicCounter } from "./agent-logic";
import { runApiAgent, resetApiCounter } from "./agent-api";
import { runFlowAgent, resetFlowCounter } from "./agent-flow";
import { deduplicateBugs, saveQAReport } from "./bug-reporter";
import type {
  BugReport,
  QAReport,
  BugSeverity,
  AgentName,
  APITestResult,
  FlowTestResult,
} from "./agent-types";

// ── Config from env ───────────────────────────────────────────────

const MODE = process.env.QA_MODE || "quick";
const AGENT_FILTER = process.env.QA_AGENT || "all"; // visual, logic, api, flow, all
const SINGLE_ROUTE = process.env.QA_ROUTE;

const QUICK_ROUTES = ["/", "/listings/new", "/settings", "/analytics"];
const ALL_ROUTES = [
  "/", "/listings/new", "/listings/smart", "/analytics", "/settings",
  "/inbox", "/inventory", "/offers", "/repricing", "/scheduler",
  "/trends", "/competitor", "/drops", "/bulk-import", "/templates",
  "/tools", "/shipping", "/workflow", "/diagnostics", "/search",
  "/report", "/alignment", "/studio", "/showcase",
  "/login", "/register", "/forgot-password", "/onboard",
];

function getRoutes(): string[] {
  if (SINGLE_ROUTE) return [SINGLE_ROUTE];
  if (MODE === "full") return ALL_ROUTES;
  return QUICK_ROUTES;
}

function shouldRun(agent: AgentName): boolean {
  if (AGENT_FILTER === "all") return true;
  return AGENT_FILTER === agent;
}

// ── Helpers ───────────────────────────────────────────────────────

function convertVisualToBugs(
  issues: Array<{
    id: string;
    category: string;
    severity: string;
    message: string;
    route: string;
    colorScheme: string;
    suggestion: string;
    wcagRef?: string;
    elements: Array<{ selector: string; tag: string; text: string; rect: { x: number; y: number; width: number; height: number } }>;
  }>
): BugReport[] {
  return issues.map((issue) => ({
    id: `VIS-${issue.id}`,
    title: `[${issue.category.toUpperCase()}] ${issue.message.substring(0, 70)}`,
    foundBy: "visual" as AgentName,
    severity: issue.severity as BugSeverity,
    labels: ["bug", "visual", issue.category, `severity:${issue.severity}`],
    body: [
      `## Visual Issue`,
      `**Category:** ${issue.category}`,
      `**Severity:** ${issue.severity}`,
      `**Route:** \`${issue.route}\` (${issue.colorScheme} mode)`,
      issue.wcagRef ? `**WCAG:** ${issue.wcagRef}` : "",
      ``,
      `### Issue`,
      issue.message,
      ``,
      `### Suggested Fix`,
      issue.suggestion,
      issue.elements.length > 0
        ? `\n### Element\n\`${issue.elements[0].selector}\` (<${issue.elements[0].tag}> "${issue.elements[0].text}")`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    stepsToReproduce: [
      `Navigate to ${issue.route}`,
      `Set color scheme to ${issue.colorScheme}`,
      `Locate the element: ${issue.elements[0]?.selector || "see description"}`,
    ],
    expected: `No ${issue.category} issues`,
    actual: issue.message,
    route: issue.route,
    suggestedFix: issue.suggestion,
    confidence: issue.severity === "critical" ? 90 : issue.severity === "major" ? 80 : 65,
  }));
}

// ── Main Test Suite ───────────────────────────────────────────────

test.describe("TrendSmart QA — Multi-Agent Runner", () => {
  test.setTimeout(600_000); // 10 min for full run

  test("run all QA agents and generate bug reports", async ({ page, request }) => {
    const startTime = Date.now();
    const routes = getRoutes();
    const allBugs: BugReport[] = [];
    let apiResults: APITestResult[] = [];
    let flowResults: FlowTestResult[] = [];

    resetIssueCounter();
    resetSopCounter();
    resetLogicCounter();
    resetApiCounter();
    resetFlowCounter();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`  TrendSmart QA — Multi-Agent Test Run`);
    console.log(`  Mode: ${MODE} | Agents: ${AGENT_FILTER} | Pages: ${routes.length}`);
    console.log(`${"=".repeat(60)}\n`);

    // ── Agent 1: Visual ──
    if (shouldRun("visual")) {
      console.log(`\n--- VISUAL AGENT ---`);
      for (const route of routes) {
        for (const scheme of ["light", "dark"] as const) {
          try {
            console.log(`  [Visual] ${route} (${scheme})`);
            const snapshot = await extractPageSnapshot(page, route, scheme);
            const issues = runConsistencyChecks(snapshot);

            // Second opinion on issues
            if (issues.length > 0) {
              const sop = getSecondOpinion({ issues, snapshot });
              // Remove disputed issues
              const disputed = new Set(sop.disputed);
              const confirmed = issues.filter((i) => !disputed.has(i.id));
              const bugs = convertVisualToBugs(confirmed);
              allBugs.push(...bugs);
              allBugs.push(...convertVisualToBugs(sop.additional));
              console.log(`    ${confirmed.length} confirmed, ${sop.disputed.length} disputed, ${sop.additional.length} new`);
            }
          } catch (err) {
            console.error(`    FAILED: ${(err as Error).message}`);
          }
        }
      }
    }

    // ── Agent 2: Logic ──
    if (shouldRun("logic")) {
      console.log(`\n--- LOGIC AGENT ---`);
      for (const route of routes) {
        try {
          console.log(`  [Logic] ${route}`);
          const bugs = await runLogicAgent(page, route);
          allBugs.push(...bugs);
          if (bugs.length > 0) {
            console.log(`    Found ${bugs.length} issue(s)`);
          }
        } catch (err) {
          console.error(`    FAILED: ${(err as Error).message}`);
        }
      }
    }

    // ── Agent 3: API ──
    if (shouldRun("api")) {
      console.log(`\n--- API AGENT ---`);
      try {
        const { results, bugs } = await runApiAgent(request);
        apiResults = results;
        allBugs.push(...bugs);
        const passed = results.filter((r) => r.passed).length;
        const failed = results.filter((r) => !r.passed).length;
        console.log(`  ${passed} passed, ${failed} failed out of ${results.length} tests`);
      } catch (err) {
        console.error(`  API Agent FAILED: ${(err as Error).message}`);
      }
    }

    // ── Agent 4: Flow ──
    if (shouldRun("flow")) {
      console.log(`\n--- FLOW AGENT ---`);
      try {
        const { results, bugs } = await runFlowAgent(page);
        flowResults = results;
        allBugs.push(...bugs);
        const passed = results.filter((r) => r.passed).length;
        const failed = results.filter((r) => !r.passed).length;
        console.log(`  ${passed} passed, ${failed} failed out of ${results.length} flows`);
      } catch (err) {
        console.error(`  Flow Agent FAILED: ${(err as Error).message}`);
      }
    }

    // ── Deduplicate & Score ──
    console.log(`\n--- DEDUPLICATION ---`);
    const beforeCount = allBugs.length;
    const dedupedBugs = deduplicateBugs(allBugs);
    console.log(`  ${beforeCount} raw bugs → ${dedupedBugs.length} after dedup`);

    // Sort by severity then confidence
    const severityOrder: Record<string, number> = { critical: 0, major: 1, minor: 2, cosmetic: 3 };
    dedupedBugs.sort((a, b) => {
      const sev = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
      if (sev !== 0) return sev;
      return b.confidence - a.confidence;
    });

    // ── Build Report ──
    const duration = Date.now() - startTime;
    const bySeverity: Record<BugSeverity, number> = { critical: 0, major: 0, minor: 0, cosmetic: 0 };
    const byAgent: Record<string, number> = {};
    const byRoute: Record<string, number> = {};

    for (const bug of dedupedBugs) {
      bySeverity[bug.severity]++;
      byAgent[bug.foundBy] = (byAgent[bug.foundBy] || 0) + 1;
      byRoute[bug.route] = (byRoute[bug.route] || 0) + 1;
    }

    const agents: AgentName[] = [];
    if (shouldRun("visual")) agents.push("visual");
    if (shouldRun("logic")) agents.push("logic");
    if (shouldRun("api")) agents.push("api");
    if (shouldRun("flow")) agents.push("flow");

    const report: QAReport = {
      meta: {
        timestamp: new Date().toISOString(),
        duration,
        agents,
        appVersion: "trendsmart-1.0",
      },
      bugs: dedupedBugs,
      apiResults,
      flowResults,
      summary: {
        totalBugs: dedupedBugs.length,
        bySeverity,
        byAgent,
        byRoute,
        apiTestsPassed: apiResults.filter((r) => r.passed).length,
        apiTestsFailed: apiResults.filter((r) => !r.passed).length,
        flowTestsPassed: flowResults.filter((r) => r.passed).length,
        flowTestsFailed: flowResults.filter((r) => !r.passed).length,
        avgConfidence:
          dedupedBugs.length > 0
            ? dedupedBugs.reduce((s, b) => s + b.confidence, 0) / dedupedBugs.length
            : 0,
      },
    };

    // ── Save Everything ──
    const output = saveQAReport(report);

    // ── Print Summary ──
    console.log(`\n${"=".repeat(60)}`);
    console.log(`  QA RUN COMPLETE`);
    console.log(`${"=".repeat(60)}`);
    console.log(`  Duration:     ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Total Bugs:   ${dedupedBugs.length}`);
    console.log(`  - Critical:   ${bySeverity.critical}`);
    console.log(`  - Major:      ${bySeverity.major}`);
    console.log(`  - Minor:      ${bySeverity.minor}`);
    console.log(`  - Cosmetic:   ${bySeverity.cosmetic}`);
    console.log(`  API Tests:    ${report.summary.apiTestsPassed}/${apiResults.length} passed`);
    console.log(`  Flow Tests:   ${report.summary.flowTestsPassed}/${flowResults.length} passed`);
    console.log(`  Avg Confidence: ${report.summary.avgConfidence.toFixed(0)}%`);
    console.log(``);
    console.log(`  Outputs:`);
    console.log(`    Report:     ${output.reportPath}`);
    console.log(`    Dashboard:  ${output.dashboardPath}`);
    console.log(`    CSV:        ${output.csvPath}`);
    console.log(`    Issues:     ${output.issuesDir}/ (${output.issueCount} files)`);
    console.log(`${"=".repeat(60)}\n`);

    // Assertions
    expect(report).toBeDefined();
    expect(report.bugs).toBeDefined();
  });
});
