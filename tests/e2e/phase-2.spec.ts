import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 2 done-when (IMPLEMENTATION_PLAN §6): enter several Loki variants in different universes, then filter by
// universe and status and sort by any column. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const thor = `${E2E_PREFIX} Thor ${run}`;
const avengers = `${E2E_PREFIX} Avengers ${run}`;
const loki = `${E2E_PREFIX} Loki ${run}`;
const earth199999 = `${E2E_PREFIX} Earth-199999 ${run}`;
const earth838 = `${E2E_PREFIX} Earth-838 ${run}`;
const unused = `${E2E_PREFIX} Unused ${run}`;

test.setTimeout(300_000);

test.afterAll(async () => {
  await removeE2eData();
});

// Picks an option from a combobox by typing into it, then clicking the option.
async function pick(page: Page, comboboxName: string, text: string, optionName = text) {
  const input = page.getByRole("combobox", { name: comboboxName, exact: true }).filter({ visible: true });
  await input.fill(text);
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

// Adds a universe from inside the universe combobox ("＋ Add “…”").
async function addUniverseInline(page: Page, name: string) {
  const input = page.getByRole("combobox", { name: "Universe", exact: true }).filter({ visible: true });
  await input.fill(name);
  await page.getByRole("option", { name: `＋ Add “${name}”` }).click();
  await expect(input).toHaveValue(name);
}

// The directory's rows, as their name and text.
function tableRows(page: Page) {
  return page.locator("tbody tr");
}

async function openFilter(page: Page, label: string) {
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
}

test("several Loki variants in different universes, filtered by universe and status, sorted by any column", async ({
  page,
}) => {
  await test.step("two movies for the variants to appear in", async () => {
    for (const [name, year] of [
      [thor, "2011"],
      [avengers, "2012"],
    ] as const) {
      await page.goto("/titles/new");
      await field(page, "Movie title").fill(name);
      await field(page, "In-universe year").fill(year);
      await page.getByRole("button", { name: "Save title" }).click();
      await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
      await page.getByRole("button", { name: "Save recap" }).click();
      await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    }
  });

  await test.step("three Loki variants in two universes, the first one with its first and last appearance", async () => {
    await page.goto("/characters/new");
    await field(page, "Name").fill(loki);
    await page.getByRole("radio", { name: "★ Major" }).click();
    await page.getByRole("radio", { name: "● Alive" }).click();
    await addUniverseInline(page, earth199999);
    await pick(page, "Predominant title", thor);
    await pick(page, "First appearance", thor, `${thor} · Movie`);
    await pick(page, "Last appearance", avengers, `${avengers} · Movie`);
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(field(page, "Name")).toHaveValue("");
    await expect(page.getByRole("status").filter({ hasText: "Add the next variant" })).toBeVisible();

    // The second variant: a new universe added inline, and a deceased status.
    await field(page, "Name").fill(loki);
    await page.getByRole("radio", { name: "Minor" }).click();
    await page.getByRole("radio", { name: "Deceased" }).click();
    await addUniverseInline(page, earth838);
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(field(page, "Name")).toHaveValue("");

    // The third variant: an existing universe, status unknown, and then save.
    await field(page, "Name").fill(loki);
    await page.getByRole("radio", { name: "Unknown" }).click();
    await pick(page, "Universe", earth199999);
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
  });

  await test.step("the directory finds the variants by name", async () => {
    await page.goto("/characters");
    await page.getByPlaceholder("Search by name…").fill(loki);
    await expect(tableRows(page)).toHaveCount(3);
  });

  await test.step("filter by universe, then by status", async () => {
    await openFilter(page, "Universe");
    await page.getByRole("button", { name: earth199999, exact: true }).click();
    await expect(tableRows(page)).toHaveCount(2);
    await expect(page).toHaveURL(/universe=/);

    await openFilter(page, "Status");
    await page.getByRole("button", { name: "Alive", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(1);
    await expect(tableRows(page).first()).toContainText("★ Major");
    await expect(page).toHaveURL(/status=alive/);
  });

  await test.step("the filters survive a reload", async () => {
    await page.reload();
    await expect(tableRows(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Status: Alive/ })).toBeVisible();
  });

  await test.step("clear all brings every variant back", async () => {
    await page.getByRole("button", { name: "Clear all", exact: true }).click();
    await expect(tableRows(page)).toHaveCount(3);
    await expect(page).not.toHaveURL(/status=|universe=/);
  });

  await test.step("sort by any column, toggling direction", async () => {
    const statusHeader = page.getByRole("columnheader", { name: "Status", exact: true });
    await statusHeader.getByRole("button").click();
    await expect(statusHeader).toHaveAttribute("aria-sort", "ascending");
    // Alive, then deceased, then unknown.
    await expect(tableRows(page).first()).toContainText("Alive");

    await statusHeader.getByRole("button").click();
    await expect(statusHeader).toHaveAttribute("aria-sort", "descending");
    await expect(tableRows(page).first()).toContainText("Unknown");
    await expect(page).toHaveURL(/sort=status.*dir=desc|dir=desc.*sort=status/);

    const firstHeader = page.getByRole("columnheader", { name: "First appearance", exact: true });
    await firstHeader.getByRole("button").click();
    await expect(firstHeader).toHaveAttribute("aria-sort", "ascending");
  });

  await test.step("a character page shows its first and last appearance, linked to their recaps", async () => {
    await page.getByRole("link", { name: loki, exact: true }).first().click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    const appearances = page.locator("section[aria-labelledby='first-last-appearance']");
    await expect(appearances.getByRole("heading", { name: "First and last appearance" })).toBeVisible();
    await expect(appearances.getByRole("link", { name: `${thor} · Movie`, exact: true })).toHaveAttribute("href", /\/recaps\//);
    await expect(appearances.getByRole("link", { name: `${avengers} · Movie`, exact: true })).toHaveAttribute("href", /\/recaps\//);
  });

  await test.step("editing a variant's status shows on its page", async () => {
    await page.getByRole("link", { name: "✎ Edit" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}\/edit$/);
    await page.getByRole("radio", { name: "Deceased" }).click();
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Deceased", { exact: true }).filter({ visible: true }).first()).toBeVisible();
  });

  await test.step("the recap edit page links characters to a recap", async () => {
    await page.goto("/recaps");
    await page.getByRole("link", { name: avengers, exact: true }).click();
    await page.getByRole("link", { name: "✎ Edit" }).click();
    await pick(page, "First Appearance Characters", loki, `${loki} · ${earth838}`);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    // The recap's First appearances card lists the variant added in this step, by its universe.
    await expect(page.locator("aside").getByRole("link", { name: new RegExp(earth838) })).toBeVisible();
  });

  await test.step("universes: one in use can't be deleted, an unused one can", async () => {
    await page.goto("/universes");
    await field(page, "New universe").fill(unused);
    await page.getByRole("button", { name: "＋ Add universe" }).click();
    await expect(page.getByRole("list", { name: "Universes" }).getByText(unused, { exact: true })).toBeVisible();

    const inUse = page.locator("li").filter({ hasText: earth199999 });
    await expect(inUse.getByRole("button", { name: "Delete" })).toBeDisabled();

    const unusedRow = page.locator("li").filter({ hasText: unused });
    await unusedRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("list", { name: "Universes" }).getByText(unused, { exact: true })).toHaveCount(0);
  });
});
