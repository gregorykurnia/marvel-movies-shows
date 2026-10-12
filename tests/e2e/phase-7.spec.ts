import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 7 done-when (IMPLEMENTATION_PLAN §6): a recap's in-universe year shows on the timeline in the right place,
// moves when the year changes, and its link opens the recap. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const first = `${E2E_PREFIX} Event first ${run}`;
const second = `${E2E_PREFIX} Event second ${run}`;
const recap = `${E2E_PREFIX} Recap movie ${run}`;
const recapTag = `${E2E_PREFIX} rewatch ${run}`;
const year = "1960";
const laterYear = "1970";

// Set when the recap is first saved, so later steps can visit its pages.
let recapId = "";

test.setTimeout(300_000);

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

// The axis's slots, in the order they are shown (by their id, e.g. "slot-1960").
async function slotOrder(page: Page) {
  return page.locator('li[id^="slot-"]').evaluateAll((items) => items.map((item) => item.id));
}

// The items in one year, in the order they are shown. A recap item's card text starts with "From recap".
async function itemsIn(page: Page, yearLabel: string) {
  return page.locator(`ul[aria-label="Events in ${yearLabel}"] > li`).allTextContents();
}

// Keyboard reorder inside a year: focus the handle, pick up with Space, move one place, drop with Space.
async function dragWithKeyboard(page: Page, moving: string, direction: "ArrowUp" | "ArrowDown") {
  const handle = page.getByRole("button", { name: new RegExp(`^Drag “${moving}” to reorder`) });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("[data-dragging]")).toHaveCount(1);
  await page.keyboard.press(direction);
  await expect(page.locator("[data-over]")).toHaveCount(1);
  // The new order shows before the server has saved it. Wait for the save, or a reload would cancel it.
  const saved = page.waitForResponse(
    (response) => response.request().method() === "POST" && response.request().headers()["next-action"] !== undefined,
  );
  await page.keyboard.press("Space");
  await saved;
}

test("a recap's year places it after the events in its year, and its links go to the recap", async ({ page }) => {
  await test.step("two events in 1960, then a movie whose in-universe year is 1960", async () => {
    await page.goto("/timeline/new");
    await field(page, "Year").fill(year);
    await field(page, "What happened").fill(first);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    await page.goto("/timeline/new");
    await field(page, "Year").fill(year);
    await field(page, "What happened").fill(second);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    await page.goto("/titles/new");
    await field(page, "Movie title").fill(recap);
    await field(page, "In-universe year").fill(year);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    recapId = new URL(page.url()).pathname.split("/")[2];

    // A tag on the recap, for the tag filter step below.
    await addTag(page, recapTag);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));
  });

  await test.step("the recap comes after the year's events, with a From recap label", async () => {
    await page.goto("/timeline");
    const items = await itemsIn(page, year);
    expect(items).toHaveLength(3);
    expect(items[0]).toContain(first);
    expect(items[1]).toContain(second);
    expect(items[2]).toContain("From recap");
    expect(items[2]).toContain(recap);
    // The header counts the recap item too.
    await expect(page.getByText(/^3 events · 1960 to 1960$/)).toBeVisible();
  });

  await test.step("hover shows the chip and the recap links, but no edit-event link", async () => {
    const pin = page.getByRole("button", { name: new RegExp(recap) });
    await pin.hover();
    await expect(page.getByText("Movie", { exact: true })).toBeVisible();
    const readRecap = page.getByRole("link", { name: "Read recap →" });
    await expect(readRecap).toBeVisible();
    await expect(readRecap).toHaveAttribute("href", `/recaps/${recapId}`);
    const editRecap = page.getByRole("link", { name: "Edit recap", exact: true });
    await expect(editRecap).toHaveAttribute("href", `/recaps/${recapId}/edit`);
    await expect(page.getByRole("link", { name: "Edit event" })).toHaveCount(0);
    await readRecap.click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));
  });

  await test.step("a recap item has no event edit page", async () => {
    await page.goto(`/timeline/entry:${recapId}/edit`);
    await expect(page.getByRole("heading", { name: "Lost in the multiverse" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save event" })).toHaveCount(0);
  });
});

test("the type and tag filters apply to the recap item", async ({ page }) => {
  await page.goto("/timeline");

  await page.getByRole("radio", { name: "Shows" }).click();
  await expect(page.getByText("Nothing matches this filter")).toBeVisible();
  await page.getByRole("button", { name: "Show all events" }).click();

  await page.getByRole("radio", { name: "Movies" }).click();
  await expect(page.getByRole("button", { name: new RegExp(recap) })).toBeVisible();
  await expect(page.getByRole("button", { name: first, exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "All" }).click();

  await page.getByRole("button", { name: /^Tag/ }).first().click();
  await page.getByRole("button", { name: `#${recapTag}`, exact: true }).click();
  await expect(page).toHaveURL(/tag=/);
  await expect(page.getByRole("button", { name: new RegExp(recap) })).toBeVisible();
  await expect(page.getByRole("button", { name: first, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /^Tag/ }).first().click();
  await page.getByRole("button", { name: "Any", exact: true }).click();
  await expect(page).toHaveURL(/\/timeline$/);
});

test("reorder still works in a year that has a recap item, and the recap can't be moved", async ({ page }) => {
  await page.goto("/timeline");
  await page.getByRole("button", { name: "⇅ Reorder" }).click();

  // "Second" is last among the events, so pick it up and move it above "First". The recap stays last.
  await dragWithKeyboard(page, second, "ArrowUp");
  await expect.poll(async () => (await itemsIn(page, year))[0]).toContain(second);
  expect((await itemsIn(page, year))[2]).toContain(recap);

  // "First" is now last among the events, so its ⋯ menu moves it up. Both events move, and the recap still follows.
  await page.getByRole("button", { name: `More actions for “${first}”` }).click();
  await page.getByRole("menuitem", { name: "Move up" }).click();
  await expect.poll(async () => (await itemsIn(page, year))[0]).toContain(first);
  const after = await itemsIn(page, year);
  expect(after[1]).toContain(second);
  expect(after[2]).toContain(recap);

  // The recap has no drag handle and no ⋯ menu.
  await expect(page.getByRole("button", { name: new RegExp(`^Drag “${recap}”`) })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `More actions for “${recap}”` })).toHaveCount(0);

  await page.getByRole("button", { name: "✓ Done reordering" }).click();
});

test("changing the recap's year moves it, and clearing the year removes it", async ({ page }) => {
  await test.step("a new year moves the recap there, and the year it left keeps its events", async () => {
    await page.goto(`/recaps/${recapId}/edit`);
    await field(page, "In-universe year").fill(laterYear);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    await page.goto("/timeline");
    expect(await slotOrder(page)).toContain(`slot-${laterYear}`);
    // The later year holds only the recap, so it is a year with only recap items.
    expect(await itemsIn(page, laterYear)).toEqual([expect.stringContaining(recap)]);
    const earlier = await itemsIn(page, year);
    expect(earlier).toHaveLength(2);
    expect(earlier.join("\n")).not.toContain(recap);
  });

  await test.step("clearing the year removes the recap from the timeline", async () => {
    await page.goto(`/recaps/${recapId}/edit`);
    await field(page, "In-universe year").fill("");
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    await page.goto("/timeline");
    await expect(page.getByRole("button", { name: new RegExp(recap) })).toHaveCount(0);
    expect(await slotOrder(page)).not.toContain(`slot-${laterYear}`);
    expect(await itemsIn(page, year)).toHaveLength(2);
  });
});
