/* ------------------------------------------------------------------ */
/*  Interactive Recording Session                                       */
/*                                                                      */
/*  Usage:                                                              */
/*    npm run test:record                                               */
/*                                                                      */
/*  Opens a headed browser, captures every click/type/navigate action.  */
/*  Press Cmd+Shift+S (or Ctrl+Shift+S) to stop and save.              */
/* ------------------------------------------------------------------ */

import { test } from "@playwright/test";
import { ActionRecorder } from "./action-recorder";
import { VisualHarness } from "./visual-harness";

const BASE = "http://localhost:3000";
const ADMIN_EMAIL = "admin@listblitz.io";
const ADMIN_PASS = "admin";

test("record interactive session", async ({ page }) => {
  test.setTimeout(0); // no timeout — user controls duration

  // Login first
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

  // Set up visual harness + recorder
  const harness = new VisualHarness(page, { actionDelay: 0 });
  const recorder = new ActionRecorder(page, harness);
  await recorder.start();

  // Navigate to app
  await page.goto(BASE);
  await harness.inject();
  await harness.showRecordingBadge();

  console.log("\n");
  console.log("  ┌─────────────────────────────────────────┐");
  console.log("  │  RECORDING — interact with the app      │");
  console.log("  │  Press Cmd/Ctrl + Shift + S to stop     │");
  console.log("  └─────────────────────────────────────────┘");
  console.log("\n");

  // Wait until user stops
  await recorder.waitForStop();

  // Save
  const filepath = await recorder.save();
  console.log(`\n  Done! Replay with:  npm run test:replay\n`);
});
