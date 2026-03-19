/**
 * TrendSmart QA — Multi-Agent Test Runner v2
 *
 * Orchestrates 12 specialized agents:
 *
 *   npm run qa              # Quick (4 pages, all agents)
 *   npm run qa:full         # Full (28 pages, all agents)
 *   npm run qa:visual       # Visual agent only
 *   npm run qa:api          # API agent only
 *   npm run qa:flow         # Flow agent only
 *   npm run qa:logic        # Logic agent only
 *   npm run qa:perf         # Performance agent only
 *   npm run qa:security     # Security agent only
 *   npm run qa:seo          # SEO agent only
 *   npm run qa:data         # Data integrity agent only
 *   npm run qa:regression   # Regression agent only
 *   npm run qa:state        # State agent only
 *   npm run qa:a11y         # Accessibility agent only
 *   npm run qa:network      # Network resilience agent only
 *
 * Outputs:  docs/gui-audit/
 *   qa-report.json          Full machine-readable report
 *   qa-dashboard.md         Human-readable summary
 *   bugs.csv                Spreadsheet triage
 *   issues/*.md             GitHub-issue-ready bug reports
 *   baselines/              Screenshot baselines (regression agent)
 *   trend-history.json      Run-over-run comparison
 */

import { test, expect } from "@playwright/test";
import { extractPageSnapshot } from "./page-extractor";
import { runConsistencyChecks, resetIssueCounter } from "./consistency-checker";
import { getSecondOpinion, resetSopCounter } from "./second-opinion";
import { runLogicAgent, resetLogicCounter } from "./agent-logic";
import { runApiAgent, resetApiCounter } from "./agent-api";
import { runFlowAgent, resetFlowCounter } from "./agent-flow";
import { runPerformanceAgent, resetPerfCounter } from "./agent-performance";
import { runSecurityAgent, resetSecurityCounter } from "./agent-security";
import { runDataIntegrityAgent, resetDataCounter } from "./agent-data-integrity";
import { runSeoAgent, resetSeoCounter } from "./agent-seo";
import { runRegressionAgent, resetRegressionCounter } from "./agent-regression";
import { runStateAgent, resetStateCounter } from "./agent-state";
import { runAccessibilityAgent, resetA11yCounter } from "./agent-accessibility";
import { runNetworkAgent, resetNetworkCounter } from "./agent-network";
import { deduplicateBugs, saveQAReport } from "./bug-reporter";
import { trackRun, formatTrendReport } from "./trend-tracker";
import type {
  BugReport,
  QAReport,
  BugSeverity,
  AgentName,
  APITestResult,
  FlowTestResult,
  PerformanceMetrics,
  SecurityTestResult,
  DataIntegrityCheck,
  SEOAudit,
  RegressionResult,
  StateCheck,
} from "./agent-types";

// ── Config ────────────────────────────────────────────────────────

const MODE = process.env.QA_MODE || "quick";
const AGENT_FILTER = process.env.QA_AGENT || "all";
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

function shouldRun(agent: AgentName | "accessibility" | "network"): boolean {
  if (AGENT_FILTER === "all") return true;
  if (AGENT_FILTER === "a11y") return agent === "accessibility";
  return AGENT_FILTER === agent;
}

// ── Visual → BugReport converter ──────────────────────────────────

function convertVisualToBugs(
  issues: Array<{
    id: string; category: string; severity: string; message: string;
    route: string; colorScheme: string; suggestion: string; wcagRef?: string;
    elements: Array<{ selector: string; tag: string; text: string; rect: { x: number; y: number; width: number; height: number } }>;
  }>
): BugReport[] {
  return issues.map((issue) => ({
    id: `VIS-${issue.id}`,
    title: `[${issue.category.toUpperCase()}] ${issue.message.substring(0, 70)}`,
    foundBy: "visual" as AgentName,
    severity: issue.severity as BugSeverity,
    labels: ["bug", "visual", issue.category, `severity:${issue.severity}`],
    body: `## Visual Issue\n**Category:** ${issue.category}\n**Route:** \`${issue.route}\` (${issue.colorScheme})\n\n${issue.message}\n\n**Fix:** ${issue.suggestion}`,
    stepsToReproduce: [
      `Navigate to ${issue.route}`,
      `Set color scheme to ${issue.colorScheme}`,
      `Locate: ${issue.elements[0]?.selector || "see description"}`,
    ],
    expected: `No ${issue.category} issues`,
    actual: issue.message,
    route: issue.route,
    suggestedFix: issue.suggestion,
    confidence: issue.severity === "critical" ? 90 : issue.severity === "major" ? 80 : 65,
  }));
}

// ── Main Test ─────────────────────────────────────────────────────

test.describe("TrendSmart QA — Multi-Agent Runner v2", () => {
  test.setTimeout(900_000); // 15 min for full run with all agents

  test("run all QA agents and generate bug reports", async ({ page, request }) => {
    const startTime = Date.now();
    const routes = getRoutes();
    const allBugs: BugReport[] = [];

    // Results from each agent
    let apiResults: APITestResult[] = [];
    let flowResults: FlowTestResult[] = [];
    let perfMetrics: PerformanceMetrics[] = [];
    let securityResults: SecurityTestResult[] = [];
    let dataChecks: DataIntegrityCheck[] = [];
    let seoAudits: SEOAudit[] = [];
    let regressionResults: RegressionResult[] = [];
    let stateChecks: StateCheck[] = [];

    // Reset all counters
    resetIssueCounter(); resetSopCounter(); resetLogicCounter();
    resetApiCounter(); resetFlowCounter(); resetPerfCounter();
    resetSecurityCounter(); resetDataCounter(); resetSeoCounter();
    resetRegressionCounter(); resetStateCounter();
    resetA11yCounter(); resetNetworkCounter();

    const agents: AgentName[] = [];

    console.log(`\n${"=".repeat(65)}`);
    console.log(`  TrendSmart QA v2 — Multi-Agent Test Run`);
    console.log(`  Mode: ${MODE} | Filter: ${AGENT_FILTER} | Pages: ${routes.length}`);
    console.log(`${"=".repeat(65)}\n`);

    // ── 1. Visual Agent ──
    if (shouldRun("visual")) {
      agents.push("visual");
      console.log(`\n--- [1/12] VISUAL AGENT ---`);
      for (const route of routes) {
        for (const scheme of ["light", "dark"] as const) {
          try {
            console.log(`  [Visual] ${route} (${scheme})`);
            const snapshot = await extractPageSnapshot(page, route, scheme);
            const issues = runConsistencyChecks(snapshot);

            if (issues.length > 0) {
              const sop = getSecondOpinion({ issues, snapshot });
              const disputed = new Set(sop.disputed);
              const confirmed = issues.filter((i) => !disputed.has(i.id));
              allBugs.push(...convertVisualToBugs(confirmed));
              allBugs.push(...convertVisualToBugs(sop.additional));
              console.log(`    ${confirmed.length} confirmed, ${sop.disputed.length} disputed`);
            }
          } catch (err) {
            console.error(`    FAILED: ${(err as Error).message}`);
          }
        }
      }
    }

    // ── 2. Logic Agent ──
    if (shouldRun("logic")) {
      agents.push("logic");
      console.log(`\n--- [2/12] LOGIC AGENT ---`);
      for (const route of routes) {
        try {
          console.log(`  [Logic] ${route}`);
          const bugs = await runLogicAgent(page, route);
          allBugs.push(...bugs);
          if (bugs.length > 0) console.log(`    Found ${bugs.length} issue(s)`);
        } catch (err) {
          console.error(`    FAILED: ${(err as Error).message}`);
        }
      }
    }

    // ── 3. API Agent ──
    if (shouldRun("api")) {
      agents.push("api");
      console.log(`\n--- [3/12] API AGENT ---`);
      try {
        const { results, bugs } = await runApiAgent(request);
        apiResults = results;
        allBugs.push(...bugs);
        const p = results.filter((r) => r.passed).length;
        const f = results.filter((r) => !r.passed).length;
        console.log(`  ${p} passed, ${f} failed out of ${results.length} tests`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 4. Flow Agent ──
    if (shouldRun("flow")) {
      agents.push("flow");
      console.log(`\n--- [4/12] FLOW AGENT ---`);
      try {
        const { results, bugs } = await runFlowAgent(page);
        flowResults = results;
        allBugs.push(...bugs);
        const p = results.filter((r) => r.passed).length;
        const f = results.filter((r) => !r.passed).length;
        console.log(`  ${p} passed, ${f} failed out of ${results.length} flows`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 5. Performance Agent ──
    if (shouldRun("performance")) {
      agents.push("performance");
      console.log(`\n--- [5/12] PERFORMANCE AGENT ---`);
      try {
        const { metrics, bugs } = await runPerformanceAgent(page, routes);
        perfMetrics = metrics;
        allBugs.push(...bugs);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 6. Security Agent ──
    if (shouldRun("security")) {
      agents.push("security");
      console.log(`\n--- [6/12] SECURITY AGENT ---`);
      try {
        const { results, bugs } = await runSecurityAgent(page, request);
        securityResults = results;
        allBugs.push(...bugs);
        const p = results.filter((r) => r.passed).length;
        const f = results.filter((r) => !r.passed).length;
        console.log(`  ${p} passed, ${f} failed out of ${results.length} checks`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 7. Data Integrity Agent ──
    if (shouldRun("data-integrity")) {
      agents.push("data-integrity");
      console.log(`\n--- [7/12] DATA INTEGRITY AGENT ---`);
      try {
        const { checks, bugs } = await runDataIntegrityAgent(request);
        dataChecks = checks;
        allBugs.push(...bugs);
        const p = checks.filter((c) => c.passed).length;
        const f = checks.filter((c) => !c.passed).length;
        console.log(`  ${p} passed, ${f} failed out of ${checks.length} checks`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 8. SEO Agent ──
    if (shouldRun("seo")) {
      agents.push("seo");
      console.log(`\n--- [8/12] SEO AGENT ---`);
      try {
        const { audits, bugs } = await runSeoAgent(page, routes);
        seoAudits = audits;
        allBugs.push(...bugs);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 9. Regression Agent ──
    if (shouldRun("regression")) {
      agents.push("regression");
      console.log(`\n--- [9/12] REGRESSION AGENT ---`);
      try {
        const { results, bugs } = await runRegressionAgent(page, routes);
        regressionResults = results;
        allBugs.push(...bugs);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 10. State Agent ──
    if (shouldRun("state")) {
      agents.push("state");
      console.log(`\n--- [10/12] STATE AGENT ---`);
      try {
        const { checks, bugs } = await runStateAgent(page);
        stateChecks = checks;
        allBugs.push(...bugs);
        const p = checks.filter((c) => c.passed).length;
        const f = checks.filter((c) => !c.passed).length;
        console.log(`  ${p} passed, ${f} failed out of ${checks.length} checks`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 11. Accessibility Agent ──
    if (shouldRun("accessibility")) {
      agents.push("visual"); // Reports under visual
      console.log(`\n--- [11/12] ACCESSIBILITY AGENT ---`);
      try {
        const bugs = await runAccessibilityAgent(page, routes);
        allBugs.push(...bugs);
        console.log(`  Found ${bugs.length} accessibility issue(s)`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── 12. Network Resilience Agent ──
    if (shouldRun("network")) {
      agents.push("flow"); // Reports under flow
      console.log(`\n--- [12/12] NETWORK RESILIENCE AGENT ---`);
      try {
        const bugs = await runNetworkAgent(page, routes);
        allBugs.push(...bugs);
        console.log(`  Found ${bugs.length} resilience issue(s)`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
      }
    }

    // ── Deduplicate ──
    console.log(`\n--- DEDUPLICATION ---`);
    const rawCount = allBugs.length;
    const dedupedBugs = deduplicateBugs(allBugs);
    console.log(`  ${rawCount} raw → ${dedupedBugs.length} after dedup`);

    // Sort by severity then confidence
    const sevOrder: Record<string, number> = { critical: 0, major: 1, minor: 2, cosmetic: 3 };
    dedupedBugs.sort((a, b) => {
      const s = (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3);
      return s !== 0 ? s : b.confidence - a.confidence;
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

    // Scores
    const securityScore = securityResults.length > 0
      ? Math.round((securityResults.filter((r) => r.passed).length / securityResults.length) * 100)
      : undefined;

    const seoScore = seoAudits.length > 0
      ? Math.round(seoAudits.reduce((s, a) => s + a.semanticScore, 0) / seoAudits.length)
      : undefined;

    const perfScore = perfMetrics.length > 0
      ? Math.round(
          perfMetrics.reduce((s, m) => {
            let score = 100;
            if (m.lcp > 2500) score -= 30;
            else if (m.lcp > 1800) score -= 15;
            if (m.cls > 0.1) score -= 25;
            if (m.tbt > 200) score -= 20;
            if (m.fcp > 1800) score -= 10;
            return s + Math.max(0, score);
          }, 0) / perfMetrics.length
        )
      : undefined;

    const report: QAReport = {
      meta: { timestamp: new Date().toISOString(), duration, agents, appVersion: "listblitz-1.0" },
      bugs: dedupedBugs,
      apiResults,
      flowResults,
      performanceMetrics: perfMetrics.length > 0 ? perfMetrics : undefined,
      securityResults: securityResults.length > 0 ? securityResults : undefined,
      dataIntegrityResults: dataChecks.length > 0 ? dataChecks : undefined,
      seoAudits: seoAudits.length > 0 ? seoAudits : undefined,
      regressionResults: regressionResults.length > 0 ? regressionResults : undefined,
      stateResults: stateChecks.length > 0 ? stateChecks : undefined,
      summary: {
        totalBugs: dedupedBugs.length,
        bySeverity, byAgent, byRoute,
        apiTestsPassed: apiResults.filter((r) => r.passed).length,
        apiTestsFailed: apiResults.filter((r) => !r.passed).length,
        flowTestsPassed: flowResults.filter((r) => r.passed).length,
        flowTestsFailed: flowResults.filter((r) => !r.passed).length,
        avgConfidence: dedupedBugs.length > 0
          ? dedupedBugs.reduce((s, b) => s + b.confidence, 0) / dedupedBugs.length : 0,
        performanceScore: perfScore,
        securityScore,
        seoScore,
      },
    };

    // ── Save ──
    const output = saveQAReport(report);

    // ── Trend Tracking ──
    console.log(`\n--- TREND ANALYSIS ---`);
    const trend = trackRun(report);
    report.trendReport = trend;
    const trendText = formatTrendReport(trend);
    console.log(trendText);

    // ── Print Summary ──
    console.log(`\n${"=".repeat(65)}`);
    console.log(`  QA v2 RUN COMPLETE`);
    console.log(`${"=".repeat(65)}`);
    console.log(`  Duration:       ${(duration / 1000).toFixed(1)}s`);
    console.log(`  Agents:         ${agents.length}/12 (${agents.join(", ")})`);
    console.log(`  Total Bugs:     ${dedupedBugs.length}`);
    console.log(`  - Critical:     ${bySeverity.critical}`);
    console.log(`  - Major:        ${bySeverity.major}`);
    console.log(`  - Minor:        ${bySeverity.minor}`);
    console.log(`  - Cosmetic:     ${bySeverity.cosmetic}`);
    if (apiResults.length > 0)
      console.log(`  API Tests:      ${report.summary.apiTestsPassed}/${apiResults.length} passed`);
    if (flowResults.length > 0)
      console.log(`  Flow Tests:     ${report.summary.flowTestsPassed}/${flowResults.length} passed`);
    if (perfScore !== undefined)
      console.log(`  Perf Score:     ${perfScore}/100`);
    if (securityScore !== undefined)
      console.log(`  Security Score: ${securityScore}/100`);
    if (seoScore !== undefined)
      console.log(`  SEO Score:      ${seoScore}/100`);
    if (regressionResults.length > 0) {
      const regPassed = regressionResults.filter((r) => r.passed).length;
      console.log(`  Regressions:    ${regressionResults.length - regPassed} detected`);
    }
    if (stateChecks.length > 0) {
      const statePassed = stateChecks.filter((c) => c.passed).length;
      console.log(`  State Checks:   ${statePassed}/${stateChecks.length} passed`);
    }
    console.log(`  Confidence:     ${report.summary.avgConfidence.toFixed(0)}%`);
    console.log(``);
    console.log(`  Outputs:`);
    console.log(`    Report:       ${output.reportPath}`);
    console.log(`    Dashboard:    ${output.dashboardPath}`);
    console.log(`    CSV:          ${output.csvPath}`);
    console.log(`    Issues:       ${output.issuesDir}/ (${output.issueCount} files)`);
    console.log(`${"=".repeat(65)}\n`);

    expect(report).toBeDefined();
    expect(report.bugs).toBeDefined();
  });
});
