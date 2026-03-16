"use client";

import { useState, useEffect } from "react";
import {
  Play, Loader2, CheckCircle2, XCircle, MinusCircle, ChevronRight,
  FlaskConical, Clock, BarChart3, RefreshCw, AlertTriangle,
} from "lucide-react";

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  file: string;
  error?: string;
}

interface TestSuite {
  file: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

interface TestRun {
  summary: {
    suites: number;
    tests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    success: boolean;
    ranAt: string;
  };
  suites: TestSuite[];
}

const STORAGE_KEY = "listblitz:test-runs";
const MAX_HISTORY = 20;

function loadHistory(): TestRun[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveHistory(runs: TestRun[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(runs.slice(0, MAX_HISTORY))); }
  catch { /* ignore */ }
}

function statusIcon(status: string) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
  return <MinusCircle className="h-4 w-4 text-slate-400 shrink-0" />;
}

function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Summary Card ──

function SummaryCard({ run }: { run: TestRun }) {
  const { summary } = run;
  const passRate = summary.tests > 0 ? Math.round((summary.passed / summary.tests) * 100) : 0;

  return (
    <div className={`rounded-xl border-2 p-4 sm:p-5 ${summary.success ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
      <div className="flex items-center gap-3 mb-4">
        {summary.success
          ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          : <XCircle className="h-6 w-6 text-red-500" />}
        <div>
          <p className="text-lg font-bold">{summary.success ? "All Tests Passing" : `${summary.failed} Test${summary.failed !== 1 ? "s" : ""} Failed`}</p>
          <p className="text-xs text-muted-foreground">{relativeTime(summary.ranAt)} &middot; {formatDuration(summary.duration)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-2xl font-bold">{summary.tests}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
        </div>
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-2xl font-bold text-emerald-500">{summary.passed}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Passed</p>
        </div>
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-2xl font-bold text-red-500">{summary.failed}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Failed</p>
        </div>
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-2xl font-bold text-slate-400">{summary.skipped}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Skipped</p>
        </div>
        <div className="rounded-lg bg-card p-3 text-center">
          <p className="text-2xl font-bold">{passRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pass Rate</p>
        </div>
      </div>

      {/* Pass rate bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${passRate}%` }} />
      </div>
    </div>
  );
}

// ── Suite Row ──

function SuiteRow({ suite }: { suite: TestSuite }) {
  const [expanded, setExpanded] = useState(suite.failed > 0);
  const [filter, setFilter] = useState<"all" | "fail">("all");

  const filtered = filter === "fail" ? suite.results.filter((r) => r.status === "fail") : suite.results;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors">
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${suite.failed > 0 ? "bg-red-500" : "bg-emerald-500"}`} />
        <span className="text-sm font-semibold flex-1 truncate">{suite.file}</span>
        <span className="text-[11px] text-muted-foreground font-mono shrink-0">{formatDuration(suite.duration)}</span>
        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-emerald-500 font-medium">{suite.passed}</span>
          {suite.failed > 0 && <span className="text-red-500 font-medium">{suite.failed}</span>}
          {suite.skipped > 0 && <span className="text-slate-400">{suite.skipped}</span>}
          <span className="text-muted-foreground">/ {suite.tests}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border animate-fade-in">
          {/* Filter tabs */}
          {suite.failed > 0 && (
            <div className="flex gap-1 px-4 py-2 border-b border-border/50">
              <button onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${filter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                All ({suite.tests})
              </button>
              <button onClick={() => setFilter("fail")} className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${filter === "fail" ? "bg-red-500 text-white" : "text-muted-foreground hover:bg-muted"}`}>
                Failed ({suite.failed})
              </button>
            </div>
          )}

          <div className="divide-y divide-border/30 max-h-[400px] overflow-y-auto">
            {filtered.map((test, i) => (
              <TestRow key={i} test={test} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Test Row ──

function TestRow({ test }: { test: TestResult }) {
  const [showError, setShowError] = useState(false);

  // Parse test name: "Section > Test Name" pattern
  const parts = test.name.split(" > ");
  const section = parts.length > 1 ? parts.slice(0, -1).join(" > ") : "";
  const name = parts[parts.length - 1];

  return (
    <div className="space-y-0">
      <div className="flex items-center gap-2.5 px-4 py-1.5 text-xs">
        {statusIcon(test.status)}
        <div className="flex-1 min-w-0">
          {section && <span className="text-muted-foreground mr-1.5">{section} &rsaquo;</span>}
          <span className={`font-medium ${test.status === "fail" ? "text-red-600 dark:text-red-400" : ""}`}>{name}</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">{test.duration}ms</span>
        {test.error && (
          <button onClick={() => setShowError(!showError)} className="text-[10px] font-medium text-red-500 hover:underline shrink-0">
            {showError ? "Hide" : "Error"}
          </button>
        )}
      </div>
      {showError && test.error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-500/5 border border-red-500/10 px-3 py-2 text-[11px] font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap overflow-x-auto">
          {test.error}
        </div>
      )}
    </div>
  );
}

// ── History Chart ──

function HistoryChart({ runs }: { runs: TestRun[] }) {
  if (runs.length < 2) return null;
  const recent = runs.slice(0, 10).reverse();
  const maxTests = Math.max(...recent.map((r) => r.summary.tests));

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">Run History</p>
        <span className="text-xs text-muted-foreground">Last {recent.length} runs</span>
      </div>
      <div className="flex items-end gap-1.5 h-24">
        {recent.map((run, i) => {
          const pct = maxTests > 0 ? (run.summary.passed / maxTests) * 100 : 0;
          const failPct = maxTests > 0 ? (run.summary.failed / maxTests) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${run.summary.passed}/${run.summary.tests} passed — ${relativeTime(run.summary.ranAt)}`}>
              <div className="w-full flex flex-col justify-end h-20">
                {failPct > 0 && <div className="w-full bg-red-500 rounded-t" style={{ height: `${failPct}%`, minHeight: failPct > 0 ? "2px" : 0 }} />}
                <div className="w-full bg-emerald-500 rounded-b" style={{ height: `${pct}%`, minHeight: "2px" }} />
              </div>
              <span className="text-[8px] text-muted-foreground">{run.summary.tests}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Passed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Failed</span>
      </div>
    </div>
  );
}

// ── Page ──

export default function TestDashboard() {
  const [running, setRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<TestRun | null>(null);
  const [history, setHistory] = useState<TestRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // Load latest run on mount
  useEffect(() => {
    const h = loadHistory();
    if (h.length > 0) setCurrentRun(h[0]);
  }, []);

  const runTests = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostics/test-runner");
      const data = await res.json();
      if (data.error) {
        setError(data.error + (data.detail ? `: ${data.detail}` : ""));
        setRunning(false);
        return;
      }
      setCurrentRun(data);
      const newHistory = [data, ...history].slice(0, MAX_HISTORY);
      setHistory(newHistory);
      saveHistory(newHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run tests");
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Test Suite</h1>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Run and visualize all automated tests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); setCurrentRun(null); localStorage.removeItem(STORAGE_KEY); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear history
            </button>
          )}
          <button
            onClick={runTests}
            disabled={running}
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition-all ${
              running ? "bg-primary/80 text-primary-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {running ? <><Loader2 className="h-4 w-4 animate-spin" />Running...</> : <><Play className="h-4 w-4" />Run All Tests</>}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Test run failed</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Running state */}
      {running && (
        <div className="rounded-xl bg-card border border-border p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm font-medium">Running test suite...</p>
          <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Summary */}
      {currentRun && !running && <SummaryCard run={currentRun} />}

      {/* History chart */}
      {!running && <HistoryChart runs={history} />}

      {/* Suite results */}
      {currentRun && !running && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{currentRun.summary.suites} Test Suites</p>
          </div>
          {currentRun.suites.map((suite, i) => (
            <SuiteRow key={i} suite={suite} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!currentRun && !running && !error && (
        <div className="rounded-xl bg-card border border-dashed border-border p-12 text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No test results yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Click &quot;Run All Tests&quot; to execute the test suite</p>
        </div>
      )}
    </div>
  );
}
