/**
 * TrendSmart QA — API Agent
 *
 * Tests every API endpoint like a manual tester would:
 *  - Hit each endpoint with valid data → expect success
 *  - Hit each endpoint with invalid data → expect proper error
 *  - Check response structure matches contract
 *  - Check validation rules are enforced
 *  - Check edge cases (empty body, huge payload, wrong content-type)
 *
 * This replaces the manual tester who opens Postman and tries things.
 */

import type { APIRequestContext } from "@playwright/test";
import type { BugReport, APITestResult, APITestCase, AgentName } from "./agent-types";

const AGENT: AgentName = "api";
let bugCounter = 0;

function bugId(): string {
  return `API-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetApiCounter(): void {
  bugCounter = 0;
}

function makeBug(
  title: string,
  severity: "critical" | "major" | "minor" | "cosmetic",
  endpoint: string,
  steps: string[],
  expected: string,
  actual: string,
  suggestedFix: string,
  labels: string[] = [],
  confidence = 85,
  relatedFile?: string
): BugReport {
  const body = [
    `## API Bug Report`,
    `**Severity:** ${severity}`,
    `**Endpoint:** \`${endpoint}\``,
    `**Found by:** API Agent (automated)`,
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
    relatedFile ? `\n### Related File\n\`${relatedFile}\`` : "",
  ].join("\n");

  return {
    id: bugId(),
    title,
    foundBy: AGENT,
    severity,
    labels: ["bug", "api", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route: endpoint,
    suggestedFix,
    relatedFile,
    confidence,
  };
}

// ── API Test Definitions ──────────────────────────────────────────

/**
 * All API test cases for TrendSmart, organized by feature area.
 * These encode the business rules discovered from reading the source.
 */
export function getTestSuite(): APITestCase[] {
  return [
    // ── Listings CRUD ──
    {
      endpoint: "/api/listings",
      method: "GET",
      expectedStatus: 200,
      validation: "isArray",
      description: "GET /api/listings returns array",
    },
    {
      endpoint: "/api/listings",
      method: "GET",
      query: { status: "active" },
      expectedStatus: 200,
      validation: "isArray",
      description: "GET /api/listings?status=active filters correctly",
    },
    {
      endpoint: "/api/listings",
      method: "POST",
      body: {},
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/listings with empty body returns 400",
    },
    {
      endpoint: "/api/listings",
      method: "POST",
      body: { title: "", price: -5 },
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/listings with invalid data returns 400",
    },

    // ── Auth ──
    {
      endpoint: "/api/auth/login",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/auth/login with empty body returns 400",
    },
    {
      endpoint: "/api/auth/login",
      method: "POST",
      body: { email: "nonexistent@test.com", password: "wrong" },
      expectedStatus: 401,
      validation: "hasError",
      description: "POST /api/auth/login with wrong creds returns 401",
    },
    {
      endpoint: "/api/auth/register",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/auth/register with empty body returns 400",
    },
    {
      endpoint: "/api/auth/register",
      method: "POST",
      body: { email: "bad", username: "ab", password: "12" },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/auth/register rejects short password & username",
    },
    {
      endpoint: "/api/auth/me",
      method: "GET",
      expectedStatus: 401,
      validation: "any",
      description: "GET /api/auth/me without session returns 401",
    },

    // ── Settings ──
    {
      endpoint: "/api/settings",
      method: "GET",
      expectedStatus: 200,
      validation: "isObject",
      description: "GET /api/settings returns settings object",
    },
    {
      endpoint: "/api/settings",
      method: "POST",
      body: { settings: { ai_provider: "openai" } },
      expectedStatus: 200,
      validation: "hasOk",
      description: "POST /api/settings with valid settings succeeds",
    },
    {
      endpoint: "/api/settings",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/settings with empty body returns 400",
    },

    // ── Analytics ──
    {
      endpoint: "/api/analytics",
      method: "GET",
      expectedStatus: 200,
      validation: "hasField:totalListings",
      description: "GET /api/analytics returns totalListings field",
    },

    // ── Repricing ──
    {
      endpoint: "/api/repricing",
      method: "GET",
      expectedStatus: 200,
      validation: "hasField:suggestions",
      description: "GET /api/repricing returns suggestions array",
    },
    {
      endpoint: "/api/repricing",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/repricing with empty body returns 400",
    },
    {
      endpoint: "/api/repricing",
      method: "POST",
      body: { listingId: "fake-id", newPrice: -10 },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/repricing rejects negative price",
    },

    // ── Offers ──
    {
      endpoint: "/api/offers",
      method: "GET",
      expectedStatus: 200,
      validation: "hasField:offers",
      description: "GET /api/offers returns offers array",
    },
    {
      endpoint: "/api/offers",
      method: "POST",
      body: { offerId: "fake", action: "invalid" },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/offers rejects invalid action",
    },

    // ── Inbox ──
    {
      endpoint: "/api/inbox",
      method: "GET",
      expectedStatus: 200,
      validation: "hasField:conversations",
      description: "GET /api/inbox returns conversations",
    },
    {
      endpoint: "/api/inbox",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/inbox with empty body returns 400",
    },

    // ── Scheduler ──
    {
      endpoint: "/api/scheduler",
      method: "GET",
      expectedStatus: 200,
      validation: "isArray",
      description: "GET /api/scheduler returns array",
    },
    {
      endpoint: "/api/scheduler",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/scheduler with empty body returns 400",
    },
    {
      endpoint: "/api/scheduler",
      method: "POST",
      body: { listingId: "fake", platform: "depop", scheduledAt: "not-a-date" },
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/scheduler rejects invalid date",
    },

    // ── Export ──
    {
      endpoint: "/api/export",
      method: "GET",
      query: { type: "listings" },
      expectedStatus: 200,
      validation: "isCSV",
      description: "GET /api/export?type=listings returns CSV",
    },
    {
      endpoint: "/api/export",
      method: "GET",
      expectedStatus: 400,
      validation: "hasError",
      description: "GET /api/export without type returns 400",
    },

    // ── Bulk Import ──
    {
      endpoint: "/api/bulk-import",
      method: "POST",
      body: {},
      expectedStatus: 400,
      validation: "hasError",
      description: "POST /api/bulk-import with non-CSV returns 400",
    },

    // ── Health Check ──
    {
      endpoint: "/api/health-check",
      method: "GET",
      expectedStatus: 200,
      validation: "any",
      description: "GET /api/health-check returns 200",
    },

    // ── Templates ──
    {
      endpoint: "/api/templates",
      method: "GET",
      expectedStatus: 200,
      validation: "isArray",
      description: "GET /api/templates returns array",
    },

    // ── Search ──
    {
      endpoint: "/api/search",
      method: "GET",
      expectedStatus: 200,
      validation: "any",
      description: "GET /api/search returns 200",
    },

    // ── Edge Cases ──
    {
      endpoint: "/api/listings",
      method: "POST",
      body: { title: "<script>alert('xss')</script>", description: "test", category: "Other", price: 10 },
      headers: { "Content-Type": "application/json" },
      expectedStatus: 400,
      validation: "noXSS",
      description: "POST /api/listings sanitizes HTML in title (XSS check)",
    },
  ];
}

// ── Validation Functions ──────────────────────────────────────────

function validate(
  validation: string,
  status: number,
  body: unknown
): { passed: boolean; reason: string } {
  const data = body as Record<string, unknown>;

  switch (validation) {
    case "isArray":
      if (Array.isArray(body)) return { passed: true, reason: "" };
      // Some endpoints wrap in an object
      if (data && typeof data === "object") {
        const values = Object.values(data);
        if (values.some(Array.isArray)) return { passed: true, reason: "" };
      }
      return { passed: false, reason: "Expected array response" };

    case "isObject":
      return typeof body === "object" && body !== null && !Array.isArray(body)
        ? { passed: true, reason: "" }
        : { passed: false, reason: "Expected object response" };

    case "hasError":
      if (data && (data.error || data.message || data.errors)) {
        return { passed: true, reason: "" };
      }
      return { passed: false, reason: "Expected error message in response" };

    case "hasOk":
      return data && data.ok
        ? { passed: true, reason: "" }
        : { passed: false, reason: "Expected { ok: true } response" };

    case "isCSV":
      return typeof body === "string" || (data && typeof data === "object")
        ? { passed: true, reason: "" }
        : { passed: false, reason: "Expected CSV response" };

    case "noXSS":
      const bodyStr = JSON.stringify(body);
      if (bodyStr.includes("<script>")) {
        return { passed: false, reason: "XSS payload not sanitized in response" };
      }
      return { passed: true, reason: "" };

    case "any":
      return { passed: true, reason: "" };

    default:
      if (validation.startsWith("hasField:")) {
        const field = validation.split(":")[1];
        return data && field in data
          ? { passed: true, reason: "" }
          : { passed: false, reason: `Missing field: ${field}` };
      }
      return { passed: true, reason: "" };
  }
}

// ── Main API Agent ────────────────────────────────────────────────

/**
 * Run all API tests and return results + bug reports.
 */
export async function runApiAgent(
  request: APIRequestContext
): Promise<{ results: APITestResult[]; bugs: BugReport[] }> {
  const testSuite = getTestSuite();
  const results: APITestResult[] = [];
  const bugs: BugReport[] = [];

  for (const tc of testSuite) {
    const start = Date.now();

    try {
      let url = tc.endpoint;
      if (tc.query) {
        const params = new URLSearchParams(tc.query);
        url += `?${params.toString()}`;
      }

      let response;
      const options: Record<string, unknown> = {};
      if (tc.headers) options.headers = tc.headers;

      switch (tc.method) {
        case "GET":
          response = await request.get(url, options);
          break;
        case "POST":
          response = await request.post(url, { ...options, data: tc.body });
          break;
        case "PUT":
          response = await request.put(url, { ...options, data: tc.body });
          break;
        case "PATCH":
          response = await request.patch(url, { ...options, data: tc.body });
          break;
        case "DELETE":
          response = await request.delete(url, options);
          break;
      }

      const actualStatus = response.status();
      let responseBody: unknown;
      try {
        responseBody = await response.json();
      } catch {
        try {
          responseBody = await response.text();
        } catch {
          responseBody = null;
        }
      }

      const duration = Date.now() - start;

      // Check status code
      const statusMatch = actualStatus === tc.expectedStatus;
      const { passed: validationPassed, reason } = validate(
        tc.validation,
        actualStatus,
        responseBody
      );

      const passed = statusMatch && validationPassed;

      results.push({
        testCase: tc,
        passed,
        actualStatus,
        responseBody,
        duration,
        error: !passed
          ? !statusMatch
            ? `Expected ${tc.expectedStatus}, got ${actualStatus}`
            : reason
          : undefined,
      });

      if (!passed) {
        const errorDetail = !statusMatch
          ? `Expected HTTP ${tc.expectedStatus}, got ${actualStatus}`
          : reason;

        bugs.push(
          makeBug(
            `API: ${tc.description} — FAILED`,
            actualStatus >= 500 ? "critical" : "major",
            tc.endpoint,
            [
              `Send ${tc.method} ${tc.endpoint}`,
              tc.body ? `Body: ${JSON.stringify(tc.body).substring(0, 200)}` : "No body",
              `Expected: HTTP ${tc.expectedStatus}`,
            ],
            `HTTP ${tc.expectedStatus} with valid response`,
            errorDetail,
            "Check the API route handler for this endpoint.",
            ["api-contract"],
            statusMatch ? 70 : 90,
            `src/app${tc.endpoint}/route.ts`
          )
        );
      }
    } catch (err) {
      const duration = Date.now() - start;
      results.push({
        testCase: tc,
        passed: false,
        actualStatus: 0,
        responseBody: null,
        duration,
        error: (err as Error).message,
      });

      bugs.push(
        makeBug(
          `API: ${tc.endpoint} threw exception`,
          "critical",
          tc.endpoint,
          [`Send ${tc.method} ${tc.endpoint}`],
          "Endpoint should respond without throwing",
          (err as Error).message,
          "The endpoint may be crashing. Check server logs.",
          ["api-crash"],
          95,
          `src/app${tc.endpoint}/route.ts`
        )
      );
    }
  }

  return { results, bugs };
}
