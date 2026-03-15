import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
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
      name: "visual",
      testMatch: "palette.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "crash",
      testMatch: "crash.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["visual"],
    },
  ],
  webServer: {
    command: "npm run dev -- -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
