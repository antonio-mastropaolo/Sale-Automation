/**
 * GUI Watch — All-in-One: Analyze + Run + Report
 *
 * Takes a session ID, generates tests, runs them, and produces an HTML report.
 *
 * Usage:
 *   npx ts-node tests/gui-watch/run-all.ts <session-id>
 */

import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";
import type { RecordingSession, TestSuite, SuiteResult } from "./types";
import { TestStatus, Severity } from "./types";
import { SessionAnalyzer } from "./session-analyzer";
import { TestRunner } from "./test-runner";
import { generateHtmlReport } from "./report-generator";

const SESSION_DIR = path.join(process.cwd(), "docs", "gui-watch", "sessions");
const SUITE_DIR = path.join(process.cwd(), "docs", "gui-watch", "suites");
const RESULTS_DIR = path.join(process.cwd(), "docs", "gui-watch", "results");
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "gui-watch", "screenshots");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main(): Promise<void> {
  const sessionId = process.argv[2];

  if (!sessionId) {
    console.error("Usage: npx ts-node tests/gui-watch/run-all.ts <session-id>");
    console.error("\nAvailable sessions:");
    if (fs.existsSync(SESSION_DIR)) {
      const files = fs.readdirSync(SESSION_DIR).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), "utf-8"));
        console.error(`  ${data.id}  ${data.name}  (${data.actions?.length || 0} actions)`);
      }
    }
    process.exit(1);
  }

  // Load session
  const sessionFile = path.join(SESSION_DIR, `${sessionId}.json`);
  if (!fs.existsSync(sessionFile)) {
    console.error(`Session not found: ${sessionFile}`);
    process.exit(1);
  }

  ensureDir(SUITE_DIR);
  ensureDir(RESULTS_DIR);
  ensureDir(SCREENSHOTS_DIR);

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  GUI Watch — Full Pipeline`);
  console.log(`${"═".repeat(65)}\n`);

  // Step 1: Analyze
  console.log(`  ▶ Step 1/3: Analyzing session ${sessionId}...\n`);
  const session: RecordingSession = JSON.parse(fs.readFileSync(sessionFile, "utf-8"));
  const analyzer = new SessionAnalyzer(session);
  const suite = analyzer.analyze();

  const suiteFile = path.join(SUITE_DIR, `${suite.id}.json`);
  fs.writeFileSync(suiteFile, JSON.stringify(suite, null, 2));
  console.log(`  Suite saved: ${suiteFile}\n`);

  // Step 2: Run
  console.log(`  ▶ Step 2/3: Running ${suite.testCases.length} tests...\n`);
  const runner = new TestRunner(suite);
  const result = await runner.run();

  const resultFile = path.join(RESULTS_DIR, `${suite.id}-result.json`);
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));

  // Step 3: Report
  console.log(`  ▶ Step 3/3: Generating HTML report...\n`);
  const reportFile = path.join(RESULTS_DIR, `${suite.id}-report.html`);
  generateHtmlReport(result, suite, reportFile);

  // Final summary
  console.log(`${"═".repeat(65)}`);
  console.log(`  PIPELINE COMPLETE`);
  console.log(`${"═".repeat(65)}`);
  console.log(`  Session:     ${sessionId}`);
  console.log(`  Tests:       ${result.summary.total}`);
  console.log(`  Passed:      ${result.summary.passed} (${result.summary.passRate}%)`);
  console.log(`  Failed:      ${result.summary.failed + result.summary.errors}`);
  console.log(`  Issues:      ${result.issues.length}`);
  console.log(`  Duration:    ${(result.duration / 1000).toFixed(1)}s`);
  console.log(``);
  console.log(`  Outputs:`);
  console.log(`    Suite:     ${suiteFile}`);
  console.log(`    Result:    ${resultFile}`);
  console.log(`    Report:    ${reportFile}`);
  console.log(`${"═".repeat(65)}\n`);
  console.log(`  Open the report:`);
  console.log(`    open ${reportFile}\n`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
