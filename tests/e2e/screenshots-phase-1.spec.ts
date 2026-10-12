import { test } from "@playwright/test";

import { removeE2eData, seedBrowseData } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 1 screens, for the design review. Writes to screenshots/phase-1/.
const run = `shots${Date.now().toString(36)}`;
let ids: Awaited<ReturnType<typeof seedBrowseData>> | undefined;
const seeded = () => {
  if (!ids) throw new Error("seedBrowseData has not run");
  return ids;
};

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
});

test.afterAll(async () => {
  await removeE2eData();
});

test.describe("phase 1 pages", () => {
  screenshotPages("phase-1", [
    { name: "titles", path: () => "/titles" },
    { name: "titles-new", path: () => "/titles/new" },
    { name: "show", path: () => `/titles/${seeded().showId}` },
    { name: "recaps", path: () => "/recaps" },
    { name: "recap-movie", path: () => `/recaps/${seeded().movieEntryId}` },
    { name: "recap-episode", path: () => `/recaps/${seeded().episodeId}` },
    { name: "recap-episode-edit", path: () => `/recaps/${seeded().episodeId}/edit` },
    { name: "show-episodes-new", path: () => `/titles/${seeded().showId}/episodes/new` },
  ]);
});
