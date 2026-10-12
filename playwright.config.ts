import { existsSync, readFileSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";
import { parse } from "dotenv";

import { assertTestDatabase } from "./tests/support/test-database";

// The Neon endpoint publishes IPv6 addresses that don't answer from some networks, and a connection that picks one can
// stall for minutes. Prefer IPv4 in every Node process of the test run. The dev server and the test workers inherit it.
process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, "--dns-result-order=ipv4first"].filter(Boolean).join(" ");

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

// E2E_BASE_URL points the specs at a deployed site instead (for example the live URL, to check Phase 0's
// done-when). No local server is started in that case. Unset, the specs run against a local dev server
// that uses the test database.
const liveBaseUrl = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // The first visit to a route compiles it in dev, which can take several seconds.
  expect: { timeout: 20_000 },
  use: {
    baseURL: liveBaseUrl ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: liveBaseUrl
    ? undefined
    : {
        // Always the test-database dev server (npm run dev:test). Never reuse an existing server on the port:
        // a dev server started with plain `npm run dev` reads .env.local, which points at production.
        command: `npm run dev:test -- --port ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
          ...process.env,
          ...testEnv,
          DATABASE_URL_POOLED: testDatabaseUrl,
        } as Record<string, string>,
      },
});
