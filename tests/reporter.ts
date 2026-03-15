import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

interface TestEntry {
  id: string;
  title: string;
  suite: string;
  category: string;
  file: string;
  status: "passed" | "failed" | "skipped" | "timedOut" | "interrupted";
  duration: number;
  retries: number;
  errors: string[];
}

interface CategorySummary {
  name: string;
  label: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface ReportData {
  meta: {
    timestamp: string;
    duration: number;
    project: string;
    playwright: string;
    nodeVersion: string;
    os: string;
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: number;
    duration: number;
  };
  categories: CategorySummary[];
  tests: TestEntry[];
  suiteBreakdown: {
    visual: { total: number; passed: number; failed: number; skipped: number };
    crash: { total: number; passed: number; failed: number; skipped: number };
  };
}

// Category labels map
const CATEGORY_LABELS: Record<string, string> = {
  A: "Full-page Screenshots",
  B: "CSS Token Verification",
  C: "Component Colors",
  D: "WCAG Contrast",
  E: "Responsive Layout",
  F: "Interactive States",
  G: "Listings API Crash",
  H: "Single Listing API",
  I: "Optimize/Publish API",
  J: "Platform Connect API",
  K: "Analytics API",
  L: "AI API Crash",
  M: "Page Navigation",
  N: "Form Interaction",
  O: "HTTP Method Enforcement",
  P: "Large Payload & Edge Cases",
  Q: "Performance Benchmarks",
  R: "Accessibility Audit",
};

class JSONReporter implements Reporter {
  private tests: TestEntry[] = [];
  private startTime = 0;

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteName = test.parent?.title || "Unknown";
    const categoryMatch = suiteName.match(/^([A-Z])\s/);
    const category = categoryMatch ? categoryMatch[1] : "?";

    this.tests.push({
      id: test.id,
      title: test.title,
      suite: suiteName,
      category,
      file: path.basename(test.location.file),
      status: result.status,
      duration: result.duration,
      retries: result.retry,
      errors: result.errors.map((e) => e.message || String(e)),
    });
  }

  onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;

    const passed = this.tests.filter((t) => t.status === "passed").length;
    const failed = this.tests.filter((t) => t.status === "failed").length;
    const skipped = this.tests.filter((t) => t.status === "skipped").length;
    const total = this.tests.length;

    // Build category summaries
    const catMap = new Map<string, TestEntry[]>();
    for (const t of this.tests) {
      const arr = catMap.get(t.category) || [];
      arr.push(t);
      catMap.set(t.category, arr);
    }

    const categories: CategorySummary[] = [];
    for (const [cat, tests] of catMap.entries()) {
      categories.push({
        name: cat,
        label: CATEGORY_LABELS[cat] || "Unknown",
        total: tests.length,
        passed: tests.filter((t) => t.status === "passed").length,
        failed: tests.filter((t) => t.status === "failed").length,
        skipped: tests.filter((t) => t.status === "skipped").length,
        duration: tests.reduce((sum, t) => sum + t.duration, 0),
      });
    }
    categories.sort((a, b) => a.name.localeCompare(b.name));

    // Suite breakdown
    const visualTests = this.tests.filter((t) => t.file.includes("palette"));
    const crashTests = this.tests.filter((t) => t.file.includes("crash"));

    const suiteBreakdown = {
      visual: {
        total: visualTests.length,
        passed: visualTests.filter((t) => t.status === "passed").length,
        failed: visualTests.filter((t) => t.status === "failed").length,
        skipped: visualTests.filter((t) => t.status === "skipped").length,
      },
      crash: {
        total: crashTests.length,
        passed: crashTests.filter((t) => t.status === "passed").length,
        failed: crashTests.filter((t) => t.status === "failed").length,
        skipped: crashTests.filter((t) => t.status === "skipped").length,
      },
    };

    const reportData: ReportData = {
      meta: {
        timestamp: new Date().toISOString(),
        duration,
        project: "Sale-Automation (CrossList)",
        playwright: "1.58.2",
        nodeVersion: process.version,
        os: `${process.platform} ${process.arch}`,
      },
      summary: {
        total,
        passed,
        failed,
        skipped,
        passRate: total > 0 ? Math.round((passed / total) * 10000) / 100 : 0,
        duration,
      },
      categories,
      tests: this.tests,
      suiteBreakdown,
    };

    const outDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
      path.join(outDir, "report-data.json"),
      JSON.stringify(reportData, null, 2)
    );
  }
}

export default JSONReporter;
