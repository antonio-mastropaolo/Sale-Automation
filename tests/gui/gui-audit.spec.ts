import { test, expect, type Page, type Browser } from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function login(page: Page) {
  // Seed admin
  await page.request.get(`${BASE}/api/auth/seed`);

  // Login via API
  const loginRes = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  const setCookie = loginRes.headers()["set-cookie"] || "";
  const match = setCookie.match(/session_token=([^;]+)/);
  if (match) {
    await page.context().addCookies([
      { name: "session_token", value: match[1], domain: "localhost", path: "/" },
    ]);
  }
}

interface GUIResult {
  page: string;
  url: string;
  status: "PASS" | "FAIL" | "WARN";
  loadTimeMs: number;
  consoleErrors: string[];
  jsErrors: string[];
  missingImages: string[];
  a11yIssues: string[];
  layoutIssues: string[];
  notes: string[];
}

const results: GUIResult[] = [];

/* ------------------------------------------------------------------ */
/*  Auth Pages (no login required)                                      */
/* ------------------------------------------------------------------ */

const PUBLIC_PAGES = [
  { name: "Login", path: "/login" },
  { name: "Register", path: "/register" },
  { name: "Forgot Password", path: "/forgot-password" },
  { name: "Showcase", path: "/showcase" },
];

/* ------------------------------------------------------------------ */
/*  Protected Pages (login required)                                    */
/* ------------------------------------------------------------------ */

const PROTECTED_PAGES = [
  { name: "Dashboard", path: "/" },
  { name: "Onboarding Wizard", path: "/onboard" },
  { name: "New Listing", path: "/listings/new" },
  { name: "Smart Listing", path: "/listings/smart" },
  { name: "Inventory", path: "/inventory" },
  { name: "Photo Studio", path: "/studio" },
  { name: "Scheduler", path: "/scheduler" },
  { name: "Inbox", path: "/inbox" },
  { name: "Settings", path: "/settings" },
  { name: "Repricing", path: "/repricing" },
  { name: "Trends", path: "/trends" },
  { name: "Cross-Market Search", path: "/search" },
  { name: "Offers", path: "/offers" },
  { name: "Shipping Hub", path: "/shipping" },
  { name: "Bulk Import", path: "/bulk-import" },
  { name: "Templates", path: "/templates" },
  { name: "Report", path: "/report" },
  { name: "Diagnostics", path: "/diagnostics" },
  { name: "Workflow", path: "/workflow" },
  { name: "Tools", path: "/tools" },
  { name: "Drops", path: "/drops" },
  { name: "Competitor", path: "/competitor" },
];

/* ------------------------------------------------------------------ */
/*  Core audit function                                                 */
/* ------------------------------------------------------------------ */

async function auditPage(page: Page, name: string, path: string): Promise<GUIResult> {
  const result: GUIResult = {
    page: name,
    url: path,
    status: "PASS",
    loadTimeMs: 0,
    consoleErrors: [],
    jsErrors: [],
    missingImages: [],
    a11yIssues: [],
    layoutIssues: [],
    notes: [],
  };

  // Collect console errors
  const consoleMessages: string[] = [];
  const jsErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleMessages.push(msg.text());
    }
  });

  page.on("pageerror", (err) => {
    jsErrors.push(err.message);
  });

  // Navigate and measure load time
  const start = Date.now();
  try {
    const response = await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    result.loadTimeMs = Date.now() - start;

    if (!response) {
      result.status = "FAIL";
      result.notes.push("No response received");
      return result;
    }

    const httpStatus = response.status();
    if (httpStatus >= 400) {
      result.status = "FAIL";
      result.notes.push(`HTTP ${httpStatus}`);
      return result;
    }

    // Wait a bit for dynamic content
    await page.waitForTimeout(1500);

  } catch (err: unknown) {
    result.loadTimeMs = Date.now() - start;
    result.status = "FAIL";
    result.notes.push(`Navigation error: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  // Collect console errors
  result.consoleErrors = [...consoleMessages];
  result.jsErrors = [...jsErrors];

  // Check for broken images
  const brokenImages = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    return imgs
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.src || img.getAttribute("data-src") || "(no src)");
  });
  result.missingImages = brokenImages;

  // Check for horizontal overflow (layout issue)
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (hasOverflow) {
    result.layoutIssues.push("Horizontal overflow detected");
  }

  // Check for overlapping fixed elements
  const overlappingFixed = await page.evaluate(() => {
    const fixed = Array.from(document.querySelectorAll("*")).filter((el) => {
      const style = getComputedStyle(el);
      return style.position === "fixed" && style.display !== "none" && style.visibility !== "hidden";
    });
    return fixed.length;
  });
  if (overlappingFixed > 5) {
    result.layoutIssues.push(`${overlappingFixed} fixed-position elements found (potential overlap)`);
  }

  // Check for empty page body
  const bodyTextLength = await page.evaluate(() => {
    return document.body?.innerText?.trim().length || 0;
  });
  if (bodyTextLength < 10) {
    result.layoutIssues.push("Page appears mostly empty (< 10 chars of text)");
  }

  // Accessibility: check for images without alt text
  const imgsNoAlt = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("img"))
      .filter((img) => !img.alt && !img.getAttribute("aria-hidden") && img.offsetParent !== null)
      .map((img) => img.src?.substring(0, 80) || "(no src)");
  });
  if (imgsNoAlt.length > 0) {
    result.a11yIssues.push(`${imgsNoAlt.length} image(s) without alt text: ${imgsNoAlt.slice(0, 3).join(", ")}`);
  }

  // Accessibility: check for buttons/links without accessible text
  const inaccessibleButtons = await page.evaluate(() => {
    const elems = Array.from(document.querySelectorAll("button, a[role=button]"));
    return elems.filter((el) => {
      const text = (el.textContent || "").trim();
      const ariaLabel = el.getAttribute("aria-label") || "";
      const title = el.getAttribute("title") || "";
      return !text && !ariaLabel && !title && el.querySelector("svg") !== null;
    }).length;
  });
  if (inaccessibleButtons > 0) {
    result.a11yIssues.push(`${inaccessibleButtons} icon-only button(s) without aria-label`);
  }

  // Accessibility: check for form inputs without labels
  const unlabeledInputs = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
    return inputs.filter((input) => {
      const id = input.id;
      const ariaLabel = input.getAttribute("aria-label");
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      const placeholder = input.getAttribute("placeholder");
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const parentLabel = input.closest("label");
      return !hasLabel && !parentLabel && !ariaLabel && !ariaLabelledBy && !placeholder;
    }).length;
  });
  if (unlabeledInputs > 0) {
    result.a11yIssues.push(`${unlabeledInputs} input(s) without label or aria-label`);
  }

  // Check for z-index stacking issues on auth pages
  if (["/login", "/register", "/forgot-password", "/reset-password"].includes(path)) {
    const sidebarVisible = await page.evaluate(() => {
      const sidebar = document.querySelector("aside, nav, [class*=sidebar]");
      if (!sidebar) return false;
      const rect = (sidebar as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(sidebar as HTMLElement);
      return rect.width > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    if (sidebarVisible) {
      result.layoutIssues.push("Sidebar is visible on auth page (should be hidden)");
      result.status = "FAIL";
    }
  }

  // Check protected pages have sidebar
  if (!PUBLIC_PAGES.map((p) => p.path).includes(path) && path !== "/onboard") {
    const hasSidebar = await page.evaluate(() => {
      const sidebar = document.querySelector("aside, nav, [class*=sidebar], [class*=Sidebar]");
      if (!sidebar) return false;
      const rect = (sidebar as HTMLElement).getBoundingClientRect();
      return rect.width > 50;
    });
    if (!hasSidebar) {
      result.layoutIssues.push("Sidebar missing on protected page");
    }
  }

  // Determine final status
  if (result.jsErrors.length > 0) {
    result.status = "FAIL";
  } else if (
    result.consoleErrors.length > 2 ||
    result.missingImages.length > 0 ||
    result.layoutIssues.length > 0
  ) {
    result.status = result.status === "FAIL" ? "FAIL" : "WARN";
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Test: Public Pages                                                  */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Public Pages", () => {
  for (const pg of PUBLIC_PAGES) {
    test(`${pg.name} (${pg.path})`, async ({ page }) => {
      const result = await auditPage(page, pg.name, pg.path);
      results.push(result);
      expect(result.status).not.toBe("FAIL");
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Test: Protected Pages                                               */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Protected Pages", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of PROTECTED_PAGES) {
    test(`${pg.name} (${pg.path})`, async ({ page }) => {
      const result = await auditPage(page, pg.name, pg.path);
      results.push(result);
      expect(result.status).not.toBe("FAIL");
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Test: Navigation — Sidebar Links                                    */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Sidebar Navigation", () => {
  test("All sidebar links are clickable and navigate correctly", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const sidebarLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href]"));
      return links
        .filter((a) => {
          const rect = (a as HTMLElement).getBoundingClientRect();
          return rect.x < 280 && rect.width > 0;
        })
        .map((a) => ({
          href: a.getAttribute("href") || "",
          text: (a.textContent || "").trim().substring(0, 40),
        }))
        .filter((l) => l.href.startsWith("/") && !l.href.startsWith("/api"));
    });

    const result: GUIResult = {
      page: "Sidebar Navigation",
      url: "/",
      status: "PASS",
      loadTimeMs: 0,
      consoleErrors: [],
      jsErrors: [],
      missingImages: [],
      a11yIssues: [],
      layoutIssues: [],
      notes: [`Found ${sidebarLinks.length} sidebar links`],
    };

    const visited = new Set<string>();
    for (const link of sidebarLinks.slice(0, 15)) {
      if (visited.has(link.href)) continue;
      visited.add(link.href);
      try {
        const res = await page.goto(`${BASE}${link.href}`, {
          waitUntil: "domcontentloaded",
          timeout: 15000,
        });
        if (!res || res.status() >= 500) {
          result.notes.push(`FAIL: ${link.text} → ${link.href} (HTTP ${res?.status()})`);
          result.status = "WARN";
        } else {
          result.notes.push(`OK: ${link.text} → ${link.href}`);
        }
      } catch (err: unknown) {
        result.notes.push(`ERR: ${link.text} → ${link.href}: ${err instanceof Error ? err.message : String(err)}`);
        result.status = "WARN";
      }
    }

    results.push(result);
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Onboarding Wizard Flow                                        */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Onboarding Wizard", () => {
  test("Wizard renders within app layout (no fullscreen overlay)", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/onboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const result: GUIResult = {
      page: "Onboard Wizard Layout",
      url: "/onboard",
      status: "PASS",
      loadTimeMs: 0,
      consoleErrors: [],
      jsErrors: [],
      missingImages: [],
      a11yIssues: [],
      layoutIssues: [],
      notes: [],
    };

    // Check that the wizard is NOT a fullscreen overlay
    const hasFullscreenOverlay = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll("div"));
      return allDivs.some((div) => {
        const style = getComputedStyle(div);
        return (
          style.position === "fixed" &&
          style.inset === "0px" &&
          parseInt(style.zIndex || "0") >= 100 &&
          div.querySelector("button") !== null
        );
      });
    });

    if (hasFullscreenOverlay) {
      result.layoutIssues.push("Wizard still renders as fullscreen overlay (should be inline)");
      result.status = "FAIL";
    } else {
      result.notes.push("Wizard renders inline within app layout");
    }

    // Check sidebar is visible alongside wizard
    const sidebarVisible = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("aside, nav, [class*=sidebar]"));
      return els.some((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        return rect.width > 50 && rect.height > 200;
      });
    });
    if (sidebarVisible) {
      result.notes.push("Sidebar is visible alongside wizard");
    } else {
      result.layoutIssues.push("Sidebar not visible on onboard page");
      result.status = "WARN";
    }

    results.push(result);
    expect(result.status).not.toBe("FAIL");
  });

  test("Wizard step navigation works", async ({ page }) => {
    await login(page);
    await page.goto(`${BASE}/onboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const result: GUIResult = {
      page: "Onboard Wizard Steps",
      url: "/onboard",
      status: "PASS",
      loadTimeMs: 0,
      consoleErrors: [],
      jsErrors: [],
      missingImages: [],
      a11yIssues: [],
      layoutIssues: [],
      notes: [],
    };

    // Step 0: Welcome
    const welcomeText = await page.textContent("body");
    if (welcomeText?.includes("Welcome to ListBlitz")) {
      result.notes.push("Step 0: Welcome screen renders correctly");
    } else {
      result.notes.push("Step 0: Welcome text not found");
      result.status = "WARN";
    }

    // Click "Let's Get Started"
    const startBtn = page.getByRole("button", { name: /get started/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
      await page.waitForTimeout(500);

      const step1Text = await page.textContent("body");
      if (step1Text?.includes("Connect Your Platforms")) {
        result.notes.push("Step 1: Connect Platforms renders correctly");
      } else {
        result.notes.push("Step 1: Platform connection text not found");
        result.status = "WARN";
      }

      // Click Continue
      const continueBtn = page.getByRole("button", { name: /continue/i });
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
        await page.waitForTimeout(500);

        const step2Text = await page.textContent("body");
        if (step2Text?.includes("AI Configuration")) {
          result.notes.push("Step 2: AI Configuration renders correctly");
        } else {
          result.notes.push("Step 2: AI Configuration text not found");
          result.status = "WARN";
        }

        // Check "Launch ListBlitz" button exists
        const launchBtn = page.getByRole("button", { name: /launch listblitz/i });
        if (await launchBtn.isVisible()) {
          result.notes.push("Launch ListBlitz button is visible");
        }
      }
    } else {
      result.notes.push("Get Started button not found");
      result.status = "FAIL";
    }

    results.push(result);
    expect(result.status).not.toBe("FAIL");
  });
});

/* ------------------------------------------------------------------ */
/*  Test: Auth Pages — No Sidebar                                       */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Auth Page Isolation", () => {
  for (const pg of [
    { name: "Login", path: "/login" },
    { name: "Register", path: "/register" },
    { name: "Forgot Password", path: "/forgot-password" },
  ]) {
    test(`${pg.name} page has no sidebar`, async ({ page }) => {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);

      const result: GUIResult = {
        page: `${pg.name} Isolation`,
        url: pg.path,
        status: "PASS",
        loadTimeMs: 0,
        consoleErrors: [],
        jsErrors: [],
        missingImages: [],
        a11yIssues: [],
        layoutIssues: [],
        notes: [],
      };

      const sidebarVisible = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("aside, nav, [class*=sidebar], [class*=Sidebar]"));
        return els.some((el) => {
          const rect = (el as HTMLElement).getBoundingClientRect();
          const style = getComputedStyle(el as HTMLElement);
          return rect.width > 50 && style.display !== "none" && style.visibility !== "hidden";
        });
      });

      if (sidebarVisible) {
        result.layoutIssues.push("Sidebar is visible on auth page — should be hidden");
        result.status = "FAIL";
      } else {
        result.notes.push("Auth page correctly isolated from app layout");
      }

      results.push(result);
      expect(result.status).not.toBe("FAIL");
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Test: Responsive — Mobile Viewport                                  */
/* ------------------------------------------------------------------ */

test.describe("GUI Audit — Mobile Viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  const MOBILE_PAGES = [
    { name: "Login (Mobile)", path: "/login" },
    { name: "Dashboard (Mobile)", path: "/" },
    { name: "Onboard (Mobile)", path: "/onboard" },
  ];

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of MOBILE_PAGES) {
    test(`${pg.name}`, async ({ page }) => {
      const result = await auditPage(page, pg.name, pg.path);

      // Extra mobile check: no horizontal scroll
      const mobileOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 5;
      });
      if (mobileOverflow) {
        result.layoutIssues.push("Horizontal scroll on mobile viewport");
      }

      results.push(result);
    });
  }
});

/* ------------------------------------------------------------------ */
/*  After all — write JSON results                                      */
/* ------------------------------------------------------------------ */

test.afterAll(async () => {
  const fs = await import("fs");
  const path = await import("path");
  const outDir = path.join(process.cwd(), "tests", "gui");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const summary = {
    timestamp: new Date().toISOString(),
    totalPages: results.length,
    passed: results.filter((r) => r.status === "PASS").length,
    warned: results.filter((r) => r.status === "WARN").length,
    failed: results.filter((r) => r.status === "FAIL").length,
    results,
  };

  fs.writeFileSync(
    path.join(outDir, "gui-audit-results.json"),
    JSON.stringify(summary, null, 2)
  );
});
