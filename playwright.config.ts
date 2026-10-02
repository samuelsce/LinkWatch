import { defineConfig, devices } from "@playwright/test";
import { randomBytes } from "node:crypto";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required for E2E; use a disposable database.");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PLAYWRIGHT_CHANNEL } }],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://localhost:3100/api/health/live",
    reuseExistingServer: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL,
      AUTH_SECRET: randomBytes(32).toString("base64url"),
      AUTH_URL: "http://localhost:3100",
      AUTH_TRUST_HOST: "true",
      // Exercise a configured provider without real credentials or external login.
      AUTH_GITHUB_ID: "e2e-client-id",
      AUTH_GITHUB_SECRET: "e2e-client-secret",
      MONITOR_LIMIT: "10",
    },
  },
});
