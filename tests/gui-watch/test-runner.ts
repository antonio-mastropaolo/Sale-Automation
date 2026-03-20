/**
 * GUI Watch — Test Runner
 *
 * Executes a generated test suite against the live app:
 *   - Runs each test case sequentially
 *   - Captures screenshots on failure
 *   - Collects performance metrics
 *   - Produces a SuiteResult with pass/fail for each step
 *
 * Usage:
 *   npx ts-node tests/gui-watch/test-runner.ts <suite-id>
 */

import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import type {
  TestSuite,
  TestCase,
  TestStep,
  TestResult,
  StepResult,
  SuiteResult,
  TestIssue,
  PerformanceSnapshot,
} from "./types";
import { ActionType, TestStatus, TestCategory, Severity } from "./types";
import { generateHtmlReport } from "./report-generator";

// ── Config ───────────────────────────────────────────────────────

const SUITE_DIR = path.join(process.cwd(), "docs", "gui-watch", "suites");
const RESULTS_DIR = path.join(process.cwd(), "docs", "gui-watch", "results");
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "gui-watch", "screenshots");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Step Executor ────────────────────────────────────────────────

class StepExecutor {
  private page: Page;
  private consoleErrors: string[] = [];

  constructor(page: Page) {
    this.page = page;

    // Track console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        this.consoleErrors.push(msg.text());
      }
    });
  }

  public clearConsoleErrors(): void {
    this.consoleErrors = [];
  }

  public getConsoleErrors(): string[] {
    return [...this.consoleErrors];
  }

  async executeStep(step: TestStep): Promise<StepResult> {
    const startTime = Date.now();
    let screenshotPath: string | undefined;

    try {
      switch (step.action) {
        case ActionType.NAVIGATE: {
          await this.page.goto(step.value, {
            waitUntil: "networkidle",
            timeout: step.timeout,
          });
          break;
        }

        case ActionType.CLICK: {
          if (step.selector) {
            await this.page.locator(step.selector).first().click({ timeout: step.timeout });
          }
          break;
        }

        case ActionType.TYPE: {
          if (step.selector) {
            const locator = this.page.locator(step.selector).first();
            await locator.fill("", { timeout: step.timeout });
            await locator.fill(step.value, { timeout: step.timeout });
          }
          break;
        }

        case ActionType.SELECT: {
          if (step.selector && step.value) {
            await this.page.locator(step.selector).first().selectOption(step.value, { timeout: step.timeout });
          }
          break;
        }

        case ActionType.KEY_PRESS: {
          await this.page.keyboard.press(step.value);
          break;
        }

        case ActionType.SCROLL: {
          if (step.value) {
            const [x, y] = step.value.split(",").map(Number);
            await this.page.evaluate(([sx, sy]) => window.scrollTo(sx, sy), [x || 0, y || 0]);
          }
          break;
        }

        case ActionType.HOVER: {
          if (step.selector) {
            await this.page.locator(step.selector).first().hover({ timeout: step.timeout });
          }
          break;
        }

        case ActionType.WAIT: {
          const ms = parseInt(step.value, 10) || 1000;
          await this.page.waitForTimeout(ms);
          break;
        }

        default:
          break;
      }

      // Run assertion if present
      if (step.assertion) {
        const assertionResult = await this.runAssertion(step);
        if (!assertionResult.passed) {
          return {
            index: step.index,
            status: TestStatus.FAILED,
            duration: Date.now() - startTime,
            error: assertionResult.error,
            actualValue: assertionResult.actualValue,
          };
        }
      }

      return {
        index: step.index,
        status: TestStatus.PASSED,
        duration: Date.now() - startTime,
      };
    } catch (err) {
      // Capture screenshot on failure
      try {
        const name = `failure-step-${step.index}-${Date.now()}.png`;
        screenshotPath = path.join(SCREENSHOTS_DIR, name);
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
      } catch {
        // Can't screenshot — page might be gone
      }

      return {
        index: step.index,
        status: TestStatus.ERROR,
        duration: Date.now() - startTime,
        error: (err as Error).message,
        screenshotPath,
      };
    }
  }

  private async runAssertion(step: TestStep): Promise<{
    passed: boolean;
    error?: string;
    actualValue?: string;
  }> {
    const assertion = step.assertion!;

    switch (assertion.type) {
      case "URL_CONTAINS": {
        const url = this.page.url();
        const contains = url.includes(assertion.expected);
        return {
          passed: contains,
          error: contains ? undefined : `URL "${url}" does not contain "${assertion.expected}"`,
          actualValue: url,
        };
      }

      case "ELEMENT_VISIBLE": {
        const selector = assertion.selector || step.selector;
        const visible = await this.page.locator(selector).first().isVisible().catch(() => false);
        return {
          passed: visible,
          error: visible ? undefined : `Element "${selector}" is not visible`,
          actualValue: String(visible),
        };
      }

      case "ELEMENT_NOT_VISIBLE": {
        const selector = assertion.selector || step.selector;
        const visible = await this.page.locator(selector).first().isVisible().catch(() => false);
        return {
          passed: !visible,
          error: !visible ? undefined : `Element "${selector}" is still visible`,
          actualValue: String(visible),
        };
      }

      case "TEXT_PRESENT": {
        const text = await this.page.textContent("body") || "";
        const found = text.includes(assertion.expected);
        return {
          passed: found,
          error: found ? undefined : `Text "${assertion.expected}" not found on page`,
          actualValue: text.substring(0, 200),
        };
      }

      case "NO_CONSOLE_ERRORS": {
        const errors = this.getConsoleErrors();
        const passed = errors.length === 0;
        return {
          passed,
          error: passed ? undefined : `${errors.length} console error(s): ${errors.slice(0, 3).join("; ")}`,
          actualValue: String(errors.length),
        };
      }

      case "PERFORMANCE_BUDGET": {
        const budgets = assertion.expected.split(",").map((b) => {
          const [key, val] = b.split("<");
          return { key: key.trim(), max: parseFloat(val) };
        });

        const metrics = await this.capturePerformance();
        const violations: string[] = [];

        for (const budget of budgets) {
          const actual = metrics[budget.key as keyof PerformanceSnapshot] as number;
          if (typeof actual === "number" && actual > budget.max) {
            violations.push(`${budget.key}=${actual} (max: ${budget.max})`);
          }
        }

        return {
          passed: violations.length === 0,
          error: violations.length > 0 ? `Budget violations: ${violations.join(", ")}` : undefined,
          actualValue: JSON.stringify(metrics),
        };
      }

      default:
        return { passed: true };
    }
  }

  async capturePerformance(): Promise<PerformanceSnapshot> {
    return this.page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

      let lcp = 0;
      try {
        const entries = performance.getEntriesByType("largest-contentful-paint");
        if (entries.length > 0) lcp = entries[entries.length - 1].startTime;
      } catch { /* not supported */ }

      let cls = 0;
      try {
        const entries = performance.getEntriesByType("layout-shift");
        for (const entry of entries) {
          if (!(entry as unknown as { hadRecentInput: boolean }).hadRecentInput) {
            cls += (entry as unknown as { value: number }).value;
          }
        }
      } catch { /* not supported */ }

      let tbt = 0;
      let longTasks = 0;
      try {
        const entries = performance.getEntriesByType("longtask");
        longTasks = entries.length;
        for (const entry of entries) {
          if (entry.duration > 50) tbt += entry.duration - 50;
        }
      } catch { /* not supported */ }

      return {
        url: window.location.href,
        timestamp: Date.now(),
        ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
        fcp: fcp ? Math.round(fcp.startTime) : 0,
        lcp: Math.round(lcp),
        cls: Math.round(cls * 1000) / 1000,
        tbt: Math.round(tbt),
        domNodes: document.querySelectorAll("*").length,
        jsHeapSize: mem ? mem.usedJSHeapSize : 0,
        requestCount: performance.getEntriesByType("resource").length,
        transferSize: 0,
        longTasks,
      };
    });
  }
}

// ── Test Runner ──────────────────────────────────────────────────

class TestRunner {
  private suite: TestSuite;
  private results: TestResult[] = [];
  private issues: TestIssue[] = [];
  private issueCounter = 0;

  constructor(suite: TestSuite) {
    this.suite = suite;
  }

  private issueId(): string {
    return `ISS-${String(++this.issueCounter).padStart(4, "0")}`;
  }

  async run(): Promise<SuiteResult> {
    const startTime = Date.now();

    console.log(`\n${"═".repeat(65)}`);
    console.log(`  GUI Watch — Test Runner`);
    console.log(`${"═".repeat(65)}`);
    console.log(`  Suite:    ${this.suite.id}`);
    console.log(`  Tests:    ${this.suite.testCases.length}`);
    console.log(`  Source:   ${this.suite.sourceSession.name}`);
    console.log(`${"═".repeat(65)}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const executor = new StepExecutor(page);

    let passCount = 0;
    let failCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (let i = 0; i < this.suite.testCases.length; i++) {
      const tc = this.suite.testCases[i];
      const tcStart = Date.now();

      const categoryIcon = {
        [TestCategory.REPLAY]: "🔁",
        [TestCategory.VARIATION]: "🔀",
        [TestCategory.EDGE_CASE]: "🔲",
        [TestCategory.NEGATIVE]: "🚫",
        [TestCategory.PERFORMANCE]: "⚡",
      }[tc.category] || "  ";

      console.log(`  ${categoryIcon} [${i + 1}/${this.suite.testCases.length}] ${tc.id} ${tc.name}`);

      executor.clearConsoleErrors();

      const stepResults: StepResult[] = [];
      let testStatus = TestStatus.PASSED;
      let failedAtStep: number | undefined;
      let testError: string | undefined;
      let testScreenshot: string | undefined;
      let perfSnapshot: PerformanceSnapshot | undefined;

      for (const step of tc.steps) {
        const result = await executor.executeStep(step);
        stepResults.push(result);

        if (result.status === TestStatus.FAILED || result.status === TestStatus.ERROR) {
          testStatus = result.status;
          failedAtStep = step.index;
          testError = result.error;
          testScreenshot = result.screenshotPath;
          break;
        }
      }

      // Capture performance for performance tests
      if (tc.category === TestCategory.PERFORMANCE && testStatus === TestStatus.PASSED) {
        try {
          perfSnapshot = await executor.capturePerformance();
        } catch { /* ignore */ }
      }

      const testResult: TestResult = {
        testId: tc.id,
        testName: tc.name,
        category: tc.category,
        status: testStatus,
        duration: Date.now() - tcStart,
        stepResults,
        failedAtStep,
        error: testError,
        screenshotPath: testScreenshot,
        performanceSnapshot: perfSnapshot,
      };

      this.results.push(testResult);

      // Generate issue for failures
      if (testStatus !== TestStatus.PASSED) {
        this.createIssue(tc, testResult);
      }

      // Log result
      const statusIcon = {
        [TestStatus.PASSED]: "✅",
        [TestStatus.FAILED]: "❌",
        [TestStatus.ERROR]: "💥",
        [TestStatus.SKIPPED]: "⏭ ",
      }[testStatus];

      const durationStr = `${testResult.duration}ms`;
      console.log(`     ${statusIcon} ${testStatus.padEnd(6)} ${durationStr.padStart(8)}${testError ? ` — ${testError.substring(0, 60)}` : ""}`);

      switch (testStatus) {
        case TestStatus.PASSED: passCount++; break;
        case TestStatus.FAILED: failCount++; break;
        case TestStatus.ERROR: errorCount++; break;
        case TestStatus.SKIPPED: skipCount++; break;
      }
    }

    await browser.close();

    // Build summary
    const totalDuration = Date.now() - startTime;
    const total = this.suite.testCases.length;
    const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;
    const avgDuration = total > 0 ? Math.round(totalDuration / total) : 0;

    const byCategory: Record<TestCategory, { total: number; passed: number; failed: number }> = {
      [TestCategory.REPLAY]: { total: 0, passed: 0, failed: 0 },
      [TestCategory.VARIATION]: { total: 0, passed: 0, failed: 0 },
      [TestCategory.EDGE_CASE]: { total: 0, passed: 0, failed: 0 },
      [TestCategory.NEGATIVE]: { total: 0, passed: 0, failed: 0 },
      [TestCategory.PERFORMANCE]: { total: 0, passed: 0, failed: 0 },
    };

    for (const r of this.results) {
      byCategory[r.category].total++;
      if (r.status === TestStatus.PASSED) byCategory[r.category].passed++;
      else byCategory[r.category].failed++;
    }

    // Performance summary
    const perfResults = this.results.filter((r) => r.performanceSnapshot);
    const perfSummary = {
      avgLcp: 0,
      avgFcp: 0,
      avgCls: 0,
      avgTbt: 0,
      slowestPage: "",
      slowestLcp: 0,
    };

    if (perfResults.length > 0) {
      let totalLcp = 0, totalFcp = 0, totalCls = 0, totalTbt = 0;
      for (const r of perfResults) {
        const ps = r.performanceSnapshot!;
        totalLcp += ps.lcp;
        totalFcp += ps.fcp;
        totalCls += ps.cls;
        totalTbt += ps.tbt;
        if (ps.lcp > perfSummary.slowestLcp) {
          perfSummary.slowestLcp = ps.lcp;
          perfSummary.slowestPage = ps.url;
        }
      }
      perfSummary.avgLcp = Math.round(totalLcp / perfResults.length);
      perfSummary.avgFcp = Math.round(totalFcp / perfResults.length);
      perfSummary.avgCls = Math.round((totalCls / perfResults.length) * 1000) / 1000;
      perfSummary.avgTbt = Math.round(totalTbt / perfResults.length);
    }

    const suiteResult: SuiteResult = {
      suiteId: this.suite.id,
      suiteName: this.suite.name,
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date().toISOString(),
      duration: totalDuration,
      results: this.results,
      summary: {
        total,
        passed: passCount,
        failed: failCount,
        skipped: skipCount,
        errors: errorCount,
        passRate,
        avgDuration,
        byCategory,
      },
      performanceSummary: perfSummary,
      issues: this.issues,
    };

    // Print summary
    console.log(`\n${"═".repeat(65)}`);
    console.log(`  TEST RUN COMPLETE`);
    console.log(`${"═".repeat(65)}`);
    console.log(`  Duration:     ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`  Total:        ${total}`);
    console.log(`  ✅ Passed:    ${passCount}`);
    console.log(`  ❌ Failed:    ${failCount}`);
    console.log(`  💥 Errors:    ${errorCount}`);
    console.log(`  Pass Rate:    ${passRate}%`);
    console.log(``);
    console.log(`  By Category:`);
    for (const [cat, counts] of Object.entries(byCategory)) {
      if (counts.total > 0) {
        console.log(`    ${cat.padEnd(14)} ${counts.passed}/${counts.total} passed`);
      }
    }
    if (perfSummary.avgLcp > 0) {
      console.log(`\n  Performance:`);
      console.log(`    Avg LCP:    ${perfSummary.avgLcp}ms`);
      console.log(`    Avg FCP:    ${perfSummary.avgFcp}ms`);
      console.log(`    Avg CLS:    ${perfSummary.avgCls}`);
      console.log(`    Avg TBT:    ${perfSummary.avgTbt}ms`);
      if (perfSummary.slowestPage) {
        console.log(`    Slowest:    ${perfSummary.slowestPage} (${perfSummary.slowestLcp}ms LCP)`);
      }
    }
    console.log(`\n  Issues:       ${this.issues.length}`);
    console.log(`${"═".repeat(65)}\n`);

    return suiteResult;
  }

  private createIssue(tc: TestCase, result: TestResult): void {
    const severity = result.status === TestStatus.ERROR
      ? Severity.HIGH
      : tc.category === TestCategory.REPLAY
        ? Severity.CRITICAL
        : tc.category === TestCategory.NEGATIVE
          ? Severity.MEDIUM
          : Severity.LOW;

    this.issues.push({
      id: this.issueId(),
      severity,
      category: tc.category,
      title: `${result.status}: ${tc.name}`,
      description: result.error || `Test failed at step ${result.failedAtStep}`,
      testId: tc.id,
      route: tc.steps[0]?.value || "unknown",
      suggestedFix: this.suggestFix(tc, result),
      screenshotPath: result.screenshotPath,
    });
  }

  private suggestFix(tc: TestCase, result: TestResult): string {
    if (tc.category === TestCategory.EDGE_CASE) {
      if (tc.name.includes("Empty")) return "Add required field validation. Check that empty form submissions show appropriate error messages.";
      if (tc.name.includes("Long")) return "Add max-length validation to input fields. Ensure the UI handles long text gracefully (truncation, scrolling).";
      if (tc.name.includes("Special")) return "Sanitize input to prevent XSS. Ensure special characters are escaped before rendering.";
    }
    if (tc.category === TestCategory.NEGATIVE) {
      if (tc.name.includes("Skip")) return "Add required field validation. Prevent form submission when required fields are empty.";
      if (tc.name.includes("Invalid")) return "Add input type validation. Show clear error messages for invalid data formats.";
    }
    if (tc.category === TestCategory.PERFORMANCE) {
      return "Optimize the identified bottleneck. Check for render-blocking resources, large images, or slow API calls.";
    }
    if (tc.category === TestCategory.REPLAY) {
      return "This is a regression — the recorded user flow no longer works. Check recent changes for breaking behavior.";
    }
    return "Investigate the test failure and fix the underlying issue.";
  }
}

// ── Entry Point ──────────────────────────────────────────────────

async function main(): Promise<void> {
  const suiteId = process.argv[2];
  if (!suiteId) {
    console.error("Usage: npx ts-node tests/gui-watch/test-runner.ts <suite-id>");
    console.error("\nAvailable suites:");
    ensureDir(SUITE_DIR);
    const files = fs.readdirSync(SUITE_DIR).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(SUITE_DIR, f), "utf-8"));
      console.error(`  ${data.id}  ${data.name}  (${data.testCases?.length || 0} tests)`);
    }
    process.exit(1);
  }

  const suiteFile = path.join(SUITE_DIR, `${suiteId}.json`);
  if (!fs.existsSync(suiteFile)) {
    console.error(`Suite not found: ${suiteFile}`);
    process.exit(1);
  }

  ensureDir(RESULTS_DIR);
  ensureDir(SCREENSHOTS_DIR);

  const suite: TestSuite = JSON.parse(fs.readFileSync(suiteFile, "utf-8"));
  const runner = new TestRunner(suite);
  const result = await runner.run();

  // Save result
  const resultFile = path.join(RESULTS_DIR, `${suiteId}-result.json`);
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  console.log(`  Result saved: ${resultFile}`);

  // Generate HTML report
  const reportFile = path.join(RESULTS_DIR, `${suiteId}-report.html`);
  generateHtmlReport(result, suite, reportFile);
  console.log(`  Report saved: ${reportFile}`);
  console.log(``);
}

main().catch((err) => {
  console.error("Runner failed:", err);
  process.exit(1);
});

export { TestRunner };
