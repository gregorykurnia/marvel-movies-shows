import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 8 done-when (IMPLEMENTATION_PLAN §6): a flashback added on a recap shows in its year on the timeline, clearly
// marked with its kind and title, the popover links to the recap, and the toggle hides it. Removing it on the recap
// removes it from the timeline too. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movie = `${E2E_PREFIX} Guardians ${run}`;
const mainYear = "2014";
const jumpYear = "1988";
const note = `${E2E_PREFIX} Young Peter ${run}`;
const jumpSlot = `#slot-${jumpYear}`;

// Set when the movie is first saved, so later steps can visit its pages.
let recapId = "";

test.setTimeout(300_000);

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Adds one row under Other years. The newest row is always the last one, and each field is labelled the same way.
async function addOtherYear(page: Page, { year, kind, text }: { year: string; kind: string; text: string }) {
  await page.getByRole("button", { name: "＋ Add another year" }).click();
  await page.getByLabel("Year", { exact: true }).last().fill(year);
  await page.getByLabel("Kind", { exact: true }).last().selectOption({ label: kind });
  await page.getByLabel("Note", { exact: true }).last().fill(text);
}

// The cards in one year, in the order they're shown.
async function itemsIn(page: Page, yearLabel: string) {
  return page.locator(`ul[aria-label="Events in ${yearLabel}"] > li`).allTextContents();
}

test("a flashback on a recap shows in its year, and the toggle hides it", async ({ page }) => {
  await test.step("a movie with a main year, and a flashback on its recap", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movie);
    await field(page, "In-universe year").fill(mainYear);
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    recapId = new URL(page.url()).pathname.split("/")[2];

    await addOtherYear(page, { year: jumpYear, kind: "Flashback", text: note });
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    // The recap page lists the other year with its kind and note, and the main year stays as it was.
    await expect(page.getByRole("definition").filter({ hasText: "Flashback" })).toContainText(note);
    await expect(page.getByText("Year in universe")).toBeVisible();
  });

  await test.step("the flashback sits in its year, marked with its kind and title", async () => {
    await page.goto("/timeline");
    const items = await itemsIn(page, jumpYear);
    expect(items).toHaveLength(1);
    expect(items[0]).toContain("Flashback");
    expect(items[0]).toContain(movie);
    expect(items[0]).toContain(note);
    // The main-year slot holds the movie's recap item, and the flashback is not in it.
    expect((await itemsIn(page, mainYear)).join("\n")).not.toContain(note);
  });

  await test.step("hover shows the main year and links to the recap, and never to an event edit page", async () => {
    await page.getByRole("button", { name: new RegExp(note) }).hover();
    await expect(page.getByText(`Main story: ${mainYear}`)).toBeVisible();
    const readRecap = page.getByRole("link", { name: "Read recap →" });
    await expect(readRecap).toHaveAttribute("href", `/recaps/${recapId}`);
    await expect(page.getByRole("link", { name: "Edit recap", exact: true })).toHaveAttribute(
      "href",
      `/recaps/${recapId}/edit`,
    );
    await expect(page.getByRole("link", { name: "Edit event" })).toHaveCount(0);
    await readRecap.click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));
  });

  await test.step("the toggle hides the flashback and turns off reordering, and On brings it back", async () => {
    await page.goto("/timeline");
    await page.getByRole("radio", { name: "Off" }).click();
    await expect(page).toHaveURL(/jumps=off/);
    await expect(page.locator(jumpSlot)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "⇅ Reorder" })).toBeDisabled();

    await page.getByRole("radio", { name: "On" }).click();
    await expect(page).not.toHaveURL(/jumps=off/);
    await expect(page.locator(jumpSlot)).toHaveCount(1);
  });

  await test.step("the type filter applies to the flashback, like any recap item", async () => {
    await page.goto("/timeline");
    await page.getByRole("radio", { name: "Shows" }).click();
    await expect(page.locator(jumpSlot)).toHaveCount(0);
    await page.getByRole("radio", { name: "All" }).click();
    await expect(page.locator(jumpSlot)).toHaveCount(1);
  });

  await test.step("removing the flashback on the recap removes it from the timeline", async () => {
    await page.goto(`/recaps/${recapId}/edit`);
    await page.getByRole("button", { name: "Remove other year 1" }).click();
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(new RegExp(`/recaps/${recapId}$`));

    await page.goto("/timeline");
    await expect(page.getByRole("button", { name: new RegExp(note) })).toHaveCount(0);
    await expect(page.locator(jumpSlot)).toHaveCount(0);
  });
});

test("a bad other year is refused on its own row, and nothing typed is lost", async ({ page }) => {
  await page.goto(`/recaps/${recapId}/edit`);
  await addOtherYear(page, { year: "soon", kind: "Time travel", text: `${E2E_PREFIX} Typed text ${run}` });
  await page.getByRole("button", { name: "Save recap" }).click();

  await expect(page.getByText("The year must be a whole number")).toBeVisible();
  await expect(page.getByLabel("Year", { exact: true }).last()).toHaveValue("soon");
  await expect(page.getByLabel("Note", { exact: true }).last()).toHaveValue(`${E2E_PREFIX} Typed text ${run}`);
});

test("other years need the in-universe year first", async ({ page }) => {
  await page.goto(`/recaps/${recapId}/edit`);
  await field(page, "In-universe year").fill("");
  await addOtherYear(page, { year: jumpYear, kind: "Flash-forward", text: "" });
  await page.getByRole("button", { name: "Save recap" }).click();
  await expect(page.getByText("Set the in-universe year before adding other years")).toBeVisible();
});
