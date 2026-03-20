/**
 * GUI Watch — Type System
 *
 * Structured type hierarchy for the record-analyze-replay pipeline.
 * Follows a Java-like pattern: clear interfaces, enums, and contracts.
 */

// ── Enums ────────────────────────────────────────────────────────

export enum ActionType {
  CLICK = "CLICK",
  TYPE = "TYPE",
  NAVIGATE = "NAVIGATE",
  SCROLL = "SCROLL",
  SELECT = "SELECT",
  HOVER = "HOVER",
  KEY_PRESS = "KEY_PRESS",
  DRAG = "DRAG",
  FILE_UPLOAD = "FILE_UPLOAD",
  WAIT = "WAIT",
}

export enum TestStatus {
  PASSED = "PASSED",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED",
  ERROR = "ERROR",
}

export enum Severity {
  CRITICAL = "CRITICAL",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
  INFO = "INFO",
}

export enum TestCategory {
  REPLAY = "REPLAY",
  VARIATION = "VARIATION",
  EDGE_CASE = "EDGE_CASE",
  PERFORMANCE = "PERFORMANCE",
  NEGATIVE = "NEGATIVE",
}

// ── Recording Types ──────────────────────────────────────────────

export interface RecordedAction {
  /** Sequential action index */
  index: number;
  /** What the user did */
  type: ActionType;
  /** CSS selector of the target element */
  selector: string;
  /** Human-readable description of the element */
  elementDescription: string;
  /** Value typed, key pressed, URL navigated, etc. */
  value: string;
  /** Timestamp relative to session start (ms) */
  timestamp: number;
  /** Page URL at the time of the action */
  url: string;
  /** Screenshot path captured at this action (optional) */
  screenshotPath?: string;
  /** Viewport size at this point */
  viewport: { width: number; height: number };
}

export interface PerformanceSnapshot {
  /** Route/URL */
  url: string;
  /** Timestamp relative to session start (ms) */
  timestamp: number;
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
  /** DOM node count */
  domNodes: number;
  /** JS heap size (bytes) */
  jsHeapSize: number;
  /** Number of network requests */
  requestCount: number;
  /** Total transfer size (bytes) */
  transferSize: number;
  /** Long tasks (tasks > 50ms) */
  longTasks: number;
}

export interface ConsoleEntry {
  /** Log level */
  level: "log" | "warn" | "error" | "info";
  /** Message text */
  text: string;
  /** Timestamp relative to session start (ms) */
  timestamp: number;
  /** URL where this was logged */
  url: string;
}

export interface NetworkEntry {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Response status */
  status: number;
  /** Duration in ms */
  duration: number;
  /** Response size in bytes */
  size: number;
  /** Content type */
  contentType: string;
  /** Timestamp relative to session start (ms) */
  timestamp: number;
  /** Whether this request failed */
  failed: boolean;
}

export interface RecordingSession {
  /** Unique session ID */
  id: string;
  /** Human-readable session name */
  name: string;
  /** When the session started */
  startedAt: string;
  /** When the session ended */
  endedAt: string;
  /** Total duration in ms */
  duration: number;
  /** Base URL of the app */
  baseUrl: string;
  /** All recorded user actions */
  actions: RecordedAction[];
  /** Performance snapshots taken at each navigation */
  performanceSnapshots: PerformanceSnapshot[];
  /** Console log entries */
  consoleEntries: ConsoleEntry[];
  /** Network requests */
  networkEntries: NetworkEntry[];
  /** Pages visited (unique URLs) */
  pagesVisited: string[];
  /** Browser viewport */
  viewport: { width: number; height: number };
}

// ── Test Case Types ──────────────────────────────────────────────

export interface TestStep {
  /** Step number */
  index: number;
  /** Action to perform */
  action: ActionType;
  /** Target selector */
  selector: string;
  /** Value to use */
  value: string;
  /** Human-readable description */
  description: string;
  /** Assertion to check after this step (optional) */
  assertion?: TestAssertion;
  /** Timeout for this step (ms) */
  timeout: number;
}

export interface TestAssertion {
  /** What to assert */
  type:
    | "URL_CONTAINS"
    | "ELEMENT_VISIBLE"
    | "ELEMENT_NOT_VISIBLE"
    | "TEXT_PRESENT"
    | "TEXT_NOT_PRESENT"
    | "ELEMENT_COUNT"
    | "NO_CONSOLE_ERRORS"
    | "PERFORMANCE_BUDGET"
    | "NETWORK_NO_FAILURES"
    | "RESPONSE_STATUS";
  /** Value to check against */
  expected: string;
  /** Selector for element-based assertions */
  selector?: string;
}

export interface TestCase {
  /** Unique test ID (e.g., TC-0001) */
  id: string;
  /** Test name */
  name: string;
  /** Category: REPLAY, VARIATION, EDGE_CASE, PERFORMANCE, NEGATIVE */
  category: TestCategory;
  /** Human-readable description */
  description: string;
  /** Source session ID that generated this test */
  sourceSessionId: string;
  /** Tags for filtering */
  tags: string[];
  /** Ordered steps */
  steps: TestStep[];
  /** Priority (lower = more important) */
  priority: number;
}

export interface TestSuite {
  /** Suite ID */
  id: string;
  /** Suite name */
  name: string;
  /** When the suite was generated */
  generatedAt: string;
  /** Source recording session */
  sourceSession: RecordingSession;
  /** All test cases in execution order */
  testCases: TestCase[];
  /** Summary counts */
  summary: {
    total: number;
    byCategory: Record<TestCategory, number>;
  };
}

// ── Test Result Types ────────────────────────────────────────────

export interface StepResult {
  /** Step index */
  index: number;
  /** Pass/fail/skip/error */
  status: TestStatus;
  /** Duration of this step (ms) */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Screenshot path if captured */
  screenshotPath?: string;
  /** Actual value (for assertion failures) */
  actualValue?: string;
}

export interface TestResult {
  /** Test case ID */
  testId: string;
  /** Test name */
  testName: string;
  /** Category */
  category: TestCategory;
  /** Overall status */
  status: TestStatus;
  /** Total duration (ms) */
  duration: number;
  /** Step-by-step results */
  stepResults: StepResult[];
  /** Failed at step index (if applicable) */
  failedAtStep?: number;
  /** Error message */
  error?: string;
  /** Screenshot on failure */
  screenshotPath?: string;
  /** Performance snapshot during this test */
  performanceSnapshot?: PerformanceSnapshot;
}

export interface SuiteResult {
  /** Suite ID */
  suiteId: string;
  /** Suite name */
  suiteName: string;
  /** When the run started */
  startedAt: string;
  /** When the run ended */
  endedAt: string;
  /** Total duration (ms) */
  duration: number;
  /** All test results */
  results: TestResult[];
  /** Summary */
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    errors: number;
    passRate: number;
    avgDuration: number;
    byCategory: Record<TestCategory, { total: number; passed: number; failed: number }>;
  };
  /** Performance overview */
  performanceSummary: {
    avgLcp: number;
    avgFcp: number;
    avgCls: number;
    avgTbt: number;
    slowestPage: string;
    slowestLcp: number;
  };
  /** Issues found */
  issues: TestIssue[];
}

export interface TestIssue {
  /** Issue ID */
  id: string;
  /** Severity */
  severity: Severity;
  /** Category */
  category: string;
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Related test ID */
  testId: string;
  /** Page/route where it was found */
  route: string;
  /** Suggested fix */
  suggestedFix: string;
  /** Screenshot path */
  screenshotPath?: string;
}

// ── Report Types ─────────────────────────────────────────────────

export interface ReportConfig {
  /** Output directory */
  outputDir: string;
  /** Title for the HTML report */
  title: string;
  /** Include screenshots in report */
  includeScreenshots: boolean;
  /** Include performance charts */
  includePerformanceCharts: boolean;
  /** Include network waterfall */
  includeNetworkDetails: boolean;
}
