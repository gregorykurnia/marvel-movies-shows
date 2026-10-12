import { test } from "@playwright/test";

import { connectTestDatabase, E2E_PREFIX, removeE2eData, seedBrowseData } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 4 screens, for the design review. Writes to screenshots/phase-4/. The seeded tag is on the movie and the
// character, so the tag chips and the tags page have something to show.
const run = `shotd${Date.now().toString(36)}`;
let ids: Awaited<ReturnType<typeof seedBrowseData>> | undefined;
const seeded = () => {
  if (!ids) throw new Error("seedBrowseData has not run");
  return ids;
};

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  const db = connectTestDatabase();
  const { tags, entryTags, characterTags } = await import("../../src/db/schema");
  const [tag] = await db.insert(tags).values({ name: `${E2E_PREFIX} rewatch ${run}` }).returning({ id: tags.id });
  await db.insert(entryTags).values({ entryId: ids.movieEntryId, tagId: tag.id });
  await db.insert(characterTags).values({ characterId: ids.characterId, tagId: tag.id });
});

test.afterAll(async () => {
  await removeE2eData();
});

test.describe("phase 4 pages", () => {
  screenshotPages("phase-4", [
    { name: "tags", path: () => "/tags" },
    { name: "recap-tags", path: () => `/recaps/${seeded().movieEntryId}` },
    { name: "character-tags", path: () => `/characters/${seeded().characterId}` },
    { name: "episode-edit", path: () => `/recaps/${seeded().episodeId}/edit` },
    // Searching the seeded tag finds the movie and the character through their tags.
    { name: "search", path: () => `/search?q=${encodeURIComponent(`${E2E_PREFIX} rewatch ${run}`)}` },
    { name: "search-empty", path: () => "/search" },
  ]);
});
