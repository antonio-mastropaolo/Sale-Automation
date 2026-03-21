/* ------------------------------------------------------------------ */
/*  Playwright config for Record / Replay / Visual test mode            */
/*                                                                      */
/*  Always runs HEADED with VIDEO recording + trace capture so you      */
/*  can watch actions live and review the video afterward.              */
/* ------------------------------------------------------------------ */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/recorder",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000, // 2 min default; record.spec overrides to 0
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],

    /* ── always headed so you SEE what's happening ─────── */
    headless: false,

    /* ── video: always record ──────────────────────────── */
    video: "on",

    /* ── trace: always capture ─────────────────────────── */
    trace: "on",

    /* ── viewport ──────────────────────────────────────── */
    viewport: { width: 1280, height: 800 },

    /* ── slow-mo for extra visibility at speed ─────────── */
    launchOptions: {
      slowMo: parseInt(process.env.SLOWMO || "0", 10),
    },
  },

  /* ── output: videos & traces land here ───────────────── */
  outputDir: "./test-results/recorder",

  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
