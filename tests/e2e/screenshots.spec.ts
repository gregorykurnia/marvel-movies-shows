import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

// Design review screenshots (DESIGN_GUIDE §13): the home page, /styleguide and the 404 at 390px and 1280px, in light and dark.
// Files are written to screenshots/phase-0/ at the project root (git-ignored).
const outDir = join(process.cwd(), "screenshots", "phase-0");
const widths = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 },
] as const;
const themes = ["light", "dark"] as const;
const pages = [
  { name: "home", path: "/" },
  { name: "styleguide", path: "/styleguide" },
  { name: "not-found", path: "/this-page-does-not-exist" },
] as const;

test.beforeAll(() => {
  mkdirSync(outDir, { recursive: true });
});

for (const pageInfo of pages) {
  for (const size of widths) {
    for (const theme of themes) {
      test(`${pageInfo.name} at ${size.name}px, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        // Set the saved theme the same way a visitor's click does. Light and dark both win over the system setting.
        await page.addInitScript((value) => {
          try {
            localStorage.setItem("marvel-directory-theme", value);
          } catch {
            // storage blocked, so the page follows the system setting
          }
        }, theme);

        await page.goto(pageInfo.path);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("h1").first()).toBeVisible();

        // No sideways page scroll at any width (DESIGN_GUIDE §5).
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(0);

        await page.screenshot({
          path: join(outDir, `${pageInfo.name}-${size.name}-${theme}.png`),
          fullPage: true,
        });
      });
    }
  }
}
