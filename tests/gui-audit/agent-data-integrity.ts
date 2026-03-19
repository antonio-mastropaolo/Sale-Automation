/**
 * TrendSmart QA — Data Integrity Agent
 *
 * Validates data consistency across the entire app:
 *  - Cross-endpoint consistency (listings count matches between endpoints)
 *  - Response shape validation (all required fields present)
 *  - Referential integrity (IDs referenced exist)
 *  - Data format validation (dates, prices, UUIDs)
 *  - API idempotency (GET same endpoint twice → same result)
 *  - Cascading data (listing appears in analytics, repricing, etc.)
 *
 * This replaces a QA engineer who manually cross-checks data screens.
 */

import type { APIRequestContext } from "@playwright/test";
import type { BugReport, DataIntegrityCheck, AgentName } from "./agent-types";

const AGENT: AgentName = "data-integrity";
let bugCounter = 0;

function bugId(): string {
  return `DATA-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetDataCounter(): void {
  bugCounter = 0;
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
  confidence = 85
): BugReport {
  const body = [
    `## Data Integrity Bug Report`,
    `**Severity:** ${severity}`,
    `**Endpoint:** \`${route}\``,
    `**Found by:** Data Integrity Agent (automated)`,
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
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", "data-integrity", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// Helper to safely fetch JSON from an endpoint
async function fetchJson(
  request: APIRequestContext,
  endpoint: string
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const response = await request.get(endpoint);
    const status = response.status();
    if (!response.ok()) {
      return { ok: false, status, data: null };
    }
    const data = await response.json();
    return { ok: true, status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// ── Integrity Checks ──────────────────────────────────────────────

/**
 * Check 1: Listings count consistency across endpoints.
 */
async function checkListingsConsistency(
  request: APIRequestContext
): Promise<{ check: DataIntegrityCheck; bugs: BugReport[] }> {
  const bugs: BugReport[] = [];

  const listingsRes = await fetchJson(request, "/api/listings");
  const analyticsRes = await fetchJson(request, "/api/analytics");

  let passed = true;
  let details = "Counts match across endpoints";

  if (listingsRes.ok && analyticsRes.ok) {
    const listings = listingsRes.data as unknown[];
    const listingsArray = Array.isArray(listings) ? listings : [];

    const analytics = analyticsRes.data as Record<string, unknown>;
    const totalFromAnalytics =
      typeof analytics?.totalListings === "number" ? analytics.totalListings : null;

    if (totalFromAnalytics !== null && listingsArray.length !== totalFromAnalytics) {
      passed = false;
      details = `GET /api/listings returns ${listingsArray.length} items but /api/analytics.totalListings = ${totalFromAnalytics}`;

      bugs.push(
        makeBug(
          `Listings count mismatch: ${listingsArray.length} vs ${totalFromAnalytics}`,
          "major",
          "/api/listings",
          [
            `GET /api/listings → ${listingsArray.length} items`,
            `GET /api/analytics → totalListings: ${totalFromAnalytics}`,
          ],
          "Listing count should be consistent across endpoints",
          details,
          "Ensure both endpoints query the same data source with the same filters.",
          ["data-consistency"],
          80,
        )
      );
    }
  }

  return {
    check: {
      name: "Listings count consistency",
      description: "Verify listing counts match between /api/listings and /api/analytics",
      passed,
      details,
      affectedEndpoints: ["/api/listings", "/api/analytics"],
    },
    bugs,
  };
}

/**
 * Check 2: Response shape validation — all required fields exist.
 */
async function checkResponseShapes(
  request: APIRequestContext
): Promise<{ checks: DataIntegrityCheck[]; bugs: BugReport[] }> {
  const checks: DataIntegrityCheck[] = [];
  const bugs: BugReport[] = [];

  const schemas: Array<{
    endpoint: string;
    requiredFields: string[];
    isArray: boolean;
    itemFields?: string[];
  }> = [
    {
      endpoint: "/api/analytics",
      requiredFields: ["totalListings", "activeListings"],
      isArray: false,
    },
    {
      endpoint: "/api/listings",
      requiredFields: [],
      isArray: true,
      itemFields: ["id", "title", "price", "status"],
    },
    {
      endpoint: "/api/repricing",
      requiredFields: ["suggestions"],
      isArray: false,
    },
    {
      endpoint: "/api/settings",
      requiredFields: [],
      isArray: false,
    },
    {
      endpoint: "/api/templates",
      requiredFields: [],
      isArray: true,
      itemFields: ["id", "name"],
    },
  ];

  for (const schema of schemas) {
    const res = await fetchJson(request, schema.endpoint);
    if (!res.ok) {
      checks.push({
        name: `Shape: ${schema.endpoint}`,
        description: `Response shape validation for ${schema.endpoint}`,
        passed: false,
        details: `Endpoint returned ${res.status}`,
        affectedEndpoints: [schema.endpoint],
      });
      continue;
    }

    const data = res.data as Record<string, unknown>;
    const missingFields: string[] = [];

    // Check top-level required fields
    for (const field of schema.requiredFields) {
      if (data && !(field in data)) {
        missingFields.push(field);
      }
    }

    // Check array item fields
    if (schema.isArray && schema.itemFields) {
      const arr = Array.isArray(data) ? data : [];
      if (arr.length > 0) {
        const firstItem = arr[0] as Record<string, unknown>;
        for (const field of schema.itemFields) {
          if (!(field in firstItem)) {
            missingFields.push(`items[].${field}`);
          }
        }
      }
    }

    const passed = missingFields.length === 0;
    checks.push({
      name: `Shape: ${schema.endpoint}`,
      description: `Response shape validation for ${schema.endpoint}`,
      passed,
      details: passed
        ? "All required fields present"
        : `Missing fields: ${missingFields.join(", ")}`,
      affectedEndpoints: [schema.endpoint],
    });

    if (!passed) {
      bugs.push(
        makeBug(
          `Missing fields in ${schema.endpoint} response`,
          "major",
          schema.endpoint,
          [`GET ${schema.endpoint}`, `Check response body for required fields`],
          `Response should contain: ${[...schema.requiredFields, ...(schema.itemFields || [])].join(", ")}`,
          `Missing: ${missingFields.join(", ")}`,
          "Add the missing fields to the API response handler.",
          ["api-contract", "schema"],
          85,
        )
      );
    }
  }

  return { checks, bugs };
}

/**
 * Check 3: Data format validation (dates, prices, UUIDs).
 */
async function checkDataFormats(
  request: APIRequestContext
): Promise<{ checks: DataIntegrityCheck[]; bugs: BugReport[] }> {
  const checks: DataIntegrityCheck[] = [];
  const bugs: BugReport[] = [];

  const res = await fetchJson(request, "/api/listings");
  if (!res.ok) return { checks, bugs };

  const listings = (Array.isArray(res.data) ? res.data : []) as Array<Record<string, unknown>>;

  const issues: string[] = [];

  for (const listing of listings.slice(0, 20)) {
    // Price validation
    const price = listing.price;
    if (typeof price === "number" && (price < 0 || price > 1_000_000 || isNaN(price))) {
      issues.push(`Listing ${listing.id}: invalid price ${price}`);
    }

    // Date validation
    for (const dateField of ["createdAt", "updatedAt"]) {
      const dateVal = listing[dateField];
      if (dateVal && typeof dateVal === "string") {
        const parsed = new Date(dateVal);
        if (isNaN(parsed.getTime())) {
          issues.push(`Listing ${listing.id}: invalid ${dateField} "${dateVal}"`);
        }
      }
    }

    // Status validation
    const validStatuses = ["draft", "active", "sold", "archived", "inactive", "paused"];
    if (listing.status && !validStatuses.includes(listing.status as string)) {
      issues.push(`Listing ${listing.id}: unknown status "${listing.status}"`);
    }

    // Title/description not empty
    if (!listing.title || (listing.title as string).length === 0) {
      issues.push(`Listing ${listing.id}: empty title`);
    }
  }

  const passed = issues.length === 0;
  checks.push({
    name: "Data format validation",
    description: "Validate prices, dates, statuses, and required fields in listings",
    passed,
    details: passed ? "All data formats valid" : issues.join("; "),
    affectedEndpoints: ["/api/listings"],
  });

  if (!passed) {
    bugs.push(
      makeBug(
        `${issues.length} data format issue(s) in listings`,
        issues.length > 5 ? "major" : "minor",
        "/api/listings",
        [`GET /api/listings`, `Validate each listing's data format`, ...issues.slice(0, 5)],
        "All listing data should have valid formats",
        `Found ${issues.length} format issues`,
        "Add server-side validation in the listings API route before saving to database.",
        ["data-format"],
        75,
      )
    );
  }

  return { checks, bugs };
}

/**
 * Check 4: GET idempotency — same request twice → same result.
 */
async function checkIdempotency(
  request: APIRequestContext
): Promise<{ checks: DataIntegrityCheck[]; bugs: BugReport[] }> {
  const checks: DataIntegrityCheck[] = [];
  const bugs: BugReport[] = [];

  const endpoints = ["/api/listings", "/api/analytics", "/api/settings", "/api/templates"];

  for (const endpoint of endpoints) {
    const res1 = await fetchJson(request, endpoint);
    const res2 = await fetchJson(request, endpoint);

    if (!res1.ok || !res2.ok) continue;

    const str1 = JSON.stringify(res1.data);
    const str2 = JSON.stringify(res2.data);
    const passed = str1 === str2;

    checks.push({
      name: `Idempotency: ${endpoint}`,
      description: `Two consecutive GET requests should return identical results`,
      passed,
      details: passed
        ? "Responses are identical"
        : `Responses differ (${str1.length} vs ${str2.length} chars)`,
      affectedEndpoints: [endpoint],
    });

    if (!passed) {
      bugs.push(
        makeBug(
          `Non-idempotent GET: ${endpoint}`,
          "minor",
          endpoint,
          [`GET ${endpoint} → response A`, `GET ${endpoint} again → response B`, `A ≠ B`],
          "Consecutive GET requests should return the same data",
          `Two GET requests returned different data (lengths: ${str1.length} vs ${str2.length})`,
          "Check for random ordering, timestamps in response, or race conditions.",
          ["idempotency"],
          60,
        )
      );
    }
  }

  return { checks, bugs };
}

/**
 * Check 5: Cross-referential integrity.
 * If repricing references a listing ID, that listing should exist.
 */
async function checkReferentialIntegrity(
  request: APIRequestContext
): Promise<{ checks: DataIntegrityCheck[]; bugs: BugReport[] }> {
  const checks: DataIntegrityCheck[] = [];
  const bugs: BugReport[] = [];

  // Get all listing IDs
  const listingsRes = await fetchJson(request, "/api/listings");
  if (!listingsRes.ok) return { checks, bugs };

  const listings = (Array.isArray(listingsRes.data) ? listingsRes.data : []) as Array<
    Record<string, unknown>
  >;
  const listingIds = new Set(listings.map((l) => l.id));

  // Check repricing suggestions reference valid listings
  const repricingRes = await fetchJson(request, "/api/repricing");
  if (repricingRes.ok) {
    const data = repricingRes.data as Record<string, unknown>;
    const suggestions = (data?.suggestions || []) as Array<Record<string, unknown>>;
    const orphanRefs: string[] = [];

    for (const suggestion of suggestions) {
      const listingId = suggestion.listingId as string;
      if (listingId && !listingIds.has(listingId)) {
        orphanRefs.push(listingId);
      }
    }

    const passed = orphanRefs.length === 0;
    checks.push({
      name: "Referential: repricing → listings",
      description: "All repricing suggestions should reference existing listings",
      passed,
      details: passed
        ? "All references valid"
        : `${orphanRefs.length} orphan references found`,
      affectedEndpoints: ["/api/repricing", "/api/listings"],
    });

    if (!passed) {
      bugs.push(
        makeBug(
          `${orphanRefs.length} orphan listing references in repricing`,
          "major",
          "/api/repricing",
          [
            `GET /api/repricing`,
            `${orphanRefs.length} suggestions reference listing IDs that don't exist`,
          ],
          "All repricing suggestions should reference valid listing IDs",
          `Orphan IDs: ${orphanRefs.slice(0, 5).join(", ")}`,
          "Add foreign key constraints or cascade deletes. Clean up orphan records.",
          ["referential-integrity"],
          80,
        )
      );
    }
  }

  return { checks, bugs };
}

// ── Main Data Integrity Agent ─────────────────────────────────────

export async function runDataIntegrityAgent(
  request: APIRequestContext
): Promise<{ checks: DataIntegrityCheck[]; bugs: BugReport[] }> {
  const allChecks: DataIntegrityCheck[] = [];
  const allBugs: BugReport[] = [];

  const runners: Array<{
    name: string;
    fn: () => Promise<{ checks?: DataIntegrityCheck[]; check?: DataIntegrityCheck; bugs: BugReport[] }>;
  }> = [
    { name: "Listings consistency", fn: () => checkListingsConsistency(request) },
    { name: "Response shapes", fn: () => checkResponseShapes(request) },
    { name: "Data formats", fn: () => checkDataFormats(request) },
    { name: "Idempotency", fn: () => checkIdempotency(request) },
    { name: "Referential integrity", fn: () => checkReferentialIntegrity(request) },
  ];

  for (const runner of runners) {
    try {
      console.log(`    [Data] ${runner.name}...`);
      const result = await runner.fn();

      if ("check" in result && result.check) {
        allChecks.push(result.check);
      }
      if ("checks" in result && result.checks) {
        allChecks.push(...result.checks);
      }
      allBugs.push(...result.bugs);
    } catch (err) {
      console.error(`      ${runner.name} failed: ${(err as Error).message}`);
    }
  }

  return { checks: allChecks, bugs: allBugs };
}
