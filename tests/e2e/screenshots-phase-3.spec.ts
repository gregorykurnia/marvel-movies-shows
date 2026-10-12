import { test } from "@playwright/test";

import { removeE2eData, seedBrowseData, seedTimelineEvents } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 3 screens, for the design review. Writes to screenshots/phase-3/.
const run = `shott${Date.now().toString(36)}`;
let ids: { firstId: string } | undefined;
const seeded = () => {
  if (!ids) throw new Error("seedTimelineEvents has not run");
  return ids;
};

test.beforeAll(async () => {
  const browse = await seedBrowseData(run);
  ids = await seedTimelineEvents(run, {
    movieTitleId: browse.movieTitleId,
    movieEntryId: browse.movieEntryId,
    showId: browse.showId,
    episodeId: browse.episodeId,
  });
});

test.afterAll(async () => {
  await removeE2eData();
});

test.describe("phase 3 pages", () => {
  screenshotPages("phase-3", [
    { name: "timeline", path: () => "/timeline" },
    { name: "timeline-new", path: () => "/timeline/new" },
    { name: "timeline-edit", path: () => `/timeline/${seeded().firstId}/edit` },
  ]);
});
