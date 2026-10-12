import { expect, test } from "@playwright/test";

import { removeE2eData, seedBrowseData } from "../support/e2e-data";

// Phase 4 layout (DESIGN_GUIDE §5 and §13): at phone width the page header keeps its chips clear of the Edit button,
// and the page never scrolls sideways. Runs against the test branch.

const run = `layout${Date.now().toString(36)}`;
let ids: Awaited<ReturnType<typeof seedBrowseData>> | undefined;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
});

test.afterAll(async () => {
  await removeE2eData();
});

test("on a phone, the character header keeps its universe chip clear of the Edit button", async ({ page }) => {
  if (!ids) throw new Error("seedBrowseData has not run");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/characters/${ids.characterId}`);

  const header = page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::header[1]");
  const chip = header.getByText(ids.universeName, { exact: true });
  const edit = header.getByRole("link", { name: "✎ Edit", exact: true });
  await expect(chip).toBeVisible();

  const [chipBox, editBox] = await Promise.all([chip.boundingBox(), edit.boundingBox()]);
  if (!chipBox || !editBox) throw new Error("the header chip or Edit button has no box");
  const overlaps =
    chipBox.x < editBox.x + editBox.width &&
    editBox.x < chipBox.x + chipBox.width &&
    chipBox.y < editBox.y + editBox.height &&
    editBox.y < chipBox.y + chipBox.height;
  expect(overlaps, "the universe chip and the Edit button overlap").toBe(false);

  const scrollsSideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(scrollsSideways).toBe(false);
});
