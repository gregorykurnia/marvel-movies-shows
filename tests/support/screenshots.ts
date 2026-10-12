import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

// Design review (DESIGN_GUIDE §13): each page at 390px and 1280px, in light and dark. The pages render inside the
// app shell, and must never scroll sideways (§5). Files are written to screenshots/<phase>/ (git-ignored).
export const widths = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
] as const;

export const themes = ["light", "dark"] as const;

// `path` is a function, so ids seeded in beforeAll are read when each test runs.
export function screenshotPages(phase: string, pages: { name: string; path: () => string }[]) {
  const outDir = join(process.cwd(), "screenshots", phase);

  test.beforeAll(() => {
    mkdirSync(outDir, { recursive: true });
  });

  for (const pageInfo of pages) {
    for (const size of widths) {
      for (const theme of themes) {
        test(`${pageInfo.name} at ${size.name}px, ${theme}`, async ({ page }) => {
          // The first visit to a route compiles it in dev, so each screen gets more time than the default.
          test.setTimeout(120_000);
          await page.setViewportSize({ width: size.width, height: size.height });
          await page.addInitScript((value) => {
            try {
              localStorage.setItem("marvel-directory-theme", value);
            } catch {
              // storage blocked, so the page follows the system setting
            }
          }, theme);

          await page.goto(pageInfo.path());
          await page.waitForLoadState("networkidle");
          await expect(page.locator("h1").first()).toBeVisible();

          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          );
          expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(0);

          await page.screenshot({ path: join(outDir, `${pageInfo.name}-${size.name}-${theme}.png`), fullPage: true });
        });
      }
    }
  }
}
