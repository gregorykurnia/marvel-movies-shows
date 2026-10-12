"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { entries, titles } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { formStrings } from "@/lib/form";
import { readPlaceables } from "@/lib/data/placeables";
import { seededKey } from "@/lib/ordering";
import { deleteConfirmSchema, titleEditSchema, titleFormSchema } from "@/lib/schemas";

// Server Actions for titles (movies and shows). See IMPLEMENTATION_PLAN §5.4 for the form rules.

// A movie is one recap. Creating a movie creates its single entry, placed by its year (§3.2).
// A show is created empty, and its episodes are added on its own page.
export async function createTitle(
  formData: FormData,
): Promise<ActionResult<{ id: string; kind: "movie" | "show"; entryId: string | null }>> {
  const parsed = titleFormSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  const created = await getDb().transaction(async (tx) => {
    const [title] = await tx
      .insert(titles)
      .values({ name: input.name, kind: input.kind, releaseDate: input.releaseDate })
      .returning({ id: titles.id });

    if (input.kind === "show") {
      return { id: title.id, kind: "show" as const, entryId: null };
    }

    const sortKey = seededKey(await readPlaceables(tx), input.inUniverseYear);
    const [entry] = await tx
      .insert(entries)
      .values({ titleId: title.id, sortKey, inUniverseYear: input.inUniverseYear, watched: false })
      .returning({ id: entries.id });
    return { id: title.id, kind: "movie" as const, entryId: entry.id };
  });

  revalidatePath("/", "layout");
  return ok(created);
}

// Name and release date for a show. A movie's name and year are saved from its recap page (saveMovie).
export async function updateTitle(titleId: string, formData: FormData): Promise<ActionResult> {
  const parsed = titleEditSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);

  const updated = await getDb()
    .update(titles)
    .set({ name: parsed.data.name, releaseDate: parsed.data.releaseDate, updatedAt: sql`now()` })
    .where(eq(titles.id, titleId))
    .returning({ id: titles.id });
  if (updated.length === 0) return fail("That title no longer exists.");

  revalidatePath("/", "layout");
  return ok();
}

// Deletes a title and everything under it (its entries, their recaps and appearances cascade). The typed
// word is checked here too. On success the user is sent to `redirectTo`.
export async function deleteTitle(titleId: string, redirectTo: string, formData: FormData): Promise<void> {
  const confirm = deleteConfirmSchema.safeParse(formData.get("confirm"));
  if (!confirm.success) {
    throw new Error("Type DELETE to confirm before deleting.");
  }

  await getDb().delete(titles).where(eq(titles.id, titleId));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}
