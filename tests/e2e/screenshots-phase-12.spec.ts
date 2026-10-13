import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { characters, tags, characterTags } from "../../src/db/schema";
import { connectTestDatabase, E2E_PREFIX, removeE2eData, seedBrowseData } from "../support/e2e-data";
import { themes, widths } from "../support/screenshots";

// Phase 12 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-12/: the directory with
// nothing selected, with rows selected, with each editor open (importance, universe list, tags), and the delete dialog.
// Every screen is checked for sideways scroll.
const run = Date.now().toString(36);
const outDir = join(process.cwd(), "screenshots", "phase-12");

test.beforeAll(async () => {
  mkdirSync(outDir, { recursive: true });
  await seedBrowseData(run);
  const db = connectTestDatabase();
  const rows = await db
    .insert(characters)
    .values(["Sif", "Heimdall", "Hela"].map((name) => ({ name: `${E2E_PREFIX} ${name} ${run}`, importance: "minor" as const, status: "alive" as const })))
    .returning({ id: characters.id });
  const [tag] = await db.insert(tags).values({ name: `${E2E_PREFIX} asgard ${run}` }).returning({ id: tags.id });
  await db.insert(characterTags).values(rows.map((row) => ({ characterId: row.id, tagId: tag.id })));
});

test.afterAll(async () => {
  await removeE2eData();
});

const screens = ["empty", "selected", "importance", "universe", "tags", "delete"] as const;

for (const screen of screens) {
  for (const size of widths) {
    for (const theme of themes) {
      test(`${screen} at ${size.name}px, ${theme}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript((value) => {
          try {
            localStorage.setItem("marvel-directory-theme", value);
          } catch {
            // storage blocked, so the page follows the system setting
          }
        }, theme);
        await page.goto(`/characters?q=${run}`);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("h1").first()).toBeVisible();

        if (screen !== "empty") {
          await page.getByRole("checkbox", { name: "Select all shown characters" }).check();
          const bar = page.getByRole("region", { name: "Bulk edit" });
          await expect(bar).toBeVisible();
          if (screen === "importance") {
            await bar.getByRole("button", { name: "Importance", exact: true }).click();
            await bar.getByRole("radio", { name: "★ Major" }).click();
          }
          if (screen === "universe") {
            await bar.getByRole("button", { name: "Universe", exact: true }).click();
            await bar.getByRole("combobox", { name: "Universe", exact: true }).click();
          }
          if (screen === "tags") {
            await bar.getByRole("button", { name: "Tags", exact: true }).click();
            await bar.getByRole("combobox", { name: "Tags to remove", exact: true }).click();
          }
          if (screen === "delete") await bar.getByRole("button", { name: "Delete…" }).click();
        }

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(0);
        await page.screenshot({ path: join(outDir, `${screen}-${size.name}-${theme}.png`) });
      });
    }
  }
}
