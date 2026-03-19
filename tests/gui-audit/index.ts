/**
 * TrendSmart QA System v2 — Public API
 *
 * 10 specialized agents:
 *
 *   npm run qa              # Quick (4 pages, all agents)
 *   npm run qa:full         # Full (28 pages, all agents)
 *   npm run qa:visual       # Visual agent
 *   npm run qa:api          # API agent
 *   npm run qa:flow         # Flow agent
 *   npm run qa:logic        # Logic agent
 *   npm run qa:perf         # Performance agent
 *   npm run qa:security     # Security agent
 *   npm run qa:seo          # SEO agent
 *   npm run qa:data         # Data integrity agent
 *   npm run qa:regression   # Regression agent
 *   npm run qa:state        # State agent
 *   npm run qa:a11y         # Accessibility agent
 *   npm run qa:network      # Network resilience agent
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

// Performance agent
export { runPerformanceAgent, resetPerfCounter } from "./agent-performance";

// Security agent
export { runSecurityAgent, resetSecurityCounter } from "./agent-security";

// Data integrity agent
export { runDataIntegrityAgent, resetDataCounter } from "./agent-data-integrity";

// SEO agent
export { runSeoAgent, resetSeoCounter } from "./agent-seo";

// Regression agent
export { runRegressionAgent, resetRegressionCounter } from "./agent-regression";

// State agent
export { runStateAgent, resetStateCounter } from "./agent-state";

// Accessibility agent
export { runAccessibilityAgent, resetA11yCounter } from "./agent-accessibility";

// Network resilience agent
export { runNetworkAgent, resetNetworkCounter } from "./agent-network";

// Bug reporting
export { deduplicateBugs, saveQAReport } from "./bug-reporter";

// Trend tracking
export { trackRun, formatTrendReport } from "./trend-tracker";

// Test case generation
export { generateTestCases, generateTestPlan, formatTestPlanSummary } from "./test-case-generator";

// Types
export type * from "./types";
export type * from "./agent-types";
