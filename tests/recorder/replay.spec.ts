/* ------------------------------------------------------------------ */
/*  Replay a Recorded Session                                           */
/*                                                                      */
/*  Usage:                                                              */
/*    npm run test:replay                      # replay latest          */
/*    SESSION=session-123.json npm run test:replay  # replay specific   */
/*    SPEED=2 npm run test:replay              # 2x speed              */
/* ------------------------------------------------------------------ */

import { test } from "@playwright/test";
import { VisualHarness } from "./visual-harness";
import { ActionReplayer } from "./action-replayer";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

test("replay recorded session", async ({ page }) => {
  test.setTimeout(0);

  // Login
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

  // Resolve speed
  const speed = parseFloat(process.env.SPEED || "1") || 1;
  const actionDelay = Math.max(80, 250 / speed);

  // Set up visual harness + replayer
  const harness = new VisualHarness(page, { actionDelay });
  const replayer = new ActionReplayer(harness, {
    speed,
    useRecordedTiming: !!process.env.REAL_TIMING,
    fixedDelay: 0,
  });

  // Load recording
  const session = process.env.SESSION || "latest";
  await replayer.load(session);

  console.log("\n");
  console.log("  ┌─────────────────────────────────────────┐");
  console.log(`  │  REPLAYING at ${speed}x speed                  │`);
  console.log("  │  Watch the browser — video is recording  │");
  console.log("  └─────────────────────────────────────────┘");
  console.log("\n");

  // Navigate to starting point
  await page.goto(BASE);
  await harness.inject();

  // Replay
  await replayer.play();

  // Final pause so the video captures the end state
  await page.waitForTimeout(2000);
});
