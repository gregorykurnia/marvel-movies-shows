import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 11 (IMPLEMENTATION_PLAN §6): first appearances on recaps and characters, inline adds for characters, movies,
// shows and episodes, a typed universe added on save, and universes on the titles list. Runs against the test branch.
// Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movieName = `${E2E_PREFIX} Thor ${run}`;
const newCharacter = `${E2E_PREFIX} Sif ${run}`;
const showName = `${E2E_PREFIX} Ghosts ${run}`;
const showCharacter = `${E2E_PREFIX} Hettie ${run}`;
const multiShow = `${E2E_PREFIX} Two Worlds ${run}`;
const earthA = `${E2E_PREFIX} Earth-A ${run}`;
const earthB = `${E2E_PREFIX} Earth-B ${run}`;

test.setTimeout(300_000);

test.afterAll(async () => {
  await removeE2eData();
});

// The First Appearance Characters picker is a combobox. Typing a name that isn't in the list offers "＋ Add character".
async function addCharacterInline(page: Page, name: string) {
  const input = page.getByRole("combobox", { name: "First Appearance Characters", exact: true }).filter({ visible: true });
  await input.fill(name);
  await page.getByRole("option", { name: `＋ Add character “${name}”` }).click();
}

test("a character added inline on a recap is its first appearance, shown on the character page", async ({ page }) => {
  let recapUrl = "";
  await test.step("a movie to put the character in", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movieName);
    await field(page, "In-universe year").fill("2011");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    recapUrl = page.url();
  });

  await test.step("the picker is named First Appearance Characters, and a new name adds a character", async () => {
    await expect(page.getByRole("combobox", { name: "First Appearance Characters", exact: true }).filter({ visible: true })).toBeVisible();
    await addCharacterInline(page, newCharacter);
    const chosen = page.getByRole("list", { name: "First Appearance Characters, chosen" });
    await expect(chosen).toContainText(newCharacter);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
  });

  await test.step("the recap lists the character under first appearances", async () => {
    expect(recapUrl).not.toBe("");
    const card = page.locator("aside").filter({ hasText: "First appearances" });
    await expect(card.getByRole("link", { name: new RegExp(newCharacter) })).toBeVisible();
  });

  await test.step("the character page shows the movie as its first appearance", async () => {
    await page.locator("aside").getByRole("link", { name: new RegExp(newCharacter) }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    const section = page.locator("section[aria-labelledby='first-last-appearance']");
    await expect(section.getByRole("heading", { name: "First and last appearance" })).toBeVisible();
    await expect(section.getByRole("link", { name: `${movieName} · Movie`, exact: true })).toHaveAttribute("href", /\/recaps\//);
  });
});

test("a show episode added from the character form's First appearance dialog, then picked", async ({ page }) => {
  await test.step("a new character, and the dialog from First appearance", async () => {
    await page.goto("/characters/new");
    await field(page, "Name").fill(showCharacter);
    const first = page.getByRole("combobox", { name: "First appearance", exact: true }).filter({ visible: true });
    await first.click();
    await page.getByRole("option", { name: "＋ Add new…" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  await test.step("a new show with its season, episode and episode name, added and picked", async () => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Show" }).click();
    await dialog.getByRole("combobox", { name: "Show", exact: true }).fill(showName);
    await dialog.getByLabel("Season", { exact: true }).fill("1");
    await dialog.getByLabel("Episode number", { exact: true }).fill("1");
    await dialog.getByLabel("Episode name", { exact: true }).fill("Pilot");
    await dialog.getByRole("button", { name: "Add and pick" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "First appearance", exact: true }).filter({ visible: true })).toHaveValue(
      `${showName} · S01·E01 · Pilot`,
    );
  });

  await test.step("saving the character shows that episode as its first appearance", async () => {
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    const section = page.locator("section[aria-labelledby='first-last-appearance']");
    await expect(section.getByRole("link", { name: `${showName} · S01·E01 · Pilot`, exact: true })).toHaveAttribute("href", /\/recaps\//);
  });
});

test("a typed universe is added on save, and a title shows a chip for each universe its episodes are in", async ({ page }) => {
  await test.step("a show", async () => {
    await page.goto("/titles/new");
    await page.getByRole("radio", { name: "Show" }).click();
    await field(page, "Show title").fill(multiShow);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
  });

  for (const [episode, universe] of [
    [1, earthA],
    [2, earthB],
  ] as const) {
    await test.step(`episode ${episode} in a universe typed, not picked`, async () => {
      await page.getByRole("link", { name: "＋ Add episodes" }).first().click();
      await field(page, "Season").fill("1");
      await field(page, "Episode number").fill(String(episode));
      const universeInput = page.getByRole("combobox", { name: "Universe", exact: true }).filter({ visible: true });
      await universeInput.fill(universe);
      await universeInput.blur();
      await page.getByRole("button", { name: "Save episode" }).click();
      await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
    });
  }

  await test.step("both universes were added to the universes list on save", async () => {
    await page.goto("/universes");
    const list = page.getByRole("list", { name: "Universes" });
    await expect(list.getByText(earthA, { exact: true })).toBeVisible();
    await expect(list.getByText(earthB, { exact: true })).toBeVisible();
  });

  await test.step("the titles list shows both universes on the show", async () => {
    await page.goto("/titles");
    const row = page.getByRole("list", { name: "Titles" }).getByRole("listitem").filter({ hasText: multiShow });
    await expect(row.getByText(earthA, { exact: true })).toBeVisible();
    await expect(row.getByText(earthB, { exact: true })).toBeVisible();
  });
});
