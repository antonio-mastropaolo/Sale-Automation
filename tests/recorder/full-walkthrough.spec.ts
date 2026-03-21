/* ------------------------------------------------------------------ */
/*  Full Visual Walkthrough                                             */
/*                                                                      */
/*  Navigates EVERY page in the app and interacts with key elements.    */
/*  Produces a watchable video with cursor, highlights, and labels.     */
/*                                                                      */
/*  Run:  npm run test:visual -- full-walkthrough.spec.ts               */
/* ------------------------------------------------------------------ */

import { test, expect } from "./visual-fixture";
import type { Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

async function login(page: Page) {
  await page.request.get(`${BASE}/api/auth/seed`);
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASS },
  });
  const cookie = res.headers()["set-cookie"] || "";
  const m = cookie.match(/session_token=([^;]+)/);
  if (m) {
    await page.context().addCookies([
      { name: "session_token", value: m[1], domain: "localhost", path: "/" },
    ]);
  }
}

/* ── helper: safe click (won't fail if element missing) ──────────── */
async function safeClick(vh: any, selector: string) {
  try {
    await vh.click(selector, 3000);
  } catch {
    /* element not found — skip */
  }
}

/* ================================================================== */
/*  1. Dashboard                                                        */
/* ================================================================== */

test("01 — Dashboard", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");

  // Search bar
  await safeClick(vh, 'input[placeholder*="Search"]');

  // Filter tabs
  for (const tab of ["Draft", "Active", "Sold", "All"]) {
    await safeClick(vh, `button:has-text("${tab}")`);
    await page.waitForTimeout(300);
  }

  // Quick action buttons
  await safeClick(vh, 'button:has-text("Smart List")');
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
});

/* ================================================================== */
/*  2. Listings group                                                   */
/* ================================================================== */

test("02 — Smart List", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/listings/smart`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("03 — New Listing form", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/listings/new`);
  await page.waitForLoadState("networkidle");

  // Fill out the form
  await vh.fill('input[placeholder*="Vintage"]', "Air Jordan 4 Retro Military Black");
  await page.waitForTimeout(300);

  // Brand & size
  try {
    await vh.fill('input[placeholder*="Brand"]', "Nike");
    await vh.fill('input[placeholder*="Size"]', "10");
  } catch { /* fields may not exist */ }

  // Price
  try {
    await vh.fill('input[type="number"]', "189");
  } catch { /* may not match */ }

  await page.waitForTimeout(400);

  // Try the AI enhance button
  await safeClick(vh, 'button:has-text("Enhance")');
  await page.waitForTimeout(500);
});

test("04 — Photo Studio", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/studio`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("05 — Bulk Import", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/bulk-import`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("06 — Templates", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/templates`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  3. Products & Repricing                                             */
/* ================================================================== */

test("07 — Products (Inventory)", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/inventory`);
  await page.waitForLoadState("networkidle");

  // Try filter/search
  await safeClick(vh, 'input[placeholder*="Search"]');
  await page.waitForTimeout(400);

  // Scroll down to see listings
  await vh.scroll(400);
  await page.waitForTimeout(400);
  await vh.scroll(-400);
});

test("08 — Smart Repricer", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/repricing`);
  await page.waitForLoadState("networkidle");

  // Filter tabs
  for (const tab of ["drop", "raise", "hold", "all"]) {
    await safeClick(vh, `button:has-text("${tab}")`);
    await page.waitForTimeout(300);
  }

  // Refresh
  await safeClick(vh, 'button:has-text("Refresh")');
  await page.waitForTimeout(500);
});

test("09 — Offer Hub", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/offers`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("10 — Cross-Market Search", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/search`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  4. Marketplace group                                                */
/* ================================================================== */

test("11 — Inbox", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/inbox`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("12 — Store Sync", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/alignment`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("13 — Shipping Hub", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/shipping`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  5. Automation group                                                 */
/* ================================================================== */

test("14 — AI Pipeline", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/workflow`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("15 — Scheduler", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/scheduler`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("16 — Drop Feed", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/drops`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  6. Analytics group                                                  */
/* ================================================================== */

test("17 — Analytics Overview", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/analytics`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("18 — Trends", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/trends`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("19 — Competitor", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/competitor`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  7. System group                                                     */
/* ================================================================== */

test("20 — Settings tabs", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/settings`);
  await page.waitForLoadState("networkidle");

  // Cycle through settings tabs
  for (const tab of ["Prompts", "Platforms", "General", "System", "AI Provider"]) {
    await safeClick(vh, `button:has-text("${tab}")`);
    await page.waitForTimeout(500);
  }
});

test("21 — Seller Tools", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/tools`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("22 — Diagnostics", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/diagnostics`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

/* ================================================================== */
/*  8. Onboarding wizard                                                */
/* ================================================================== */

test("23 — Onboarding wizard", async ({ vh, page }) => {
  await login(page);
  await vh.goto(`${BASE}/onboard`);
  await page.waitForLoadState("networkidle");

  // Step 0 → Step 1
  await safeClick(vh, "button:has-text(\"Let's Get Started\")");
  await page.waitForTimeout(500);

  // Step 1: try typing a platform username
  try {
    const usernameInput = page.locator('input[type="text"]').first();
    if (await usernameInput.isVisible({ timeout: 2000 })) {
      await vh.fill('input[type="text"]', "demo_seller");
      await page.waitForTimeout(300);
    }
  } catch { /* skip */ }

  // Continue to step 2
  await safeClick(vh, 'button:has-text("Continue")');
  await page.waitForTimeout(500);

  // Step 2: click an AI provider
  await safeClick(vh, 'button:has-text("OpenAI")');
  await page.waitForTimeout(400);

  // Back to step 1
  await safeClick(vh, 'button:has-text("Back")');
  await page.waitForTimeout(400);
});

/* ================================================================== */
/*  9. Public / Auth pages                                              */
/* ================================================================== */

test("24 — Login page", async ({ vh, page }) => {
  await vh.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");

  await vh.fill('input[type="email"]', "test@example.com");
  await vh.fill('input[type="password"]', "password123");
  await page.waitForTimeout(500);
});

test("25 — Register page", async ({ vh, page }) => {
  await vh.goto(`${BASE}/register`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
});

test("26 — Showcase page", async ({ vh, page }) => {
  await vh.goto(`${BASE}/showcase`);
  await page.waitForLoadState("networkidle");

  // Scroll through the showcase
  await vh.scroll(500);
  await page.waitForTimeout(400);
  await vh.scroll(500);
  await page.waitForTimeout(400);
  await vh.scroll(-1000);
  await page.waitForTimeout(400);
});
