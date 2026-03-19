/**
 * TrendSmart QA — Extended Types
 *
 * Adds types for logic testing, API testing, user flow testing,
 * and GitHub-issue-ready bug reports on top of the visual audit types.
 */

// ── Re-export all visual audit types ──────────────────────────────
export * from "./types";

// ── Agent Identity ────────────────────────────────────────────────

export type AgentName =
  | "visual"           // DOM inspection, contrast, overlap, accessibility
  | "logic"            // Business rule validation, data integrity, state
  | "api"              // API contract testing, validation, error handling
  | "flow"             // User journey simulation, navigation, forms
  | "second-opinion";  // Cross-validates findings from other agents

// ── Bug Report (GitHub-issue-ready) ───────────────────────────────

export type BugSeverity = "critical" | "major" | "minor" | "cosmetic";

export interface BugReport {
  /** Unique bug ID */
  id: string;
  /** GitHub issue title (< 80 chars) */
  title: string;
  /** Which agent found this */
  foundBy: AgentName;
  /** Bug severity */
  severity: BugSeverity;
  /** Category tag for labeling */
  labels: string[];
  /** Markdown body for GitHub issue */
  body: string;
  /** Steps to reproduce */
  stepsToReproduce: string[];
  /** What was expected */
  expected: string;
  /** What actually happened */
  actual: string;
  /** Affected route */
  route: string;
  /** Viewport if relevant */
  viewport?: { width: number; height: number };
  /** Screenshot path if available */
  screenshotPath?: string;
  /** Suggested fix */
  suggestedFix: string;
  /** Related code file (best guess) */
  relatedFile?: string;
  /** Confidence that this is a real bug (0-100) */
  confidence: number;
}

// ── API Test Types ────────────────────────────────────────────────

export interface APITestCase {
  /** Endpoint path */
  endpoint: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request body (for POST/PUT/PATCH) */
  body?: Record<string, unknown>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Query params */
  query?: Record<string, string>;
  /** Expected HTTP status */
  expectedStatus: number;
  /** Validation function name */
  validation: string;
  /** Description of what this tests */
  description: string;
}

export interface APITestResult {
  testCase: APITestCase;
  passed: boolean;
  actualStatus: number;
  responseBody: unknown;
  duration: number;
  error?: string;
}

// ── Flow Test Types ───────────────────────────────────────────────

export interface FlowStep {
  action: "navigate" | "click" | "type" | "select" | "wait" | "assert" | "screenshot";
  target?: string;   // selector or URL
  value?: string;    // text to type, option to select, assertion
  description: string;
}

export interface UserFlow {
  name: string;
  description: string;
  steps: FlowStep[];
  /** Expected final state description */
  expectedOutcome: string;
}

export interface FlowTestResult {
  flow: UserFlow;
  passed: boolean;
  failedAtStep?: number;
  error?: string;
  duration: number;
  screenshotPath?: string;
}

// ── Full QA Report ────────────────────────────────────────────────

export interface QAReport {
  meta: {
    timestamp: string;
    duration: number;
    agents: AgentName[];
    appVersion: string;
  };
  /** All bugs found across all agents */
  bugs: BugReport[];
  /** API test results */
  apiResults: APITestResult[];
  /** Flow test results */
  flowResults: FlowTestResult[];
  /** Summary statistics */
  summary: {
    totalBugs: number;
    bySeverity: Record<BugSeverity, number>;
    byAgent: Record<string, number>;
    byRoute: Record<string, number>;
    apiTestsPassed: number;
    apiTestsFailed: number;
    flowTestsPassed: number;
    flowTestsFailed: number;
    /** Average confidence across all bugs */
    avgConfidence: number;
  };
}
