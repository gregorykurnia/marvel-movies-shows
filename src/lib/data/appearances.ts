// Writes for the appearances join table, shared by the character side and the recap side. A set is always
// replaced as a whole, inside the caller's transaction. Kept out of the action files (see placeables.ts).
import { eq } from "drizzle-orm";

import type { Tx } from "@/db";
import { appearances } from "@/db/schema";

// The recaps one character appears in.
export async function replaceCharacterAppearances(tx: Tx, characterId: string, entryIds: string[]) {
  await tx.delete(appearances).where(eq(appearances.characterId, characterId));
  if (entryIds.length > 0) {
    await tx.insert(appearances).values(entryIds.map((entryId) => ({ characterId, entryId })));
  }
}

// The characters who appear in one recap.
export async function replaceRecapCharacters(tx: Tx, entryId: string, characterIds: string[]) {
  await tx.delete(appearances).where(eq(appearances.entryId, entryId));
  if (characterIds.length > 0) {
    await tx.insert(appearances).values(characterIds.map((characterId) => ({ characterId, entryId })));
  }
}
