import { sql } from "drizzle-orm";
import { test } from "@playwright/test";

import {
  connectTestDatabase,
  E2E_PREFIX,
  removeE2eData,
  seedBrowseData,
  seedTimeJumps,
  seedTimelineEvents,
} from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 10 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-10/. The Phase 9 data, with
// the Thor movie in Earth-199999 and the Loki episode in Earth-838, so their "From recap" cards show a universe. The
// timeline is shown unfiltered, filtered to Earth-838, and filtered to "No universe set".
const run = Date.now().toString(36);

let ids: Awaited<ReturnType<typeof seedBrowseData>>;
const earth838 = `${E2E_PREFIX} Earth-838 ${run}`;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  await seedTimelineEvents(run, ids);
  await seedTimeJumps(run, ids);
  const db = connectTestDatabase();
  // The movie takes the seeded Earth-199999, and the episode takes Earth-838.
  await db.execute(sql`
    update entries set universe_id = (select id from universes where name = ${ids.universeName})
    where id = ${ids.movieEntryId}
  `);
  await db.execute(sql`
    update entries set universe_id = (select id from universes where name = ${earth838})
    where id = ${ids.episodeId}
  `);
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-10", [
  { name: "timeline", path: () => "/timeline" },
  {
    name: "timeline-universe",
    path: () => `/timeline?universe=${encodeURIComponent(earth838)}`,
  },
  { name: "timeline-no-universe", path: () => "/timeline?universe=none" },
]);
