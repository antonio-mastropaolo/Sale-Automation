/**
 * TrendSmart QA — Trend Tracker
 *
 * Compares QA runs over time to detect regressions and improvements:
 *  - Saves a summary of each run to docs/gui-audit/trend-history.json
 *  - Compares current run against the last N runs
 *  - Flags regressions (new bugs, degraded performance, failed tests)
 *  - Highlights improvements (fixed bugs, better performance)
 *  - Generates a trend report with direction (improving/degrading/stable)
 *
 * This replaces manual tracking in spreadsheets.
 */

import type { QAReport, TrendEntry, TrendReport, BugSeverity } from "./agent-types";
import * as fs from "fs";
import * as path from "path";

const HISTORY_FILE = path.join(process.cwd(), "docs", "gui-audit", "trend-history.json");
const MAX_ENTRIES = 50; // Keep last 50 runs

// ── Save Entry ────────────────────────────────────────────────────

function loadHistory(): TrendEntry[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
      return JSON.parse(raw) as TrendEntry[];
    }
  } catch {
    // Corrupted file — start fresh
  }
  return [];
}

function saveHistory(entries: TrendEntry[]): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Keep only the last MAX_ENTRIES
  const trimmed = entries.slice(-MAX_ENTRIES);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2));
}

/**
 * Convert a QA report into a trend entry for storage.
 */
function reportToEntry(report: QAReport): TrendEntry {
  const perfMetrics = report.performanceMetrics || [];
  const avgLcp = perfMetrics.length > 0
    ? perfMetrics.reduce((sum, m) => sum + m.lcp, 0) / perfMetrics.length
    : 0;

  const securityIssues = report.securityResults
    ? report.securityResults.filter((r) => !r.passed).length
    : 0;

  return {
    timestamp: report.meta.timestamp,
    totalBugs: report.summary.totalBugs,
    bySeverity: report.summary.bySeverity,
    byAgent: report.summary.byAgent,
    apiTestsPassed: report.summary.apiTestsPassed,
    apiTestsTotal: report.summary.apiTestsPassed + report.summary.apiTestsFailed,
    flowTestsPassed: report.summary.flowTestsPassed,
    flowTestsTotal: report.summary.flowTestsPassed + report.summary.flowTestsFailed,
    performanceAvgLcp: Math.round(avgLcp),
    securityIssues,
  };
}

// ── Comparison ────────────────────────────────────────────────────

/**
 * Compare current entry against the previous one and generate a trend report.
 */
function compareEntries(current: TrendEntry, previous: TrendEntry | null): TrendReport {
  const regressions: string[] = [];
  const improvements: string[] = [];

  if (!previous) {
    return {
      entries: [current],
      direction: "stable",
      regressions: [],
      improvements: [],
    };
  }

  // Bug count comparison
  const bugDiff = current.totalBugs - previous.totalBugs;
  if (bugDiff > 0) {
    regressions.push(`${bugDiff} new bug(s) found (${previous.totalBugs} → ${current.totalBugs})`);
  } else if (bugDiff < 0) {
    improvements.push(`${Math.abs(bugDiff)} bug(s) fixed (${previous.totalBugs} → ${current.totalBugs})`);
  }

  // Critical bugs
  const critDiff = (current.bySeverity.critical || 0) - (previous.bySeverity.critical || 0);
  if (critDiff > 0) {
    regressions.push(`${critDiff} new CRITICAL bug(s)`);
  } else if (critDiff < 0) {
    improvements.push(`${Math.abs(critDiff)} critical bug(s) fixed`);
  }

  // API tests
  if (current.apiTestsPassed < previous.apiTestsPassed) {
    regressions.push(
      `API tests regressed: ${previous.apiTestsPassed}/${previous.apiTestsTotal} → ${current.apiTestsPassed}/${current.apiTestsTotal}`
    );
  } else if (current.apiTestsPassed > previous.apiTestsPassed) {
    improvements.push(
      `API tests improved: ${previous.apiTestsPassed}/${previous.apiTestsTotal} → ${current.apiTestsPassed}/${current.apiTestsTotal}`
    );
  }

  // Flow tests
  if (current.flowTestsPassed < previous.flowTestsPassed) {
    regressions.push(
      `Flow tests regressed: ${previous.flowTestsPassed}/${previous.flowTestsTotal} → ${current.flowTestsPassed}/${current.flowTestsTotal}`
    );
  } else if (current.flowTestsPassed > previous.flowTestsPassed) {
    improvements.push(
      `Flow tests improved: ${previous.flowTestsPassed}/${previous.flowTestsTotal} → ${current.flowTestsPassed}/${current.flowTestsTotal}`
    );
  }

  // Performance (LCP)
  if (current.performanceAvgLcp > 0 && previous.performanceAvgLcp > 0) {
    const lcpDiff = current.performanceAvgLcp - previous.performanceAvgLcp;
    if (lcpDiff > 200) {
      regressions.push(`LCP degraded: ${previous.performanceAvgLcp}ms → ${current.performanceAvgLcp}ms (+${lcpDiff}ms)`);
    } else if (lcpDiff < -200) {
      improvements.push(`LCP improved: ${previous.performanceAvgLcp}ms → ${current.performanceAvgLcp}ms (${lcpDiff}ms)`);
    }
  }

  // Security issues
  const secDiff = current.securityIssues - previous.securityIssues;
  if (secDiff > 0) {
    regressions.push(`${secDiff} new security issue(s)`);
  } else if (secDiff < 0) {
    improvements.push(`${Math.abs(secDiff)} security issue(s) fixed`);
  }

  // Determine direction
  let direction: "improving" | "degrading" | "stable";
  if (regressions.length > improvements.length) {
    direction = "degrading";
  } else if (improvements.length > regressions.length) {
    direction = "improving";
  } else {
    direction = "stable";
  }

  return {
    entries: [previous, current],
    direction,
    regressions,
    improvements,
  };
}

// ── Main API ──────────────────────────────────────────────────────

/**
 * Record a QA run and generate a trend report.
 */
export function trackRun(report: QAReport): TrendReport {
  const history = loadHistory();
  const currentEntry = reportToEntry(report);
  const previousEntry = history.length > 0 ? history[history.length - 1] : null;

  // Save current entry
  history.push(currentEntry);
  saveHistory(history);

  // Generate trend report
  const trend = compareEntries(currentEntry, previousEntry);
  trend.entries = history.slice(-10); // Include last 10 entries in the report

  return trend;
}

/**
 * Format trend report for console output.
 */
export function formatTrendReport(trend: TrendReport): string {
  const lines: string[] = [];
  const arrow = trend.direction === "improving" ? "UP" : trend.direction === "degrading" ? "DOWN" : "FLAT";

  lines.push(`  Trend: ${arrow} (${trend.direction})`);
  lines.push(`  History: ${trend.entries.length} previous runs on record`);

  if (trend.regressions.length > 0) {
    lines.push(`  Regressions:`);
    for (const r of trend.regressions) {
      lines.push(`    - ${r}`);
    }
  }

  if (trend.improvements.length > 0) {
    lines.push(`  Improvements:`);
    for (const imp of trend.improvements) {
      lines.push(`    + ${imp}`);
    }
  }

  if (trend.regressions.length === 0 && trend.improvements.length === 0) {
    lines.push(`  No changes since last run.`);
  }

  return lines.join("\n");
}
