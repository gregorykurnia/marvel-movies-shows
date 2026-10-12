// Tag reads and writes, shared by recaps, timeline events and characters (PRODUCT_PLAN §2.6). Tags are unique by name
// ignoring case, so "Rewatch" and "rewatch" are one tag. The helpers take a transaction where they write, and they stay
// out of the action files (see placeables.ts).
import { asc, eq, sql } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { characterTags, entryTags, eventTags, tags } from "@/db/schema";

export type TagRow = { id: string; name: string; uses: number };

// Every tag with how many recaps, events and characters use it. Feeds the autocomplete and the /tags page.
export async function loadTagRows(): Promise<TagRow[]> {
  return getDb()
    .select({
      id: tags.id,
      name: tags.name,
      uses: sql<number>`(select count(*)::int from ${entryTags} where ${entryTags.tagId} = ${tags.id})
        + (select count(*)::int from ${eventTags} where ${eventTags.tagId} = ${tags.id})
        + (select count(*)::int from ${characterTags} where ${characterTags.tagId} = ${tags.id})`,
    })
    .from(tags)
    .orderBy(asc(sql`lower(${tags.name})`));
}

export async function loadTagNames(): Promise<string[]> {
  const rows = await getDb().select({ name: tags.name }).from(tags).orderBy(asc(sql`lower(${tags.name})`));
  return rows.map((row) => row.name);
}

// The tag names on each recap, event or character, keyed by its id. Used by the lists, so they show each row's tags
// without a query per row.
export async function loadEntryTagNames(): Promise<Map<string, string[]>> {
  const rows = await getDb()
    .select({ ownerId: entryTags.entryId, name: tags.name })
    .from(entryTags)
    .innerJoin(tags, eq(entryTags.tagId, tags.id))
    .orderBy(asc(sql`lower(${tags.name})`));
  return groupByOwner(rows);
}

export async function loadEventTagNames(): Promise<Map<string, string[]>> {
  const rows = await getDb()
    .select({ ownerId: eventTags.eventId, name: tags.name })
    .from(eventTags)
    .innerJoin(tags, eq(eventTags.tagId, tags.id))
    .orderBy(asc(sql`lower(${tags.name})`));
  return groupByOwner(rows);
}

export async function loadCharacterTagNames(): Promise<Map<string, string[]>> {
  const rows = await getDb()
    .select({ ownerId: characterTags.characterId, name: tags.name })
    .from(characterTags)
    .innerJoin(tags, eq(characterTags.tagId, tags.id))
    .orderBy(asc(sql`lower(${tags.name})`));
  return groupByOwner(rows);
}

function groupByOwner(rows: { ownerId: string; name: string }[]) {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    grouped.set(row.ownerId, [...(grouped.get(row.ownerId) ?? []), row.name]);
  }
  return grouped;
}

// Turns tag names into tag ids, creating the tags that don't exist yet. Names match ignoring case, and the first
// spelling wins.
export async function tagIdsFor(tx: Tx, names: string[]): Promise<string[]> {
  const ids: string[] = [];
  for (const name of names) {
    const [existing] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(sql`lower(${tags.name}) = lower(${name})`)
      .limit(1);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const [created] = await tx.insert(tags).values({ name }).onConflictDoNothing().returning({ id: tags.id });
    if (created) {
      ids.push(created.id);
      continue;
    }
    // Another save created the same tag between the read and the insert. Use that one.
    const [again] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(sql`lower(${tags.name}) = lower(${name})`)
      .limit(1);
    ids.push(again.id);
  }
  return ids;
}

// A set is always replaced as a whole, inside the caller's transaction.
export async function replaceEntryTags(tx: Tx, entryId: string, tagIds: string[]) {
  await tx.delete(entryTags).where(eq(entryTags.entryId, entryId));
  if (tagIds.length > 0) await tx.insert(entryTags).values(tagIds.map((tagId) => ({ entryId, tagId })));
}

export async function replaceEventTags(tx: Tx, eventId: string, tagIds: string[]) {
  await tx.delete(eventTags).where(eq(eventTags.eventId, eventId));
  if (tagIds.length > 0) await tx.insert(eventTags).values(tagIds.map((tagId) => ({ eventId, tagId })));
}

export async function replaceCharacterTags(tx: Tx, characterId: string, tagIds: string[]) {
  await tx.delete(characterTags).where(eq(characterTags.characterId, characterId));
  if (tagIds.length > 0) await tx.insert(characterTags).values(tagIds.map((tagId) => ({ characterId, tagId })));
}

// Moves every use of `sourceId` onto `targetId`, then deletes the source. A row that already has the target is kept once.
export async function mergeTagInto(tx: Tx, sourceId: string, targetId: string) {
  const entryIds = await tx.select({ id: entryTags.entryId }).from(entryTags).where(eq(entryTags.tagId, sourceId));
  if (entryIds.length > 0) {
    await tx
      .insert(entryTags)
      .values(entryIds.map((row) => ({ entryId: row.id, tagId: targetId })))
      .onConflictDoNothing();
  }
  const eventIds = await tx.select({ id: eventTags.eventId }).from(eventTags).where(eq(eventTags.tagId, sourceId));
  if (eventIds.length > 0) {
    await tx
      .insert(eventTags)
      .values(eventIds.map((row) => ({ eventId: row.id, tagId: targetId })))
      .onConflictDoNothing();
  }
  const characterIds = await tx
    .select({ id: characterTags.characterId })
    .from(characterTags)
    .where(eq(characterTags.tagId, sourceId));
  if (characterIds.length > 0) {
    await tx
      .insert(characterTags)
      .values(characterIds.map((row) => ({ characterId: row.id, tagId: targetId })))
      .onConflictDoNothing();
  }
  await tx.delete(tags).where(eq(tags.id, sourceId));
}
