/**
 * GUI Audit System — Public API
 *
 * Usage:
 *   import { runGUIAudit, QUICK_CONFIG } from "./tests/gui-audit";
 *
 * Or run directly with Playwright:
 *   npx playwright test --project=gui-audit
 *   AUDIT_MODE=full npx playwright test --project=gui-audit
 *   AUDIT_MODE=single AUDIT_ROUTE=/settings npx playwright test --project=gui-audit
 */

export { runGUIAudit, DEFAULT_CONFIG, QUICK_CONFIG, ALL_ROUTES } from "./orchestrator";
export type { AuditConfig } from "./orchestrator";

export { extractPageSnapshot, extractElements, setColorScheme } from "./page-extractor";

export { runConsistencyChecks, resetIssueCounter } from "./consistency-checker";

export { getSecondOpinion, resetSopCounter } from "./second-opinion";

export {
  generateTestCases,
  generateTestPlan,
  formatTestPlanSummary,
} from "./test-case-generator";

export type {
  PageSnapshot,
  ElementInfo,
  AuditIssue,
  AuditReport,
  SecondOpinionRequest,
  SecondOpinionResult,
  ManualTestCase,
  TestPlan,
  TestCasePriority,
  IssueSeverity,
  IssueCategory,
} from "./types";
