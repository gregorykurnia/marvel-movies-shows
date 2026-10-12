import { test } from "@playwright/test";

import { removeE2eData, seedBrowseData } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 2 screens, for the design review. Writes to screenshots/phase-2/.
const run = `shotc${Date.now().toString(36)}`;
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

test.describe("phase 2 pages", () => {
  screenshotPages("phase-2", [
    { name: "universes", path: () => "/universes" },
    { name: "characters", path: () => "/characters" },
    { name: "characters-new", path: () => "/characters/new" },
    { name: "character", path: () => `/characters/${seeded().characterId}` },
    { name: "character-edit", path: () => `/characters/${seeded().characterId}/edit` },
  ]);
});
