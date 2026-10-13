import { sql } from "drizzle-orm";
import { test } from "@playwright/test";

import { connectTestDatabase, E2E_PREFIX, removeE2eData, seedBrowseData } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 11 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-11/. The seeded Loki
// variant's first appearance is the seeded episode, and its episodes take two universes, so the titles list shows two
// chips on the show.
const run = Date.now().toString(36);

let ids: Awaited<ReturnType<typeof seedBrowseData>>;
const otherUniverse = `${E2E_PREFIX} Earth-838 ${run}`;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  const db = connectTestDatabase();
  await db.execute(sql`
    update entries set universe_id = (select id from universes where name = ${ids.universeName})
    where id = ${ids.episodeId}
  `);
  await db.execute(sql`
    update entries set universe_id = (select id from universes where name = ${otherUniverse})
    where id = ${ids.unwatchedEpisodeId}
  `);
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-11", [
  { name: "recap-edit", path: () => `/recaps/${ids.episodeId}/edit` },
  { name: "recap", path: () => `/recaps/${ids.episodeId}` },
  { name: "character-new", path: () => "/characters/new" },
  { name: "character-edit", path: () => `/characters/${ids.characterId}/edit` },
  { name: "character", path: () => `/characters/${ids.characterId}` },
  { name: "titles", path: () => "/titles" },
]);
