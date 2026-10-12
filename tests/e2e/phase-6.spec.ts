import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 6 done-when (IMPLEMENTATION_PLAN §6): set a universe on a movie or an episode, see it on the recap page and in
// the list, and a universe used by a recap can't be deleted. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movie = `${E2E_PREFIX} Thor ${run}`;
const show = `${E2E_PREFIX} Loki ${run}`;
const earth616 = `${E2E_PREFIX} Earth-616 ${run}`;
const earth199999 = `${E2E_PREFIX} Earth-199999 ${run}`;

test.setTimeout(300_000);

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Picks an existing option from a combobox by typing into it, then clicking the option.
async function pick(page: Page, comboboxName: string, text: string) {
  const input = page.getByRole("combobox", { name: comboboxName, exact: true }).filter({ visible: true });
  await input.fill(text);
  await page.getByRole("option", { name: text, exact: true }).click();
  await expect(input).toHaveValue(text);
}

// Adds a universe from inside the universe combobox ("＋ Add “…”"), then checks it is selected.
async function addUniverseInline(page: Page, name: string) {
  const input = page.getByRole("combobox", { name: "Universe", exact: true }).filter({ visible: true });
  await input.fill(name);
  await page.getByRole("option", { name: `＋ Add “${name}”` }).click();
  await expect(input).toHaveValue(name);
}

// A row in the recap list, found by its title.
function recapRow(page: Page, heading: string) {
  return page.locator('ol[aria-label="Recaps in order"] > li').filter({ hasText: heading });
}

// A row on /universes, found by the universe's name.
function universeRow(page: Page, name: string) {
  return page.locator("li").filter({ hasText: name });
}

test("a universe on a movie and on an episode, shown on the recap and in the list, and kept while a recap uses it", async ({
  page,
}) => {
  let recapPath = "";

  await test.step("a movie with a new universe added inline", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movie);
    await field(page, "In-universe year").fill("2011");
    await addUniverseInline(page, earth616);
    await page.getByRole("button", { name: "Save title" }).click();

    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    recapPath = new URL(page.url()).pathname.replace(/\/edit$/, "");
    // The universe was saved with the movie, so the recap's edit page starts with it.
    await expect(field(page, "Universe")).toHaveValue(earth616);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`${recapPath}$`));
  });

  await test.step("the recap page shows the universe in the header and in Details", async () => {
    await expect(page.getByText(earth616, { exact: true }).first()).toBeVisible();
    await expect(page.locator("dl").getByText(earth616, { exact: true })).toBeVisible();
  });

  await test.step("the recap list shows the universe chip on its row", async () => {
    await page.goto("/recaps");
    await expect(recapRow(page, movie).getByText(earth616, { exact: true })).toBeVisible();
  });

  await test.step("a show with a run of episodes, all in one universe", async () => {
    await page.goto("/titles/new");
    await page.getByRole("radio", { name: "Show" }).click();
    await field(page, "Show title").fill(show);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);

    const showPath = new URL(page.url()).pathname;
    await page.goto(`${showPath}/episodes/new`);
    await page.getByRole("radio", { name: "A run of episodes" }).click();
    await field(page, "First episode").fill("1");
    await field(page, "Last episode").fill("2");
    await field(page, "In-universe year").fill("2012");
    await addUniverseInline(page, earth199999);
    await page.getByRole("button", { name: "Add 2 episodes" }).click();

    await expect(page).toHaveURL(new RegExp(`${showPath}$`));
    await page.goto("/recaps");
    await expect(recapRow(page, `${show} — Episode 1`).getByText(earth199999, { exact: true })).toBeVisible();
    await expect(recapRow(page, `${show} — Episode 2`).getByText(earth199999, { exact: true })).toBeVisible();
  });

  await test.step("the universe can be changed and cleared on the recap's edit page", async () => {
    await page.goto(`${recapPath}/edit`);
    const input = field(page, "Universe");
    await expect(input).toHaveValue(earth616);

    // Clearing: focus the field, then choose "No universe".
    await input.click();
    await page.getByRole("option", { name: "No universe", exact: true }).click();
    await expect(input).toHaveValue("");
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`${recapPath}$`));
    await expect(page.locator("dl").getByText("No universe set", { exact: true })).toBeVisible();
    await expect(page.getByText(earth616, { exact: true })).toHaveCount(0);

    // Setting an existing universe again.
    await page.goto(`${recapPath}/edit`);
    await pick(page, "Universe", earth199999);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`${recapPath}$`));
    await expect(page.locator("dl").getByText(earth199999, { exact: true })).toBeVisible();
  });

  await test.step("a universe a recap uses can't be deleted, and an unused one can", async () => {
    await page.goto("/universes");

    // Earth-199999 is used by the movie and both episodes.
    const inUse = universeRow(page, earth199999);
    await expect(inUse.getByText("0 characters · 3 recaps", { exact: true })).toBeVisible();
    await expect(inUse.getByRole("button", { name: "Delete" })).toBeDisabled();
    await expect(inUse.getByText("In use. Clear it from its characters and recaps first.")).toBeVisible();

    // Earth-616 is no longer used by anything.
    const unused = universeRow(page, earth616);
    await expect(unused.getByText("0 characters · 0 recaps", { exact: true })).toBeVisible();
    await unused.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("list", { name: "Universes" }).getByText(earth616, { exact: true })).toHaveCount(0);
  });
});

test("on a phone, the recap page and the movie form don't scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/titles/new");
  await expect(field(page, "Universe")).toBeVisible();
  const formOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(formOverflow, "the movie form should not scroll sideways").toBeLessThanOrEqual(0);

  await page.goto("/recaps");
  const listOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(listOverflow, "the recap list should not scroll sideways").toBeLessThanOrEqual(0);
});
