import { sql } from "drizzle-orm";
import { test } from "@playwright/test";

import { connectTestDatabase, E2E_PREFIX, removeE2eData, seedBrowseData, seedTimeJumps, seedTimelineEvents } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 9 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-9/. The Phase 8 data, with one
// other year given its own universe (Earth-838) and the others left on the recap's universe. The recap edit pages
// show the universe field on each Other years row.
const run = Date.now().toString(36);

let ids: Awaited<ReturnType<typeof seedBrowseData>>;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  await seedTimelineEvents(run, ids);
  await seedTimeJumps(run, ids);
  // The 1943 flashback on the movie moves to Earth-838, a universe that differs from the movie's own.
  const db = connectTestDatabase();
  await db.execute(sql`
    update entry_time_jumps set universe_id = (select id from universes where name = ${`${E2E_PREFIX} Earth-838 ${run}`})
    where year = 1943
  `);
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-9", [
  { name: "timeline", path: () => "/timeline" },
  { name: "recap-movie", path: () => `/recaps/${ids.movieEntryId}` },
  { name: "edit-movie", path: () => `/recaps/${ids.movieEntryId}/edit` },
  { name: "edit-episode", path: () => `/recaps/${ids.episodeId}/edit` },
]);
