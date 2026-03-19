/**
 * GUI Audit System — Core Types
 *
 * Defines all data structures used by the page extractor,
 * consistency checker, second-opinion agent, and test-case generator.
 */

// ── Page Element Catalog ──────────────────────────────────────────

export interface ElementInfo {
  /** CSS selector path to re-locate this element */
  selector: string;
  /** Tag name (button, input, div, etc.) */
  tag: string;
  /** Visible text content (truncated to 120 chars) */
  text: string;
  /** Bounding box in viewport coordinates */
  rect: { x: number; y: number; width: number; height: number };
  /** Computed foreground color as rgb tuple */
  fgColor: [number, number, number];
  /** Computed background color as rgb tuple */
  bgColor: [number, number, number];
  /** Font size in px */
  fontSize: number;
  /** Font weight (400 = normal, 700 = bold, etc.) */
  fontWeight: number;
  /** Whether the element is visually visible (not display:none, opacity>0, etc.) */
  visible: boolean;
  /** Whether the element is interactive (button, a, input, select, textarea) */
  interactive: boolean;
  /** aria-label or aria-labelledby resolved text, if any */
  ariaLabel: string;
  /** role attribute */
  role: string;
  /** z-index (auto → 0) */
  zIndex: number;
  /** opacity */
  opacity: number;
  /** overflow property */
  overflow: string;
}

// ── Page Snapshot ─────────────────────────────────────────────────

export interface PageSnapshot {
  /** Route path, e.g. "/" or "/settings" */
  route: string;
  /** Page <title> */
  title: string;
  /** Viewport dimensions used */
  viewport: { width: number; height: number };
  /** Light or dark mode */
  colorScheme: "light" | "dark";
  /** ISO timestamp when extraction happened */
  timestamp: string;
  /** All extracted elements */
  elements: ElementInfo[];
  /** Full-page screenshot as base64 PNG (stored separately) */
  screenshotPath: string;
  /** Total document height */
  documentHeight: number;
  /** Total document width */
  documentWidth: number;
}

// ── Inconsistency Findings ────────────────────────────────────────

export type IssueSeverity = "critical" | "major" | "minor" | "info";

export type IssueCategory =
  | "contrast"         // Text unreadable due to low contrast
  | "overlap"          // Two elements visually overlap
  | "truncation"       // Text is clipped / overflows its container
  | "tiny-text"        // Font size below minimum threshold
  | "tiny-target"      // Interactive element below touch-target size
  | "missing-label"    // Interactive element has no accessible label
  | "invisible-interactive" // Interactive element is not visible
  | "z-fighting"       // Multiple elements at same z-index overlap
  | "offscreen"        // Element partially or fully off-viewport
  | "empty-container"  // Visible container with no content
  | "color-clash"      // Foreground/background too similar
  | "responsive"       // Layout breaks at specific viewport
  | "orphan-text";     // Text outside any semantic container

export interface AuditIssue {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  /** Human-readable description */
  message: string;
  /** Elements involved */
  elements: Array<{
    selector: string;
    tag: string;
    text: string;
    rect: { x: number; y: number; width: number; height: number };
  }>;
  /** The page route where this was found */
  route: string;
  /** The color scheme when found */
  colorScheme: "light" | "dark";
  /** WCAG guideline reference, if applicable */
  wcagRef?: string;
  /** Suggested fix */
  suggestion: string;
}

// ── Second Opinion ────────────────────────────────────────────────

export interface SecondOpinionRequest {
  /** The original issues found by the first pass */
  issues: AuditIssue[];
  /** The page snapshot for context */
  snapshot: PageSnapshot;
}

export interface SecondOpinionResult {
  /** Issues the second agent agrees with */
  confirmed: string[];
  /** Issues the second agent disagrees with (false positives) */
  disputed: string[];
  /** New issues the second agent found that the first missed */
  additional: AuditIssue[];
  /** Overall confidence score 0-100 */
  confidence: number;
  /** Notes from the second agent */
  notes: string;
}

// ── Test Case Generation ──────────────────────────────────────────

export type TestCasePriority = "P0" | "P1" | "P2" | "P3";

export interface ManualTestCase {
  id: string;
  /** Short title */
  title: string;
  /** Which issue(s) this test verifies */
  relatedIssueIds: string[];
  /** Priority based on severity */
  priority: TestCasePriority;
  /** Step-by-step instructions for manual tester */
  steps: string[];
  /** What the tester should observe */
  expectedResult: string;
  /** Route to navigate to */
  route: string;
  /** Viewport to use */
  viewport: { width: number; height: number };
  /** Light or dark mode */
  colorScheme: "light" | "dark";
  /** Category tag */
  category: IssueCategory;
  /** Estimated time in minutes */
  estimatedMinutes: number;
}

export interface TestPlan {
  /** Total number of test cases */
  totalCases: number;
  /** Breakdown by priority */
  byPriority: Record<TestCasePriority, number>;
  /** Breakdown by category */
  byCategory: Record<string, number>;
  /** Breakdown by page */
  byPage: Record<string, number>;
  /** Estimated total time in minutes */
  estimatedTotalMinutes: number;
  /** All test cases */
  cases: ManualTestCase[];
}

// ── Audit Report ──────────────────────────────────────────────────

export interface AuditReport {
  meta: {
    timestamp: string;
    pagesAudited: number;
    viewports: Array<{ width: number; height: number }>;
    colorSchemes: Array<"light" | "dark">;
  };
  /** All page snapshots */
  snapshots: PageSnapshot[];
  /** All found issues */
  issues: AuditIssue[];
  /** Second opinion result, if requested */
  secondOpinion?: SecondOpinionResult;
  /** Generated test plan */
  testPlan: TestPlan;
}
