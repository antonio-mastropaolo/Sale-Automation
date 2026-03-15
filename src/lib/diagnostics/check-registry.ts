/**
 * Diagnostic Check Registry
 *
 * Single source of truth for all diagnostic categories and their checks.
 * Shared between client (rendering) and server (dispatching).
 */

export interface CheckDefinition {
  id: string;
  name: string;
  description: string;
}

export interface CategoryDefinition {
  id: string;
  label: string;
  icon: string;
  checks: CheckDefinition[];
}

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface CheckResult {
  id: string;
  name: string;
  status: CheckStatus;
  latencyMs: number;
  message?: string;
  detail?: string;
}

export interface CategoryResult {
  categoryId: string;
  checks: CheckResult[];
  ranAt: string;
  durationMs: number;
}

export const DIAGNOSTIC_CATEGORIES: CategoryDefinition[] = [
  {
    id: "auth",
    label: "Authentication",
    icon: "Shield",
    checks: [
      { id: "auth-session", name: "Session Validity", description: "Verify current session exists" },
      { id: "auth-env", name: "Auth Environment", description: "Check JWT secret and auth config" },
      { id: "auth-password", name: "Password Hashing", description: "Verify password uses bcrypt" },
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: "Database",
    checks: [
      { id: "db-connection", name: "Connection", description: "Test database connectivity" },
      { id: "db-latency", name: "Query Latency", description: "Measure round-trip query time" },
      { id: "db-tables", name: "Table Integrity", description: "Verify core tables exist and have data" },
    ],
  },
  {
    id: "ai-providers",
    label: "AI Providers",
    icon: "Brain",
    checks: [
      { id: "ai-default-key", name: "Default Provider Key", description: "Check default AI provider has an API key" },
      { id: "ai-connectivity", name: "AI Connectivity", description: "Test AI provider with minimal request" },
      { id: "ai-all-keys", name: "All Provider Keys", description: "Report configured vs missing API keys" },
    ],
  },
  {
    id: "platforms",
    label: "Platform Connections",
    icon: "Globe",
    checks: [
      { id: "plat-credentials", name: "Stored Credentials", description: "Check which platforms have credentials saved" },
      { id: "plat-encryption", name: "Credential Encryption", description: "Verify credentials are decryptable" },
      { id: "plat-connectivity", name: "Platform Reachability", description: "Test connectivity to marketplace sites" },
    ],
  },
  {
    id: "listings",
    label: "Listings",
    icon: "Package",
    checks: [
      { id: "list-count", name: "Listing Count", description: "Report total listings and status breakdown" },
      { id: "list-images", name: "Image Storage", description: "Verify listing images are accessible" },
      { id: "list-publish", name: "Publish Pipeline", description: "Check platform automation classes are loaded" },
    ],
  },
  {
    id: "prompts",
    label: "Prompt Studio",
    icon: "FileCode",
    checks: [
      { id: "prompt-defaults", name: "Default Prompts", description: "Verify all default prompt templates exist" },
      { id: "prompt-overrides", name: "Custom Overrides", description: "Check user prompt overrides are valid" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: "Gauge",
    checks: [
      { id: "perf-memory", name: "Memory Usage", description: "Check Node.js heap memory utilization" },
      { id: "perf-api", name: "API Response Time", description: "Measure internal API round-trip" },
      { id: "perf-env", name: "Environment", description: "Verify critical environment variables" },
    ],
  },
];

export const TOTAL_CHECK_COUNT = DIAGNOSTIC_CATEGORIES.reduce(
  (sum, cat) => sum + cat.checks.length, 0
);

export function getCategoryById(id: string): CategoryDefinition | undefined {
  return DIAGNOSTIC_CATEGORIES.find((c) => c.id === id);
}

export function getAggregateStatus(result: CategoryResult): CheckStatus {
  const statuses = result.checks.map((c) => c.status);
  if (statuses.some((s) => s === "fail")) return "fail";
  if (statuses.some((s) => s === "warn")) return "warn";
  if (statuses.every((s) => s === "skip")) return "skip";
  return "pass";
}
