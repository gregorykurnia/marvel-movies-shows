import { expect, test, type Page } from "@playwright/test";

import {
  E2E_PREFIX,
  removeE2eData,
  seedUniverseFilterData,
} from "../support/e2e-data";

// Phase 10 done-when (IMPLEMENTATION_PLAN §6): every recap item on the timeline shows its universe, and picking a universe
// in the filter leaves only the items in that universe. Runs against the test branch. Every name carries the run, so the
// specs only see their own cards.

const run = Date.now().toString(36);

let names: Awaited<ReturnType<typeof seedUniverseFilterData>>;

test.setTimeout(300_000);

test.beforeAll(async () => {
  await removeE2eData();
  names = await seedUniverseFilterData(run);
});

test.afterAll(async () => {
  await removeE2eData();
});

// The timeline's cards for this run, in the order they're shown. A card's name is its text, so the run in the title or
// the note finds it.
function runCards(page: Page) {
  return page.getByRole("button").filter({ hasText: run });
}

// The recap card for one movie: a "From recap" card with its title.
function recapCard(page: Page, title: string) {
  return page
    .getByRole("button")
    .filter({ hasText: "From recap" })
    .filter({ hasText: title });
}

// Opens the Universe filter and picks an option by its name, or "Any" to clear it.
async function pickUniverse(page: Page, option: string) {
  await page.getByRole("button", { name: /^Universe/ }).click();
  await page.getByRole("button", { name: option, exact: true }).click();
}

// The text of the cards that are showing, for this run only.
async function shownTexts(page: Page) {
  return (await runCards(page).allTextContents()).map((text) => text.trim());
}

// Whether a card's text contains a name.
function mentions(cards: string[], name: string) {
  return cards.some((text) => text.includes(name));
}

test("a recap item shows its universe on its card and in its popover, and no chip when it has none", async ({
  page,
}) => {
  await page.goto("/timeline");

  await test.step("a movie in Earth-616 shows that universe on its card", async () => {
    await expect(recapCard(page, names.movieA)).toContainText(
      names.universe616,
    );
    await expect(recapCard(page, names.movieA)).not.toContainText(
      names.universe838,
    );
  });

  await test.step("hovering the card shows the same universe in the popover", async () => {
    const card = recapCard(page, names.movieA);
    await card.hover();
    await expect(
      page.getByText(`Universe: ${names.universe616}`),
    ).toBeVisible();
  });

  await test.step("a movie with no universe shows no universe chip", async () => {
    const card = recapCard(page, names.movieC);
    await expect(card).toBeVisible();
    await expect(card).not.toContainText(names.universe616);
    await expect(card).not.toContainText(names.universe838);
  });
});

test("picking a universe leaves only its items, and the choice is kept in the address", async ({
  page,
}) => {
  await page.goto("/timeline");
  await pickUniverse(page, names.universe616);

  await expect(page).toHaveURL(/universe=/);
  expect(new URL(page.url()).searchParams.get("universe")).toBe(
    names.universe616,
  );

  // Earth-616 holds the first movie and the event linked to its recap. The other movies, the flashback in Earth-838 and
  // the unlinked event are left out.
  await expect(recapCard(page, names.movieA)).toBeVisible();
  await expect(runCards(page).filter({ hasText: names.unlinked })).toHaveCount(
    0,
  );
  await expect(runCards(page).filter({ hasText: names.linked })).toHaveCount(1);
  await expect(runCards(page).filter({ hasText: names.movieB })).toHaveCount(0);
  await expect(runCards(page).filter({ hasText: names.ownJump })).toHaveCount(
    0,
  );

  const cards = await shownTexts(page);
  expect(mentions(cards, names.movieA)).toBe(true);
  expect(mentions(cards, names.movieB)).toBe(false);
});

test("a universe in the address is restored when the page loads, whatever its case", async ({
  page,
}) => {
  await page.goto(
    `/timeline?universe=${encodeURIComponent(names.universe838.toLowerCase())}`,
  );

  await expect(
    page.getByRole("button", {
      name: new RegExp(`^Universe: ${names.universe838}`),
    }),
  ).toBeVisible();
  // The address is tidied to the name's own spelling.
  await expect
    .poll(() => new URL(page.url()).searchParams.get("universe"))
    .toBe(names.universe838);

  // Earth-838 holds the second movie and the flashback that falls back to its universe. The first movie's own
  // flashback is in Earth-838 too, so it's shown as well.
  await expect(recapCard(page, names.movieB)).toBeVisible();
  await expect(
    runCards(page).filter({ hasText: names.fallbackJump }),
  ).toHaveCount(1);
  await expect(recapCard(page, names.movieA)).toHaveCount(0);
});

test("an unknown universe in the address means no filter", async ({ page }) => {
  await page.goto(
    `/timeline?universe=${encodeURIComponent(`${E2E_PREFIX} Nowhere ${run}`)}`,
  );

  await expect(recapCard(page, names.movieA)).toBeVisible();
  await expect(recapCard(page, names.movieB)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Universe$/ })).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("universe"))
    .toBeNull();
});

test("No universe set shows the items with no universe, including the unlinked event", async ({
  page,
}) => {
  await page.goto("/timeline?universe=none");

  await expect(
    page.getByRole("button", { name: /^Universe: No universe set/ }),
  ).toBeVisible();
  await expect(runCards(page).filter({ hasText: names.unlinked })).toHaveCount(
    1,
  );
  await expect(recapCard(page, names.movieC)).toHaveCount(1);
  await expect(recapCard(page, names.movieA)).toHaveCount(0);
  await expect(runCards(page).filter({ hasText: names.linked })).toHaveCount(0);
});

test("reorder is off while a universe filter is set, and clearing the filter brings everything back", async ({
  page,
}) => {
  await page.goto("/timeline");
  await expect(recapCard(page, names.movieA)).toBeVisible();
  const everything = await shownTexts(page);
  expect(mentions(everything, names.unlinked)).toBe(true);

  await pickUniverse(page, names.universe838);
  await expect(page.getByRole("button", { name: /Reorder/ })).toBeDisabled();
  await expect(
    page.getByText("Clear the filters to reorder events."),
  ).toBeVisible();

  await pickUniverse(page, "Any");
  await expect(page).not.toHaveURL(/universe=/);
  await expect(page.getByRole("button", { name: /Reorder/ })).toBeEnabled();
  await expect(
    page.getByText("Clear the filters to reorder events."),
  ).toHaveCount(0);
  await expect(recapCard(page, names.movieA)).toBeVisible();
  await expect(runCards(page).filter({ hasText: names.unlinked })).toHaveCount(
    1,
  );
  expect(await shownTexts(page)).toHaveLength(everything.length);
});
