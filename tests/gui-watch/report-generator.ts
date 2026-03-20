/**
 * GUI Watch — HTML Report Generator
 *
 * Generates a self-contained HTML page with:
 *   - Executive summary (pass rate, duration, counts)
 *   - Category breakdown (pie chart, bar chart via CSS)
 *   - Performance metrics dashboard
 *   - Detailed test results table (expandable rows)
 *   - Issues list with severity badges
 *   - Session recording replay summary
 *   - Fully responsive, dark-mode aware, no external dependencies
 */

import * as fs from "fs";
import type { SuiteResult, TestSuite, TestResult, TestIssue, PerformanceSnapshot } from "./types";
import { TestStatus, TestCategory, Severity } from "./types";

// ── HTML Generator ───────────────────────────────────────────────

export function generateHtmlReport(
  result: SuiteResult,
  suite: TestSuite,
  outputPath: string
): void {
  const html = buildHtml(result, suite);
  fs.writeFileSync(outputPath, html, "utf-8");
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBadge(status: TestStatus): string {
  const colors: Record<TestStatus, string> = {
    [TestStatus.PASSED]: "#10b981",
    [TestStatus.FAILED]: "#ef4444",
    [TestStatus.ERROR]: "#f59e0b",
    [TestStatus.SKIPPED]: "#6b7280",
  };
  const icons: Record<TestStatus, string> = {
    [TestStatus.PASSED]: "&#10003;",
    [TestStatus.FAILED]: "&#10007;",
    [TestStatus.ERROR]: "&#9888;",
    [TestStatus.SKIPPED]: "&#8680;",
  };
  return `<span class="badge" style="background:${colors[status]}">${icons[status]} ${status}</span>`;
}

function severityBadge(severity: Severity): string {
  const colors: Record<Severity, string> = {
    [Severity.CRITICAL]: "#dc2626",
    [Severity.HIGH]: "#ef4444",
    [Severity.MEDIUM]: "#f59e0b",
    [Severity.LOW]: "#3b82f6",
    [Severity.INFO]: "#6b7280",
  };
  return `<span class="badge" style="background:${colors[severity]}">${severity}</span>`;
}

function categoryBadge(category: TestCategory): string {
  const colors: Record<TestCategory, string> = {
    [TestCategory.REPLAY]: "#8b5cf6",
    [TestCategory.VARIATION]: "#06b6d4",
    [TestCategory.EDGE_CASE]: "#f97316",
    [TestCategory.NEGATIVE]: "#ef4444",
    [TestCategory.PERFORMANCE]: "#10b981",
  };
  const icons: Record<TestCategory, string> = {
    [TestCategory.REPLAY]: "&#128257;",
    [TestCategory.VARIATION]: "&#128256;",
    [TestCategory.EDGE_CASE]: "&#9632;",
    [TestCategory.NEGATIVE]: "&#128683;",
    [TestCategory.PERFORMANCE]: "&#9889;",
  };
  return `<span class="badge" style="background:${colors[category]}">${icons[category]} ${category}</span>`;
}

function buildHtml(result: SuiteResult, suite: TestSuite): string {
  const { summary, performanceSummary, issues, results } = result;
  const session = suite.sourceSession;

  const passRateColor = summary.passRate >= 90 ? "#10b981" : summary.passRate >= 70 ? "#f59e0b" : "#ef4444";

  // Category bars
  const categoryBars = Object.entries(summary.byCategory)
    .filter(([, v]) => v.total > 0)
    .map(([cat, v]) => {
      const pct = v.total > 0 ? Math.round((v.passed / v.total) * 100) : 0;
      const color = pct >= 90 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";
      return `
        <div class="cat-row">
          <div class="cat-label">${cat}</div>
          <div class="cat-bar-bg">
            <div class="cat-bar" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="cat-stat">${v.passed}/${v.total} (${pct}%)</div>
        </div>`;
    })
    .join("");

  // Test results rows
  const testRows = results.map((r, i) => {
    const stepsHtml = r.stepResults.map((s) => `
      <tr class="step-row">
        <td>${s.index}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${s.duration}ms</td>
        <td>${esc(s.error || "—")}</td>
      </tr>
    `).join("");

    return `
      <tr class="test-row ${r.status === TestStatus.PASSED ? "" : "test-failed"}" onclick="toggleDetails('details-${i}')">
        <td>${r.testId}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${categoryBadge(r.category)}</td>
        <td class="test-name">${esc(r.testName)}</td>
        <td class="mono">${r.duration}ms</td>
        <td>${r.failedAtStep !== undefined ? `Step ${r.failedAtStep}` : "—"}</td>
      </tr>
      <tr id="details-${i}" class="details-row" style="display:none">
        <td colspan="6">
          <div class="details-content">
            ${r.error ? `<div class="error-msg">${esc(r.error)}</div>` : ""}
            <table class="steps-table">
              <thead><tr><th>Step</th><th>Status</th><th>Duration</th><th>Details</th></tr></thead>
              <tbody>${stepsHtml}</tbody>
            </table>
          </div>
        </td>
      </tr>`;
  }).join("");

  // Issues rows
  const issueRows = issues.map((iss) => `
    <tr>
      <td>${iss.id}</td>
      <td>${severityBadge(iss.severity)}</td>
      <td>${esc(iss.title)}</td>
      <td>${esc(iss.route)}</td>
      <td>${esc(iss.testId)}</td>
      <td>${esc(iss.suggestedFix)}</td>
    </tr>
  `).join("");

  // Performance table
  const perfRows = results
    .filter((r) => r.performanceSnapshot)
    .map((r) => {
      const ps = r.performanceSnapshot!;
      const lcpColor = ps.lcp <= 2500 ? "#10b981" : ps.lcp <= 4000 ? "#f59e0b" : "#ef4444";
      const fcpColor = ps.fcp <= 1800 ? "#10b981" : ps.fcp <= 3000 ? "#f59e0b" : "#ef4444";
      const clsColor = ps.cls <= 0.1 ? "#10b981" : ps.cls <= 0.25 ? "#f59e0b" : "#ef4444";
      const tbtColor = ps.tbt <= 200 ? "#10b981" : ps.tbt <= 600 ? "#f59e0b" : "#ef4444";
      return `
        <tr>
          <td>${esc(new URL(ps.url).pathname)}</td>
          <td style="color:${lcpColor}" class="mono">${ps.lcp}ms</td>
          <td style="color:${fcpColor}" class="mono">${ps.fcp}ms</td>
          <td style="color:${clsColor}" class="mono">${ps.cls}</td>
          <td style="color:${tbtColor}" class="mono">${ps.tbt}ms</td>
          <td class="mono">${ps.domNodes}</td>
        </tr>`;
    }).join("");

  // Session info
  const sessionDuration = (session.duration / 1000).toFixed(1);
  const consoleErrors = session.consoleEntries.filter((c) => c.level === "error").length;
  const failedRequests = session.networkEntries.filter((n) => n.failed).length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GUI Watch Report — ${esc(suite.name)}</title>
<style>
  :root {
    --bg: #0f172a;
    --surface: #1e293b;
    --surface2: #334155;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --border: #475569;
    --accent: #3b82f6;
    --success: #10b981;
    --danger: #ef4444;
    --warning: #f59e0b;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 2rem;
  }

  .container { max-width: 1400px; margin: 0 auto; }

  h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
  h2 { font-size: 1.4rem; font-weight: 600; margin: 2rem 0 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
  h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }

  .subtitle { color: var(--text-muted); margin-bottom: 2rem; }
  .mono { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.9em; }

  /* Cards */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card {
    background: var(--surface);
    border-radius: 12px;
    padding: 1.5rem;
    border: 1px solid var(--border);
  }
  .card-label { color: var(--text-muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
  .card-value { font-size: 2rem; font-weight: 700; }
  .card-sub { color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem; }

  /* Badges */
  .badge {
    display: inline-block;
    padding: 0.15rem 0.6rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
  }

  /* Pass rate ring */
  .ring-container { display: flex; align-items: center; gap: 2rem; margin: 1.5rem 0; }
  .ring { position: relative; width: 140px; height: 140px; }
  .ring svg { transform: rotate(-90deg); }
  .ring-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .ring-pct { font-size: 2rem; font-weight: 700; }
  .ring-label { font-size: 0.8rem; color: var(--text-muted); }

  /* Category bars */
  .cat-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
  .cat-label { width: 120px; font-size: 0.85rem; color: var(--text-muted); text-align: right; }
  .cat-bar-bg { flex: 1; height: 24px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
  .cat-bar { height: 100%; border-radius: 4px; transition: width 0.5s; }
  .cat-stat { width: 120px; font-size: 0.85rem; font-family: monospace; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
  th, td { padding: 0.6rem 0.8rem; text-align: left; border-bottom: 1px solid var(--border); font-size: 0.9rem; }
  th { background: var(--surface); color: var(--text-muted); font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.05em; position: sticky; top: 0; }
  .test-row { cursor: pointer; transition: background 0.15s; }
  .test-row:hover { background: var(--surface); }
  .test-failed { background: rgba(239, 68, 68, 0.08); }
  .test-name { max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .details-row td { padding: 0; background: var(--surface); }
  .details-content { padding: 1rem 1.5rem; }
  .error-msg { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 6px; padding: 0.8rem; margin-bottom: 1rem; font-family: monospace; font-size: 0.85rem; color: #fca5a5; }
  .steps-table { background: var(--bg); border-radius: 8px; overflow: hidden; }
  .steps-table th { background: var(--surface2); }
  .step-row:nth-child(even) { background: rgba(255,255,255,0.02); }

  /* Session panel */
  .session-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .session-grid .card { padding: 1rem; }

  /* Footer */
  .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--text-muted); font-size: 0.8rem; text-align: center; }

  /* Responsive */
  @media (max-width: 768px) {
    body { padding: 1rem; }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .ring-container { flex-direction: column; }
    .session-grid { grid-template-columns: 1fr; }
    .test-name { max-width: 200px; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- Header -->
  <h1>GUI Watch Report</h1>
  <p class="subtitle">${esc(suite.name)} &mdash; ${new Date(result.startedAt).toLocaleString()} &mdash; ${(result.duration / 1000).toFixed(1)}s</p>

  <!-- Summary Cards -->
  <div class="cards">
    <div class="card">
      <div class="card-label">Total Tests</div>
      <div class="card-value">${summary.total}</div>
      <div class="card-sub">${suite.testCases.length} generated from recording</div>
    </div>
    <div class="card">
      <div class="card-value" style="color:${passRateColor}">${summary.passRate}%</div>
      <div class="card-label">Pass Rate</div>
      <div class="card-sub">${summary.passed} passed, ${summary.failed + summary.errors} failed</div>
    </div>
    <div class="card">
      <div class="card-label">Duration</div>
      <div class="card-value">${(result.duration / 1000).toFixed(1)}s</div>
      <div class="card-sub">avg ${summary.avgDuration}ms per test</div>
    </div>
    <div class="card">
      <div class="card-label">Issues Found</div>
      <div class="card-value" style="color:${issues.length > 0 ? "#ef4444" : "#10b981"}">${issues.length}</div>
      <div class="card-sub">${issues.filter((i) => i.severity === Severity.CRITICAL || i.severity === Severity.HIGH).length} critical/high</div>
    </div>
  </div>

  <!-- Pass Rate Ring + Category Breakdown -->
  <h2>Results by Category</h2>
  <div class="ring-container">
    <div class="ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="60" fill="none" stroke="var(--surface2)" stroke-width="12"/>
        <circle cx="70" cy="70" r="60" fill="none" stroke="${passRateColor}" stroke-width="12"
          stroke-dasharray="${Math.round(377 * summary.passRate / 100)} 377"
          stroke-linecap="round"/>
      </svg>
      <div class="ring-text">
        <div class="ring-pct" style="color:${passRateColor}">${summary.passRate}%</div>
        <div class="ring-label">pass rate</div>
      </div>
    </div>
    <div style="flex:1">
      ${categoryBars}
    </div>
  </div>

  <!-- Performance Metrics -->
  ${perfRows ? `
  <h2>Performance Metrics</h2>
  <div class="cards" style="margin-bottom:1rem">
    <div class="card">
      <div class="card-label">Avg LCP</div>
      <div class="card-value mono" style="color:${performanceSummary.avgLcp <= 2500 ? "#10b981" : "#ef4444"}">${performanceSummary.avgLcp}ms</div>
      <div class="card-sub">target &lt; 2500ms</div>
    </div>
    <div class="card">
      <div class="card-label">Avg FCP</div>
      <div class="card-value mono" style="color:${performanceSummary.avgFcp <= 1800 ? "#10b981" : "#ef4444"}">${performanceSummary.avgFcp}ms</div>
      <div class="card-sub">target &lt; 1800ms</div>
    </div>
    <div class="card">
      <div class="card-label">Avg CLS</div>
      <div class="card-value mono" style="color:${performanceSummary.avgCls <= 0.1 ? "#10b981" : "#ef4444"}">${performanceSummary.avgCls}</div>
      <div class="card-sub">target &lt; 0.1</div>
    </div>
    <div class="card">
      <div class="card-label">Avg TBT</div>
      <div class="card-value mono" style="color:${performanceSummary.avgTbt <= 200 ? "#10b981" : "#ef4444"}">${performanceSummary.avgTbt}ms</div>
      <div class="card-sub">target &lt; 200ms</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Page</th><th>LCP</th><th>FCP</th><th>CLS</th><th>TBT</th><th>DOM Nodes</th></tr></thead>
    <tbody>${perfRows}</tbody>
  </table>
  ` : ""}

  <!-- Issues -->
  ${issues.length > 0 ? `
  <h2>Issues (${issues.length})</h2>
  <table>
    <thead><tr><th>ID</th><th>Severity</th><th>Title</th><th>Route</th><th>Test</th><th>Suggested Fix</th></tr></thead>
    <tbody>${issueRows}</tbody>
  </table>
  ` : ""}

  <!-- All Test Results -->
  <h2>Test Results (${results.length})</h2>
  <table>
    <thead><tr><th>ID</th><th>Status</th><th>Category</th><th>Name</th><th>Duration</th><th>Failed At</th></tr></thead>
    <tbody>${testRows}</tbody>
  </table>

  <!-- Recording Session Info -->
  <h2>Source Recording</h2>
  <div class="session-grid">
    <div class="card">
      <div class="card-label">Session</div>
      <div style="font-weight:600">${esc(session.id)}</div>
      <div class="card-sub">${esc(session.name)}</div>
    </div>
    <div class="card">
      <div class="card-label">Duration</div>
      <div style="font-weight:600">${sessionDuration}s</div>
      <div class="card-sub">${session.actions.length} actions recorded</div>
    </div>
    <div class="card">
      <div class="card-label">Pages Visited</div>
      <div style="font-weight:600">${session.pagesVisited.length}</div>
      <div class="card-sub">${session.pagesVisited.slice(0, 5).join(", ")}${session.pagesVisited.length > 5 ? "..." : ""}</div>
    </div>
    <div class="card">
      <div class="card-label">Network</div>
      <div style="font-weight:600">${session.networkEntries.length} requests</div>
      <div class="card-sub">${failedRequests} failed, ${consoleErrors} console errors</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated by GUI Watch &mdash; TrendSmart QA System &mdash; ${new Date().toISOString()}
  </div>

</div>

<script>
function toggleDetails(id) {
  const row = document.getElementById(id);
  if (row) {
    row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
  }
}
</script>
</body>
</html>`;
}
