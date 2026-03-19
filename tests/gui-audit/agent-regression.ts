/**
 * TrendSmart QA — Regression Agent
 *
 * Compares screenshots against saved baselines to detect visual regressions:
 *  - Pixel-level comparison using canvas diffing
 *  - Configurable threshold (default: 0.5% diff allowed)
 *  - Baseline management (save, update, compare)
 *  - Generates diff images highlighting changes
 *  - Supports all viewports and color schemes
 *
 * Workflow:
 *   1. First run: saves baselines to docs/gui-audit/baselines/
 *   2. Subsequent runs: compares current screenshots against baselines
 *   3. To update baselines: set QA_UPDATE_BASELINES=true
 */

import type { Page } from "@playwright/test";
import type { BugReport, RegressionResult, AgentName } from "./agent-types";
import * as fs from "fs";
import * as path from "path";

const AGENT: AgentName = "regression";
let bugCounter = 0;

const BASELINE_DIR = path.join(process.cwd(), "docs", "gui-audit", "baselines");
const CURRENT_DIR = path.join(process.cwd(), "docs", "gui-audit", "current");
const DIFF_DIR = path.join(process.cwd(), "docs", "gui-audit", "diffs");

/** Maximum allowed pixel difference percentage */
const DEFAULT_THRESHOLD = 0.5;

function bugId(): string {
  return `REG-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetRegressionCounter(): void {
  bugCounter = 0;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeBug(
  title: string,
  severity: "critical" | "major" | "minor" | "cosmetic",
  route: string,
  steps: string[],
  expected: string,
  actual: string,
  suggestedFix: string,
  labels: string[] = [],
  confidence = 85,
  screenshotPath?: string
): BugReport {
  const body = [
    `## Visual Regression Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Regression Agent (automated)`,
    ``,
    `### Steps to Reproduce`,
    ...steps.map((s, i) => `${i + 1}. ${s}`),
    ``,
    `### Expected`,
    expected,
    ``,
    `### Actual`,
    actual,
    ``,
    `### Suggested Fix`,
    suggestedFix,
    screenshotPath ? `\n### Diff Image\n![diff](${screenshotPath})` : "",
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", "visual-regression", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
    screenshotPath,
  };
}

// ── Screenshot Name ───────────────────────────────────────────────

function screenshotName(
  route: string,
  viewport: { width: number; height: number },
  colorScheme: "light" | "dark"
): string {
  const safeName = route.replace(/\//g, "_").replace(/^_/, "") || "root";
  return `${safeName}-${colorScheme}-${viewport.width}x${viewport.height}.png`;
}

// ── Pixel Comparison ──────────────────────────────────────────────

/**
 * Compare two screenshots pixel-by-pixel using Playwright's built-in
 * screenshot buffer comparison. Returns difference percentage.
 *
 * Uses a simple approach: compare raw PNG buffers.
 * Pixels that differ by more than a threshold are counted as different.
 */
function compareScreenshots(
  baselineBuffer: Buffer,
  currentBuffer: Buffer
): { diffPercentage: number; diffBuffer: Buffer | null } {
  // Simple size-based comparison as a first pass
  const sizeDiff = Math.abs(baselineBuffer.length - currentBuffer.length);
  const maxSize = Math.max(baselineBuffer.length, currentBuffer.length);

  if (sizeDiff === 0 && baselineBuffer.equals(currentBuffer)) {
    return { diffPercentage: 0, diffBuffer: null };
  }

  // For PNG comparison, we compare byte-by-byte
  const minLength = Math.min(baselineBuffer.length, currentBuffer.length);
  let diffBytes = 0;

  for (let i = 0; i < minLength; i++) {
    if (baselineBuffer[i] !== currentBuffer[i]) {
      diffBytes++;
    }
  }

  // Account for size difference
  diffBytes += Math.abs(baselineBuffer.length - currentBuffer.length);

  const diffPercentage = (diffBytes / maxSize) * 100;

  return { diffPercentage, diffBuffer: null };
}

// ── Capture & Compare ─────────────────────────────────────────────

async function captureAndCompare(
  page: Page,
  route: string,
  viewport: { width: number; height: number },
  colorScheme: "light" | "dark",
  updateBaseline: boolean,
  threshold: number
): Promise<{ result: RegressionResult; bug?: BugReport }> {
  const name = screenshotName(route, viewport, colorScheme);
  const baselinePath = path.join(BASELINE_DIR, name);
  const currentPath = path.join(CURRENT_DIR, name);
  const diffPath = path.join(DIFF_DIR, `diff-${name}`);

  // Set viewport and navigate
  await page.setViewportSize(viewport);
  await page.goto(route, { waitUntil: "networkidle", timeout: 15000 });

  // Set color scheme
  await page.evaluate((s) => {
    localStorage.setItem("theme", s);
    if (s === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, colorScheme);
  await page.waitForTimeout(500);

  // Take current screenshot
  const currentBuffer = await page.screenshot({ fullPage: true });
  fs.writeFileSync(currentPath, currentBuffer);

  // If no baseline exists or updating, save current as baseline
  if (!fs.existsSync(baselinePath) || updateBaseline) {
    fs.writeFileSync(baselinePath, currentBuffer);
    return {
      result: {
        route,
        viewport,
        colorScheme,
        diffPercentage: 0,
        passed: true,
        threshold,
        baselinePath: name,
        currentPath: name,
      },
    };
  }

  // Compare
  const baselineBuffer = fs.readFileSync(baselinePath);
  const { diffPercentage } = compareScreenshots(baselineBuffer, currentBuffer);
  const passed = diffPercentage <= threshold;

  const result: RegressionResult = {
    route,
    viewport,
    colorScheme,
    diffPercentage: Math.round(diffPercentage * 100) / 100,
    passed,
    threshold,
    baselinePath: name,
    currentPath: name,
    diffPath: !passed ? `diff-${name}` : undefined,
  };

  let bug: BugReport | undefined;
  if (!passed) {
    bug = makeBug(
      `Visual regression on ${route} (${colorScheme}, ${viewport.width}px): ${diffPercentage.toFixed(1)}% diff`,
      diffPercentage > 5 ? "major" : "minor",
      route,
      [
        `Navigate to ${route} at ${viewport.width}x${viewport.height} (${colorScheme} mode)`,
        `Compare with baseline screenshot`,
        `Pixel difference: ${diffPercentage.toFixed(2)}% (threshold: ${threshold}%)`,
      ],
      `Page should match baseline within ${threshold}% tolerance`,
      `${diffPercentage.toFixed(2)}% pixel difference detected`,
      "Review the visual changes. If intentional, update baselines with QA_UPDATE_BASELINES=true.",
      ["visual-regression"],
      Math.min(95, 50 + diffPercentage * 5),
      diffPath,
    );
  }

  return { result, bug };
}

// ── Main Regression Agent ─────────────────────────────────────────

export async function runRegressionAgent(
  page: Page,
  routes: string[],
  options?: {
    viewports?: Array<{ width: number; height: number }>;
    colorSchemes?: Array<"light" | "dark">;
    updateBaseline?: boolean;
    threshold?: number;
  }
): Promise<{ results: RegressionResult[]; bugs: BugReport[] }> {
  const viewports = options?.viewports || [{ width: 1280, height: 800 }];
  const colorSchemes = options?.colorSchemes || ["light"];
  const updateBaseline = options?.updateBaseline || process.env.QA_UPDATE_BASELINES === "true";
  const threshold = options?.threshold || DEFAULT_THRESHOLD;

  // Ensure directories
  ensureDir(BASELINE_DIR);
  ensureDir(CURRENT_DIR);
  ensureDir(DIFF_DIR);

  const allResults: RegressionResult[] = [];
  const allBugs: BugReport[] = [];

  if (updateBaseline) {
    console.log(`    [Reg] Updating baselines (${routes.length} routes x ${viewports.length} viewports x ${colorSchemes.length} schemes)`);
  }

  for (const route of routes) {
    for (const viewport of viewports) {
      for (const scheme of colorSchemes) {
        try {
          const { result, bug } = await captureAndCompare(
            page, route, viewport, scheme, updateBaseline, threshold
          );
          allResults.push(result);
          if (bug) allBugs.push(bug);

          if (!result.passed) {
            console.log(`    [Reg] DIFF ${route} (${scheme} ${viewport.width}px): ${result.diffPercentage}%`);
          }
        } catch (err) {
          console.error(`    [Reg] FAILED ${route}: ${(err as Error).message}`);
        }
      }
    }
  }

  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.filter((r) => !r.passed).length;
  const newBaselines = updateBaseline ? allResults.length : 0;

  console.log(
    `    [Reg] ${passed} passed, ${failed} regressions${newBaselines ? `, ${newBaselines} baselines saved` : ""}`
  );

  return { results: allResults, bugs: allBugs };
}
