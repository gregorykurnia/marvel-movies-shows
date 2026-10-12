import { existsSync, readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";
import { parse } from "dotenv";

import { assertTestDatabase } from "./tests/support/test-database";

// Read both env files without changing process.env. The app server gets the test values only,
// so it can never pick up the production connection string.
const readEnv = (file: string) =>
  existsSync(file) ? parse(readFileSync(file)) : ({} as Record<string, string>);
const testEnv = readEnv(".env.test");
const productionEnv = readEnv(".env.local");

const testDatabaseUrl = assertTestDatabase(
  testEnv.DATABASE_URL_POOLED,
  productionEnv.DATABASE_URL_POOLED,
);

const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // Dev server, because the /styleguide route only exists in development.
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ...testEnv,
      DATABASE_URL_POOLED: testDatabaseUrl,
    } as Record<string, string>,
  },
});
