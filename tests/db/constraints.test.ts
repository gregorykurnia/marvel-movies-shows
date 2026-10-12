import { describe, expect, it, afterAll } from "vitest";

import { appearances, characters, entries, tags, titles, universes } from "../../src/db/schema";
import { isRestrictViolation, isUniqueViolation } from "../../src/lib/db-errors";
import { connectTestDatabase, E2E_PREFIX, removeE2eData } from "../support/e2e-data";

// Database rules (IMPLEMENTATION_PLAN §7): unique episodes, delete rules, and the case-insensitive tag constraint.
// These run against the Neon test branch only. Every row is prefixed "E2E" and removed afterwards.
const db = connectTestDatabase();
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const label = (text: string) => `${E2E_PREFIX} ${text} ${run}`;

// Runs a write that should fail, and returns the error (or null if it succeeded).
async function errorFrom(write: PromiseLike<unknown>): Promise<unknown> {
  return write.then(
    () => null,
    (error: unknown) => error,
  );
}

afterAll(async () => {
  await removeE2eData();
});

describe("episodes are unique within a show", () => {
  it("refuses a second entry with the same season and episode number", async () => {
    const [show] = await db
      .insert(titles)
      .values({ name: label("unique show"), kind: "show" })
      .returning({ id: titles.id });
    const episode = { titleId: show.id, seasonNumber: 1, episodeNumber: 1, watched: false };
    await db.insert(entries).values({ ...episode, sortKey: `${run}-a` });

    const error = await errorFrom(db.insert(entries).values({ ...episode, sortKey: `${run}-b` }));
    expect(error).not.toBeNull();
    expect(isUniqueViolation(error)).toBe(true);
  });

  it("allows the same episode number in another season", async () => {
    const [show] = await db
      .insert(titles)
      .values({ name: label("two seasons"), kind: "show" })
      .returning({ id: titles.id });
    await db.insert(entries).values({ titleId: show.id, seasonNumber: 1, episodeNumber: 1, sortKey: `${run}-c`, watched: false });

    const error = await errorFrom(
      db.insert(entries).values({ titleId: show.id, seasonNumber: 2, episodeNumber: 1, sortKey: `${run}-d`, watched: false }),
    );
    expect(error).toBeNull();
  });
});

describe("delete rules", () => {
  it("deleting a title removes its entries and their appearances", async () => {
    const [show] = await db
      .insert(titles)
      .values({ name: label("cascade show"), kind: "show" })
      .returning({ id: titles.id });
    const [episode] = await db
      .insert(entries)
      .values({ titleId: show.id, seasonNumber: 1, episodeNumber: 1, sortKey: `${run}-e`, watched: false })
      .returning({ id: entries.id });
    const [character] = await db
      .insert(characters)
      .values({ name: label("cascade character"), importance: "minor", status: "alive" })
      .returning({ id: characters.id });
    await db.insert(appearances).values({ characterId: character.id, entryId: episode.id });

    await db.delete(titles).where(eqTitle(show.id));

    const remainingEntries = await db.select({ id: entries.id }).from(entries).where(eqEntry(episode.id));
    const remainingAppearances = await db
      .select({ entryId: appearances.entryId })
      .from(appearances)
      .where(eq(appearances.characterId, character.id));
    expect(remainingEntries).toHaveLength(0);
    expect(remainingAppearances).toHaveLength(0);
  });

  it("a universe that a character uses can't be deleted", async () => {
    const [universe] = await db
      .insert(universes)
      .values({ name: label("in use") })
      .returning({ id: universes.id });
    await db.insert(characters).values({
      name: label("universe user"),
      importance: "major",
      status: "alive",
      universeId: universe.id,
    });

    const error = await errorFrom(db.delete(universes).where(eqUniverse(universe.id)));
    expect(error).not.toBeNull();
    expect(isRestrictViolation(error)).toBe(true);
  });

  it("deleting a title clears a character's predominant title but keeps the character", async () => {
    const [show] = await db
      .insert(titles)
      .values({ name: label("predominant show"), kind: "show" })
      .returning({ id: titles.id });
    const [character] = await db
      .insert(characters)
      .values({ name: label("predominant character"), importance: "minor", status: "unknown", predominantTitleId: show.id })
      .returning({ id: characters.id });

    await db.delete(titles).where(eqTitle(show.id));

    const [row] = await db
      .select({ id: characters.id, predominantTitleId: characters.predominantTitleId })
      .from(characters)
      .where(eqCharacter(character.id));
    expect(row?.id).toBe(character.id);
    expect(row?.predominantTitleId).toBeNull();
  });
});

describe("tags are unique regardless of case", () => {
  it("refuses 'rewatch' after 'Rewatch'", async () => {
    await db.insert(tags).values({ name: label("Rewatch") });

    const error = await errorFrom(db.insert(tags).values({ name: label("rewatch").toLowerCase() }));
    expect(error).not.toBeNull();
    expect(isUniqueViolation(error)).toBe(true);
  });
});

// Small helpers so each test reads as the rule it checks.
import { eq } from "drizzle-orm";
const eqTitle = (id: string) => eq(titles.id, id);
const eqEntry = (id: string) => eq(entries.id, id);
const eqCharacter = (id: string) => eq(characters.id, id);
const eqUniverse = (id: string) => eq(universes.id, id);
