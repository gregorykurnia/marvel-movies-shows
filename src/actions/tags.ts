"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import { tags } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { mergeTagInto } from "@/lib/data/tags";
import { isUniqueViolation } from "@/lib/db-errors";
import { formStrings } from "@/lib/form";
import { tagNameSchema, uuidSchema } from "@/lib/schemas";

// Server Actions for the /tags page: rename, merge and delete (PRODUCT_PLAN §2.6). Recaps, events and characters pick
// tags up through their own forms, so only the tag list is managed here.

const NAME_TAKEN = "Another tag already has that name. Merge the two tags instead.";

export async function renameTag(tagId: string, formData: FormData): Promise<ActionResult> {
  const parsed = tagNameSchema.safeParse(formStrings(formData).name ?? "");
  if (!parsed.success) return validationFailure(parsed.error);

  try {
    const updated = await getDb()
      .update(tags)
      .set({ name: parsed.data })
      .where(eq(tags.id, tagId))
      .returning({ id: tags.id });
    if (updated.length === 0) return fail("That tag no longer exists.");
  } catch (error) {
    if (isUniqueViolation(error)) return fail(NAME_TAKEN, { name: NAME_TAKEN });
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

// Moves every use of one tag onto another, then deletes the first. Used when two tags mean the same thing.
export async function mergeTags(sourceId: string, targetId: string): Promise<ActionResult> {
  const source = uuidSchema.safeParse(sourceId);
  const target = uuidSchema.safeParse(targetId);
  if (!source.success || !target.success) return fail("Pick two tags to merge.");
  if (source.data === target.data) return fail("Pick a different tag to merge into.");

  const merged = await getDb().transaction(async (tx) => {
    const [exists] = await tx.select({ id: tags.id }).from(tags).where(eq(tags.id, target.data)).limit(1);
    if (!exists) return false;
    await mergeTagInto(tx, source.data, target.data);
    return true;
  });
  if (!merged) return fail("That tag no longer exists.");

  revalidatePath("/", "layout");
  return ok();
}

export async function deleteTag(tagId: string): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(tagId);
  if (!parsed.success) return fail("That tag no longer exists.");

  await getDb().delete(tags).where(eq(tags.id, parsed.data));
  revalidatePath("/", "layout");
  return ok();
}
