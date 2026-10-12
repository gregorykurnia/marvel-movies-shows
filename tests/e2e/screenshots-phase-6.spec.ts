import { test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";

import { entries, universes } from "../../src/db/schema";
import { connectTestDatabase, removeE2eData, seedBrowseData } from "../support/e2e-data";
import { screenshotPages } from "../support/screenshots";

// Phase 6 screens, for the design review (DESIGN_GUIDE §13). Writes to screenshots/phase-6/. The seeded movie and
// first episode are in one universe. The second episode has none, so its page shows "No universe set".
const run = Date.now().toString(36);
let ids: Awaited<ReturnType<typeof seedBrowseData>>;

test.beforeAll(async () => {
  ids = await seedBrowseData(run);
  const db = connectTestDatabase();
  const [earth] = await db
    .select({ id: universes.id })
    .from(universes)
    .where(eq(universes.name, ids.universeName))
    .limit(1);
  await db
    .update(entries)
    .set({ universeId: earth.id })
    .where(inArray(entries.id, [ids.movieEntryId, ids.episodeId]));
});

test.afterAll(async () => {
  await removeE2eData();
});

screenshotPages("phase-6", [
  { name: "recap-movie", path: () => `/recaps/${ids.movieEntryId}` },
  { name: "recap-episode-no-universe", path: () => `/recaps/${ids.unwatchedEpisodeId}` },
  { name: "recaps", path: () => "/recaps" },
  { name: "recap-edit-movie", path: () => `/recaps/${ids.movieEntryId}/edit` },
  { name: "recap-edit-episode", path: () => `/recaps/${ids.episodeId}/edit` },
  { name: "movie-form", path: () => "/titles/new" },
  { name: "episode-form", path: () => `/titles/${ids.showId}/episodes/new` },
  { name: "universes", path: () => "/universes" },
]);
