/**
 * TrendSmart QA — Extended Types (v2)
 *
 * Extends the type system to support 10 specialized agents:
 *   visual, logic, api, flow, performance, security,
 *   data-integrity, seo, regression, state
 */

// ── Re-export all visual audit types ──────────────────────────────
export * from "./types";

// ── Agent Identity ────────────────────────────────────────────────

export type AgentName =
  | "visual"           // DOM inspection, contrast, overlap, accessibility
  | "logic"            // Business rule validation, data integrity, state
  | "api"              // API contract testing, validation, error handling
  | "flow"             // User journey simulation, navigation, forms
  | "performance"      // Core Web Vitals, load times, memory, bundle
  | "security"         // OWASP Top 10, auth bypass, CSRF, XSS, headers
  | "data-integrity"   // Cross-endpoint consistency, response shapes, DB
  | "seo"              // Meta tags, OG, heading hierarchy, semantic HTML
  | "regression"       // Screenshot baseline diffing, pixel comparison
  | "state"            // localStorage, SWR cache, theme, navigation state
  | "second-opinion";  // Cross-validates findings from other agents

// ── Bug Report (GitHub-issue-ready) ───────────────────────────────

export type BugSeverity = "critical" | "major" | "minor" | "cosmetic";

export interface BugReport {
  id: string;
  title: string;
  foundBy: AgentName;
  severity: BugSeverity;
  labels: string[];
  body: string;
  stepsToReproduce: string[];
  expected: string;
  actual: string;
  route: string;
  viewport?: { width: number; height: number };
  screenshotPath?: string;
  suggestedFix: string;
  relatedFile?: string;
  confidence: number;
}

// ── API Test Types ────────────────────────────────────────────────

export interface APITestCase {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  expectedStatus: number;
  validation: string;
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
  target?: string;
  value?: string;
  description: string;
}

export interface UserFlow {
  name: string;
  description: string;
  steps: FlowStep[];
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

// ── Performance Types ─────────────────────────────────────────────

export interface PerformanceMetrics {
  route: string;
  /** Time to first byte (ms) */
  ttfb: number;
  /** First contentful paint (ms) */
  fcp: number;
  /** Largest contentful paint (ms) */
  lcp: number;
  /** Cumulative layout shift */
  cls: number;
  /** Total blocking time (ms) */
  tbt: number;
  /** DOM content loaded (ms) */
  domContentLoaded: number;
  /** Full page load (ms) */
  fullLoad: number;
  /** DOM node count */
  domNodes: number;
  /** Total JS heap size (bytes) */
  jsHeapSize: number;
  /** Number of network requests */
  requestCount: number;
  /** Total transfer size (bytes) */
  transferSize: number;
  /** Timestamp */
  timestamp: string;
}

export interface PerformanceBudget {
  ttfb: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  domNodes: number;
  transferSize: number;
}

// ── Security Types ────────────────────────────────────────────────

export type SecurityCheckName =
  | "xss-reflected"
  | "xss-stored"
  | "sql-injection"
  | "auth-bypass"
  | "csrf"
  | "security-headers"
  | "cookie-security"
  | "path-traversal"
  | "open-redirect"
  | "info-disclosure"
  | "rate-limiting"
  | "session-fixation";

export interface SecurityTestResult {
  check: SecurityCheckName;
  target: string;
  passed: boolean;
  severity: BugSeverity;
  details: string;
  evidence?: string;
}

// ── Data Integrity Types ──────────────────────────────────────────

export interface DataIntegrityCheck {
  name: string;
  description: string;
  passed: boolean;
  details: string;
  affectedEndpoints: string[];
}

// ── SEO Types ─────────────────────────────────────────────────────

export interface SEOAudit {
  route: string;
  hasTitle: boolean;
  titleLength: number;
  hasMetaDescription: boolean;
  descriptionLength: number;
  hasCanonical: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  h1Count: number;
  headingOrder: boolean;
  imgsMissingAlt: number;
  totalImages: number;
  hasLangAttr: boolean;
  semanticScore: number;
  issues: string[];
}

// ── Regression Types ──────────────────────────────────────────────

export interface ScreenshotBaseline {
  route: string;
  viewport: { width: number; height: number };
  colorScheme: "light" | "dark";
  baselinePath: string;
  timestamp: string;
}

export interface RegressionResult {
  route: string;
  viewport: { width: number; height: number };
  colorScheme: "light" | "dark";
  diffPercentage: number;
  passed: boolean;
  /** threshold was this */
  threshold: number;
  baselinePath: string;
  currentPath: string;
  diffPath?: string;
}

// ── State Types ───────────────────────────────────────────────────

export interface StateCheck {
  name: string;
  description: string;
  passed: boolean;
  before: string;
  after: string;
  details: string;
}

// ── Trend Types ───────────────────────────────────────────────────

export interface TrendEntry {
  timestamp: string;
  totalBugs: number;
  bySeverity: Record<BugSeverity, number>;
  byAgent: Record<string, number>;
  apiTestsPassed: number;
  apiTestsTotal: number;
  flowTestsPassed: number;
  flowTestsTotal: number;
  performanceAvgLcp: number;
  securityIssues: number;
}

export interface TrendReport {
  entries: TrendEntry[];
  direction: "improving" | "degrading" | "stable";
  regressions: string[];
  improvements: string[];
}

// ── Full QA Report (v2) ──────────────────────────────────────────

export interface QAReport {
  meta: {
    timestamp: string;
    duration: number;
    agents: AgentName[];
    appVersion: string;
  };
  bugs: BugReport[];
  apiResults: APITestResult[];
  flowResults: FlowTestResult[];
  performanceMetrics?: PerformanceMetrics[];
  securityResults?: SecurityTestResult[];
  dataIntegrityResults?: DataIntegrityCheck[];
  seoAudits?: SEOAudit[];
  regressionResults?: RegressionResult[];
  stateResults?: StateCheck[];
  trendReport?: TrendReport;
  summary: {
    totalBugs: number;
    bySeverity: Record<BugSeverity, number>;
    byAgent: Record<string, number>;
    byRoute: Record<string, number>;
    apiTestsPassed: number;
    apiTestsFailed: number;
    flowTestsPassed: number;
    flowTestsFailed: number;
    avgConfidence: number;
    performanceScore?: number;
    securityScore?: number;
    seoScore?: number;
  };
}
