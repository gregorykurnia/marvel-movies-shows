import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 4 (IMPLEMENTATION_PLAN §6): notes and tags on the forms, tag management, tag filters, and the deletes that the
// user approved. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movie = `${E2E_PREFIX} Avengers ${run}`;
const otherMovie = `${E2E_PREFIX} Thor ${run}`;
const show = `${E2E_PREFIX} Loki ${run}`;
const character = `${E2E_PREFIX} Mobius ${run}`;
const rewatch = `${E2E_PREFIX} rewatch ${run}`;
const favourite = `${E2E_PREFIX} favourite ${run}`;
const note = `E2E note about the TVA ${run}`;
const eventText = `${E2E_PREFIX} Event with a tag ${run}`;
const eventTag = `${E2E_PREFIX} event tag ${run}`;
const characterTag = `${E2E_PREFIX} character tag ${run}`;

test.setTimeout(600_000);

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Adds a tag to the "Add a tag" box. `option` is the exact option to pick: "#stored name" for a tag that exists (its
// spelling is the stored one, whatever case is typed), or "＋ Add “typed”" for a new one.
async function addTag(page: Page, typed: string, option = `＋ Add “${typed}”`) {
  const input = page.getByRole("combobox", { name: "Add a tag", exact: true }).filter({ visible: true });
  await input.fill(typed);
  await page.getByRole("option", { name: option, exact: true }).click({ timeout: 20_000 });
}

// Creates a movie and opens its recap editor.
async function createMovie(page: Page, name: string) {
  await page.goto("/titles/new");
  await field(page, "Movie title").fill(name);
  await field(page, "In-universe year").fill("2012");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
}

test("notes and tags on a recap, a tag reused whatever its case, and the recap list filters by tag", async ({ page }) => {
  await test.step("a movie with a note and two new tags", async () => {
    await createMovie(page, movie);
    await field(page, "Notes").fill(note);
    await addTag(page, rewatch);
    await addTag(page, favourite);
    await expect(page.getByRole("list", { name: "Add a tag, chosen" })).toContainText(rewatch);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText(rewatch, { exact: true })).toBeVisible();
  });

  await test.step("a second movie with no tags", async () => {
    await createMovie(page, otherMovie);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
  });

  await test.step("typing a tag in another case picks the existing one", async () => {
    await createMovie(page, `${E2E_PREFIX} Hulk ${run}`);
    await addTag(page, rewatch.toUpperCase(), `#${rewatch}`);
    await expect(page.getByRole("list", { name: "Add a tag, chosen" })).toContainText(rewatch);
    await expect(page.getByRole("list", { name: "Add a tag, chosen" }).getByRole("listitem")).toHaveCount(1);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
  });

  await test.step("the recap list shows only the recaps with the tag", async () => {
    await page.goto(`/recaps?tag=${encodeURIComponent(rewatch)}`);
    await expect(page.getByRole("heading", { name: movie, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: `${E2E_PREFIX} Hulk ${run}`, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: otherMovie, exact: true })).toHaveCount(0);
  });
});

test("a show's episode can be deleted with the typed word", async ({ page }) => {
  await test.step("a show with one episode", async () => {
    await page.goto("/titles/new");
    await page.getByRole("radio", { name: "Show" }).click();
    await field(page, "Show title").fill(show);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
    const titleId = new URL(page.url()).pathname.split("/")[2];
    await page.goto(`/titles/${titleId}/episodes/new`);
    await field(page, "Season").fill("1");
    await field(page, "Episode number").fill("1");
    await page.getByRole("button", { name: "Save episode" }).click();
    await expect(page).toHaveURL(new RegExp(`/titles/${titleId}$`));
  });

  await test.step("delete the episode from its editor", async () => {
    await page.locator('a[href^="/recaps/"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    await page.getByRole("link", { name: "✎ Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByRole("textbox", { name: "Type DELETE to confirm" }).fill("DELETE");
    await page.getByRole("button", { name: "Delete episode" }).click();
    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
    // Next keeps the old recap page mounted but hidden, so only the visible links count.
    await expect(page.locator('a[href^="/recaps/"]').filter({ visible: true })).toHaveCount(0);
  });
});

test("a timeline event's notes and tag, and the timeline tag filter", async ({ page }) => {
  await page.goto("/timeline/new");
  await field(page, "Year").fill("1960");
  await field(page, "What happened").fill(eventText);
  await field(page, "Notes").fill(note);
  await addTag(page, eventTag);
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page).toHaveURL(/\/timeline$/);

  await page.getByRole("button", { name: /^Tag/ }).first().click();
  await page.getByRole("button", { name: `#${eventTag}`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`tag=${encodeURIComponent(eventTag).replace(/%20/g, "(%20|\\+)")}$`));
  await expect(page.getByRole("button", { name: eventText, exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Tag/ }).first().click();
  await page.getByRole("button", { name: "Any", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
});

test("a character's tags save as they change, and the character can be deleted", async ({ page }) => {
  await test.step("a character with a tag from the card", async () => {
    await page.goto("/characters/new");
    await field(page, "Name").fill(character);
    await page.getByRole("button", { name: "Save character" }).click();
    await expect(page).toHaveURL(/\/characters\/[0-9a-f-]{36}$/);
    // The tag card saves in a Server Action whose body carries the tag name. Wait for that save before reloading, or
    // the reload cancels it.
    const saved = page.waitForResponse(
      (response) => response.request().method() === "POST" && (response.request().postData() ?? "").includes(characterTag),
    );
    await addTag(page, characterTag);
    await saved;
  });

  await test.step("the tag is still there after a reload", async () => {
    await page.reload();
    await expect(page.getByRole("list", { name: "Add a tag, chosen" })).toContainText(characterTag);
  });

  await test.step("the characters table filters by the tag", async () => {
    await page.goto(`/characters?tag=${encodeURIComponent(characterTag)}`);
    await expect(page.getByRole("link", { name: character, exact: true })).toBeVisible();
    await page.goto("/characters");
    await expect(page.getByRole("link", { name: character, exact: true })).toBeVisible();
  });

  await test.step("delete the character from its editor", async () => {
    await page.getByRole("link", { name: character, exact: true }).click();
    await page.getByRole("link", { name: "✎ Edit" }).click();
    await expect(page).toHaveURL(/\/edit$/);
    await page.getByRole("textbox", { name: "Type DELETE to confirm" }).fill("DELETE");
    await page.getByRole("button", { name: "Delete character" }).click();
    await expect(page).toHaveURL(/\/characters$/);
    await expect(page.getByRole("link", { name: character, exact: true })).toHaveCount(0);
  });
});

// Uses the tags made by the first test, so it relies on the tests running in order (one worker).
test("tags can be merged, renamed and deleted on the tags page", async ({ page }) => {
  await page.goto("/tags");
  const row = (name: string) => page.locator('ol[aria-label="Tags"] > li').filter({ hasText: name });

  await test.step("merge favourite into rewatch", async () => {
    await expect(row(favourite)).toHaveCount(1);
    await row(favourite).getByRole("button", { name: "Merge", exact: true }).click();
    await page.getByRole("combobox", { name: `Merge #${favourite} into`, exact: true }).selectOption({ label: `#${rewatch}` });
    await page.getByRole("button", { name: "Merge tags", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Merged" })).toBeVisible();
    await expect(page.locator('ol[aria-label="Tags"] > li').filter({ hasText: favourite })).toHaveCount(0);
  });

  await test.step("rename rewatch", async () => {
    await row(rewatch).getByRole("button", { name: "Rename", exact: true }).click();
    await page.getByRole("textbox", { name: "New name", exact: true }).fill(`${rewatch} again`);
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await expect(row(`${rewatch} again`)).toBeVisible();
  });

  await test.step("delete the tag", async () => {
    await row(`${rewatch} again`).getByRole("button", { name: "Delete", exact: true }).click();
    await page.getByRole("button", { name: "Delete tag", exact: true }).click();
    await expect(page.locator('ol[aria-label="Tags"] > li').filter({ hasText: `${rewatch} again` })).toHaveCount(0);
  });
});
