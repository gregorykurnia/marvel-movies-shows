import { existsSync, readFileSync } from "node:fs";

import { parse } from "dotenv";
import { sql } from "drizzle-orm";

import { getDb } from "../../src/db";

import { assertTestDatabase } from "./test-database";

// Specs that read or clean data directly connect to the test branch only. The production guard runs first, and
// nothing is written to process.env until it passes.
export function connectTestDatabase() {
  const readEnv = (file: string) => (existsSync(file) ? parse(readFileSync(file)) : {});
  const testUrl = assertTestDatabase(
    readEnv(".env.test").DATABASE_URL_POOLED,
    readEnv(".env.local").DATABASE_URL_POOLED,
  );
  process.env.DATABASE_URL_POOLED = testUrl;
  return getDb();
}

// Every spec names what it creates with the prefix "E2E", so leftovers from a failed run are easy to find.
export const E2E_PREFIX = "E2E";

// Removes everything the specs created: timeline events first (they are not removed with their titles), then
// characters (universes can't be deleted while in use), then universes, titles and tags. Titles cascade to their
// entries, recaps and appearances.
export async function removeE2eData() {
  const db = connectTestDatabase();
  await db.execute(sql`delete from timeline_events where text like ${`${E2E_PREFIX}%`}`);
  await db.execute(sql`delete from characters where name like ${`${E2E_PREFIX}%`}`);
  await db.execute(sql`delete from universes where name like ${`${E2E_PREFIX}%`}`);
  await db.execute(sql`delete from titles where name like ${`${E2E_PREFIX}%`}`);
  await db.execute(sql`delete from tags where name like ${`${E2E_PREFIX}%`}`);
}

// Seeds a small directory for the screenshot specs: a movie, a show with three episodes (one recapped), two Loki
// variants in two universes, and their appearances. Returns the ids the specs visit. Rows use the E2E prefix, so
// removeE2eData() clears them.
export async function seedBrowseData(run: string) {
  const db = connectTestDatabase();
  const { titles, entries, universes, characters, appearances } = await import("../../src/db/schema");
  const { readPlaceables } = await import("../../src/lib/data/placeables");
  const { seededKey, seededKeys } = await import("../../src/lib/ordering");

  const [movie] = await db
    .insert(titles)
    .values({ name: `${E2E_PREFIX} Thor ${run}`, kind: "movie", releaseDate: "2011-05-06" })
    .returning({ id: titles.id });
  const movieKey = seededKey(await readPlaceables(db), 2011);
  const [movieEntry] = await db
    .insert(entries)
    .values({ titleId: movie.id, sortKey: movieKey, inUniverseYear: 2011, watched: true, recap: "Thor is banished to Earth.\n\n## Key moments\n\n- Mjolnir falls" })
    .returning({ id: entries.id });

  const [show] = await db
    .insert(titles)
    .values({ name: `${E2E_PREFIX} Loki ${run}`, kind: "show", releaseDate: "2021-06-09" })
    .returning({ id: titles.id });
  const episodeKeys = seededKeys(await readPlaceables(db), 2012, 3);
  const episodes = await db
    .insert(entries)
    .values(
      episodeKeys.map((sortKey, index) => ({
        titleId: show.id,
        seasonNumber: 1,
        episodeNumber: index + 1,
        name: index === 0 ? "Glorious Purpose" : null,
        inUniverseYear: 2012,
        sortKey,
        watched: index === 0,
        recap: index === 0 ? "Loki escapes with the Tesseract.\n\n**Time Variance Authority** arrests him." : null,
      })),
    )
    .returning({ id: entries.id });

  const [earth] = await db.insert(universes).values({ name: `${E2E_PREFIX} Earth-199999 ${run}` }).returning({ id: universes.id });
  const [other] = await db.insert(universes).values({ name: `${E2E_PREFIX} Earth-838 ${run}` }).returning({ id: universes.id });
  const [lokiA] = await db
    .insert(characters)
    .values({
      name: `${E2E_PREFIX} Loki ${run}`,
      importance: "major",
      status: "alive",
      universeId: earth.id,
      predominantTitleId: show.id,
      firstEntryId: episodes[0].id,
      lastEntryId: episodes[2].id,
      notes: "Variant L1130. **Hunted** by the TVA.",
    })
    .returning({ id: characters.id });
  const [lokiB] = await db
    .insert(characters)
    .values({ name: `${E2E_PREFIX} Loki ${run}`, importance: "minor", status: "deceased", universeId: other.id })
    .returning({ id: characters.id });
  await db.insert(appearances).values([
    { characterId: lokiA.id, entryId: episodes[0].id },
    { characterId: lokiA.id, entryId: episodes[2].id },
    { characterId: lokiB.id, entryId: movieEntry.id },
  ]);

  return {
    movieTitleId: movie.id,
    movieEntryId: movieEntry.id,
    showId: show.id,
    episodeId: episodes[0].id,
    unwatchedEpisodeId: episodes[1].id,
    characterId: lokiA.id,
    universeName: `${E2E_PREFIX} Earth-199999 ${run}`,
  };
}

// Adds timeline events for the screenshot specs: a BCE event with no title, events linked to the seeded movie and
// episode, and two events in one year. Returns the first event's id, for the edit page.
export async function seedTimelineEvents(run: string, ids: { movieTitleId: string; movieEntryId: string; showId: string; episodeId: string }) {
  const db = connectTestDatabase();
  const { timelineEvents } = await import("../../src/db/schema");
  const { readEventPlaceables } = await import("../../src/lib/data/timeline");
  const { keyInYear } = await import("../../src/lib/ordering");

  const rows = [
    { year: -5000, text: `${E2E_PREFIX} The Eternals arrive ${run}`, titleId: null, entryId: null },
    { year: 1943, text: `${E2E_PREFIX} Steve receives the serum ${run}`, titleId: ids.movieTitleId, entryId: ids.movieEntryId },
    { year: 2012, text: `${E2E_PREFIX} Battle of New York ${run}`, titleId: ids.movieTitleId, entryId: ids.movieEntryId },
    { year: 2012, text: `${E2E_PREFIX} Loki is arrested ${run}`, titleId: ids.showId, entryId: ids.episodeId },
  ];

  let firstId: string | null = null;
  for (const row of rows) {
    const sortKey = keyInYear(await readEventPlaceables(db), row.year, undefined);
    const [inserted] = await db.insert(timelineEvents).values({ ...row, sortKey }).returning({ id: timelineEvents.id });
    firstId ??= inserted.id;
  }
  if (!firstId) throw new Error("no timeline events were seeded");
  return { firstId };
}
