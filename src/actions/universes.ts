"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { characters, entries, entryTimeJumps, universes } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { isRestrictViolation, isUniqueViolation } from "@/lib/db-errors";
import { formatCount } from "@/lib/format";
import { formStrings } from "@/lib/form";
import { universeNameSchema } from "@/lib/schemas";

// The universes list is maintained by hand (PRODUCT_PLAN §2.3). Names are unique, ignoring case.

const DUPLICATE_UNIVERSE = "A universe with that name already exists.";

export async function createUniverse(
  input: FormData | string,
): Promise<ActionResult<{ id: string; name: string }>> {
  const raw = typeof input === "string" ? input : (formStrings(input).name ?? "");
  const parsed = universeNameSchema.safeParse(raw);
  if (!parsed.success) return validationFailure(parsed.error);

  const db = getDb();
  const [existing] = await db
    .select({ id: universes.id, name: universes.name })
    .from(universes)
    .where(sql`lower(${universes.name}) = lower(${parsed.data})`)
    .limit(1);
  if (existing) return fail(DUPLICATE_UNIVERSE, { name: DUPLICATE_UNIVERSE });

  try {
    const [row] = await db.insert(universes).values({ name: parsed.data }).returning({ id: universes.id, name: universes.name });
    revalidatePath("/", "layout");
    return ok(row);
  } catch (error) {
    if (isUniqueViolation(error)) return fail(DUPLICATE_UNIVERSE, { name: DUPLICATE_UNIVERSE });
    throw error;
  }
}

export async function renameUniverse(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = universeNameSchema.safeParse(formStrings(formData).name ?? "");
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await getDb()
      .update(universes)
      .set({ name: parsed.data })
      .where(eq(universes.id, id))
      .returning({ id: universes.id });
    if (updated.length === 0) return fail("That universe no longer exists.");
  } catch (error) {
    if (isUniqueViolation(error)) return fail(DUPLICATE_UNIVERSE, { name: DUPLICATE_UNIVERSE });
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

// Only allowed when no character, recap or other year (Phase 9) uses the universe. The check comes first, so the
// message can say how many. The database restricts the delete too (characters.universe_id, entries.universe_id and
// entry_time_jumps.universe_id are ON DELETE RESTRICT).
export async function deleteUniverse(id: string): Promise<ActionResult> {
  const db = getDb();
  const [[{ count: characterCount }], [{ count: recapCount }], [{ count: otherYearCount }]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(characters).where(eq(characters.universeId, id)),
    db.select({ count: sql<number>`count(*)::int` }).from(entries).where(eq(entries.universeId, id)),
    db.select({ count: sql<number>`count(*)::int` }).from(entryTimeJumps).where(eq(entryTimeJumps.universeId, id)),
  ]);
  if (characterCount > 0 || recapCount > 0 || otherYearCount > 0) {
    const uses = [
      characterCount > 0 ? formatCount(characterCount, "character") : null,
      recapCount > 0 ? formatCount(recapCount, "recap") : null,
      otherYearCount > 0 ? formatCount(otherYearCount, "other year") : null,
    ].filter(Boolean);
    return fail(`It's used by ${uses.join(", ")}, so it can't be deleted.`);
  }

  try {
    await db.delete(universes).where(eq(universes.id, id));
  } catch (error) {
    if (isRestrictViolation(error)) {
      return fail("It's still used by a character, recap or other year, so it can't be deleted.");
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}
