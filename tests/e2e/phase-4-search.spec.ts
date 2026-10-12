import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData, seedMatchingEvents } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 4 search (PRODUCT_PLAN §2.5): one search finds a recap, a timeline event, a character, a note and a tag, and
// the header box and its shortcuts work from any page. Runs against the test branch. Every name is prefixed "E2E".

test.setTimeout(300_000);

const run = Date.now().toString(36);
// Each word is made only for this run, so the results are exact. Letters and digits only, so the search tokenises
// them the same way the text was stored.
const recapWord = `recapword${run}`;
const noteWord = `noteword${run}`;
const tagWord = `searchtag${run}`;
const eventWord = `eventword${run}`;
const characterWord = `searchchar${run}`;
const manyWord = `manyword${run}`;
const movie = `${E2E_PREFIX} Search movie ${run}`;
const character = `${E2E_PREFIX} ${characterWord}`;

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Adds a tag to the "Add a tag" box, picking the new option it offers.
async function addTag(page: Page, typed: string) {
  const input = page.getByRole("combobox", { name: "Add a tag", exact: true }).filter({ visible: true });
  await input.fill(typed);
  await page.getByRole("option", { name: `＋ Add “${typed}”`, exact: true }).click({ timeout: 20_000 });
}

// The search box in the header. It is the only searchbox on the page.
function headerSearch(page: Page) {
  return page.getByRole("searchbox", { name: "Search", exact: true }).filter({ visible: true });
}

async function search(page: Page, text: string) {
  await headerSearch(page).fill(text);
  await headerSearch(page).press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
}

test("one search finds a recap, its note and tag, an event, and a character", async ({ page }) => {
  await test.step("a movie with a recap, a note and a tag", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movie);
    await field(page, "In-universe year").fill("2012");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    await field(page, "Recap").fill(`The plot turns on the ${recapWord} artifact.`);
    await field(page, "Notes").fill(`A note about the ${noteWord} scene.`);
    await addTag(page, tagWord);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
  });

  await test.step("a timeline event", async () => {
    await page.goto("/timeline/new");
    await field(page, "Year").fill("1960");
    await field(page, "What happened").fill(`${E2E_PREFIX} The ${eventWord} happens`);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
  });

  await test.step("a character", async () => {
    await page.goto("/characters/new");
    await field(page, "Name").fill(character);
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
  });

  await test.step("the header box finds the recap by its text, with the match highlighted", async () => {
    await page.goto("/timeline");
    await search(page, recapWord);
    await expect(page.getByRole("heading", { name: "Recaps", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: movie })).toBeVisible();
    await expect(page.locator("mark", { hasText: recapWord })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timeline", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Characters", exact: true })).toHaveCount(0);
  });

  await test.step("the note and the tag find the same recap", async () => {
    await search(page, noteWord);
    await expect(page.getByRole("link", { name: movie })).toBeVisible();
    await search(page, tagWord);
    await expect(page.getByRole("link", { name: movie })).toBeVisible();
  });

  await test.step("an event and a character are found in their own groups", async () => {
    await search(page, eventWord);
    await expect(page.getByRole("heading", { name: "Timeline", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /eventword/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recaps", exact: true })).toHaveCount(0);

    await search(page, characterWord);
    await expect(page.getByRole("heading", { name: "Characters", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: character })).toBeVisible();
  });

  await test.step("a misspelled name still finds the character", async () => {
    await search(page, `serachchar${run}`);
    await expect(page.getByRole("link", { name: character })).toBeVisible();
  });

  await test.step("a single letter asks for more, and nothing matching says so", async () => {
    await search(page, "x");
    await expect(page.getByText("Type a little more")).toBeVisible();
    await search(page, `nothing${run}here`);
    await expect(page.getByText("Nothing matches")).toBeVisible();
  });

  await test.step("the / and Ctrl+K shortcuts focus the box from any page", async () => {
    await page.goto("/tags");
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("/");
    await expect(headerSearch(page)).toBeFocused();

    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("Control+k");
    await expect(headerSearch(page)).toBeFocused();
  });
});

test("a group with more matches than the preview gets a Show all link", async ({ page }) => {
  await seedMatchingEvents(manyWord, 11);
  await page.goto("/timeline");
  await search(page, manyWord);

  const timeline = page.getByRole("region", { name: "Timeline", exact: true });
  await expect(timeline.getByRole("link", { name: new RegExp(manyWord) })).toHaveCount(10);
  await timeline.getByRole("link", { name: "Show all 11", exact: true }).click();

  await expect(page).toHaveURL(/group=events/);
  await expect(page.getByRole("link", { name: new RegExp(manyWord) })).toHaveCount(11);
  await expect(page.getByRole("heading", { name: "Recaps", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "All results", exact: true })).toBeVisible();
});
