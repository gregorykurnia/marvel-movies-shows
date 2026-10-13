// Writes for first appearances (PRODUCT_PLAN §2.1, §2.3). A character's first and last appearance are columns on the
// character row, so these write those columns. The appearances join table is no longer written (Phase 11), and its
// rows are kept as they are. Kept out of the action files (see placeables.ts).
import { and, eq, inArray, sql } from "drizzle-orm";

import type { Tx } from "@/db";
import { characters, entries, titles } from "@/db/schema";
import { entryLabel } from "@/lib/data/characters";
import { readPlaceables } from "@/lib/data/placeables";
import { seededKey } from "@/lib/ordering";
import type { FirstAppearanceInput } from "@/lib/schemas";

// The characters whose first appearance is this recap. Picking a character here sets its first appearance to this
// entry, and moves it if it was somewhere else. A character taken off the list loses this recap as its first.
export async function replaceFirstAppearances(tx: Tx, entryId: string, characterIds: string[]) {
  await tx.update(characters).set({ firstEntryId: null }).where(eq(characters.firstEntryId, entryId));
  if (characterIds.length > 0) {
    await tx.update(characters).set({ firstEntryId: entryId }).where(inArray(characters.id, characterIds));
  }
}

// The label an entry shows in pickers, read back from the database.
async function labelFor(tx: Tx, entryId: string) {
  const [row] = await tx
    .select({
      titleName: titles.name,
      titleKind: titles.kind,
      seasonNumber: entries.seasonNumber,
      episodeNumber: entries.episodeNumber,
      name: entries.name,
    })
    .from(entries)
    .innerJoin(titles, eq(entries.titleId, titles.id))
    .where(eq(entries.id, entryId))
    .limit(1);
  return entryLabel(row);
}

// Adds a movie, a short or a show episode from a character's First or Last appearance, and returns the entry that
// the character should point at. It goes to the end of the recap order, with no year and no universe. A show that
// already exists is reused by name (ignoring case). An episode that already exists is picked, not added again.
export async function addFirstAppearanceEntry(tx: Tx, input: FirstAppearanceInput): Promise<{ id: string; label: string }> {
  if (input.kind !== "show") {
    const [title] = await tx
      .insert(titles)
      .values({ name: input.name ?? "", kind: input.kind })
      .returning({ id: titles.id });
    const sortKey = seededKey(await readPlaceables(tx), null);
    const [entry] = await tx
      .insert(entries)
      .values({ titleId: title.id, sortKey, watched: false })
      .returning({ id: entries.id });
    return { id: entry.id, label: await labelFor(tx, entry.id) };
  }

  let showId = input.showTitleId;
  if (!showId) {
    const [existing] = await tx
      .select({ id: titles.id })
      .from(titles)
      .where(and(eq(titles.kind, "show"), sql`lower(${titles.name}) = lower(${input.showName ?? ""})`))
      .limit(1);
    if (existing) {
      showId = existing.id;
    } else {
      const [created] = await tx
        .insert(titles)
        .values({ name: input.showName ?? "", kind: "show" })
        .returning({ id: titles.id });
      showId = created.id;
    }
  }

  const season = input.season ?? 0;
  const episode = input.episode ?? 0;
  const [clash] = await tx
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.titleId, showId), eq(entries.seasonNumber, season), eq(entries.episodeNumber, episode)))
    .limit(1);
  if (clash) return { id: clash.id, label: await labelFor(tx, clash.id) };

  const sortKey = seededKey(await readPlaceables(tx), null);
  const [entry] = await tx
    .insert(entries)
    .values({
      titleId: showId,
      seasonNumber: season,
      episodeNumber: episode,
      name: input.episodeName,
      sortKey,
      watched: false,
    })
    .returning({ id: entries.id });
  return { id: entry.id, label: await labelFor(tx, entry.id) };
}
