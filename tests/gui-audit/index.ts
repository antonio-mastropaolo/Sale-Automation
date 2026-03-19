/**
 * TrendSmart QA System — Public API
 *
 * Run the full QA suite:
 *   npm run qa          # Quick (4 pages, all agents)
 *   npm run qa:full     # Full (28 pages, all agents)
 *   npm run qa:visual   # Visual agent only
 *   npm run qa:api      # API agent only
 *   npm run qa:flow     # Flow agent only
 *   npm run qa:logic    # Logic agent only
 *
 * Outputs go to docs/gui-audit/:
 *   qa-dashboard.md     # Human-readable summary
 *   qa-report.json      # Machine-readable report
 *   bugs.csv            # Spreadsheet triage
 *   issues/*.md         # One GitHub-issue-ready file per bug
 */

// Visual agent
export { runGUIAudit, DEFAULT_CONFIG, QUICK_CONFIG, ALL_ROUTES } from "./orchestrator";
export type { AuditConfig } from "./orchestrator";
export { extractPageSnapshot, extractElements, setColorScheme } from "./page-extractor";
export { runConsistencyChecks, resetIssueCounter } from "./consistency-checker";
export { getSecondOpinion, resetSopCounter } from "./second-opinion";

// Logic agent
export { runLogicAgent, resetLogicCounter } from "./agent-logic";

// API agent
export { runApiAgent, resetApiCounter, getTestSuite } from "./agent-api";

// Flow agent
export { runFlowAgent, resetFlowCounter, getUserFlows } from "./agent-flow";

// Bug reporting
export { deduplicateBugs, saveQAReport } from "./bug-reporter";

// Test case generation
export { generateTestCases, generateTestPlan, formatTestPlanSummary } from "./test-case-generator";

// Types
export type * from "./types";
export type * from "./agent-types";
