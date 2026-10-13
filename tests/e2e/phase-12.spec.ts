import { expect, test, type Page } from "@playwright/test";

import { characters, entries, titles, universes } from "../../src/db/schema";
import { connectTestDatabase, E2E_PREFIX, removeE2eData } from "../support/e2e-data";

// Phase 12 (IMPLEMENTATION_PLAN §6): bulk edit in the character directory. Tick characters, change one thing for all of
// them, confirm once. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const names = ["A", "B", "C", "D"].map((letter) => `${E2E_PREFIX} Bulk ${letter} ${run}`);
const earth = `${E2E_PREFIX} Earth-B12 ${run}`;
const typedEarth = `${E2E_PREFIX} Earth-T12 ${run}`;
const movieName = `${E2E_PREFIX} Bulk Movie ${run}`;
const tagKeep = `${E2E_PREFIX} keep ${run}`;
const tagNew = `${E2E_PREFIX} fresh ${run}`;

test.setTimeout(300_000);

test.beforeAll(async () => {
  const db = connectTestDatabase();
  await db.insert(universes).values({ name: earth });
  const [title] = await db.insert(titles).values({ name: movieName, kind: "movie" }).returning({ id: titles.id });
  await db.insert(entries).values({ titleId: title.id, sortKey: `bulk12-${run}`, watched: false });
  await db.insert(characters).values(names.map((name) => ({ name, importance: "minor" as const, status: "unknown" as const })));
});

test.afterAll(async () => {
  await removeE2eData();
});

// The table narrowed to this run's four characters, by the run id in their names. Rows are found by name.
async function open(page: Page) {
  await page.goto(`/characters?q=${run}`);
  await expect(rowOf(page, names[0])).toBeVisible();
}

const rowOf = (page: Page, name: string) => page.locator("tbody tr").filter({ hasText: name });
const tick = (page: Page, name: string) => page.getByRole("checkbox", { name: `Select ${name}`, exact: true }).check();
const bar = (page: Page) => page.getByRole("region", { name: "Bulk edit" });

test("ticking rows shows the bar, and one confirm sets importance for all of them", async ({ page }) => {
  await open(page);
  await expect(bar(page)).toHaveCount(0);

  await tick(page, names[0]);
  await tick(page, names[1]);
  await expect(bar(page).getByText("2 selected")).toBeVisible();

  await bar(page).getByRole("button", { name: "Importance", exact: true }).click();
  await bar(page).getByRole("radio", { name: "★ Major" }).click();
  await expect(bar(page).getByText("Set importance to Major for 2 characters?")).toBeVisible();
  await bar(page).getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText("Updated 2 characters.")).toBeVisible();
  await expect(rowOf(page, names[0]).getByText("★ Major", { exact: true })).toBeVisible();
  await expect(rowOf(page, names[1]).getByText("★ Major", { exact: true })).toBeVisible();
  await expect(rowOf(page, names[2]).getByText("Minor", { exact: true })).toBeVisible();
  // The selection is kept, so another change can follow.
  await expect(bar(page).getByText("2 selected")).toBeVisible();
});

test("select all takes the rows the filters show, and the bar counts the ones a filter hides", async ({ page }) => {
  await open(page);
  await page.getByRole("checkbox", { name: "Select all shown characters" }).check();
  await expect(bar(page).getByText(/^4 selected/)).toBeVisible();

  await page.getByPlaceholder("Search by name…").fill(`Bulk A ${run}`);
  await expect(bar(page).getByText("(3 hidden by filters)")).toBeVisible();

  await bar(page).getByRole("button", { name: "Status", exact: true }).click();
  await bar(page).getByRole("radio", { name: "Deceased" }).click();
  await expect(bar(page).getByText("Set status to Deceased for 4 characters?")).toBeVisible();
  await bar(page).getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Updated 4 characters.")).toBeVisible();

  await page.getByRole("button", { name: "Clear selection" }).click();
  await expect(bar(page)).toHaveCount(0);
  await page.getByPlaceholder("Search by name…").fill(run);
  for (const name of names) await expect(rowOf(page, name).getByText("Deceased", { exact: true })).toBeVisible();
});

test("a universe is picked, typed, and cleared with None", async ({ page }) => {
  await open(page);
  await page.getByRole("checkbox", { name: "Select all shown characters" }).check();
  await bar(page).getByRole("button", { name: "Universe", exact: true }).click();

  await test.step("a picked universe", async () => {
    const input = bar(page).getByRole("combobox", { name: "Universe", exact: true });
    await input.fill(earth);
    await page.getByRole("option", { name: earth, exact: true }).click();
    await bar(page).getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Updated 4 characters.")).toBeVisible();
    for (const name of names) await expect(rowOf(page, name).getByText(earth, { exact: true })).toBeVisible();
  });

  await test.step("a new name typed, added on confirm", async () => {
    await bar(page).getByRole("button", { name: "Universe", exact: true }).click();
    const input = bar(page).getByRole("combobox", { name: "Universe", exact: true });
    await input.fill(typedEarth);
    await page.getByRole("option", { name: `＋ Add universe “${typedEarth}”` }).click();
    await expect(bar(page).getByText(`Set the universe to “${typedEarth}” for 4 characters? It's added if it's new.`)).toBeVisible();
    await bar(page).getByRole("button", { name: "Confirm" }).click();
    await expect(rowOf(page, names[0]).getByText(typedEarth, { exact: true })).toBeVisible();
  });

  await test.step("None clears it", async () => {
    await bar(page).getByRole("button", { name: "Universe", exact: true }).click();
    await bar(page).getByRole("combobox", { name: "Universe", exact: true }).click();
    await page.getByRole("option", { name: "None", exact: true }).click();
    await expect(bar(page).getByText("Clear the universe for 4 characters?")).toBeVisible();
    await bar(page).getByRole("button", { name: "Confirm" }).click();
    await expect(rowOf(page, names[0]).getByText(typedEarth, { exact: true })).toHaveCount(0);
    await expect(rowOf(page, names[3]).getByText(earth, { exact: true })).toHaveCount(0);
  });
});

test("first appearance is set for all, then cleared with None", async ({ page }) => {
  await open(page);
  await tick(page, names[0]);
  await tick(page, names[2]);
  await bar(page).getByRole("button", { name: "First appearance", exact: true }).click();
  await bar(page).getByRole("combobox", { name: "First appearance", exact: true }).fill(movieName);
  await page.getByRole("option", { name: new RegExp(movieName) }).click();
  await bar(page).getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Updated 2 characters.")).toBeVisible();
  await expect(rowOf(page, names[0]).getByRole("link", { name: new RegExp(movieName) })).toBeVisible();
  await expect(rowOf(page, names[2]).getByRole("link", { name: new RegExp(movieName) })).toBeVisible();
  await expect(rowOf(page, names[1]).getByRole("link", { name: new RegExp(movieName) })).toHaveCount(0);

  await bar(page).getByRole("button", { name: "First appearance", exact: true }).click();
  await bar(page).getByRole("combobox", { name: "First appearance", exact: true }).click();
  await page.getByRole("option", { name: "None", exact: true }).click();
  await bar(page).getByRole("button", { name: "Confirm" }).click();
  await expect(rowOf(page, names[0]).getByRole("link", { name: new RegExp(movieName) })).toHaveCount(0);
});

test("tags are added and removed, and the characters' other tags stay", async ({ page }) => {
  await open(page);
  await tick(page, names[0]);
  await tick(page, names[1]);

  await test.step("add two tags, one of them new", async () => {
    await bar(page).getByRole("button", { name: "Tags", exact: true }).click();
    const add = bar(page).getByRole("combobox", { name: "Tags to add", exact: true });
    await add.fill(tagKeep);
    await page.getByRole("option", { name: `＋ Add “${tagKeep}”` }).click();
    await add.fill(tagNew);
    await page.getByRole("option", { name: `＋ Add “${tagNew}”` }).click();
    await expect(bar(page).getByText(`Add #${tagKeep}, #${tagNew} on 2 characters?`)).toBeVisible();
    await bar(page).getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("Updated 2 characters.")).toBeVisible();
    for (const name of [names[0], names[1]]) {
      await expect(rowOf(page, name)).toContainText(tagKeep);
      await expect(rowOf(page, name)).toContainText(tagNew);
    }
    await expect(rowOf(page, names[2])).not.toContainText(tagKeep);
  });

  await test.step("remove one, the other stays", async () => {
    await bar(page).getByRole("button", { name: "Tags", exact: true }).click();
    const remove = bar(page).getByRole("combobox", { name: "Tags to remove", exact: true });
    await remove.click();
    // Only tags the selected characters have are offered.
    await expect(page.getByRole("option", { name: `#${tagNew}`, exact: true })).toBeVisible();
    await page.getByRole("option", { name: `#${tagNew}`, exact: true }).click();
    await expect(bar(page).getByText(`Remove #${tagNew} on 2 characters?`)).toBeVisible();
    await bar(page).getByRole("button", { name: "Confirm" }).click();
    await expect(rowOf(page, names[0])).not.toContainText(tagNew);
    await expect(rowOf(page, names[0])).toContainText(tagKeep);
  });
});

test("delete asks for DELETE, then removes the selected characters", async ({ page }) => {
  await open(page);
  await tick(page, names[2]);
  await tick(page, names[3]);
  await bar(page).getByRole("button", { name: "Delete…" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Delete 2 characters?" })).toBeVisible();
  const confirm = dialog.getByRole("button", { name: "Delete 2 characters" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("delete");
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();

  await expect(page.getByText("Deleted 2 characters.")).toBeVisible();
  await expect(rowOf(page, names[2])).toHaveCount(0);
  await expect(rowOf(page, names[3])).toHaveCount(0);
  await expect(rowOf(page, names[0])).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
});
