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
  },
});
