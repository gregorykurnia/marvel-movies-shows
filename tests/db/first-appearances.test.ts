import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { characters, entries, titles, universes } from "../../src/db/schema";
import { addFirstAppearanceEntry, replaceFirstAppearances } from "../../src/lib/data/first-appearances";
import { resolveUniverseId } from "../../src/lib/data/universes";
import { connectTestDatabase, E2E_PREFIX, removeE2eData } from "../support/e2e-data";

// Phase 11 writes (IMPLEMENTATION_PLAN §6): first appearances move between entries, an inline show or episode is
// reused rather than duplicated, and a typed universe is matched by name ignoring case. Runs against the test branch.
const db = connectTestDatabase();
const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const label = (text: string) => `${E2E_PREFIX} ${text} ${run}`;

afterAll(async () => {
  await removeE2eData();
});

async function movie(name: string) {
  const [title] = await db.insert(titles).values({ name, kind: "movie" }).returning({ id: titles.id });
  const [entry] = await db
    .insert(entries)
    .values({ titleId: title.id, sortKey: `${name}-${run}`, watched: false })
    .returning({ id: entries.id });
  return entry.id;
}

describe("first appearances", () => {
  it("moves a character's first appearance to the recap it's picked on, and clears it when taken off", async () => {
    const first = await movie(label("Movie A"));
    const second = await movie(label("Movie B"));
    const [loki] = await db
      .insert(characters)
      .values({ name: label("Loki"), importance: "minor", status: "unknown", firstEntryId: first })
      .returning({ id: characters.id });
    const [thor] = await db
      .insert(characters)
      .values({ name: label("Thor"), importance: "minor", status: "unknown", firstEntryId: first })
      .returning({ id: characters.id });

    await db.transaction((tx) => replaceFirstAppearances(tx, second, [loki.id]));
    const [lokiRow] = await db.select().from(characters).where(eq(characters.id, loki.id));
    const [thorRow] = await db.select().from(characters).where(eq(characters.id, thor.id));
    expect(lokiRow.firstEntryId).toBe(second);
    // Thor wasn't picked for the second recap, so his first appearance stays where it was.
    expect(thorRow.firstEntryId).toBe(first);

    await db.transaction((tx) => replaceFirstAppearances(tx, second, []));
    const [cleared] = await db.select().from(characters).where(eq(characters.id, loki.id));
    expect(cleared.firstEntryId).toBeNull();
  });

  it("adds a show episode from an existing show, and picks an episode that already exists", async () => {
    const [show] = await db.insert(titles).values({ name: label("Loki Show"), kind: "show" }).returning({ id: titles.id });
    const first = await db.transaction((tx) =>
      addFirstAppearanceEntry(tx, {
        kind: "show",
        name: null,
        showTitleId: show.id,
        showName: null,
        season: 1,
        episode: 3,
        episodeName: "Glorious Purpose",
      }),
    );
    expect(first.label).toContain("S01·E03");

    const again = await db.transaction((tx) =>
      addFirstAppearanceEntry(tx, {
        kind: "show",
        name: null,
        showTitleId: show.id,
        showName: null,
        season: 1,
        episode: 3,
        episodeName: null,
      }),
    );
    expect(again.id).toBe(first.id);

    const episodes = await db.select({ id: entries.id }).from(entries).where(eq(entries.titleId, show.id));
    expect(episodes).toHaveLength(1);
  });

  it("reuses a show typed with a different capital letter, instead of making a second one", async () => {
    const name = label("Ghosts Show");
    const first = await db.transaction((tx) =>
      addFirstAppearanceEntry(tx, {
        kind: "show",
        name: null,
        showTitleId: null,
        showName: name,
        season: 1,
        episode: 1,
        episodeName: null,
      }),
    );
    const second = await db.transaction((tx) =>
      addFirstAppearanceEntry(tx, {
        kind: "show",
        name: null,
        showTitleId: null,
        showName: name.toUpperCase(),
        season: 1,
        episode: 2,
        episodeName: null,
      }),
    );
    const shows = await db.select({ id: titles.id }).from(titles).where(eq(titles.name, name));
    expect(shows).toHaveLength(1);
    expect(second.id).not.toBe(first.id);
  });

  it("adds a movie as one title with one entry, at the end of the order with no year", async () => {
    const created = await db.transaction((tx) =>
      addFirstAppearanceEntry(tx, {
        kind: "short",
        name: label("Item 47"),
        showTitleId: null,
        showName: null,
        season: null,
        episode: null,
        episodeName: null,
      }),
    );
    const [entry] = await db.select().from(entries).where(eq(entries.id, created.id));
    expect(entry.inUniverseYear).toBeNull();
    expect(entry.universeId).toBeNull();
    expect(created.label).toBe(`${label("Item 47")} · Short`);
  });
});

describe("universes typed in a form", () => {
  it("uses a picked universe as it is", async () => {
    const [picked] = await db.insert(universes).values({ name: label("Earth-A") }).returning({ id: universes.id });
    const id = await db.transaction((tx) => resolveUniverseId(tx, picked.id, label("Something else")));
    expect(id).toBe(picked.id);
  });

  it("finds an existing universe by name, ignoring case, and adds a new one", async () => {
    const [existing] = await db.insert(universes).values({ name: label("Earth-B") }).returning({ id: universes.id });
    const matched = await db.transaction((tx) => resolveUniverseId(tx, null, label("Earth-B").toLowerCase()));
    expect(matched).toBe(existing.id);

    const fresh = label("Earth-C");
    const createdId = await db.transaction((tx) => resolveUniverseId(tx, null, fresh));
    const [row] = await db.select().from(universes).where(eq(universes.id, createdId ?? ""));
    expect(row.name).toBe(fresh);
  });

  it("returns nothing when no universe is picked or typed", async () => {
    expect(await db.transaction((tx) => resolveUniverseId(tx, null, null))).toBeNull();
  });
});
