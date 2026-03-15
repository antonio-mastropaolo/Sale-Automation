"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  FadeInUp,
  StaggerContainer,
  StaggerItem,
  CountUp,
  motion,
} from "@/components/motion";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Download,
  FileText,
  BarChart3,
  Shield,
  Zap,
  Filter,
  Search,
  Loader2,
  Share2,
  Eye,
  Palette,
  Monitor,
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
  ChevronDown,
  ChevronRight,
  Award,
  Activity,
  TrendingUp,
  Hash,
} from "lucide-react";

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
  suiteBreakdown?: {
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
  S: Activity,
  T: TrendingUp,
};

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
    weekday: "short",
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

function getPassRateBg(rate: number): string {
  if (rate === 100) return "bg-emerald-500";
  if (rate >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function getCategoryCardBorder(rate: number): string {
  if (rate === 100) return "ring-emerald-500/20";
  if (rate >= 80) return "ring-amber-500/20";
  return "ring-red-500/20";
}

// ─── Circular Progress Ring ──────────────────────────────────────

function CircularProgress({
  value,
  size = 160,
  strokeWidth = 10,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color =
    value === 100
      ? "#22c55e"
      : value >= 80
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <CountUp
          value={value}
          suffix="%"
          className={`text-4xl font-black tabular-nums ${getPassRateColor(value)}`}
          duration={1.5}
        />
        <span className="text-xs text-muted-foreground mt-0.5">pass rate</span>
      </div>
    </div>
  );
}

// ─── Status Icon helper ──────────────────────────────────────────

function StatusIcon({ status, size = 16 }: { status: string; size?: number }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 size={size} className="text-emerald-500" />;
    case "failed":
    case "timedOut":
    case "interrupted":
      return <XCircle size={size} className="text-red-500" />;
    case "skipped":
      return <MinusCircle size={size} className="text-amber-500" />;
    default:
      return <MinusCircle size={size} className="text-gray-400" />;
  }
}

// ─── Component ───────────────────────────────────────────────────

export default function TestReportPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

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

  const handlePrintPDF = useCallback(() => {
    window.print();
  }, []);

  const toggleError = useCallback((id: string) => {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Filtered tests
  const filteredTests = useMemo(() => {
    if (!data) return [];
    return data.tests.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.suite.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, statusFilter, searchQuery]);

  // Performance tests (category R)
  const perfTests = useMemo(() => {
    if (!data) return [];
    return data.tests
      .filter((t) => t.category === "R")
      .sort((a, b) => b.duration - a.duration);
  }, [data]);

  // Slowest tests overall
  const slowestTests = useMemo(() => {
    if (!data) return [];
    return [...data.tests].sort((a, b) => b.duration - a.duration).slice(0, 8);
  }, [data]);

  // ─── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading test report...</p>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────

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

  const { summary, categories, meta } = data;
  const avgDuration =
    data.tests.length > 0
      ? data.tests.reduce((s, t) => s + t.duration, 0) / data.tests.length
      : 0;

  // ─── Render ────────────────────────────────────────────────────

  return (
    <>
      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          nav, aside, header, footer,
          [data-slot="sidebar"],
          [data-slot="header"],
          .no-print {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 12px !important;
            max-width: 100% !important;
          }
          * {
            box-shadow: none !important;
            animation: none !important;
            transition: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .print-no-break {
            page-break-inside: avoid;
          }
          .overflow-x-auto, .overflow-hidden, .overflow-y-auto {
            overflow: visible !important;
          }
          @page {
            margin: 0.5in;
            size: A4 landscape;
          }
        }
      `}</style>

      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* ════════════════════════════════════════════════════════
            SECTION 1 — Hero
        ════════════════════════════════════════════════════════ */}
        <FadeInUp>
          <Card className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-border/40">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

            <CardContent className="relative pt-8 pb-8">
              {/* Top row: title + buttons */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-3 rounded-2xl">
                      <Shield className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-black tracking-tight">
                        Stress Test Report
                      </h1>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        {meta.project}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTimestamp(meta.timestamp)}
                    </span>
                    <span className="text-border">|</span>
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      {formatDuration(meta.duration)} total
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <Badge variant="outline" className="text-xs px-3 py-1 gap-1.5">
                    <Share2 className="h-3 w-3" />
                    Share Report
                  </Badge>
                  <Button
                    size="lg"
                    onClick={handlePrintPDF}
                    className="bg-primary text-primary-foreground gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF Report
                  </Button>
                </div>
              </div>

              {/* Hero content: circular ring + summary badges */}
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                {/* Circular progress ring */}
                <div className="flex-shrink-0">
                  <CircularProgress value={summary.passRate} />
                </div>

                {/* Summary badge grid */}
                <StaggerContainer className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1 w-full">
                  <StaggerItem>
                    <div className="rounded-2xl bg-card ring-1 ring-border/40 p-5 text-center">
                      <div className="text-3xl font-black tabular-nums">
                        <CountUp value={summary.total} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider">
                        Total
                      </p>
                    </div>
                  </StaggerItem>

                  <StaggerItem>
                    <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 ring-1 ring-emerald-200/40 dark:ring-emerald-800/40 p-5 text-center">
                      <div className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                        <CountUp value={summary.passed} />
                      </div>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1.5 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Passed
                      </p>
                    </div>
                  </StaggerItem>

                  <StaggerItem>
                    <div className={`rounded-2xl p-5 text-center ${
                      summary.failed > 0
                        ? "bg-red-50 dark:bg-red-950/20 ring-1 ring-red-200/40 dark:ring-red-800/40"
                        : "bg-card ring-1 ring-border/40"
                    }`}>
                      <div className={`text-3xl font-black tabular-nums ${
                        summary.failed > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}>
                        <CountUp value={summary.failed} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </p>
                    </div>
                  </StaggerItem>

                  <StaggerItem>
                    <div className={`rounded-2xl p-5 text-center ${
                      summary.skipped > 0
                        ? "bg-amber-50 dark:bg-amber-950/20 ring-1 ring-amber-200/40 dark:ring-amber-800/40"
                        : "bg-card ring-1 ring-border/40"
                    }`}>
                      <div className={`text-3xl font-black tabular-nums ${
                        summary.skipped > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground"
                      }`}>
                        <CountUp value={summary.skipped} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 font-medium uppercase tracking-wider flex items-center justify-center gap-1">
                        <MinusCircle className="h-3 w-3" />
                        Skipped
                      </p>
                    </div>
                  </StaggerItem>
                </StaggerContainer>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* ════════════════════════════════════════════════════════
            SECTION 2 — Category Breakdown Grid
        ════════════════════════════════════════════════════════ */}
        <FadeInUp delay={0.15}>
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Category Breakdown</h2>
              <p className="text-sm text-muted-foreground">
                {categories.length} test categories across {data.tests.length} tests
              </p>
            </div>
          </div>
        </FadeInUp>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.name] || FileText;
            const catPassRate =
              cat.total > 0 ? Math.round((cat.passed / cat.total) * 100) : 0;

            return (
              <StaggerItem key={cat.name}>
                <Card
                  className={`rounded-2xl bg-card ring-1 ${getCategoryCardBorder(catPassRate)} hover:ring-2 transition-all print-no-break`}
                >
                  <CardContent className="pt-5 pb-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${
                            catPassRate === 100
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : catPassRate >= 80
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                          }`}
                        >
                          {cat.name}
                        </div>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono tabular-nums ${
                          catPassRate === 100
                            ? "text-emerald-600 border-emerald-300 dark:border-emerald-700"
                            : catPassRate >= 80
                              ? "text-amber-600 border-amber-300 dark:border-amber-700"
                              : "text-red-600 border-red-300 dark:border-red-700"
                        }`}
                      >
                        {catPassRate}%
                      </Badge>
                    </div>

                    {/* Label */}
                    <p className="text-sm font-semibold leading-snug mb-3 line-clamp-2">
                      {cat.label}
                    </p>

                    {/* Pass rate bar */}
                    <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden mb-3">
                      <motion.div
                        className={`absolute inset-y-0 left-0 rounded-full ${getPassRateBg(catPassRate)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${catPassRate}%` }}
                        transition={{
                          duration: 1,
                          ease: [0.25, 0.46, 0.45, 0.94],
                          delay: 0.4,
                        }}
                      />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex gap-2">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          {cat.passed}
                        </span>
                        {cat.failed > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            {cat.failed}
                          </span>
                        )}
                        {cat.skipped > 0 && (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            {cat.skipped}
                          </span>
                        )}
                      </div>
                      <span className="font-mono">{formatDuration(cat.duration)}</span>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* ════════════════════════════════════════════════════════
            SECTION 3 — Individual Test Results Table
        ════════════════════════════════════════════════════════ */}
        <FadeInUp delay={0.2} className="print-break">
          <Card className="rounded-2xl bg-card ring-1 ring-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Individual Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5 no-print">
                {/* Search */}
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Status filter buttons */}
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-muted-foreground mr-1" />
                  {[
                    { value: "all", label: "All", count: data.tests.length },
                    { value: "passed", label: "Passed", count: summary.passed },
                    { value: "failed", label: "Failed", count: summary.failed },
                    { value: "skipped", label: "Skipped", count: summary.skipped },
                  ].map(({ value, label, count }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={statusFilter === value ? "default" : "outline"}
                      onClick={() => setStatusFilter(value)}
                      className="text-xs h-7 gap-1"
                    >
                      {label}
                      <span className="opacity-60">({count})</span>
                    </Button>
                  ))}
                </div>

                <span className="text-xs text-muted-foreground ml-auto hidden sm:inline">
                  Showing {filteredTests.length} of {data.tests.length}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl ring-1 ring-border/30">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-10">
                        #
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground w-10">
                        Status
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
                        Test
                      </th>
                      <th className="text-left py-2.5 px-3 font-medium text-muted-foreground hidden md:table-cell">
                        Suite
                      </th>
                      <th className="text-right py-2.5 px-3 font-medium text-muted-foreground w-24">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.map((t, i) => {
                      const rowBg =
                        t.status === "failed"
                          ? "bg-red-50/50 dark:bg-red-950/10"
                          : t.status === "skipped"
                            ? "bg-amber-50/50 dark:bg-amber-950/10"
                            : i % 2 === 0
                              ? ""
                              : "bg-muted/20";
                      const hasErrors =
                        t.status === "failed" && t.errors && t.errors.length > 0;
                      const isErrorExpanded = expandedErrors.has(t.id);

                      return (
                        <tr
                          key={t.id}
                          className={`border-b border-border/30 last:border-0 ${rowBg} transition-colors hover:bg-muted/30`}
                        >
                          <td className="py-2 px-3 text-xs text-muted-foreground font-mono tabular-nums">
                            {i + 1}
                          </td>
                          <td className="py-2 px-3">
                            <StatusIcon status={t.status} />
                          </td>
                          <td className="py-2 px-3">
                            <div>
                              <span className="font-medium">{t.title}</span>
                              {hasErrors && (
                                <button
                                  onClick={() => toggleError(t.id)}
                                  className="ml-2 text-xs text-red-500 hover:text-red-700 inline-flex items-center gap-0.5 no-print"
                                >
                                  {isErrorExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  error
                                </button>
                              )}
                              {hasErrors && isErrorExpanded && (
                                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
                                  {t.errors.join("\n\n")}
                                </pre>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground hidden md:table-cell">
                            <Badge variant="outline" className="text-xs font-mono">
                              {t.category}
                            </Badge>
                            <span className="ml-1.5 text-xs">{t.suite}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                            {formatDuration(t.duration)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredTests.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No tests match your current filters.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* ════════════════════════════════════════════════════════
            SECTION 4 — Performance Section
        ════════════════════════════════════════════════════════ */}
        <FadeInUp delay={0.25} className="print-break">
          <Card className="rounded-2xl bg-card ring-1 ring-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Quick stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-muted/30 p-4 text-center print-no-break">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDuration(summary.duration)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Duration</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-4 text-center print-no-break">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDuration(Math.round(avgDuration))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Average per Test</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-4 text-center print-no-break">
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDuration(slowestTests[0]?.duration || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Slowest Test</p>
                </div>
              </div>

              {/* Performance tests (category R) */}
              {perfTests.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Performance Test Results (Category R)
                  </h3>
                  <div className="space-y-2">
                    {perfTests.map((t) => {
                      const maxDuration = perfTests[0]?.duration || 1;
                      const barWidth = Math.max(
                        (t.duration / maxDuration) * 100,
                        3
                      );

                      return (
                        <div key={t.id} className="print-no-break">
                          <div className="flex items-center gap-3 mb-1">
                            <StatusIcon status={t.status} size={14} />
                            <span className="text-sm flex-1 truncate">
                              {t.title}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground tabular-nums">
                              {formatDuration(t.duration)}
                            </span>
                          </div>
                          <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden ml-7">
                            <motion.div
                              className={`absolute inset-y-0 left-0 rounded-full ${
                                t.duration > 3000
                                  ? "bg-amber-500"
                                  : t.duration > 5000
                                    ? "bg-red-500"
                                    : "bg-blue-500"
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{
                                duration: 0.8,
                                ease: [0.25, 0.46, 0.45, 0.94],
                                delay: 0.5,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Top 8 slowest tests */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Slowest Tests Overall
                </h3>
                <div className="space-y-2">
                  {slowestTests.map((t, i) => {
                    const maxDuration = slowestTests[0]?.duration || 1;
                    const barWidth = Math.max(
                      (t.duration / maxDuration) * 100,
                      3
                    );

                    return (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 print-no-break"
                      >
                        <span className="text-muted-foreground w-5 text-right font-mono text-xs tabular-nums">
                          {i + 1}.
                        </span>
                        <StatusIcon status={t.status} size={14} />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">
                            {t.title}
                          </span>
                          <div className="relative h-1.5 rounded-full bg-muted/50 overflow-hidden mt-1">
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded-full bg-primary/60"
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{
                                duration: 0.8,
                                ease: [0.25, 0.46, 0.45, 0.94],
                                delay: 0.5 + i * 0.05,
                              }}
                            />
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-mono tabular-nums ml-2">
                          {formatDuration(t.duration)}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* ════════════════════════════════════════════════════════
            SECTION 5 — Category Duration Breakdown
        ════════════════════════════════════════════════════════ */}
        <FadeInUp delay={0.3} className="print-break">
          <Card className="rounded-2xl bg-card ring-1 ring-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Duration by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...categories]
                  .sort((a, b) => b.duration - a.duration)
                  .map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.name] || FileText;
                    const maxDuration = Math.max(
                      ...categories.map((c) => c.duration)
                    );
                    const barWidth = Math.max(
                      (cat.duration / maxDuration) * 100,
                      2
                    );
                    const catPassRate =
                      cat.total > 0
                        ? Math.round((cat.passed / cat.total) * 100)
                        : 0;

                    return (
                      <div
                        key={cat.name}
                        className="flex items-center gap-3 print-no-break"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            catPassRate === 100
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : catPassRate >= 80
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                          }`}
                        >
                          {cat.name}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium truncate">
                              {cat.label}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground tabular-nums ml-2">
                              {formatDuration(cat.duration)}
                            </span>
                          </div>
                          <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                              className="absolute inset-y-0 left-0 rounded-full bg-blue-500/70"
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{
                                duration: 0.8,
                                ease: [0.25, 0.46, 0.45, 0.94],
                                delay: 0.3,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* ════════════════════════════════════════════════════════
            SECTION 6 — Meta Information Footer
        ════════════════════════════════════════════════════════ */}
        <FadeInUp delay={0.35}>
          <Card className="rounded-2xl bg-card ring-1 ring-border/40">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Environment Details</h3>
                    <p className="text-xs text-muted-foreground">
                      Test execution metadata
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
                    <Hash className="h-3 w-3" />
                    Playwright {meta.playwright}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
                    <Server className="h-3 w-3" />
                    Node {meta.nodeVersion}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
                    <Monitor className="h-3 w-3" />
                    {meta.os}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(meta.timestamp)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInUp>

        {/* ── Footer text ── */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/40">
          <p>
            Generated by ListBlitz Test Suite &bull;{" "}
            {summary.total} tests across {categories.length} categories &bull;{" "}
            {formatTimestamp(meta.timestamp)}
          </p>
        </div>
      </div>
    </>
  );
}
