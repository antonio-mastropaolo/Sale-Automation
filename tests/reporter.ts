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
}

const CATEGORY_LABELS: Record<string, string> = {
  A: "Auth — Login / Register / Logout",
  B: "Auth — Password Reset Flow",
  C: "Auth — Session & Middleware",
  D: "Listings — CRUD Operations",
  E: "Listings — Batch Operations",
  F: "Listings — Bulk CSV Import",
  G: "Templates — CRUD",
  H: "Sales & P/L — Recording & Stats",
  I: "AI APIs — Optimize / Enhance",
  J: "AI APIs — Smart List / Trends / Competitor",
  K: "AI APIs — Price Intel / Health / Negotiate",
  L: "Settings — Provider & Prompts",
  M: "Platform Connections",
  N: "Scheduler — CRUD",
  O: "Export — CSV Downloads",
  P: "Page Navigation — All Routes",
  Q: "Edge Cases & Error Handling",
  R: "Performance — Response Times",
  S: "Shipping Calculator",
  T: "Onboarding Wizard",
  T1: "Trends — API Response Structure",
  T2: "Trends — Data Validation",
  T3: "Trends — Performance",
  T4: "Trends — Edge Cases",
  P1: "Platforms — Connect API",
  P2: "Platforms — Config API",
  P3: "Platforms — AI Optimization",
  P4: "Platforms — Scheduler",
  P5: "Platforms — Batch Operations",
  P6: "Platforms — Export",
  P7: "Platforms — Branding Consistency",
  P8: "Platforms — Trend Tips",
  P9: "Platforms — Image Search",
  P10: "Platforms — Competitor Discovery",
  T5: "Trends — Page UI",
};

class JSONReporter implements Reporter {
  private tests: TestEntry[] = [];
  private startTime = 0;

  onBegin(_config: FullConfig, _suite: Suite) {
    this.startTime = Date.now();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const suiteName = test.parent?.title || "Unknown";
    const categoryMatch = suiteName.match(/^([A-Z]\d*)\s/);
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

  onEnd(_result: FullResult) {
    const duration = Date.now() - this.startTime;

    const passed = this.tests.filter((t) => t.status === "passed").length;
    const failed = this.tests.filter((t) => t.status === "failed").length;
    const skipped = this.tests.filter((t) => t.status === "skipped").length;
    const total = this.tests.length;

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

    const reportData: ReportData = {
      meta: {
        timestamp: new Date().toISOString(),
        duration,
        project: "ListBlitz — Sales Automation Hub",
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
    };

    const outDir = path.join(process.cwd(), "docs");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(
      path.join(outDir, "report-data.json"),
      JSON.stringify(reportData, null, 2)
    );
  }
}

export default JSONReporter;
