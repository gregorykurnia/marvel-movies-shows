"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { replaceCharacterAppearances } from "@/lib/data/appearances";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { formStrings } from "@/lib/form";
import { characterFormSchema } from "@/lib/schemas";

// Server Actions for characters. Each variant is its own row (PRODUCT_PLAN §2.3). A character's appearances are
// saved as one set: the rows are replaced in the same transaction as the character.

function readCharacterForm(formData: FormData) {
  return characterFormSchema.safeParse({
    ...formStrings(formData),
    entryIds: formData.getAll("entryId").map(String),
  });
}

export async function createCharacter(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = readCharacterForm(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const id = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(characters)
        .values({
          name: input.name,
          importance: input.importance,
          status: input.status,
          universeId: input.universeId,
          predominantTitleId: input.predominantTitleId,
          firstEntryId: input.firstEntryId,
          lastEntryId: input.lastEntryId,
          notes: input.notes,
        })
        .returning({ id: characters.id });
      await replaceCharacterAppearances(tx, row.id, input.entryIds);
      return row.id;
    });
    revalidatePath("/", "layout");
    return ok({ id });
  } catch (error) {
    return referenceFailure(error);
  }
}

export async function updateCharacter(id: string, formData: FormData): Promise<ActionResult> {
  const parsed = readCharacterForm(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const found = await getDb().transaction(async (tx) => {
      const updated = await tx
        .update(characters)
        .set({
          name: input.name,
          importance: input.importance,
          status: input.status,
          universeId: input.universeId,
          predominantTitleId: input.predominantTitleId,
          firstEntryId: input.firstEntryId,
          lastEntryId: input.lastEntryId,
          notes: input.notes,
        })
        .where(eq(characters.id, id))
        .returning({ id: characters.id });
      if (updated.length === 0) return false;
      await replaceCharacterAppearances(tx, id, input.entryIds);
      return true;
    });
    if (!found) return fail("That character no longer exists.");
  } catch (error) {
    return referenceFailure(error);
  }

  revalidatePath("/", "layout");
  return ok();
}

const MISSING_REFERENCE = "One of the linked items no longer exists. Pick it again.";

// A dropdown choice or appearance that was deleted in the meantime. The foreign key rejects it.
function referenceFailure(error: unknown): ActionResult<never> {
  if (isForeignKeyViolation(error)) return fail(MISSING_REFERENCE);
  throw error;
}
