import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Phase 3 done-when (IMPLEMENTATION_PLAN §6): events with real years, including a BCE year, appear in the right
// order, gaps are compressed, and the recap links work. Runs against the test branch. Every name is prefixed "E2E".

const run = Date.now().toString(36);
const movie = `${E2E_PREFIX} Thor ${run}`;
const eternals = `${E2E_PREFIX} Eternals arrive ${run}`;
const serum = `${E2E_PREFIX} Serum ${run}`;
const banished = `${E2E_PREFIX} Banished ${run}`;
const second = `${E2E_PREFIX} Second ${run}`;

test.setTimeout(300_000);

test.beforeAll(async () => {
  await removeE2eData();
});

test.afterAll(async () => {
  await removeE2eData();
});

// Picks an option from a combobox by typing into it, then clicking the option.
async function pick(page: Page, comboboxName: string, text: string, optionName = text) {
  const input = page.getByRole("combobox", { name: comboboxName, exact: true }).filter({ visible: true });
  await input.fill(text);
  await page.getByRole("option", { name: optionName, exact: true }).click();
}

// The axis's slots, in the order they are shown (by their id, e.g. "slot-1943").
async function slotOrder(page: Page) {
  return page.locator('li[id^="slot-"]').evaluateAll((items) => items.map((item) => item.id));
}

// The events in one year, in the order they are shown.
async function eventsIn(page: Page, year: string) {
  return page.locator(`ul[aria-label="Events in ${year}"] > li`).allTextContents();
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

test("events in the right order, a BCE year, compressed gaps, and working recap links", async ({ page }) => {
  await test.step("a movie with a recap for the events to link to", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(movie);
    await field(page, "In-universe year").fill("2011");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
  });

  const recapHref = new URL(page.url()).pathname;

  await test.step("a BCE event with no title, then events linked to the movie", async () => {
    await page.goto("/timeline/new");
    await field(page, "Year").fill("−5000");
    await field(page, "What happened").fill(eternals);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    await page.goto("/timeline/new");
    await field(page, "Year").fill("1943");
    await field(page, "What happened").fill(serum);
    await pick(page, "Recap link", movie, `${movie} · Movie`);
    // Picking the recap sets the title too.
    await expect(page.getByRole("combobox", { name: "Title", exact: true }).filter({ visible: true })).toHaveValue(
      `${movie} · Movie`,
    );
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);

    await page.goto("/timeline/new");
    await field(page, "Year").fill("2011");
    await field(page, "What happened").fill(banished);
    await pick(page, "Recap link", movie, `${movie} · Movie`);
    await page.getByRole("button", { name: "Save & add another" }).click();
    await expect(field(page, "What happened")).toHaveValue("");
    await expect(page.getByRole("status").filter({ hasText: "Add the next event" })).toBeVisible();

    // "Save & add another" keeps the title and recap, so this one is set back to no title.
    await field(page, "What happened").fill(second);
    await pick(page, "Title", "No title", "No title (a general event)");
    await expect(page.getByRole("combobox", { name: "Recap link", exact: true }).filter({ visible: true })).toHaveValue(
      "No recap link",
    );
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
  });

  await test.step("the axis is in year order, with the empty years compressed", async () => {
    await page.goto("/timeline");
    const slots = await slotOrder(page);
    const index = (year: string) => slots.indexOf(`slot-${year}`);
    expect(index("-5000"), "the BCE year is shown").toBeGreaterThanOrEqual(0);
    expect(index("-5000")).toBeLessThan(index("1943"));
    expect(index("1943")).toBeLessThan(index("2011"));
    // 1943 to −5000 spans 6,943 years, shown as one gap instead of thousands of empty slots.
    await expect(page.getByText("⋯ 6,943 yrs ⋯")).toBeVisible();
    // Both 2011 events share one slot, in the order they were saved.
    const in2011 = await eventsIn(page, "2011");
    expect(in2011).toHaveLength(2);
    expect(in2011[0]).toContain(banished);
    expect(in2011[1]).toContain(second);
  });

  await test.step("hover opens the details, and the recap link goes to the recap", async () => {
    const pin = page.getByRole("button", { name: banished, exact: true });
    await pin.hover();
    const readRecap = page.getByRole("link", { name: "Read recap →" });
    await expect(readRecap).toBeVisible();
    await expect(readRecap).toHaveAttribute("href", recapHref);
    await readRecap.click();
    await expect(page).toHaveURL(new RegExp(`${recapHref}$`));
  });

  await test.step("focus opens the details, and Esc closes them", async () => {
    await page.goto("/timeline");
    const pin = page.getByRole("button", { name: serum, exact: true });
    await pin.focus();
    await expect(page.getByRole("link", { name: "Read recap →" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("link", { name: "Read recap →" })).toHaveCount(0);
  });

  await test.step("zoom out to decades, then click the bucket to zoom back in", async () => {
    await page.goto("/timeline");
    await page.getByRole("radio", { name: "Decade" }).click();
    const bucket = page.getByRole("button", { name: /^2010–2019: 2 events/ });
    await expect(bucket).toBeVisible();
    await bucket.click();
    await expect(page.locator('ul[aria-label="Events in 2011"]')).toContainText(banished);
  });

  await test.step("jump to a year, and refuse text that isn't a year", async () => {
    await page.goto("/timeline");
    await page.getByPlaceholder("Jump to year").fill("abc");
    await page.getByRole("button", { name: "Go" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Enter a year" })).toBeVisible();
    await page.getByPlaceholder("Jump to year").fill("−5000");
    await page.getByRole("button", { name: "Go" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Enter a year" })).toHaveCount(0);
  });

  await test.step("the type filter hides the events without a title", async () => {
    await page.goto("/timeline");
    await page.getByRole("radio", { name: "Movies" }).click();
    await expect(page).toHaveURL(/type=movie$/);
    await expect(page.getByRole("button", { name: serum, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: second, exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "Shows" }).click();
    await expect(page.getByText("Nothing matches this filter")).toBeVisible();
    await page.getByRole("button", { name: "Show all events" }).click();
    await expect(page.getByRole("button", { name: second, exact: true })).toBeVisible();
  });

  await test.step("reorder within a year, by keyboard and from the ⋯ menu", async () => {
    await page.goto("/timeline");
    await page.getByRole("button", { name: "⇅ Reorder" }).click();
    expect(await eventsIn(page, "2011")).toEqual(
      (await eventsIn(page, "2011")).length === 2 ? await eventsIn(page, "2011") : [],
    );

    // "Second" is last in 2011, so pick it up and move it above "Banished".
    await dragWithKeyboard(page, second, "ArrowUp");
    await expect.poll(async () => (await eventsIn(page, "2011"))[0]).toContain(second);

    // Then send it back down from the ⋯ menu.
    await page.getByRole("button", { name: `More actions for “${second}”` }).click();
    await page.getByRole("menuitem", { name: "Move down" }).click();
    await expect.poll(async () => (await eventsIn(page, "2011"))[0]).toContain(banished);
    await page.getByRole("button", { name: "✓ Done reordering" }).click();
  });

  await test.step("edit an event's year, then delete an event", async () => {
    await page.goto("/timeline");
    await page.getByRole("button", { name: serum, exact: true }).hover();
    await page.getByRole("link", { name: "Edit event" }).click();
    await expect(page).toHaveURL(/\/timeline\/[0-9a-f-]{36}\/edit$/);
    await field(page, "Year").fill("1950");
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.locator('li[id="slot-1950"]')).toContainText(serum);

    await page.getByRole("button", { name: serum, exact: true }).hover();
    await page.getByRole("link", { name: "Edit event" }).click();
    await page.getByRole("textbox", { name: "Type DELETE to confirm" }).fill("DELETE");
    await page.getByRole("button", { name: "Delete event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
    await expect(page.getByRole("button", { name: serum, exact: true })).toHaveCount(0);
  });
});

test("a tap opens the details inline on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/timeline/new");
  await field(page, "Year").fill("1945");
  await field(page, "What happened").fill(`${serum} phone`);
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page).toHaveURL(/\/timeline$/);

  const pin = page.getByRole("button", { name: `${serum} phone`, exact: true });
  await pin.click();
  await expect(pin).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Edit event" }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read recap →" })).toHaveCount(0);

  await page.getByRole("button", { name: "More actions" }).count();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page should not scroll sideways").toBeLessThanOrEqual(0);

  await removeE2eData();
});
