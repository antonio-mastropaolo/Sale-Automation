"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  Clock,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Shield,
  Monitor,
  Zap,
  Eye,
  BarChart3,
  Palette,
  Accessibility,
  Globe,
  MousePointer,
  Server,
  Database,
  Bot,
  Navigation,
  FormInput,
  Lock,
  Box,
  Gauge,
  ScanEye,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  A: Eye,
  B: Palette,
  C: Monitor,
  D: Accessibility,
  E: Globe,
  F: MousePointer,
  G: Server,
  H: Database,
  I: Zap,
  J: Shield,
  K: BarChart3,
  L: Bot,
  M: Navigation,
  N: FormInput,
  O: Lock,
  P: Box,
  Q: Gauge,
  R: ScanEye,
};

const STATUS_COLORS = {
  passed: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  failed: { text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
  skipped: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
  timedOut: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
  interrupted: { text: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-950/30", border: "border-gray-200 dark:border-gray-800" },
};

const PIE_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#f97316"];

// ─── Helpers ─────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPassRateColor(rate: number): string {
  if (rate >= 95) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 80) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getPassRateGrade(rate: number): string {
  if (rate === 100) return "A+";
  if (rate >= 95) return "A";
  if (rate >= 90) return "A-";
  if (rate >= 85) return "B+";
  if (rate >= 80) return "B";
  if (rate >= 70) return "C";
  if (rate >= 60) return "D";
  return "F";
}

// ─── Component ───────────────────────────────────────────────────

export default function TestReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [suiteFilter, setSuiteFilter] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/test-report")
      .then((r) => {
        if (!r.ok) throw new Error("No test report found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handlePrintPDF = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadJSON = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // ─── Loading / Error ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading test report...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <h2 className="text-xl font-semibold">No Test Report Available</h2>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          {error || "Run your Playwright tests first to generate report data."}
        </p>
        <code className="bg-muted px-4 py-2 rounded-lg text-sm font-mono">
          npx playwright test
        </code>
      </div>
    );
  }

  // ─── Derived Data ───────────────────────────────────────────────

  const { summary, categories, tests, meta, suiteBreakdown } = data;

  const filteredCategories = categories.filter((cat) => {
    if (suiteFilter === "visual") return ["A", "B", "C", "D", "E", "F"].includes(cat.name);
    if (suiteFilter === "crash") return !["A", "B", "C", "D", "E", "F"].includes(cat.name);
    return true;
  });

  const filteredTests = tests.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (suiteFilter === "visual" && t.file.includes("crash")) return false;
    if (suiteFilter === "crash" && !t.file.includes("crash")) return false;
    return true;
  });

  const pieData = [
    { name: "Passed", value: summary.passed },
    ...(summary.failed > 0 ? [{ name: "Failed", value: summary.failed }] : []),
    ...(summary.skipped > 0 ? [{ name: "Skipped", value: summary.skipped }] : []),
  ];

  const barData = filteredCategories.map((c) => ({
    name: c.name,
    label: c.label,
    Passed: c.passed,
    Failed: c.failed,
    Skipped: c.skipped,
  }));

  const radarData = filteredCategories.map((c) => ({
    category: c.name,
    passRate: c.total > 0 ? Math.round((c.passed / c.total) * 100) : 0,
    fullMark: 100,
  }));

  const slowestTests = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 5);
  const avgDuration = tests.length > 0 ? tests.reduce((s, t) => s + t.duration, 0) / tests.length : 0;

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, aside, header, .no-print { display: none !important; }
          main { margin: 0 !important; padding: 16px !important; }
          .print-break { page-break-before: always; }
          .print-no-break { page-break-inside: avoid; }
          button { display: none !important; }
          @page { margin: 0.5in; size: A4 landscape; }
        }
      `}</style>

      <div ref={reportRef} className="space-y-6 max-w-7xl mx-auto">
        {/* ─── Header ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Test Report</h1>
                <p className="text-muted-foreground text-sm">{meta.project}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{formatTimestamp(meta.timestamp)}</span>
              <span>Playwright {meta.playwright}</span>
              <span>{meta.os}</span>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" onClick={handleDownloadJSON}>
              <Download className="h-4 w-4 mr-1.5" />
              JSON
            </Button>
            <Button size="sm" onClick={handlePrintPDF} className="bg-primary text-primary-foreground">
              <Download className="h-4 w-4 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>

        {/* ─── Summary Cards ───────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Tests</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.passed}</p>
              <p className="text-xs text-muted-foreground mt-1">Passed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-3xl font-bold ${summary.failed > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                {summary.failed}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Failed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-3xl font-bold ${summary.skipped > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {summary.skipped}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Skipped</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className={`text-3xl font-bold ${getPassRateColor(summary.passRate)}`}>
                {summary.passRate}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pass Rate</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm print-no-break">
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-3xl font-bold">{formatDuration(summary.duration)}</p>
              <p className="text-xs text-muted-foreground mt-1">Duration</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Grade Badge ─────────────────────────────────────── */}
        <Card className="border-0 shadow-sm print-no-break">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black ${
                summary.passRate === 100
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : summary.passRate >= 80
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              }`}>
                {getPassRateGrade(summary.passRate)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Overall Health</h3>
                <Progress
                  value={summary.passRate}
                  className="h-3 mb-2"
                />
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    {summary.passed} passed
                  </span>
                  {summary.failed > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      {summary.failed} failed
                    </span>
                  )}
                  {summary.skipped > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      {summary.skipped} skipped
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Suite Breakdown ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-no-break">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Visual Tests (palette.spec.ts)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{suiteBreakdown.visual.total}</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                  {suiteBreakdown.visual.total > 0
                    ? Math.round((suiteBreakdown.visual.passed / suiteBreakdown.visual.total) * 100)
                    : 0}% pass
                </Badge>
              </div>
              <Progress
                value={suiteBreakdown.visual.total > 0 ? (suiteBreakdown.visual.passed / suiteBreakdown.visual.total) * 100 : 0}
                className="h-2"
              />
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>{suiteBreakdown.visual.passed} passed</span>
                <span>{suiteBreakdown.visual.failed} failed</span>
                <span>{suiteBreakdown.visual.skipped} skipped</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Crash Tests (crash.spec.ts)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl font-bold">{suiteBreakdown.crash.total}</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
                  {suiteBreakdown.crash.total > 0
                    ? Math.round((suiteBreakdown.crash.passed / suiteBreakdown.crash.total) * 100)
                    : 0}% pass
                </Badge>
              </div>
              <Progress
                value={suiteBreakdown.crash.total > 0 ? (suiteBreakdown.crash.passed / suiteBreakdown.crash.total) * 100 : 0}
                className="h-2"
              />
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>{suiteBreakdown.crash.passed} passed</span>
                <span>{suiteBreakdown.crash.failed} failed</span>
                <span>{suiteBreakdown.crash.skipped} skipped</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Charts ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print-break">
          {/* Pie Chart */}
          <Card className="border-0 shadow-sm print-no-break">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Results Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Radar Chart */}
          <Card className="border-0 shadow-sm print-no-break">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Category Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Pass Rate"
                    dataKey="passRate"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip formatter={(val: number) => `${val}%`} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart — full width */}
        <Card className="border-0 shadow-sm print-no-break print-break">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tests by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(label) => {
                    const cat = barData.find((b) => b.name === label);
                    return cat ? `${label} — ${cat.label}` : label;
                  }}
                />
                <Legend />
                <Bar dataKey="Passed" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Failed" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Skipped" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ─── Performance Insights ────────────────────────────── */}
        <Card className="border-0 shadow-sm print-no-break">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{formatDuration(summary.duration)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Duration</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{formatDuration(Math.round(avgDuration))}</p>
                <p className="text-xs text-muted-foreground mt-1">Avg per Test</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-center">
                <p className="text-xl font-bold">{formatDuration(slowestTests[0]?.duration || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Slowest Test</p>
              </div>
            </div>

            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Top 5 Slowest Tests
            </h4>
            <div className="space-y-2">
              {slowestTests.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 text-right font-mono text-xs">{i + 1}.</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    {formatDuration(t.duration)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Filters ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 no-print">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter:</span>
          </div>

          <div className="flex gap-1.5">
            {[
              { value: "all", label: "All" },
              { value: "passed", label: "Passed" },
              { value: "failed", label: "Failed" },
              { value: "skipped", label: "Skipped" },
            ].map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "default" : "outline"}
                onClick={() => setStatusFilter(value)}
                className="text-xs h-7"
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="h-5 w-px bg-border" />

          <div className="flex gap-1.5">
            {[
              { value: "all", label: "All Suites" },
              { value: "visual", label: "Visual" },
              { value: "crash", label: "Crash" },
            ].map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant={suiteFilter === value ? "default" : "outline"}
                onClick={() => setSuiteFilter(value)}
                className="text-xs h-7"
              >
                {label}
              </Button>
            ))}
          </div>

          <span className="text-xs text-muted-foreground ml-auto">
            Showing {filteredTests.length} of {tests.length} tests
          </span>
        </div>

        {/* ─── Category Details ────────────────────────────────── */}
        <div className="space-y-3 print-break">
          {filteredCategories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] || FileText;
            const isExpanded = expandedCategories.has(cat.name);
            const catTests = filteredTests.filter((t) => t.category === cat.name);
            const catPassRate = cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0;

            return (
              <Card key={cat.name} className="border-0 shadow-sm print-no-break">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full text-left"
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {cat.name} — {cat.label}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${catPassRate === 100 ? "text-emerald-600 border-emerald-200" : catPassRate >= 80 ? "text-amber-600 border-amber-200" : "text-red-600 border-red-200"}`}
                          >
                            {catPassRate}%
                          </Badge>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{cat.total} tests</span>
                          <span className="text-emerald-600">{cat.passed} passed</span>
                          {cat.failed > 0 && <span className="text-red-600">{cat.failed} failed</span>}
                          {cat.skipped > 0 && <span className="text-amber-600">{cat.skipped} skipped</span>}
                          <span>{formatDuration(cat.duration)}</span>
                        </div>
                      </div>
                      <div className="no-print">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <Progress value={catPassRate} className="h-1.5 mt-3" />
                  </CardContent>
                </button>

                {isExpanded && catTests.length > 0 && (
                  <div className="border-t mx-4 mb-4">
                    <div className="divide-y">
                      {catTests.map((t) => {
                        const sc = STATUS_COLORS[t.status] || STATUS_COLORS.passed;
                        return (
                          <div key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                            <div className={`p-1 rounded ${sc.bg}`}>
                              {t.status === "passed" ? (
                                <CheckCircle2 className={`h-3.5 w-3.5 ${sc.text}`} />
                              ) : t.status === "failed" ? (
                                <XCircle className={`h-3.5 w-3.5 ${sc.text}`} />
                              ) : (
                                <SkipForward className={`h-3.5 w-3.5 ${sc.text}`} />
                              )}
                            </div>
                            <span className="flex-1 truncate text-sm">{t.title}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatDuration(t.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* ─── Footer ──────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground py-6 border-t">
          <p>
            Generated by CrossList Test Suite &bull; {formatTimestamp(meta.timestamp)} &bull;{" "}
            {summary.total} tests across {categories.length} categories
          </p>
        </div>
      </div>
    </>
  );
}
