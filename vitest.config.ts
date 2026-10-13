import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Unit and database tests only. Playwright specs in tests/e2e have their own runner.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/db/**/*.test.ts"],
    // The database tests share the test branch, and each one's cleanup removes every row named "E2E…". Run one file at a
    // time, so one file's cleanup can't delete another's rows halfway through.
    fileParallelism: false,
  },
});
