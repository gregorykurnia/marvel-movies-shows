import { expect, test, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";
import { field } from "../support/e2e-helpers";

// Shorts are a third kind of title, next to movies and shows. A short is one recap, like a movie, and its colour is
// orange (DESIGN_GUIDE §2). Runs against the test branch (npm run dev:test). Every title is prefixed "E2E" and removed afterwards.

const run = Date.now().toString(36);
const short = `${E2E_PREFIX} Item 47 ${run}`;
const event = `${E2E_PREFIX} Item 47 happens ${run}`;

// Dev mode compiles each route the first time it is visited, so the scenario gets more time.
test.setTimeout(240_000);

test.afterAll(async () => {
  await removeE2eData();
});

// Server Actions are POSTs that carry a Next-Action header. Waiting for the next one means the change has saved.
function nextAction(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST" && response.request().headers()["next-action"] !== undefined,
  );
}

// Picks an option in a combobox by typing into it and clicking the matching option. The active option also shows a
// "↵" key hint in its text, so the option is matched by its text rather than its exact name.
async function pick(page: Page, comboboxName: string, text: string, optionName = text) {
  const input = page.getByRole("combobox", { name: comboboxName, exact: true }).filter({ visible: true });
  await input.fill(text);
  await page.getByRole("option").filter({ hasText: optionName }).first().click();
}

test("add a short, paste its recap, and find it under Shorts", async ({ page }) => {
  await test.step("the add form offers Short, with the movie fields", async () => {
    await page.goto("/titles/new");
    await page.getByRole("radio", { name: "Short" }).click();
    await expect(field(page, "Short title")).toBeVisible();
    await expect(field(page, "Release date")).toBeVisible();
    await expect(field(page, "In-universe year")).toBeVisible();
  });

  await test.step("saving opens its recap, as a movie does", async () => {
    await field(page, "Short title").fill(short);
    await field(page, "In-universe year").fill("2012");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]+\/edit$/, { timeout: 30_000 });
    await expect(page.getByText("Recaps · Short · Edit")).toBeVisible();
  });

  await test.step("the recap saves, and its page shows an orange Short chip", async () => {
    await field(page, "Recap").fill("A short recap.");
    const saved = nextAction(page);
    await page.getByRole("button", { name: "Save recap" }).click();
    await saved;
    await expect(page.getByRole("heading", { level: 1, name: short })).toBeVisible({ timeout: 30_000 });
    // Orange-soft (DESIGN_GUIDE §3, --orange-soft: #FFE8D5) behind the chip, in light mode.
    await expect(page.locator("span.rounded-pill", { hasText: "Short" })).toHaveCSS(
      "background-color",
      "rgb(255, 232, 213)",
    );
  });

  await test.step("the titles list shows it as a short that opens its recap", async () => {
    await page.goto("/titles");
    const row = page.getByRole("link").filter({ hasText: short });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Short");
    await expect(row).not.toContainText("episode");
    await expect(row).toHaveAttribute("href", /\/recaps\//);
  });

  await test.step("the Shorts filter on the recap list selects it", async () => {
    await page.goto("/recaps?type=short");
    await expect(page.getByRole("link", { name: "Shorts" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator('ol[aria-label="Recaps in order"] h3', { hasText: short })).toBeVisible();
  });

  await test.step("a timeline event linked to the short, which the timeline's filters need", async () => {
    await page.goto("/timeline/new");
    await field(page, "Year").fill("2012");
    await field(page, "What happened").fill(event);
    // The title option reads "· Short", the same label the title form uses.
    await pick(page, "Title", short, `${short} · Short`);
    await page.getByRole("button", { name: "Save event" }).click();
    await expect(page).toHaveURL(/\/timeline$/);
  });

  await test.step("the timeline's type filter offers Shorts, and the event's pin is orange", async () => {
    await page.goto("/timeline?type=short");
    await expect(page.getByRole("radio", { name: "Shorts" })).toBeChecked();
    await expect(page.getByRole("button", { name: event })).toHaveAttribute("style", /--short/);
  });

  await test.step("on a phone, the add form and the filtered lists don't scroll sideways", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/titles/new", "/recaps?type=short", "/timeline?type=short"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${path} should not scroll sideways`).toBeLessThanOrEqual(0);
    }
  });
});
