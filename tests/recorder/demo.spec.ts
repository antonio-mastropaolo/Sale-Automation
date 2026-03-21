/* ------------------------------------------------------------------ */
/*  Demo: Visual Test using the VisualHarness fixture                   */
/*                                                                      */
/*  This shows how to write tests that produce watchable visual output. */
/*  Every action is animated with cursor, highlights, and labels.       */
/*                                                                      */
/*  Run:  npm run test:visual -- tests/recorder/demo.spec.ts            */
/* ------------------------------------------------------------------ */

import { test, expect } from "./visual-fixture";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

async function login(page: import("@playwright/test").Page) {
  await page.request.get(`${BASE}/api/auth/seed`);
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

test("visual walkthrough of main pages", async ({ vh, page }) => {
  await login(page);

  vh.setTotalSteps(10);

  // Dashboard
  await vh.goto(`${BASE}/`);
  await page.waitForTimeout(800);

  // Navigate through sidebar links (using real sidebar labels)
  const sidebarLinks = [
    { text: "Products", path: "/inventory" },
    { text: "Photo Studio", path: "/studio" },
    { text: "Smart Repricer", path: "/repricing" },
    { text: "Trends", path: "/trends" },
    { text: "Settings", path: "/settings" },
  ];

  for (const link of sidebarLinks) {
    try {
      await vh.click(`a:has-text("${link.text}")`);
      await page.waitForTimeout(500);
    } catch {
      // Link might not be visible, navigate directly
      await vh.goto(`${BASE}${link.path}`);
      await page.waitForTimeout(500);
    }
  }

  // Try interacting with settings page
  await vh.goto(`${BASE}/settings`);
  await page.waitForTimeout(500);

  // Back to dashboard
  await vh.goto(`${BASE}/`);
  await page.waitForTimeout(1000);
});
