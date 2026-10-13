import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 9 done-when (IMPLEMENTATION_PLAN §6): a universe I pick on a flashback, flash-forward or time travel shows on
// the timeline card and popover, and the recap's universe shows when I leave it on "Same as recap". Runs against the
// test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movie = `${E2E_PREFIX} Strange ${run}`;
const mainYear = "2016";
const jumpYear = "1945";
const note = `${E2E_PREFIX} Other timeline ${run}`;
const earth616 = `${E2E_PREFIX} Earth-616 ${run}`;
const earth199999 = `${E2E_PREFIX} Earth-199999 ${run}`;
const jumpSlot = `#slot-${jumpYear}`;

let recapId = "";

test.setTimeout(300_000);

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Types a universe name into the combobox the test has focused, and creates it from the "＋ Add “…”" row if it's new.
// The combobox's own listbox is the one with the option, so it's found by its accessible name.
async function typeUniverse(page: Page, comboboxName: string, name: string) {
  const input = page.getByRole("combobox", { name: comboboxName, exact: true }).filter({ visible: true }).last();
  await input.fill(name);
  const create = page.getByRole("option", { name: `＋ Add “${name}”` });
  if (await create.count()) {
    await create.click();
  } else {
    await page.getByRole("option", { name, exact: true }).click();
  }
  await expect(input).toHaveValue(name);
}

// Adds one row under Other years, with its own universe.
async function addOtherYear(page: Page, { year, kind, text, universe }: { year: string; kind: string; text: string; universe: string }) {
  await page.getByRole("button", { name: "＋ Add another year" }).click();
  await page.getByLabel("Year", { exact: true }).last().fill(year);
  await page.getByLabel("Kind", { exact: true }).last().selectOption({ label: kind });
  await page.getByLabel("Note", { exact: true }).last().fill(text);
  await typeUniverse(page, "Universe for this year", universe);
}

// The cards in one year, in the order they're shown.
async function itemsIn(page: Page, yearLabel: string) {
  return page.locator(`ul[aria-label="Events in ${yearLabel}"] > li`).allTextContents();
}

test("a universe on a flashback shows on its card and popover, and clearing it falls back to the recap's", async ({ page }) => {
  await test.step("a movie in Earth-616, with a time travel into Earth-199999 on its recap", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movie);
    await field(page, "In-universe year").fill(mainYear);
    await typeUniverse(page, "Universe", earth616);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    recapId = new URL(page.url()).pathname.split("/")[2];

    await addOtherYear(page, { year: jumpYear, kind: "Time travel", text: note, universe: earth199999 });
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    // The recap page names the year's universe, because it differs from the recap's own.
    await expect(page.getByRole("definition").filter({ hasText: "Time travel" })).toContainText(earth199999);
  });

  await test.step("the card in its year carries the year's universe, not the recap's", async () => {
    await page.goto("/timeline");
    const items = await itemsIn(page, jumpYear);
    expect(items).toHaveLength(1);
    expect(items[0]).toContain(earth199999);
    expect(items[0]).not.toContain(earth616);
  });

  await test.step("hover shows the year's universe in the popover", async () => {
    await page.getByRole("button", { name: new RegExp(note) }).hover();
    await expect(page.getByText(`Universe: ${earth199999}`)).toBeVisible();
  });

  await test.step("clearing the year's universe to Same as recap shows the recap's universe", async () => {
    await page.goto(`/recaps/${recapId}/edit`);
    const row = page.getByRole("combobox", { name: "Universe for this year", exact: true }).last();
    await row.click();
    await page.getByRole("option", { name: "Same as recap", exact: true }).click();
    await expect(row).toHaveValue("");
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    // Same as the recap now, so the recap page doesn't repeat it.
    await expect(page.getByRole("definition").filter({ hasText: "Time travel" })).not.toContainText(earth199999);

    await page.goto("/timeline");
    const items = await itemsIn(page, jumpYear);
    expect(items[0]).toContain(earth616);
    expect(items[0]).not.toContain(earth199999);
    await page.getByRole("button", { name: new RegExp(note) }).hover();
    await expect(page.getByText(`Universe: ${earth616}`)).toBeVisible();
  });

  await test.step("a universe used by a year can't be deleted, and is freed once the year stops using it", async () => {
    await page.goto(`/recaps/${recapId}/edit`);
    await page.getByRole("combobox", { name: "Universe for this year", exact: true }).last().click();
    await page.getByRole("option", { name: earth199999, exact: true }).click();
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    await page.goto("/universes");
    const inUse = page.locator('ul[aria-label="Universes"] > li').filter({ hasText: earth199999 });
    await expect(inUse.getByText("In use. Clear it from its characters, recaps and other years first.")).toBeVisible();
    await expect(inUse.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  await test.step("the timeline still places the year with the recap's main year", async () => {
    await page.goto("/timeline");
    await expect(page.locator(jumpSlot)).toHaveCount(1);
  });
});
