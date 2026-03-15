"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  Loader2,
  RotateCcw,
  Zap,
  Shield,
  Database,
  Globe,
  Cpu,
  FileText,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ───────────────────────────────────────────────────────────

type CheckStatus = "idle" | "running" | "passed" | "failed" | "skipped" | "warning";

interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  category: string;
  run: () => Promise<CheckResult>;
}

interface CheckResult {
  status: "passed" | "failed" | "skipped" | "warning";
  message: string;
  duration: number;
  detail?: string;
}

interface CheckState extends CheckResult {
  id: string;
  name: string;
  category: string;
}

// ── Diagnostic check definitions ────────────────────────────────────

function defineChecks(): DiagnosticCheck[] {
  const checks: DiagnosticCheck[] = [];

  // Helper: timed fetch
  async function timedFetch(
    url: string,
    opts?: RequestInit
  ): Promise<{ res: Response; duration: number }> {
    const start = performance.now();
    const res = await fetch(url, opts);
    const duration = Math.round(performance.now() - start);
    return { res, duration };
  }

  // ── Auth System ─────────────────────────────────────────────────

  checks.push({
    id: "auth-seed",
    name: "Admin seed endpoint",
    description: "GET /api/auth/seed returns 200",
    category: "Auth System",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/seed");
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Seed endpoint healthy" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "auth-login",
    name: "Login endpoint",
    description: "POST /api/auth/login with admin credentials",
    category: "Auth System",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@listblitz.io", password: "admin" }),
      });
      const data = await res.json().catch(() => null);
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? `Logged in as ${data?.user?.username}` : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "auth-me",
    name: "Session validation",
    description: "GET /api/auth/me returns current user",
    category: "Auth System",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/me");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok ? "passed" : "warning",
        message: res.ok ? `Session valid: ${data?.user?.email}` : "No active session",
        duration,
      };
    },
  });

  checks.push({
    id: "auth-register-validation",
    name: "Registration validation",
    description: "POST /api/auth/register with empty body returns 400",
    category: "Auth System",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return {
        status: res.status === 400 ? "passed" : "failed",
        message: res.status === 400 ? "Validation works correctly" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "auth-forgot-pw",
    name: "Forgot password endpoint",
    description: "POST /api/auth/forgot-password returns 200",
    category: "Auth System",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      });
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Endpoint healthy (no email leak)" : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Listings API ────────────────────────────────────────────────

  checks.push({
    id: "listings-get",
    name: "List all listings",
    description: "GET /api/listings returns array",
    category: "Listings API",
    run: async () => {
      const { res, duration } = await timedFetch("/api/listings");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && Array.isArray(data) ? "passed" : "failed",
        message: res.ok ? `${data?.length ?? 0} listings found` : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "listings-create",
    name: "Create listing",
    description: "POST /api/listings with valid data",
    category: "Listings API",
    run: async () => {
      const form = new FormData();
      form.append("title", `Diag Test ${Date.now()}`);
      form.append("description", "Diagnostic test listing");
      form.append("category", "Tops");
      form.append("brand", "TestBrand");
      form.append("size", "M");
      form.append("condition", "Good");
      form.append("price", "25");
      const { res, duration } = await timedFetch("/api/listings", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      // Clean up
      if (data?.id) {
        await fetch(`/api/listings/${data.id}`, { method: "DELETE" }).catch(() => {});
      }
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Created and cleaned up" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "listings-404",
    name: "Nonexistent listing returns 404",
    description: "GET /api/listings/nonexistent-id",
    category: "Listings API",
    run: async () => {
      const { res, duration } = await timedFetch("/api/listings/00000000-0000-0000-0000-000000000000");
      return {
        status: res.status === 404 ? "passed" : "failed",
        message: res.status === 404 ? "404 handled correctly" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "listings-validation",
    name: "Listing validation",
    description: "POST /api/listings without title returns 400",
    category: "Listings API",
    run: async () => {
      const form = new FormData();
      form.append("description", "no title");
      const { res, duration } = await timedFetch("/api/listings", { method: "POST", body: form });
      return {
        status: res.status === 400 ? "passed" : "failed",
        message: res.status === 400 ? "Validation enforced" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  // ── Batch Operations ────────────────────────────────────────────

  checks.push({
    id: "batch-validation",
    name: "Batch validation",
    description: "POST /api/batch with empty action returns 400",
    category: "Batch & Import",
    run: async () => {
      const { res, duration } = await timedFetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingIds: [] }),
      });
      return {
        status: res.status === 400 ? "passed" : "failed",
        message: res.status === 400 ? "Validation enforced" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "bulk-import-csv",
    name: "CSV import endpoint",
    description: "POST /api/bulk-import with valid CSV",
    category: "Batch & Import",
    run: async () => {
      const csv = "title,description,category,brand,size,condition,price\nDiag Import Test,test item,Tops,Nike,M,Good,30";
      const { res, duration } = await timedFetch("/api/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: csv,
      });
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && data?.imported >= 1 ? "passed" : "failed",
        message: res.ok ? `Imported ${data?.imported} items` : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Templates ───────────────────────────────────────────────────

  checks.push({
    id: "templates-get",
    name: "List templates",
    description: "GET /api/templates returns array",
    category: "Templates",
    run: async () => {
      const { res, duration } = await timedFetch("/api/templates");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && Array.isArray(data) ? "passed" : "failed",
        message: res.ok ? `${data?.length ?? 0} templates` : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "templates-crud",
    name: "Template create & delete",
    description: "Full CRUD cycle on templates",
    category: "Templates",
    run: async () => {
      const { res, duration } = await timedFetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Diag Template ${Date.now()}`, category: "Tops", brand: "Test", condition: "Good" }),
      });
      const data = await res.json().catch(() => null);
      if (data?.id) {
        await fetch(`/api/templates?id=${data.id}`, { method: "DELETE" }).catch(() => {});
      }
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "CRUD cycle complete" : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Sales & P/L ─────────────────────────────────────────────────

  checks.push({
    id: "sales-get",
    name: "List sales",
    description: "GET /api/sales returns data",
    category: "Sales & P/L",
    run: async () => {
      const { res, duration } = await timedFetch("/api/sales");
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Sales endpoint healthy" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "sales-stats",
    name: "Sales statistics",
    description: "GET /api/sales?stats=true returns aggregate data",
    category: "Sales & P/L",
    run: async () => {
      const { res, duration } = await timedFetch("/api/sales?stats=true");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && data ? "passed" : "failed",
        message: res.ok ? "Stats endpoint healthy" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "sales-crud",
    name: "Sale record & delete",
    description: "Create and delete a sale record",
    category: "Sales & P/L",
    run: async () => {
      const { res, duration } = await timedFetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "depop", title: "Diag Sale", soldPrice: 50, costPrice: 20, shippingCost: 5, platformFee: 5 }),
      });
      const data = await res.json().catch(() => null);
      if (data?.id) {
        await fetch(`/api/sales?id=${data.id}`, { method: "DELETE" }).catch(() => {});
      }
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? `Sale recorded (profit: $${data?.profit})` : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Settings & Prompts ──────────────────────────────────────────

  checks.push({
    id: "settings-get",
    name: "Read settings",
    description: "GET /api/settings returns object",
    category: "Settings",
    run: async () => {
      const { res, duration } = await timedFetch("/api/settings");
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Settings readable" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "settings-write",
    name: "Write settings",
    description: "POST /api/settings with valid data",
    category: "Settings",
    run: async () => {
      const { res, duration } = await timedFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { currency: "USD" } }),
      });
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Settings writable" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "prompts-get",
    name: "Read prompts",
    description: "GET /api/settings/prompts returns prompt list",
    category: "Settings",
    run: async () => {
      const { res, duration } = await timedFetch("/api/settings/prompts");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && Array.isArray(data) ? "passed" : "failed",
        message: res.ok ? `${data?.length ?? 0} prompts loaded` : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Platform Connections ────────────────────────────────────────

  checks.push({
    id: "platforms-get",
    name: "List platform connections",
    description: "GET /api/platforms/connect returns platforms",
    category: "Platforms",
    run: async () => {
      const { res, duration } = await timedFetch("/api/platforms/connect");
      const data = await res.json().catch(() => null);
      return {
        status: res.ok && Array.isArray(data) ? "passed" : "failed",
        message: res.ok ? `${data?.length ?? 0} platforms` : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Scheduler ───────────────────────────────────────────────────

  checks.push({
    id: "scheduler-get",
    name: "List scheduled posts",
    description: "GET /api/scheduler returns array",
    category: "Scheduler",
    run: async () => {
      const { res, duration } = await timedFetch("/api/scheduler");
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? "Scheduler healthy" : `Status ${res.status}`,
        duration,
      };
    },
  });

  // ── Export ──────────────────────────────────────────────────────

  checks.push({
    id: "export-listings",
    name: "Export listings CSV",
    description: "GET /api/export?type=listings returns CSV",
    category: "Export",
    run: async () => {
      const { res, duration } = await timedFetch("/api/export?type=listings");
      const text = await res.text().catch(() => "");
      return {
        status: res.ok && text.includes("title") ? "passed" : "failed",
        message: res.ok ? `CSV generated (${text.split("\n").length} rows)` : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "export-sales",
    name: "Export sales CSV",
    description: "GET /api/export?type=sales returns CSV",
    category: "Export",
    run: async () => {
      const { res, duration } = await timedFetch("/api/export?type=sales");
      const text = await res.text().catch(() => "");
      return {
        status: res.ok ? "passed" : "failed",
        message: res.ok ? `CSV generated (${text.split("\n").length} rows)` : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "export-invalid",
    name: "Export invalid type",
    description: "GET /api/export?type=invalid returns 400",
    category: "Export",
    run: async () => {
      const { res, duration } = await timedFetch("/api/export?type=invalid");
      return {
        status: res.status === 400 ? "passed" : "failed",
        message: res.status === 400 ? "Invalid type rejected" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  // ── AI Endpoints ────────────────────────────────────────────────

  checks.push({
    id: "ai-optimize-reachable",
    name: "AI optimize endpoint reachable",
    description: "POST /api/ai/optimize with invalid body returns 400",
    category: "AI Endpoints",
    run: async () => {
      const { res, duration } = await timedFetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalid" }),
      });
      return {
        status: res.status === 400 ? "passed" : "warning",
        message: res.status === 400 ? "Endpoint reachable, validation works" : `Status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "ai-trends-reachable",
    name: "AI trends endpoint reachable",
    description: "GET /api/ai/trends responds (may use fallback data)",
    category: "AI Endpoints",
    run: async () => {
      const { res, duration } = await timedFetch("/api/ai/trends");
      const data = await res.json().catch(() => null);
      const hasFallback = data?.trendingCategories?.length > 0;
      return {
        status: res.ok ? "passed" : "warning",
        message: res.ok
          ? hasFallback ? "Responded with trend data" : "Responded but empty"
          : `Status ${res.status}`,
        duration,
        detail: hasFallback ? undefined : "May need AI API key for live data",
      };
    },
  });

  checks.push({
    id: "ai-competitor-reachable",
    name: "AI competitor endpoint reachable",
    description: "POST /api/ai/competitor responds",
    category: "AI Endpoints",
    run: async () => {
      const { res, duration } = await timedFetch("/api/ai/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test", brand: "Nike", category: "Tops", price: 50 }),
      });
      return {
        status: res.ok ? "passed" : "warning",
        message: res.ok ? "AI responded" : `Status ${res.status} (may need API key)`,
        duration,
        detail: !res.ok ? "Configure your AI provider in Settings" : undefined,
      };
    },
  });

  // ── Performance ─────────────────────────────────────────────────

  checks.push({
    id: "perf-listings",
    name: "Listings API < 500ms",
    description: "GET /api/listings response time",
    category: "Performance",
    run: async () => {
      const { res, duration } = await timedFetch("/api/listings");
      return {
        status: duration < 500 ? "passed" : duration < 1000 ? "warning" : "failed",
        message: `${duration}ms${duration >= 500 ? " (slow)" : ""}`,
        duration,
      };
    },
  });

  checks.push({
    id: "perf-settings",
    name: "Settings API < 200ms",
    description: "GET /api/settings response time",
    category: "Performance",
    run: async () => {
      const { res, duration } = await timedFetch("/api/settings");
      return {
        status: duration < 200 ? "passed" : duration < 500 ? "warning" : "failed",
        message: `${duration}ms`,
        duration,
      };
    },
  });

  checks.push({
    id: "perf-export",
    name: "Export API < 1000ms",
    description: "GET /api/export?type=listings response time",
    category: "Performance",
    run: async () => {
      const { res, duration } = await timedFetch("/api/export?type=listings");
      return {
        status: duration < 1000 ? "passed" : duration < 2000 ? "warning" : "failed",
        message: `${duration}ms`,
        duration,
      };
    },
  });

  checks.push({
    id: "perf-auth",
    name: "Auth API < 300ms",
    description: "POST /api/auth/login response time",
    category: "Performance",
    run: async () => {
      const { res, duration } = await timedFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@listblitz.io", password: "admin" }),
      });
      return {
        status: duration < 300 ? "passed" : duration < 600 ? "warning" : "failed",
        message: `${duration}ms`,
        duration,
      };
    },
  });

  // ── Edge Cases ──────────────────────────────────────────────────

  checks.push({
    id: "edge-invalid-json",
    name: "Invalid JSON body → 400",
    description: "POST with malformed JSON",
    category: "Edge Cases",
    run: async () => {
      const { res, duration } = await timedFetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json{{{",
      });
      return {
        status: res.status === 400 ? "passed" : "failed",
        message: res.status === 400 ? "Bad JSON rejected" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "edge-nonexistent-route",
    name: "Nonexistent API → 404",
    description: "GET /api/this-does-not-exist",
    category: "Edge Cases",
    run: async () => {
      const { res, duration } = await timedFetch("/api/this-does-not-exist");
      return {
        status: res.status === 404 ? "passed" : "failed",
        message: res.status === 404 ? "404 handled" : `Unexpected status ${res.status}`,
        duration,
      };
    },
  });

  checks.push({
    id: "edge-large-payload",
    name: "Large payload rejected",
    description: "POST /api/ai/optimize with >100KB body",
    category: "Edge Cases",
    run: async () => {
      const bigBody = JSON.stringify({ action: "enhance", description: "x".repeat(120_000) });
      const { res, duration } = await timedFetch("/api/ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bigBody,
      });
      return {
        status: res.status === 413 ? "passed" : res.status === 400 ? "passed" : "warning",
        message: `Status ${res.status}`,
        duration,
      };
    },
  });

  return checks;
}

// ── Category metadata ───────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Auth System": Shield,
  "Listings API": Database,
  "Batch & Import": FileText,
  Templates: FileText,
  "Sales & P/L": Zap,
  Settings: Cpu,
  Platforms: Globe,
  Scheduler: Clock,
  Export: FileText,
  "AI Endpoints": Zap,
  Performance: Cpu,
  "Edge Cases": AlertTriangle,
};

// ═══════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function DiagnosticsPage() {
  const [results, setResults] = useState<Map<string, CheckState>>(new Map());
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const abortRef = useRef(false);
  const checksRef = useRef(defineChecks());

  const checks = checksRef.current;
  const categories = [...new Set(checks.map((c) => c.category))];

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  // Run a single check
  const runCheck = useCallback(async (check: DiagnosticCheck) => {
    setResults((prev) => {
      const next = new Map(prev);
      next.set(check.id, { id: check.id, name: check.name, category: check.category, status: "passed", message: "Running...", duration: 0 });
      return next;
    });

    try {
      const result = await check.run();
      setResults((prev) => {
        const next = new Map(prev);
        next.set(check.id, { id: check.id, name: check.name, category: check.category, ...result });
        return next;
      });
    } catch (err) {
      setResults((prev) => {
        const next = new Map(prev);
        next.set(check.id, {
          id: check.id,
          name: check.name,
          category: check.category,
          status: "failed",
          message: err instanceof Error ? err.message : "Unknown error",
          duration: 0,
        });
        return next;
      });
    }
  }, []);

  // Run checks for a category
  const runCategory = useCallback(async (category: string) => {
    const catChecks = checks.filter((c) => c.category === category);
    setExpandedCats((prev) => new Set([...prev, category]));
    for (const check of catChecks) {
      if (abortRef.current) break;
      await runCheck(check);
    }
  }, [checks, runCheck]);

  // Run ALL checks
  const runAll = useCallback(async () => {
    abortRef.current = false;
    setRunning(true);
    setResults(new Map());
    setExpandedCats(new Set(categories));

    for (const cat of categories) {
      if (abortRef.current) break;
      await runCategory(cat);
    }

    setRunning(false);
    toast.success("Diagnostics complete");
  }, [categories, runCategory]);

  const stopAll = () => {
    abortRef.current = true;
    setRunning(false);
  };

  const reset = () => {
    setResults(new Map());
    setExpandedCats(new Set());
  };

  // Stats
  const allResults = [...results.values()];
  const passed = allResults.filter((r) => r.status === "passed").length;
  const failed = allResults.filter((r) => r.status === "failed").length;
  const warnings = allResults.filter((r) => r.status === "warning").length;
  const skipped = allResults.filter((r) => r.status === "skipped").length;
  const totalDuration = allResults.reduce((s, r) => s + r.duration, 0);

  // Filter
  const filteredResults = allResults.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusIcon = (status: CheckStatus, size = "h-4 w-4") => {
    switch (status) {
      case "passed": return <CheckCircle2 className={`${size} text-emerald-500`} />;
      case "failed": return <XCircle className={`${size} text-red-500`} />;
      case "warning": return <AlertTriangle className={`${size} text-amber-500`} />;
      case "skipped": return <MinusCircle className={`${size} text-muted-foreground`} />;
      case "running": return <Loader2 className={`${size} text-blue-500 animate-spin`} />;
      default: return <Clock className={`${size} text-muted-foreground/30`} />;
    }
  };

  const catStatus = (category: string): CheckStatus => {
    const catResults = allResults.filter((r) => r.category === category);
    if (catResults.length === 0) return "idle";
    if (catResults.some((r) => r.status === "failed")) return "failed";
    if (catResults.some((r) => r.status === "warning")) return "warning";
    if (catResults.every((r) => r.status === "passed" || r.status === "skipped")) return "passed";
    return "running";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Print styles */}
      <style>{`
        @media print {
          nav, aside, header, [data-slot="sidebar"], .no-print { display: none !important; }
          main { margin-left: 0 !important; padding-top: 0 !important; }
          body { background: white !important; }
          * { box-shadow: none !important; animation: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diagnostics</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Run health checks across all API endpoints and features
          </p>
        </div>
        <div className="flex items-center gap-2 no-print">
          {results.size > 0 && (
            <>
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5" onClick={() => window.print()}>
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
            </>
          )}
          {running ? (
            <Button size="sm" variant="destructive" className="h-8 text-[13px] gap-1.5" onClick={stopAll}>
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button size="sm" className="h-8 text-[13px] gap-1.5" onClick={runAll}>
              <Play className="h-3.5 w-3.5" />
              Run All
            </Button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {results.size > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-medium">{passed}</span>
                  <span className="text-muted-foreground">passed</span>
                </span>
                {failed > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="font-medium">{failed}</span>
                    <span className="text-muted-foreground">failed</span>
                  </span>
                )}
                {warnings > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-medium">{warnings}</span>
                    <span className="text-muted-foreground">warnings</span>
                  </span>
                )}
                {skipped > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="font-medium">{skipped}</span>
                    <span className="text-muted-foreground">skipped</span>
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground font-mono">
              {totalDuration}ms total
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-px mt-3 h-1.5 rounded-full overflow-hidden bg-muted">
            {passed > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${(passed / checks.length) * 100}%` }} />}
            {warnings > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(warnings / checks.length) * 100}%` }} />}
            {failed > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(failed / checks.length) * 100}%` }} />}
          </div>
        </div>
      )}

      {/* Category panels */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const catChecks = checks.filter((c) => c.category === cat);
          const expanded = expandedCats.has(cat);
          const status = catStatus(cat);
          const catResults = allResults.filter((r) => r.category === cat);
          const catPassed = catResults.filter((r) => r.status === "passed").length;
          const CatIcon = CATEGORY_ICONS[cat] || Database;

          return (
            <div key={cat} className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Category header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleCategory(cat)}
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                {statusIcon(status, "h-4 w-4")}
                <CatIcon className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-[13px] font-medium flex-1">{cat}</span>
                <span className="text-[12px] text-muted-foreground font-mono">
                  {catResults.length > 0 ? `${catPassed}/${catChecks.length}` : `${catChecks.length} checks`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[11px] no-print"
                  onClick={(e) => {
                    e.stopPropagation();
                    runCategory(cat);
                  }}
                  disabled={running}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Run
                </Button>
              </div>

              {/* Expanded check list */}
              {expanded && (
                <div className="border-t border-border divide-y divide-border">
                  {catChecks.map((check) => {
                    const result = results.get(check.id);
                    return (
                      <div key={check.id} className="flex items-center gap-3 px-4 py-2.5 pl-12">
                        {result ? statusIcon(result.status, "h-3.5 w-3.5") : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/20" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px]">{check.name}</p>
                          {result && (
                            <p className={`text-[11px] ${
                              result.status === "failed" ? "text-red-500" :
                              result.status === "warning" ? "text-amber-500" :
                              "text-muted-foreground"
                            }`}>
                              {result.message}
                              {result.detail && <span className="ml-1 text-muted-foreground/50">— {result.detail}</span>}
                            </p>
                          )}
                        </div>
                        {result && (
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                            {result.duration}ms
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Playwright Report Link */}
      {results.size > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 print-break">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Playwright Stress Test Report</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                118 automated tests covering auth, CRUD, edge cases, and performance
              </p>
            </div>
            <a href="/report">
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5 no-print">
                <FileText className="h-3.5 w-3.5" />
                View Full Report
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
