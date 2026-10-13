import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { characterTags, characters, entries, tags, titles, universes } from "../../src/db/schema";
import { applyCharacterPatch, deleteCharacters, editCharacterTags } from "../../src/lib/data/bulk-characters";
import { connectTestDatabase, E2E_PREFIX, removeE2eData } from "../support/e2e-data";

// Phase 12 writes (IMPLEMENTATION_PLAN §6): one change applied to many characters in a transaction, tags added and
// removed without touching the rest, a missing id skipped and counted, and a delete that takes the tags with it.
// Runs against the test branch.
const db = connectTestDatabase();
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const label = (text: string) => `${E2E_PREFIX} ${text} ${run}`;

afterAll(async () => {
  await removeE2eData();
});

async function character(name: string, values: Partial<typeof characters.$inferInsert> = {}) {
  const [row] = await db
    .insert(characters)
    .values({ name: label(name), importance: "minor", status: "unknown", ...values })
    .returning({ id: characters.id });
  return row.id;
}

async function tagNamesOf(characterId: string) {
  const rows = await db
    .select({ name: tags.name })
    .from(characterTags)
    .innerJoin(tags, eq(characterTags.tagId, tags.id))
    .where(eq(characterTags.characterId, characterId));
  return rows.map((row) => row.name).sort();
}

describe("applyCharacterPatch", () => {
  it("sets a status on every listed character and leaves the others", async () => {
    const [a, b, c, other] = await Promise.all([character("A"), character("B"), character("C"), character("Other")]);
    const result = await db.transaction((tx) => applyCharacterPatch(tx, [a, b, c], { status: "deceased" }));
    expect(result).toEqual({ updated: 3, missing: 0 });

    const rows = await db.select().from(characters).where(inArray(characters.id, [a, b, c, other]));
    const status = Object.fromEntries(rows.map((row) => [row.id, row.status]));
    expect(status).toEqual({ [a]: "deceased", [b]: "deceased", [c]: "deceased", [other]: "unknown" });
  });

  it("sets importance", async () => {
    const [a, b] = await Promise.all([character("Imp A"), character("Imp B")]);
    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { importance: "major" }));
    const rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    expect(rows.map((row) => row.importance)).toEqual(["major", "major"]);
  });

  it("sets a universe, and clears it with None", async () => {
    const [earth] = await db.insert(universes).values({ name: label("Earth-A") }).returning({ id: universes.id });
    const [a, b] = await Promise.all([character("Uni A"), character("Uni B", { universeId: earth.id })]);

    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { universe: { id: earth.id, name: null } }));
    let rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    expect(rows.map((row) => row.universeId)).toEqual([earth.id, earth.id]);

    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { universe: { id: null, name: null } }));
    rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    expect(rows.map((row) => row.universeId)).toEqual([null, null]);
  });

  it("finds a typed universe by name ignoring case, or adds it", async () => {
    const name = label("Earth-B");
    const a = await character("Typed A");
    await db.transaction((tx) => applyCharacterPatch(tx, [a], { universe: { id: null, name } }));
    const [created] = await db.select().from(universes).where(eq(universes.name, name));
    expect(created).toBeDefined();

    const b = await character("Typed B");
    await db.transaction((tx) => applyCharacterPatch(tx, [b], { universe: { id: null, name: name.toUpperCase() } }));
    const [row] = await db.select().from(characters).where(eq(characters.id, b));
    expect(row.universeId).toBe(created.id);
    const same = await db.select().from(universes).where(eq(universes.id, created.id));
    expect(same).toHaveLength(1);
  });

  it("sets and clears the predominant title, first appearance and last appearance", async () => {
    const [title] = await db.insert(titles).values({ name: label("Movie"), kind: "movie" }).returning({ id: titles.id });
    const [entry] = await db
      .insert(entries)
      .values({ titleId: title.id, sortKey: `bulk-${run}`, watched: false })
      .returning({ id: entries.id });
    const [a, b] = await Promise.all([character("Ref A"), character("Ref B")]);

    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { predominantTitleId: title.id }));
    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { firstEntryId: entry.id }));
    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { lastEntryId: entry.id }));
    let rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    for (const row of rows) {
      expect([row.predominantTitleId, row.firstEntryId, row.lastEntryId]).toEqual([title.id, entry.id, entry.id]);
    }

    await db.transaction((tx) => applyCharacterPatch(tx, [a, b], { firstEntryId: null }));
    rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    expect(rows.map((row) => row.firstEntryId)).toEqual([null, null]);
    expect(rows.map((row) => row.lastEntryId)).toEqual([entry.id, entry.id]);
  });

  it("skips an id that no longer exists and counts it", async () => {
    const a = await character("Present");
    const result = await db.transaction((tx) =>
      applyCharacterPatch(tx, [a, crypto.randomUUID()], { status: "alive" }),
    );
    expect(result).toEqual({ updated: 1, missing: 1 });
  });

  it("rolls the whole change back when a reference no longer exists", async () => {
    const [a, b] = await Promise.all([character("Roll A"), character("Roll B")]);
    await expect(
      db.transaction((tx) => applyCharacterPatch(tx, [a, b], { predominantTitleId: crypto.randomUUID() })),
    ).rejects.toThrow();
    const rows = await db.select().from(characters).where(inArray(characters.id, [a, b]));
    expect(rows.map((row) => row.predominantTitleId)).toEqual([null, null]);
  });
});

describe("editCharacterTags", () => {
  it("adds tags, creating the ones that don't exist, and keeps each character's other tags", async () => {
    const [a, b] = await Promise.all([character("Tag A"), character("Tag B")]);
    await db.transaction((tx) => editCharacterTags(tx, [a], [label("keep")], []));

    const result = await db.transaction((tx) => editCharacterTags(tx, [a, b], [label("new"), label("other")], []));
    expect(result).toEqual({ updated: 2, missing: 0 });
    expect(await tagNamesOf(a)).toEqual([label("keep"), label("new"), label("other")].sort());
    expect(await tagNamesOf(b)).toEqual([label("new"), label("other")].sort());
  });

  it("removes only the named tags, matching ignoring case, and ignores one that doesn't exist", async () => {
    const [a, b] = await Promise.all([character("Rem A"), character("Rem B")]);
    await db.transaction((tx) => editCharacterTags(tx, [a, b], [label("one"), label("two")], []));
    await db.transaction((tx) => editCharacterTags(tx, [a], [label("three")], []));

    await db.transaction((tx) => editCharacterTags(tx, [a, b], [], [label("ONE"), label("never-created")]));
    expect(await tagNamesOf(a)).toEqual([label("three"), label("two")].sort());
    expect(await tagNamesOf(b)).toEqual([label("two")]);
  });

  it("adds and removes in one go, and an already-added tag isn't duplicated", async () => {
    const a = await character("Both");
    await db.transaction((tx) => editCharacterTags(tx, [a], [label("x"), label("y")], []));
    await db.transaction((tx) => editCharacterTags(tx, [a], [label("y"), label("z")], [label("x")]));
    expect(await tagNamesOf(a)).toEqual([label("y"), label("z")].sort());
  });

  it("counts an id that no longer exists", async () => {
    const a = await character("Tag present");
    const result = await db.transaction((tx) => editCharacterTags(tx, [a, crypto.randomUUID()], [label("t")], []));
    expect(result).toEqual({ updated: 1, missing: 1 });
  });
});

describe("deleteCharacters", () => {
  it("deletes the listed characters and their tags, and counts a missing id", async () => {
    const [a, b, keep] = await Promise.all([character("Del A"), character("Del B"), character("Del keep")]);
    await db.transaction((tx) => editCharacterTags(tx, [a, b, keep], [label("doomed")], []));

    const result = await db.transaction((tx) => deleteCharacters(tx, [a, b, crypto.randomUUID()]));
    expect(result).toEqual({ updated: 2, missing: 1 });

    expect(await db.select().from(characters).where(inArray(characters.id, [a, b]))).toHaveLength(0);
    expect(await db.select().from(characterTags).where(inArray(characterTags.characterId, [a, b]))).toHaveLength(0);
    expect(await tagNamesOf(keep)).toEqual([label("doomed")]);
  });
});
