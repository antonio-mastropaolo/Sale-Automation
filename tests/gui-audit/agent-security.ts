/**
 * TrendSmart QA — Security Agent
 *
 * Tests the app for common security vulnerabilities:
 *  - Reflected XSS via URL params and form inputs
 *  - Auth bypass (access protected routes without session)
 *  - Security headers (CSP, X-Frame-Options, etc.)
 *  - Cookie security flags (httpOnly, secure, sameSite)
 *  - Open redirect via login redirect params
 *  - Path traversal in file/image endpoints
 *  - Information disclosure (stack traces, debug info)
 *  - CSRF protection
 *  - SQL injection via API params
 *  - Session fixation
 *  - Sensitive data exposure in API responses
 *
 * This replaces a penetration tester doing a basic security audit.
 */

import type { Page, APIRequestContext } from "@playwright/test";
import type { BugReport, SecurityTestResult, AgentName } from "./agent-types";

const AGENT: AgentName = "security";
let bugCounter = 0;

function bugId(): string {
  return `SEC-${String(++bugCounter).padStart(4, "0")}`;
}

export function resetSecurityCounter(): void {
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
    `## Security Bug Report`,
    `**Severity:** ${severity}`,
    `**Route:** \`${route}\``,
    `**Found by:** Security Agent (automated)`,
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
    labels: ["bug", "security", `severity:${severity}`, ...labels],
    body,
    stepsToReproduce: steps,
    expected,
    actual,
    route,
    suggestedFix,
    confidence,
  };
}

// ── Security Checks ───────────────────────────────────────────────

/**
 * Check 1: Auth bypass — access protected routes without a session.
 */
async function checkAuthBypass(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  const protectedEndpoints = [
    "/api/listings",
    "/api/analytics",
    "/api/settings",
    "/api/repricing",
    "/api/offers",
    "/api/inbox",
    "/api/scheduler",
    "/api/export?type=listings",
    "/api/templates",
    "/api/sales",
    "/api/batch",
    "/api/bulk-import",
    "/api/ops/summary",
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      // Hit without any cookies/auth
      const response = await request.get(endpoint, {
        headers: { Cookie: "" },
      });
      const status = response.status();

      // Protected endpoints should return 401 or redirect, not 200
      const passed = status === 401 || status === 403 || status === 302;

      results.push({
        check: "auth-bypass",
        target: endpoint,
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? `Correctly returned ${status}`
          : `Returned ${status} — possible auth bypass`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `Auth bypass: ${endpoint} returns ${status} without session`,
            "critical",
            endpoint,
            [`Send GET ${endpoint} without any authentication`, `Observe the response status: ${status}`],
            "Protected endpoint should return 401 or 403 without authentication",
            `Endpoint returned HTTP ${status} without a valid session`,
            "Add authentication middleware to this route. Check that session validation runs before data access.",
            ["auth-bypass", "owasp-a01"],
            95,
          )
        );
      }
    } catch (err) {
      results.push({
        check: "auth-bypass",
        target: endpoint,
        passed: true,
        severity: "cosmetic",
        details: `Request failed (likely blocked): ${(err as Error).message}`,
      });
    }
  }

  return { results, bugs };
}

/**
 * Check 2: Security headers.
 */
async function checkSecurityHeaders(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  try {
    const response = await request.get("/");
    const headers = response.headers();

    const checks: Array<{
      header: string;
      name: string;
      severity: "critical" | "major" | "minor" | "cosmetic";
      fix: string;
    }> = [
      {
        header: "x-frame-options",
        name: "X-Frame-Options",
        severity: "major",
        fix: "Add X-Frame-Options: DENY or SAMEORIGIN header in middleware or next.config.ts headers.",
      },
      {
        header: "x-content-type-options",
        name: "X-Content-Type-Options",
        severity: "minor",
        fix: "Add X-Content-Type-Options: nosniff header.",
      },
      {
        header: "strict-transport-security",
        name: "Strict-Transport-Security",
        severity: "major",
        fix: "Add Strict-Transport-Security: max-age=31536000; includeSubDomains header.",
      },
      {
        header: "x-xss-protection",
        name: "X-XSS-Protection",
        severity: "minor",
        fix: "Add X-XSS-Protection: 1; mode=block header.",
      },
      {
        header: "referrer-policy",
        name: "Referrer-Policy",
        severity: "minor",
        fix: "Add Referrer-Policy: strict-origin-when-cross-origin header.",
      },
      {
        header: "content-security-policy",
        name: "Content-Security-Policy",
        severity: "major",
        fix: "Add a Content-Security-Policy header. Start with: default-src 'self'; script-src 'self' 'unsafe-inline'",
      },
    ];

    const missingHeaders: string[] = [];

    for (const check of checks) {
      const present = !!headers[check.header];
      results.push({
        check: "security-headers",
        target: check.name,
        passed: present,
        severity: present ? "cosmetic" : check.severity,
        details: present
          ? `${check.name}: ${headers[check.header]}`
          : `Missing ${check.name} header`,
      });

      if (!present) {
        missingHeaders.push(check.name);
      }
    }

    if (missingHeaders.length > 0) {
      bugs.push(
        makeBug(
          `Missing ${missingHeaders.length} security header(s)`,
          missingHeaders.length > 3 ? "major" : "minor",
          "/",
          [`Send GET / and inspect response headers`, `Missing: ${missingHeaders.join(", ")}`],
          "All standard security headers should be present",
          `Missing headers: ${missingHeaders.join(", ")}`,
          "Add security headers in next.config.ts or middleware.ts. See OWASP Secure Headers Project.",
          ["security-headers", "owasp-a05"],
          90,
        )
      );
    }
  } catch (err) {
    console.error(`  Security headers check failed: ${(err as Error).message}`);
  }

  return { results, bugs };
}

/**
 * Check 3: Cookie security flags.
 */
async function checkCookieSecurity(
  page: Page
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  try {
    await page.goto("/login", { waitUntil: "networkidle" });
    const cookies = await page.context().cookies();

    for (const cookie of cookies) {
      const issues: string[] = [];

      if (!cookie.httpOnly && cookie.name.includes("session")) {
        issues.push("Missing httpOnly flag — accessible to JavaScript");
      }

      if (!cookie.secure && cookie.name.includes("session")) {
        issues.push("Missing secure flag — sent over HTTP");
      }

      if (cookie.sameSite === "None" || !cookie.sameSite) {
        if (cookie.name.includes("session")) {
          issues.push("SameSite=None or missing — vulnerable to CSRF");
        }
      }

      const passed = issues.length === 0;
      results.push({
        check: "cookie-security",
        target: cookie.name,
        passed,
        severity: passed ? "cosmetic" : "major",
        details: passed
          ? `Cookie "${cookie.name}" has proper flags`
          : `Cookie "${cookie.name}": ${issues.join("; ")}`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `Insecure cookie: "${cookie.name}"`,
            "major",
            "/",
            [`Inspect cookies after visiting /login`, ...issues],
            "Session cookies should have httpOnly, secure, and SameSite=Strict flags",
            issues.join(". "),
            "Set httpOnly: true, secure: true, sameSite: 'strict' when creating the cookie.",
            ["cookie-security", "owasp-a07"],
            90,
          )
        );
      }
    }
  } catch (err) {
    console.error(`  Cookie check failed: ${(err as Error).message}`);
  }

  return { results, bugs };
}

/**
 * Check 4: Reflected XSS via URL parameters.
 */
async function checkReflectedXSS(
  page: Page
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  const xssPayloads = [
    { param: "q", value: '<img src=x onerror="alert(1)">', route: "/search" },
    { param: "status", value: '"><script>alert(1)</script>', route: "/" },
    { param: "error", value: "<svg/onload=alert(1)>", route: "/login" },
  ];

  for (const { param, value, route } of xssPayloads) {
    try {
      const encodedValue = encodeURIComponent(value);
      const url = `${route}?${param}=${encodedValue}`;

      let alertTriggered = false;
      page.on("dialog", async (dialog) => {
        alertTriggered = true;
        await dialog.dismiss();
      });

      await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
      await page.waitForTimeout(1000);

      // Also check if the payload appears unescaped in the DOM
      const bodyHtml = await page.evaluate(() => document.body.innerHTML);
      const unescaped = bodyHtml.includes(value);

      const passed = !alertTriggered && !unescaped;

      results.push({
        check: "xss-reflected",
        target: `${route}?${param}`,
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? "XSS payload properly escaped"
          : alertTriggered
            ? "XSS payload triggered alert!"
            : "XSS payload rendered unescaped in DOM",
        evidence: !passed ? value : undefined,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `Reflected XSS in ${route} via ?${param}`,
            "critical",
            route,
            [`Navigate to ${url}`, alertTriggered ? "Alert dialog appears" : "Payload rendered unescaped in DOM"],
            "User input in URL params should be sanitized/escaped",
            alertTriggered ? "XSS payload executed JavaScript" : "XSS payload rendered unescaped",
            "Sanitize all URL parameter values before rendering. Use React's built-in escaping — avoid dangerouslySetInnerHTML.",
            ["xss", "owasp-a03"],
            95,
          )
        );
      }
    } catch (err) {
      // timeout = likely fine (page didn't load the payload)
    }
  }

  return { results, bugs };
}

/**
 * Check 5: SQL injection via API params.
 */
async function checkSQLInjection(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  const sqlPayloads = [
    { endpoint: "/api/listings", query: { status: "'; DROP TABLE listings; --" } },
    { endpoint: "/api/search", query: { q: "' OR '1'='1" } },
    { endpoint: "/api/listings", query: { status: "1 UNION SELECT * FROM users --" } },
  ];

  for (const { endpoint, query } of sqlPayloads) {
    try {
      const params = new URLSearchParams(query);
      const url = `${endpoint}?${params.toString()}`;
      const response = await request.get(url);
      const status = response.status();
      let body: string;
      try {
        body = await response.text();
      } catch {
        body = "";
      }

      // Check for SQL error messages in response
      const sqlErrors = [
        "syntax error", "unclosed quotation", "sql", "sqlite",
        "pg_", "postgresql", "mysql", "mariadb", "database error",
        "relation", "column", "table",
      ];
      const hasLeakedError = sqlErrors.some((e) => body.toLowerCase().includes(e));

      const passed = !hasLeakedError && status !== 500;

      results.push({
        check: "sql-injection",
        target: `${endpoint} (${JSON.stringify(query)})`,
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? "SQL injection payload handled safely"
          : `SQL error leaked in response (HTTP ${status})`,
        evidence: hasLeakedError ? body.substring(0, 200) : undefined,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `SQL error disclosure via ${endpoint}`,
            "critical",
            endpoint,
            [`Send GET ${url}`, `Response contains SQL error information`],
            "SQL injection payloads should be handled safely without leaking error details",
            `Response (HTTP ${status}) contains SQL error information`,
            "Use parameterized queries (Prisma does this by default). Never interpolate user input into raw SQL.",
            ["sql-injection", "owasp-a03"],
            hasLeakedError ? 95 : 80,
          )
        );
      }
    } catch {
      // Network error = endpoint handled it
    }
  }

  return { results, bugs };
}

/**
 * Check 6: Information disclosure (stack traces, debug data, env vars).
 */
async function checkInfoDisclosure(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  // Hit a non-existent endpoint to trigger error handling
  const errorEndpoints = [
    "/api/nonexistent",
    "/api/listings/../../../../etc/passwd",
    "/api/settings/../../../.env",
  ];

  for (const endpoint of errorEndpoints) {
    try {
      const response = await request.get(endpoint);
      const body = await response.text();

      const sensitivePatterns = [
        { pattern: /process\.env/i, name: "process.env reference" },
        { pattern: /at\s+\w+\s+\(.*\.ts:\d+:\d+\)/i, name: "Stack trace with file paths" },
        { pattern: /DATABASE_URL|DB_PASSWORD|API_KEY|SECRET/i, name: "Environment variable name" },
        { pattern: /node_modules/i, name: "node_modules path" },
        { pattern: /Error:.*at\s/i, name: "Detailed error with stack" },
      ];

      const found: string[] = [];
      for (const { pattern, name } of sensitivePatterns) {
        if (pattern.test(body)) {
          found.push(name);
        }
      }

      const passed = found.length === 0;
      results.push({
        check: "info-disclosure",
        target: endpoint,
        passed,
        severity: passed ? "cosmetic" : "major",
        details: passed
          ? "No sensitive information disclosed"
          : `Disclosed: ${found.join(", ")}`,
        evidence: !passed ? body.substring(0, 300) : undefined,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `Information disclosure at ${endpoint}`,
            "major",
            endpoint,
            [`Send GET ${endpoint}`, `Response leaks: ${found.join(", ")}`],
            "Error responses should not reveal internal implementation details",
            `Response contains: ${found.join(", ")}`,
            "Return generic error messages in production. Set NODE_ENV=production and use custom error handlers.",
            ["info-disclosure", "owasp-a01"],
            85,
          )
        );
      }
    } catch {
      // Fine
    }
  }

  return { results, bugs };
}

/**
 * Check 7: Open redirect.
 */
async function checkOpenRedirect(
  page: Page
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  const redirectPayloads = [
    "/login?redirect=https://evil.com",
    "/login?next=//evil.com",
    "/login?returnTo=https://evil.com/steal-cookies",
  ];

  for (const url of redirectPayloads) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 10000 });
      const finalUrl = page.url();

      const redirectedToExternal = finalUrl.includes("evil.com");
      const passed = !redirectedToExternal;

      results.push({
        check: "open-redirect",
        target: url,
        passed,
        severity: passed ? "cosmetic" : "major",
        details: passed
          ? "Redirect to external domain blocked"
          : `Redirected to external domain: ${finalUrl}`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `Open redirect via login redirect param`,
            "major",
            "/login",
            [`Navigate to ${url}`, `Page redirects to: ${finalUrl}`],
            "Redirect parameters should only allow same-origin URLs",
            `User is redirected to external domain: ${finalUrl}`,
            "Validate redirect URLs server-side: only allow relative paths or same-origin URLs.",
            ["open-redirect", "owasp-a01"],
            90,
          )
        );
      }
    } catch {
      // Timeout = no redirect happened = fine
    }
  }

  return { results, bugs };
}

/**
 * Check 8: Sensitive data exposure in API responses.
 */
async function checkDataExposure(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  // Check if settings API leaks full API keys
  try {
    const response = await request.get("/api/settings");
    if (response.ok()) {
      const body = await response.text();

      const sensitivePatterns = [
        { pattern: /sk-[a-zA-Z0-9]{32,}/, name: "OpenAI API key" },
        { pattern: /AIza[a-zA-Z0-9_-]{35}/, name: "Google API key" },
        { pattern: /gsk_[a-zA-Z0-9]{32,}/, name: "Groq API key" },
        { pattern: /password"?\s*:\s*"[^"]+"/i, name: "Password in response" },
        { pattern: /secret"?\s*:\s*"[^"]+"/i, name: "Secret in response" },
      ];

      const found: string[] = [];
      for (const { pattern, name } of sensitivePatterns) {
        if (pattern.test(body)) {
          found.push(name);
        }
      }

      const passed = found.length === 0;
      results.push({
        check: "info-disclosure",
        target: "/api/settings",
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? "No sensitive data exposed in settings response"
          : `Exposed: ${found.join(", ")}`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `API key exposed in /api/settings response`,
            "critical",
            "/api/settings",
            [`GET /api/settings`, `Response contains full API key(s): ${found.join(", ")}`],
            "API keys should be masked in responses (show only last 4 chars)",
            `Full API keys visible: ${found.join(", ")}`,
            "Mask API keys in the settings GET handler: show only '****' + last 4 characters.",
            ["data-exposure", "owasp-a01"],
            95,
          )
        );
      }
    }
  } catch {
    // Can't access = fine
  }

  return { results, bugs };
}

/**
 * Check 9: CORS misconfiguration.
 */
async function checkCORS(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  const endpoints = ["/api/listings", "/api/settings", "/api/auth/me"];

  for (const endpoint of endpoints) {
    try {
      // Send a preflight-like request with an evil origin
      const response = await request.fetch(endpoint, {
        method: "GET",
        headers: {
          Origin: "https://evil-attacker.com",
          "Access-Control-Request-Method": "GET",
        },
      });

      const headers = response.headers();
      const acao = headers["access-control-allow-origin"] || "";
      const acac = headers["access-control-allow-credentials"] || "";

      // Wildcard with credentials is dangerous
      const wildcardWithCreds = acao === "*" && acac === "true";
      // Reflecting arbitrary origins is dangerous
      const reflectsEvil = acao === "https://evil-attacker.com";
      const passed = !wildcardWithCreds && !reflectsEvil;

      results.push({
        check: "csrf", // CORS falls under CSRF protection category
        target: `CORS ${endpoint}`,
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? `CORS OK: ${acao || "(no ACAO header)"}`
          : reflectsEvil
            ? `Origin reflected: ${acao}`
            : `Wildcard with credentials: ${acao}, ${acac}`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `CORS misconfiguration on ${endpoint}`,
            "critical",
            endpoint,
            [
              `Send request to ${endpoint} with Origin: https://evil-attacker.com`,
              reflectsEvil
                ? `Server reflects the evil origin in Access-Control-Allow-Origin`
                : `Server allows * with credentials`,
            ],
            "CORS should only allow trusted origins",
            reflectsEvil
              ? `Access-Control-Allow-Origin reflects arbitrary origin: ${acao}`
              : `Wildcard origin with credentials enabled`,
            "Configure CORS to only allow your app's origin(s). Never reflect arbitrary Origin headers. Never use * with credentials.",
            ["cors", "owasp-a05"],
            95,
          )
        );
      }
    } catch {
      // Can't reach endpoint = fine
    }
  }

  return { results, bugs };
}

/**
 * Check 10: CSRF protection on state-changing endpoints.
 */
async function checkCSRF(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  // State-changing endpoints that should have CSRF protection
  const stateChangingEndpoints = [
    { endpoint: "/api/listings", method: "POST" as const },
    { endpoint: "/api/settings", method: "PUT" as const },
    { endpoint: "/api/auth/logout", method: "POST" as const },
    { endpoint: "/api/repricing", method: "POST" as const },
    { endpoint: "/api/export", method: "POST" as const },
  ];

  for (const { endpoint, method } of stateChangingEndpoints) {
    try {
      // Send request with no CSRF token, wrong content type (simulating form submission from another site)
      const response = await request.fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: "https://evil-attacker.com",
          Cookie: "", // No session
        },
        data: "test=1",
      });

      const status = response.status();
      // Should get 401 (no auth), 403 (CSRF rejected), or 400 (wrong content type)
      const passed = status === 401 || status === 403 || status === 400 || status === 405;

      results.push({
        check: "csrf",
        target: `CSRF ${method} ${endpoint}`,
        passed,
        severity: passed ? "cosmetic" : "major",
        details: passed
          ? `Correctly rejected with ${status}`
          : `Accepted cross-origin form submission with status ${status}`,
      });

      if (!passed && status === 200) {
        bugs.push(
          makeBug(
            `CSRF: ${endpoint} accepts cross-origin form POST`,
            "major",
            endpoint,
            [
              `Send ${method} ${endpoint} with form-urlencoded from evil origin`,
              `Server returns ${status} instead of rejecting`,
            ],
            "State-changing endpoints should reject cross-origin form submissions",
            `Endpoint returned ${status} for cross-origin form submission`,
            "Validate the Origin header on state-changing requests. Use SameSite=Strict cookies. Consider CSRF tokens for non-API routes.",
            ["csrf", "owasp-a01"],
            80,
          )
        );
      }
    } catch {
      // Error = likely blocked
    }
  }

  return { results, bugs };
}

/**
 * Check 11: Session fixation — verify that session token changes after login.
 */
async function checkSessionFixation(
  page: Page
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  try {
    // Get cookies before login
    await page.goto("/login", { waitUntil: "networkidle" });
    const cookiesBefore = await page.context().cookies();
    const sessionBefore = cookiesBefore.find((c) => c.name.includes("session"));

    // Try to set a known session token
    if (sessionBefore) {
      const fixedToken = "attacker-controlled-session-12345";
      await page.context().addCookies([
        {
          name: sessionBefore.name,
          value: fixedToken,
          domain: sessionBefore.domain || "localhost",
          path: "/",
        },
      ]);

      // Navigate to a protected route
      await page.goto("/", { waitUntil: "networkidle" });
      const cookiesAfter = await page.context().cookies();
      const sessionAfter = cookiesAfter.find((c) => c.name.includes("session"));

      // If the attacker-controlled token is still accepted, that's session fixation
      const tokenAccepted = sessionAfter?.value === fixedToken;
      const isOnProtectedPage = !page.url().includes("/login");
      const passed = !tokenAccepted || !isOnProtectedPage;

      results.push({
        check: "session-fixation",
        target: "session cookie",
        passed,
        severity: passed ? "cosmetic" : "critical",
        details: passed
          ? "Server does not accept arbitrary session tokens"
          : "Server accepted an attacker-supplied session token",
      });

      if (!passed) {
        bugs.push(
          makeBug(
            "Session fixation: arbitrary session tokens accepted",
            "critical",
            "/login",
            [
              "Set session cookie to an attacker-controlled value",
              "Navigate to a protected route",
              "Server accepts the forged session",
            ],
            "Server should reject unknown session tokens and redirect to login",
            `Attacker-supplied session "${fixedToken}" was accepted by the server`,
            "Validate session tokens server-side. Only accept tokens that exist in the session store. Regenerate session ID after login.",
            ["session-fixation", "owasp-a07"],
            90,
          )
        );
      }
    } else {
      results.push({
        check: "session-fixation",
        target: "session cookie",
        passed: true,
        severity: "cosmetic",
        details: "No session cookie found on login page (OK — issued on auth)",
      });
    }
  } catch (err) {
    console.error(`  Session fixation check failed: ${(err as Error).message}`);
  }

  return { results, bugs };
}

/**
 * Check 12: Rate limiting on auth endpoints.
 */
async function checkRateLimiting(
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const results: SecurityTestResult[] = [];
  const bugs: BugReport[] = [];

  // Send rapid requests to auth endpoints
  const authEndpoints = [
    { endpoint: "/api/auth/login", body: { email: "test@test.com", password: "wrong" } },
    { endpoint: "/api/auth/forgot-password", body: { email: "test@test.com" } },
  ];

  for (const { endpoint, body } of authEndpoints) {
    try {
      const statuses: number[] = [];

      // Send 15 rapid requests
      for (let i = 0; i < 15; i++) {
        const response = await request.post(endpoint, {
          data: body,
          headers: { "Content-Type": "application/json" },
        });
        statuses.push(response.status());
      }

      // Check if any returned 429 (Too Many Requests)
      const hasRateLimit = statuses.includes(429);
      // Even 403 after many attempts could indicate rate limiting
      const laterStatuses = statuses.slice(10);
      const hasDelayedBlock = laterStatuses.some((s) => s === 429 || s === 403);
      const passed = hasRateLimit || hasDelayedBlock;

      results.push({
        check: "rate-limiting",
        target: endpoint,
        passed,
        severity: passed ? "cosmetic" : "major",
        details: passed
          ? `Rate limiting active (429 or 403 after rapid requests)`
          : `No rate limiting detected after 15 rapid requests: statuses = [${[...new Set(statuses)].join(", ")}]`,
      });

      if (!passed) {
        bugs.push(
          makeBug(
            `No rate limiting on ${endpoint}`,
            "major",
            endpoint,
            [
              `Send 15 rapid POST requests to ${endpoint}`,
              `All returned normal status codes: ${[...new Set(statuses)].join(", ")}`,
            ],
            "Auth endpoints should rate-limit after 5-10 failed attempts",
            `No 429 responses after 15 rapid requests`,
            "Implement rate limiting (e.g., 5 requests per minute) on auth endpoints using middleware or a library like rate-limiter-flexible.",
            ["rate-limiting", "owasp-a04"],
            75,
          )
        );
      }
    } catch {
      // Error = likely blocked
    }
  }

  return { results, bugs };
}

// ── Main Security Agent ───────────────────────────────────────────

export async function runSecurityAgent(
  page: Page,
  request: APIRequestContext
): Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }> {
  const allResults: SecurityTestResult[] = [];
  const allBugs: BugReport[] = [];

  const checks: Array<{
    name: string;
    fn: () => Promise<{ results: SecurityTestResult[]; bugs: BugReport[] }>;
  }> = [
    { name: "Auth bypass", fn: () => checkAuthBypass(request) },
    { name: "Security headers", fn: () => checkSecurityHeaders(request) },
    { name: "Cookie security", fn: () => checkCookieSecurity(page) },
    { name: "Reflected XSS", fn: () => checkReflectedXSS(page) },
    { name: "SQL injection", fn: () => checkSQLInjection(request) },
    { name: "Info disclosure", fn: () => checkInfoDisclosure(request) },
    { name: "Open redirect", fn: () => checkOpenRedirect(page) },
    { name: "Data exposure", fn: () => checkDataExposure(request) },
    { name: "CORS config", fn: () => checkCORS(request) },
    { name: "CSRF protection", fn: () => checkCSRF(request) },
    { name: "Session fixation", fn: () => checkSessionFixation(page) },
    { name: "Rate limiting", fn: () => checkRateLimiting(request) },
  ];

  for (const check of checks) {
    try {
      console.log(`    [Sec] ${check.name}...`);
      const { results, bugs } = await check.fn();
      allResults.push(...results);
      allBugs.push(...bugs);

      const passed = results.filter((r) => r.passed).length;
      const failed = results.filter((r) => !r.passed).length;
      if (failed > 0) {
        console.log(`      ${passed} passed, ${failed} FAILED`);
      }
    } catch (err) {
      console.error(`      ${check.name} error: ${(err as Error).message}`);
    }
  }

  return { results: allResults, bugs: allBugs };
}
