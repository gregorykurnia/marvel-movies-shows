import { test } from "@playwright/test";

import { removeE2eData, seedBrowseData, seedTimeJumps, seedTimelineEvents } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 8 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-8/. The timeline holds the
// Phase 7 data plus four other years: a flashback with a note, a time travel with no note, a flash-forward on an
// episode, and a BCE flashback. The recap edit pages show the Other years rows.
const run = Date.now().toString(36);

let ids: Awaited<ReturnType<typeof seedBrowseData>>;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  await seedTimelineEvents(run, ids);
  await seedTimeJumps(run, ids);
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-8", [
  { name: "timeline", path: () => "/timeline" },
  { name: "timeline-no-flashbacks", path: () => "/timeline?jumps=off" },
  { name: "recap-movie", path: () => `/recaps/${ids.movieEntryId}` },
  { name: "recap-episode", path: () => `/recaps/${ids.episodeId}` },
  { name: "edit-movie", path: () => `/recaps/${ids.movieEntryId}/edit` },
  { name: "edit-episode", path: () => `/recaps/${ids.episodeId}/edit` },
]);
