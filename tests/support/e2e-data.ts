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

// Removes everything the specs created: characters first (universes can't be deleted while in use), then universes,
// titles and tags. Titles cascade to their entries, recaps and appearances.
export async function removeE2eData() {
  const db = connectTestDatabase();
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
