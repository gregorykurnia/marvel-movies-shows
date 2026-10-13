"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { characters, universes } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { replaceCharacterTags, tagIdsFor } from "@/lib/data/tags";
import { resolveUniverseId } from "@/lib/data/universes";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { formStrings } from "@/lib/form";
import {
  characterFormSchema,
  deleteConfirmSchema,
  inlineCharacterSchema,
  tagNamesSchema,
  uuidSchema,
} from "@/lib/schemas";

// Server Actions for characters. Each variant is its own row (PRODUCT_PLAN §2.3). A character's first and last
// appearance are columns on the row. The appearances join table is no longer written (Phase 11).

function readCharacterForm(formData: FormData) {
  return characterFormSchema.safeParse(formStrings(formData));
}

export async function createCharacter(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = readCharacterForm(formData);
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const id = await getDb().transaction(async (tx) => {
      const universeId = await resolveUniverseId(tx, input.universeId, input.universeName);
      const [row] = await tx
        .insert(characters)
        .values({
          name: input.name,
          importance: input.importance,
          status: input.status,
          universeId,
          predominantTitleId: input.predominantTitleId,
          firstEntryId: input.firstEntryId,
          lastEntryId: input.lastEntryId,
          notes: input.notes,
        })
        .returning({ id: characters.id });
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
      const universeId = await resolveUniverseId(tx, input.universeId, input.universeName);
      const updated = await tx
        .update(characters)
        .set({
          name: input.name,
          importance: input.importance,
          status: input.status,
          universeId,
          predominantTitleId: input.predominantTitleId,
          firstEntryId: input.firstEntryId,
          lastEntryId: input.lastEntryId,
          notes: input.notes,
        })
        .where(eq(characters.id, id))
        .returning({ id: characters.id });
      return updated.length > 0;
    });
    if (!found) return fail("That character no longer exists.");
  } catch (error) {
    return referenceFailure(error);
  }

  revalidatePath("/", "layout");
  return ok();
}

// Adds a character from the recap's First Appearance Characters picker (Phase 11). It's a minor character with an
// unknown status, in the recap's universe. The rest is filled in on the character form. Returns the label the
// picker shows.
export async function createCharacterInline(input: unknown): Promise<ActionResult<{ id: string; label: string }>> {
  const parsed = inlineCharacterSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { name, importance, universeId } = parsed.data;

  try {
    const created = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(characters)
        .values({ name, importance, status: "unknown", universeId })
        .returning({ id: characters.id });
      const [universe] = universeId
        ? await tx.select({ name: universes.name }).from(universes).where(eq(universes.id, universeId)).limit(1)
        : [];
      return { id: row.id, label: `${name} · ${universe?.name ?? "No universe"}` };
    });
    revalidatePath("/", "layout");
    return ok(created);
  } catch (error) {
    return referenceFailure(error);
  }
}

// Replaces a character's tags. The tags card saves on each change, so every change is one save.
export async function setCharacterTags(characterId: string, names: string[]): Promise<ActionResult> {
  const id = uuidSchema.safeParse(characterId);
  if (!id.success) return fail("That character no longer exists.");
  const parsed = tagNamesSchema.safeParse(names);
  if (!parsed.success) return validationFailure(parsed.error);

  const found = await getDb().transaction(async (tx) => {
    const [exists] = await tx
      .select({ id: characters.id })
      .from(characters)
      .where(eq(characters.id, id.data))
      .limit(1);
    if (!exists) return false;
    await replaceCharacterTags(tx, id.data, await tagIdsFor(tx, parsed.data));
    return true;
  });
  if (!found) return fail("That character no longer exists.");

  revalidatePath("/", "layout");
  return ok();
}

// Deletes one variant. Its appearances and tags go with it. Recaps are not affected. The typed word is checked here
// too, then the user goes to `redirectTo`.
export async function deleteCharacter(characterId: string, redirectTo: string, formData: FormData): Promise<void> {
  const confirm = deleteConfirmSchema.safeParse(formData.get("confirm"));
  if (!confirm.success) {
    throw new Error("Type DELETE to confirm before deleting.");
  }

  await getDb().delete(characters).where(eq(characters.id, characterId));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

const MISSING_REFERENCE = "One of the linked items no longer exists. Pick it again.";

// A dropdown choice or appearance that was deleted in the meantime. The foreign key rejects it.
function referenceFailure(error: unknown): ActionResult<never> {
  if (isForeignKeyViolation(error)) return fail(MISSING_REFERENCE);
  throw error;
}
