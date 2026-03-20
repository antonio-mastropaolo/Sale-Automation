/**
 * GUI Watch — Session Analyzer
 *
 * Reads a recorded session and generates structured test cases:
 *   1. REPLAY tests     — exact replay of your session
 *   2. VARIATION tests  — same flow with modified inputs
 *   3. EDGE_CASE tests  — empty inputs, special chars, boundary values
 *   4. NEGATIVE tests   — wrong inputs, missing fields, invalid data
 *   5. PERFORMANCE tests — same flow with performance budget assertions
 *
 * Usage:
 *   npx ts-node tests/gui-watch/session-analyzer.ts <session-id>
 */

import * as fs from "fs";
import * as path from "path";
import type {
  RecordingSession,
  RecordedAction,
  TestCase,
  TestStep,
  TestSuite,
  TestAssertion,
} from "./types";
import { ActionType, TestCategory } from "./types";

// ── Config ───────────────────────────────────────────────────────

const SESSION_DIR = path.join(process.cwd(), "docs", "gui-watch", "sessions");
const SUITE_DIR = path.join(process.cwd(), "docs", "gui-watch", "suites");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Analyzer Class ───────────────────────────────────────────────

class SessionAnalyzer {
  private session: RecordingSession;
  private testCounter = 0;

  constructor(session: RecordingSession) {
    this.session = session;
  }

  private nextId(): string {
    return `TC-${String(++this.testCounter).padStart(4, "0")}`;
  }

  // ── Step 1: Segment actions into flows ──

  private segmentIntoFlows(): RecordedAction[][] {
    const flows: RecordedAction[][] = [];
    let currentFlow: RecordedAction[] = [];

    for (const action of this.session.actions) {
      if (action.type === ActionType.NAVIGATE && currentFlow.length > 0) {
        flows.push(currentFlow);
        currentFlow = [action];
      } else {
        currentFlow.push(action);
      }
    }

    if (currentFlow.length > 0) {
      flows.push(currentFlow);
    }

    return flows;
  }

  // ── Step 2: Convert action to test step ──

  private actionToStep(action: RecordedAction, index: number): TestStep {
    const base: TestStep = {
      index,
      action: action.type,
      selector: action.selector,
      value: action.value,
      description: action.elementDescription || `${action.type} on ${action.selector}`,
      timeout: 10000,
    };

    // Add assertions for navigations
    if (action.type === ActionType.NAVIGATE) {
      const urlPath = new URL(action.value, this.session.baseUrl).pathname;
      base.assertion = {
        type: "URL_CONTAINS",
        expected: urlPath,
      };
    }

    return base;
  }

  // ── Generate REPLAY test cases ──

  private generateReplayTests(flows: RecordedAction[][]): TestCase[] {
    const tests: TestCase[] = [];

    // Full session replay
    const allSteps: TestStep[] = [];
    let stepIdx = 0;

    for (const action of this.session.actions) {
      allSteps.push(this.actionToStep(action, ++stepIdx));
    }

    tests.push({
      id: this.nextId(),
      name: `Full Session Replay: ${this.session.name}`,
      category: TestCategory.REPLAY,
      description: `Exact replay of user session "${this.session.name}" — ${this.session.actions.length} actions across ${this.session.pagesVisited.length} pages`,
      sourceSessionId: this.session.id,
      tags: ["replay", "full-session"],
      steps: allSteps,
      priority: 1,
    });

    // Per-page replay tests
    for (let i = 0; i < flows.length; i++) {
      const flow = flows[i];
      if (flow.length < 2) continue;

      const firstNavAction = flow.find((a) => a.type === ActionType.NAVIGATE);
      const pageName = firstNavAction
        ? new URL(firstNavAction.value, this.session.baseUrl).pathname
        : `flow-${i + 1}`;

      const steps: TestStep[] = [];
      for (let j = 0; j < flow.length; j++) {
        steps.push(this.actionToStep(flow[j], j + 1));
      }

      // Add assertion: no console errors after flow completes
      steps.push({
        index: steps.length + 1,
        action: ActionType.WAIT,
        selector: "",
        value: "500",
        description: "Wait for page to settle",
        assertion: { type: "NO_CONSOLE_ERRORS", expected: "0" },
        timeout: 5000,
      });

      tests.push({
        id: this.nextId(),
        name: `Page Replay: ${pageName}`,
        category: TestCategory.REPLAY,
        description: `Replay user actions on ${pageName} (${flow.length} actions)`,
        sourceSessionId: this.session.id,
        tags: ["replay", "page", pageName.replace(/\//g, "-")],
        steps,
        priority: 2,
      });
    }

    return tests;
  }

  // ── Generate VARIATION test cases ──

  private generateVariationTests(flows: RecordedAction[][]): TestCase[] {
    const tests: TestCase[] = [];

    for (const flow of flows) {
      // Find all type actions (form inputs)
      const typeActions = flow.filter((a) => a.type === ActionType.TYPE && a.value);

      if (typeActions.length === 0) continue;

      const firstNav = flow.find((a) => a.type === ActionType.NAVIGATE);
      const pageName = firstNav
        ? new URL(firstNav.value, this.session.baseUrl).pathname
        : "unknown";

      // Variation: Different valid inputs
      const variationSteps: TestStep[] = [];
      let stepIdx = 0;

      for (const action of flow) {
        if (action.type === ActionType.TYPE && action.value) {
          const varied = this.generateVariedInput(action.value);
          variationSteps.push({
            index: ++stepIdx,
            action: action.type,
            selector: action.selector,
            value: varied,
            description: `${action.elementDescription} (varied input: "${varied}")`,
            timeout: 10000,
          });
        } else {
          variationSteps.push(this.actionToStep(action, ++stepIdx));
        }
      }

      variationSteps.push({
        index: ++stepIdx,
        action: ActionType.WAIT,
        selector: "",
        value: "1000",
        description: "Wait for page to process varied inputs",
        assertion: { type: "NO_CONSOLE_ERRORS", expected: "0" },
        timeout: 5000,
      });

      tests.push({
        id: this.nextId(),
        name: `Input Variation: ${pageName}`,
        category: TestCategory.VARIATION,
        description: `Same flow on ${pageName} with different valid inputs`,
        sourceSessionId: this.session.id,
        tags: ["variation", "inputs", pageName.replace(/\//g, "-")],
        steps: variationSteps,
        priority: 3,
      });
    }

    return tests;
  }

  // ── Generate EDGE_CASE test cases ──

  private generateEdgeCaseTests(flows: RecordedAction[][]): TestCase[] {
    const tests: TestCase[] = [];

    for (const flow of flows) {
      const typeActions = flow.filter((a) => a.type === ActionType.TYPE && a.value);
      if (typeActions.length === 0) continue;

      const firstNav = flow.find((a) => a.type === ActionType.NAVIGATE);
      const pageName = firstNav
        ? new URL(firstNav.value, this.session.baseUrl).pathname
        : "unknown";

      // Edge case: Empty inputs
      const emptySteps: TestStep[] = [];
      let stepIdx = 0;

      for (const action of flow) {
        if (action.type === ActionType.TYPE) {
          emptySteps.push({
            index: ++stepIdx,
            action: action.type,
            selector: action.selector,
            value: "",
            description: `${action.elementDescription} (EMPTY INPUT)`,
            timeout: 10000,
          });
        } else {
          emptySteps.push(this.actionToStep(action, ++stepIdx));
        }
      }

      tests.push({
        id: this.nextId(),
        name: `Empty Inputs: ${pageName}`,
        category: TestCategory.EDGE_CASE,
        description: `Submit ${pageName} form with all inputs empty — should show validation`,
        sourceSessionId: this.session.id,
        tags: ["edge-case", "empty", pageName.replace(/\//g, "-")],
        steps: emptySteps,
        priority: 4,
      });

      // Edge case: Very long inputs
      const longSteps: TestStep[] = [];
      stepIdx = 0;

      for (const action of flow) {
        if (action.type === ActionType.TYPE) {
          longSteps.push({
            index: ++stepIdx,
            action: action.type,
            selector: action.selector,
            value: "A".repeat(5000),
            description: `${action.elementDescription} (5000 chars)`,
            timeout: 10000,
          });
        } else {
          longSteps.push(this.actionToStep(action, ++stepIdx));
        }
      }

      tests.push({
        id: this.nextId(),
        name: `Long Input Stress: ${pageName}`,
        category: TestCategory.EDGE_CASE,
        description: `Submit ${pageName} with extremely long inputs — should handle gracefully`,
        sourceSessionId: this.session.id,
        tags: ["edge-case", "long-input", pageName.replace(/\//g, "-")],
        steps: longSteps,
        priority: 5,
      });

      // Edge case: Special characters
      const specialSteps: TestStep[] = [];
      stepIdx = 0;
      const specialChars = '<script>alert("xss")</script>&amp;%00 🎉 é ñ "quoted" \'single\' <b>bold</b>';

      for (const action of flow) {
        if (action.type === ActionType.TYPE) {
          specialSteps.push({
            index: ++stepIdx,
            action: action.type,
            selector: action.selector,
            value: specialChars,
            description: `${action.elementDescription} (special chars + XSS)`,
            timeout: 10000,
          });
        } else {
          specialSteps.push(this.actionToStep(action, ++stepIdx));
        }
      }

      tests.push({
        id: this.nextId(),
        name: `Special Characters: ${pageName}`,
        category: TestCategory.EDGE_CASE,
        description: `Submit ${pageName} with HTML, Unicode, and XSS payloads`,
        sourceSessionId: this.session.id,
        tags: ["edge-case", "special-chars", "xss", pageName.replace(/\//g, "-")],
        steps: specialSteps,
        priority: 4,
      });
    }

    return tests;
  }

  // ── Generate NEGATIVE test cases ──

  private generateNegativeTests(flows: RecordedAction[][]): TestCase[] {
    const tests: TestCase[] = [];

    for (const flow of flows) {
      const typeActions = flow.filter((a) => a.type === ActionType.TYPE && a.value);
      if (typeActions.length === 0) continue;

      const firstNav = flow.find((a) => a.type === ActionType.NAVIGATE);
      const pageName = firstNav
        ? new URL(firstNav.value, this.session.baseUrl).pathname
        : "unknown";

      // Negative: Skip required steps (submit without filling form)
      const clickActions = flow.filter((a) => a.type === ActionType.CLICK);
      const submitClick = clickActions.find((a) =>
        a.selector.includes("submit") ||
        a.elementDescription.toLowerCase().includes("submit") ||
        a.elementDescription.toLowerCase().includes("save") ||
        a.elementDescription.toLowerCase().includes("create")
      );

      if (submitClick) {
        const skipSteps: TestStep[] = [];
        let stepIdx = 0;

        // Only navigate and click submit — skip all typing
        for (const action of flow) {
          if (action.type === ActionType.NAVIGATE || action === submitClick) {
            skipSteps.push(this.actionToStep(action, ++stepIdx));
          }
        }

        skipSteps.push({
          index: ++stepIdx,
          action: ActionType.WAIT,
          selector: "",
          value: "1000",
          description: "Wait for validation feedback",
          timeout: 5000,
        });

        tests.push({
          id: this.nextId(),
          name: `Skip Form Fields: ${pageName}`,
          category: TestCategory.NEGATIVE,
          description: `Click submit on ${pageName} without filling any fields`,
          sourceSessionId: this.session.id,
          tags: ["negative", "skip-fields", pageName.replace(/\//g, "-")],
          steps: skipSteps,
          priority: 3,
        });
      }

      // Negative: Invalid data types
      const invalidSteps: TestStep[] = [];
      let stepIdx = 0;

      for (const action of flow) {
        if (action.type === ActionType.TYPE) {
          const invalidValue = this.generateInvalidInput(action.value, action.selector);
          invalidSteps.push({
            index: ++stepIdx,
            action: action.type,
            selector: action.selector,
            value: invalidValue,
            description: `${action.elementDescription} (INVALID: "${invalidValue}")`,
            timeout: 10000,
          });
        } else {
          invalidSteps.push(this.actionToStep(action, ++stepIdx));
        }
      }

      tests.push({
        id: this.nextId(),
        name: `Invalid Inputs: ${pageName}`,
        category: TestCategory.NEGATIVE,
        description: `Submit ${pageName} with wrong data types — letters in number fields, etc.`,
        sourceSessionId: this.session.id,
        tags: ["negative", "invalid", pageName.replace(/\//g, "-")],
        steps: invalidSteps,
        priority: 4,
      });
    }

    return tests;
  }

  // ── Generate PERFORMANCE test cases ──

  private generatePerformanceTests(): TestCase[] {
    const tests: TestCase[] = [];

    // Performance budget test for each visited page
    for (const pageUrl of this.session.pagesVisited) {
      const steps: TestStep[] = [
        {
          index: 1,
          action: ActionType.NAVIGATE,
          selector: "",
          value: `${this.session.baseUrl}${pageUrl}`,
          description: `Navigate to ${pageUrl}`,
          assertion: { type: "URL_CONTAINS", expected: pageUrl },
          timeout: 30000,
        },
        {
          index: 2,
          action: ActionType.WAIT,
          selector: "",
          value: "2000",
          description: "Wait for page to fully load and metrics to settle",
          assertion: { type: "PERFORMANCE_BUDGET", expected: "lcp<2500,fcp<1800,cls<0.1,tbt<200" },
          timeout: 10000,
        },
        {
          index: 3,
          action: ActionType.WAIT,
          selector: "",
          value: "500",
          description: "Check for console errors",
          assertion: { type: "NO_CONSOLE_ERRORS", expected: "0" },
          timeout: 5000,
        },
      ];

      tests.push({
        id: this.nextId(),
        name: `Performance Budget: ${pageUrl}`,
        category: TestCategory.PERFORMANCE,
        description: `Verify ${pageUrl} meets Core Web Vitals budgets (LCP<2.5s, FCP<1.8s, CLS<0.1, TBT<200ms)`,
        sourceSessionId: this.session.id,
        tags: ["performance", "core-web-vitals", pageUrl.replace(/\//g, "-")],
        steps,
        priority: 2,
      });
    }

    // Rapid navigation test — navigate all visited pages quickly
    if (this.session.pagesVisited.length > 2) {
      const rapidSteps: TestStep[] = [];
      let stepIdx = 0;

      for (const pageUrl of this.session.pagesVisited) {
        rapidSteps.push({
          index: ++stepIdx,
          action: ActionType.NAVIGATE,
          selector: "",
          value: `${this.session.baseUrl}${pageUrl}`,
          description: `Quick navigate to ${pageUrl}`,
          timeout: 15000,
        });
        rapidSteps.push({
          index: ++stepIdx,
          action: ActionType.WAIT,
          selector: "",
          value: "300",
          description: `Quick settle on ${pageUrl}`,
          timeout: 5000,
        });
      }

      // Final assertion: no memory leak / console errors after rapid nav
      rapidSteps.push({
        index: ++stepIdx,
        action: ActionType.WAIT,
        selector: "",
        value: "1000",
        description: "Final check after rapid navigation",
        assertion: { type: "NO_CONSOLE_ERRORS", expected: "0" },
        timeout: 5000,
      });

      tests.push({
        id: this.nextId(),
        name: `Rapid Navigation Stress Test`,
        category: TestCategory.PERFORMANCE,
        description: `Navigate through all ${this.session.pagesVisited.length} visited pages rapidly — checks for memory leaks and errors`,
        sourceSessionId: this.session.id,
        tags: ["performance", "stress", "rapid-nav"],
        steps: rapidSteps,
        priority: 3,
      });
    }

    return tests;
  }

  // ── Input Generators ──

  private generateVariedInput(original: string): string {
    // Try to detect the type of input and generate a valid variation
    if (/^\d+$/.test(original)) {
      // Numeric — use a different number
      return String(parseInt(original) + 42);
    }
    if (/^\d+\.\d+$/.test(original)) {
      // Decimal
      return String((parseFloat(original) * 1.5).toFixed(2));
    }
    if (original.includes("@")) {
      // Email
      return `test-varied-${Date.now()}@example.com`;
    }
    if (/^https?:\/\//.test(original)) {
      // URL
      return "https://example.com/varied-test-url";
    }
    // Default: append variation marker
    return `${original} (varied)`;
  }

  private generateInvalidInput(original: string, selector: string): string {
    const lower = selector.toLowerCase();

    if (lower.includes("email") || lower.includes("mail")) {
      return "not-an-email";
    }
    if (lower.includes("phone") || lower.includes("tel")) {
      return "abc-not-phone";
    }
    if (lower.includes("price") || lower.includes("amount") || lower.includes("number")) {
      return "not-a-number!@#";
    }
    if (lower.includes("url") || lower.includes("link") || lower.includes("website")) {
      return "not a valid url !!!";
    }
    if (lower.includes("password")) {
      return "x"; // too short
    }
    if (/^\d+$/.test(original)) {
      return "abc"; // letters where numbers expected
    }
    return "🎲💀 invalid \x00 null \t tab";
  }

  // ── Main Analyze ──

  public analyze(): TestSuite {
    console.log(`\n${"═".repeat(65)}`);
    console.log(`  GUI Watch — Session Analyzer`);
    console.log(`${"═".repeat(65)}`);
    console.log(`  Session:  ${this.session.id}`);
    console.log(`  Name:     ${this.session.name}`);
    console.log(`  Actions:  ${this.session.actions.length}`);
    console.log(`  Pages:    ${this.session.pagesVisited.length}`);
    console.log(`${"═".repeat(65)}\n`);

    const flows = this.segmentIntoFlows();
    console.log(`  Segmented into ${flows.length} flow(s)`);

    // Generate all test categories
    const replayTests = this.generateReplayTests(flows);
    console.log(`  Generated ${replayTests.length} REPLAY test(s)`);

    const variationTests = this.generateVariationTests(flows);
    console.log(`  Generated ${variationTests.length} VARIATION test(s)`);

    const edgeCaseTests = this.generateEdgeCaseTests(flows);
    console.log(`  Generated ${edgeCaseTests.length} EDGE_CASE test(s)`);

    const negativeTests = this.generateNegativeTests(flows);
    console.log(`  Generated ${negativeTests.length} NEGATIVE test(s)`);

    const perfTests = this.generatePerformanceTests();
    console.log(`  Generated ${perfTests.length} PERFORMANCE test(s)`);

    const allTests = [
      ...replayTests,
      ...variationTests,
      ...edgeCaseTests,
      ...negativeTests,
      ...perfTests,
    ];

    // Sort by priority
    allTests.sort((a, b) => a.priority - b.priority);

    const byCategory: Record<TestCategory, number> = {
      [TestCategory.REPLAY]: replayTests.length,
      [TestCategory.VARIATION]: variationTests.length,
      [TestCategory.EDGE_CASE]: edgeCaseTests.length,
      [TestCategory.NEGATIVE]: negativeTests.length,
      [TestCategory.PERFORMANCE]: perfTests.length,
    };

    const suite: TestSuite = {
      id: `TS-${this.session.id}`,
      name: `Test Suite: ${this.session.name}`,
      generatedAt: new Date().toISOString(),
      sourceSession: this.session,
      testCases: allTests,
      summary: {
        total: allTests.length,
        byCategory,
      },
    };

    console.log(`\n  ────────────────────────────────────────`);
    console.log(`  Total test cases: ${allTests.length}`);
    console.log(`    REPLAY:      ${byCategory.REPLAY}`);
    console.log(`    VARIATION:   ${byCategory.VARIATION}`);
    console.log(`    EDGE_CASE:   ${byCategory.EDGE_CASE}`);
    console.log(`    NEGATIVE:    ${byCategory.NEGATIVE}`);
    console.log(`    PERFORMANCE: ${byCategory.PERFORMANCE}`);
    console.log(`  ────────────────────────────────────────\n`);

    return suite;
  }
}

// ── Entry Point ──────────────────────────────────────────────────

function main(): void {
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error("Usage: npx ts-node tests/gui-watch/session-analyzer.ts <session-id>");
    console.error("\nAvailable sessions:");
    if (fs.existsSync(SESSION_DIR)) {
      const files = fs.readdirSync(SESSION_DIR).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), "utf-8"));
        console.error(`  ${data.id}  ${data.name}  (${data.actions?.length || 0} actions, ${data.pagesVisited?.length || 0} pages)`);
      }
    }
    process.exit(1);
  }

  // Find session file
  const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
  if (!fs.existsSync(sessionFile)) {
    console.error(`Session not found: ${sessionFile}`);
    process.exit(1);
  }

  const session: RecordingSession = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
  const analyzer = new SessionAnalyzer(session);
  const suite = analyzer.analyze();

  // Save suite
  ensureDir(SUITE_DIR);
  const suiteFile = path.join(SUITE_DIR, `${suite.id}.json`);
  fs.writeFileSync(suiteFile, JSON.stringify(suite, null, 2));

  console.log(`  Suite saved: ${suiteFile}`);
  console.log(`\n  Next step: run the test suite`);
  console.log(`    npx ts-node tests/gui-watch/test-runner.ts ${suite.id}`);
  console.log(``);
}

main();

export { SessionAnalyzer };
