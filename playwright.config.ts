import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    ["./tests/reporter.ts"],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "stress",
      testDir: "./tests/stress",
      testMatch: "*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "gui-audit",
      testDir: "./tests/gui-audit",
      testMatch: "*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      timeout: 900_000, // 15 min — 12 agents need time
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
