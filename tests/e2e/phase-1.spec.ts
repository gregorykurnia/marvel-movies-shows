import { expect, test, type Locator, type Page } from "@playwright/test";

import { E2E_PREFIX, removeE2eData } from "../support/e2e-data";

// Phase 1 done-when (IMPLEMENTATION_PLAN §6): add a show with episodes, paste recaps, drag an episode between two
// movies, mark things watched, and check that the order and progress survive a reload.
// Runs against the test branch (npm run dev:test). Every title is prefixed "E2E" and removed afterwards.

const run = Date.now().toString(36);
const thor = `${E2E_PREFIX} Thor ${run}`;
const avengers = `${E2E_PREFIX} Avengers ${run}`;
const loki = `${E2E_PREFIX} Loki ${run}`;
const episode2 = `${loki} — Episode 2`;

// Dev mode compiles each route the first time it is visited, so the whole scenario gets more time.
test.setTimeout(240_000);

test.afterAll(async () => {
  await removeE2eData();
});

// After a client navigation, Next keeps the previous page mounted but hidden (so going back is instant). Only the
// visible match counts, so the lookups below ignore the hidden copy of an old page.
function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

// Server Actions are POSTs that carry a Next-Action header. Waiting for the next one means the change has saved.
function nextAction(page: Page) {
  return page.waitForResponse(
    (response) => response.request().method() === "POST" && response.request().headers()["next-action"] !== undefined,
  );
}

// The recap list's rows, in the order they are shown.
async function rowHeadings(page: Page) {
  return page.locator('ol[aria-label="Recaps in order"] > li h3').allTextContents();
}

async function indexOf(page: Page, heading: string) {
  return (await rowHeadings(page)).indexOf(heading);
}

// Drags one row so it sits directly after another, using dnd-kit's keyboard sensor: focus the handle, pick up
// with Space, move one row with an arrow key, and drop with Space. Each step waits for the state it depends on: the
// row marked as dragging after pickup, and the rows shifted after the arrow key. Without those waits, the drop
// can run before dnd-kit has moved the target, and the drop does nothing.
async function dragAfter(page: Page, moving: string, after: string) {
  for (let step = 0; step < 20; step += 1) {
    const from = await indexOf(page, moving);
    const anchor = await indexOf(page, after);
    expect(from, `${moving} is in the list`).toBeGreaterThanOrEqual(0);
    expect(anchor, `${after} is in the list`).toBeGreaterThanOrEqual(0);
    // Moving down, the anchor shifts up once the row is removed, so the drop index is the anchor's own index.
    const to = from < anchor ? anchor : anchor + 1;
    if (to === from) return;

    const handle = page.getByRole("button", { name: `Drag ${moving} to reorder` });
    await handle.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("article[data-dragging]")).toHaveCount(1);
    await page.keyboard.press(to > from ? "ArrowDown" : "ArrowUp");
    // The drop target has to be the new row before dropping, or the drop does nothing.
    await expect(page.locator("article[data-over]")).toHaveCount(1);
    // The new order shows before the server has saved it. Wait for the save, or a reload would cancel it.
    const saved = nextAction(page);
    await page.keyboard.press("Space");
    await saved;
    await expect.poll(() => indexOf(page, moving), { timeout: 10_000 }).not.toBe(from);
  }
  throw new Error(`${moving} did not settle after ${after}`);
}

// The progress label, e.g. "2 / 7 watched · 29%", as its numbers.
async function overallWatched(page: Page) {
  const label = await page.getByRole("progressbar", { name: "Overall watched progress" }).evaluate((element) => {
    return element.parentElement?.textContent ?? "";
  });
  const match = label.match(/(\d+) \/ (\d+) watched/);
  return { watched: Number(match?.[1]), total: Number(match?.[2]) };
}

function rowFor(page: Page, heading: string): Locator {
  return page.locator("li").filter({ has: page.getByRole("link", { name: heading, exact: true }) });
}

test("add a show with episodes, paste recaps, reorder across movies, mark watched, and survive a reload", async ({
  page,
}) => {
  await test.step("add a movie and paste its recap", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(thor);
    await field(page, "In-universe year").fill("2011");
    await page.getByRole("button", { name: "Save title" }).click();

    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    await field(page, "Recap").fill("Thor is banished to Earth.\n\n## Key moments\n\n- Mjolnir falls\n- Jane Foster");
    await page.getByRole("button", { name: "Save recap" }).click();

    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 2, name: "Key moments" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Mjolnir falls" })).toBeVisible();
  });

  await test.step("add a second movie with no recap yet", async () => {
    await page.goto("/titles/new");
    await field(page, "Movie title").fill(avengers);
    await field(page, "In-universe year").fill("2012");
    await page.getByRole("button", { name: "Save title" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}\/edit$/);
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page.getByRole("heading", { name: "No recap yet" })).toBeVisible();
  });

  await test.step("add a show and a run of its episodes", async () => {
    await page.goto("/titles/new");
    await page.getByRole("radio", { name: "Show" }).click();
    await field(page, "Show title").fill(loki);
    await field(page, "Premiere date").fill("2021-06-09");
    await page.getByRole("button", { name: "Save title" }).click();

    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: "No episodes yet" })).toBeVisible();
    await page.getByRole("link", { name: "＋ Add episodes" }).first().click();

    await page.getByRole("radio", { name: "A run of episodes" }).click();
    await field(page, "First episode").fill("1");
    await field(page, "Last episode").fill("2");
    await field(page, "In-universe year").fill("2012");
    await page.getByRole("button", { name: "Add 2 episodes" }).click();

    await expect(page).toHaveURL(/\/titles\/[0-9a-f-]{36}$/);
    await expect(page.getByText("S01·E01").filter({ visible: true })).toBeVisible();
    await expect(page.getByText("S01·E02").filter({ visible: true })).toBeVisible();
  });

  await test.step("paste a recap for the first episode", async () => {
    await page.getByRole("link", { name: "Episode 1", exact: true }).first().click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    await page.getByRole("link", { name: "Paste recap" }).click();
    await field(page, "Episode name").fill("Glorious Purpose");
    await field(page, "Recap").fill("Loki escapes with the Tesseract.\n\n**Time Variance Authority** arrests him.");
    await page.getByRole("button", { name: "Save recap" }).click();
    await expect(page).toHaveURL(/\/recaps\/[0-9a-f-]{36}$/);
    await expect(page.locator("strong").filter({ hasText: "Time Variance Authority", visible: true })).toBeVisible();
  });

  await test.step("drag Loki episode 2 between the two movies", async () => {
    await page.goto("/recaps");
    await page.getByRole("button", { name: "⇅ Reorder" }).click();

    // Put Avengers right after Thor, then drag episode 2 in between them.
    await dragAfter(page, avengers, thor);
    await dragAfter(page, episode2, thor);

    const headings = await rowHeadings(page);
    const e2 = headings.indexOf(episode2);
    expect(headings[e2 - 1]).toBe(thor);
    expect(headings[e2 + 1]).toBe(avengers);
  });

  await test.step("the order survives a reload", async () => {
    await page.waitForLoadState("networkidle");
    await page.reload();
    await page.getByRole("button", { name: "⇅ Reorder" }).click();
    const headings = await rowHeadings(page);
    expect(headings.indexOf(episode2)).toBe(headings.indexOf(thor) + 1);
    expect(headings.indexOf(avengers)).toBe(headings.indexOf(episode2) + 1);
  });

  await test.step("move up and down from the row menu", async () => {
    const before = await rowHeadings(page);
    const episode2Index = before.indexOf(episode2);
    await page.getByRole("button", { name: `More actions for ${episode2}` }).click();
    await page.getByRole("menuitem", { name: "Move up" }).click();
    await expect.poll(() => indexOf(page, episode2)).toBe(episode2Index - 1);

    await page.getByRole("button", { name: `More actions for ${episode2}` }).click();
    await page.getByRole("menuitem", { name: "Move down" }).click();
    await expect.poll(() => indexOf(page, episode2)).toBe(episode2Index);
  });

  await test.step("mark things watched and check the progress", async () => {
    await page.getByRole("button", { name: "✓ Done reordering" }).click();
    const before = await overallWatched(page);

    const savedThor = nextAction(page);
    await rowFor(page, thor).getByRole("button", { name: "Not watched" }).click();
    await savedThor;
    await expect(rowFor(page, thor).getByRole("button", { name: "✓ Watched" })).toBeVisible();
    const savedEpisode = nextAction(page);
    await rowFor(page, episode2).getByRole("button", { name: "Not watched" }).click();
    await savedEpisode;
    await expect(rowFor(page, episode2).getByRole("button", { name: "✓ Watched" })).toBeVisible();

    await expect.poll(async () => (await overallWatched(page)).watched).toBe(before.watched + 2);
  });

  await test.step("watched state and progress survive a reload, and show it per show", async () => {
    await page.reload();
    await expect(rowFor(page, thor).getByRole("button", { name: "✓ Watched" })).toBeVisible();
    await expect(rowFor(page, episode2).getByRole("button", { name: "✓ Watched" })).toBeVisible();
    await expect(rowFor(page, avengers).getByRole("button", { name: "Not watched" })).toBeVisible();

    await page.goto("/titles");
    const lokiRow = page.locator("li").filter({ hasText: loki });
    await expect(lokiRow.getByText("1 / 2", { exact: true })).toBeVisible();
  });

  await test.step("previous and next follow the custom order", async () => {
    await page.goto("/recaps");
    const list = await rowHeadings(page);
    const index = list.indexOf(episode2);
    await rowFor(page, episode2).getByRole("link", { name: episode2, exact: true }).click();

    const nav = page.getByRole("navigation", { name: "Previous and next" });
    await expect(nav.getByRole("link").filter({ hasText: list[index - 1] })).toBeVisible();
    await expect(nav.getByRole("link").filter({ hasText: list[index + 1] })).toBeVisible();
    await expect(nav.getByRole("link").filter({ hasText: list[index + 1] })).toHaveAttribute("href", /\/recaps\//);
  });
});
