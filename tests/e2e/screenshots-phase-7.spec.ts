import { test } from "@playwright/test";

import { removeE2eData, seedBrowseData, seedTimelineEvents } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 7 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-7/. The timeline holds
// hand-written events and recap items together: a movie in 2011 (a recap-only year), an event and a recap in 1943 and
// 2012, two episodes with no name (shown as "Episode N"), and a year with no title.
const run = Date.now().toString(36);

test.beforeAll(async () => {
  const ids = await seedBrowseData(run);
  await seedTimelineEvents(run, ids);
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-7", [{ name: "timeline", path: () => "/timeline" }]);
