// Bulk writes for the character directory (Phase 12). Each one runs inside the caller's transaction, so a change either
// reaches every character it can or none. An id that no longer exists is skipped and counted in `missing`.
import { and, inArray, sql } from "drizzle-orm";

import type { Tx } from "@/db";
import { characterTags, characters, tags } from "@/db/schema";
import type { BulkCharacterPatch } from "@/lib/schemas";

import { tagIdsFor } from "./tags";
import { resolveUniverseId } from "./universes";

export type BulkResult = { updated: number; missing: number };

// Postgres allows 65,535 parameters in one statement. A tag row takes two, so tag inserts go in batches.
const TAG_BATCH = 5_000;

// Sets one field on every listed character. A null reference clears the field.
export async function applyCharacterPatch(tx: Tx, ids: string[], patch: BulkCharacterPatch): Promise<BulkResult> {
  const changes: Partial<typeof characters.$inferInsert> = {};
  if (patch.importance !== undefined) changes.importance = patch.importance;
  if (patch.status !== undefined) changes.status = patch.status;
  if (patch.universe !== undefined) changes.universeId = await resolveUniverseId(tx, patch.universe.id, patch.universe.name);
  if (patch.predominantTitleId !== undefined) changes.predominantTitleId = patch.predominantTitleId;
  if (patch.firstEntryId !== undefined) changes.firstEntryId = patch.firstEntryId;
  if (patch.lastEntryId !== undefined) changes.lastEntryId = patch.lastEntryId;

  const updated = await tx.update(characters).set(changes).where(inArray(characters.id, ids)).returning({ id: characters.id });
  return { updated: updated.length, missing: ids.length - updated.length };
}

// Adds some tags to, and takes some tags off, every listed character. Tags that aren't named stay. A tag to add that
// doesn't exist is created. A tag to remove that doesn't exist is ignored.
export async function editCharacterTags(tx: Tx, ids: string[], add: string[], remove: string[]): Promise<BulkResult> {
  const existing = await tx.select({ id: characters.id }).from(characters).where(inArray(characters.id, ids));
  const characterIds = existing.map((row) => row.id);

  if (characterIds.length > 0 && remove.length > 0) {
    const lowered = remove.map((name) => name.toLowerCase());
    const removeIds = (
      await tx
        .select({ id: tags.id })
        .from(tags)
        .where(inArray(sql<string>`lower(${tags.name})`, lowered))
    ).map((row) => row.id);
    if (removeIds.length > 0) {
      await tx
        .delete(characterTags)
        .where(and(inArray(characterTags.characterId, characterIds), inArray(characterTags.tagId, removeIds)));
    }
  }

  if (characterIds.length > 0 && add.length > 0) {
    const addIds = await tagIdsFor(tx, add);
    const rows = characterIds.flatMap((characterId) => addIds.map((tagId) => ({ characterId, tagId })));
    for (let start = 0; start < rows.length; start += TAG_BATCH) {
      await tx.insert(characterTags).values(rows.slice(start, start + TAG_BATCH)).onConflictDoNothing();
    }
  }

  return { updated: characterIds.length, missing: ids.length - characterIds.length };
}

// Deletes the listed characters. Their tags go with them. Recaps and titles are not touched.
export async function deleteCharacters(tx: Tx, ids: string[]): Promise<BulkResult> {
  const deleted = await tx.delete(characters).where(inArray(characters.id, ids)).returning({ id: characters.id });
  return { updated: deleted.length, missing: ids.length - deleted.length };
}
