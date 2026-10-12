"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { entries, titles } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { replaceRecapCharacters } from "@/lib/data/appearances";
import { replaceEntryTags, tagIdsFor } from "@/lib/data/tags";
import { readPlaceables } from "@/lib/data/placeables";
import { isForeignKeyViolation, isUniqueViolation } from "@/lib/db-errors";
import { formStrings } from "@/lib/form";
import { formatEpisodeCode } from "@/lib/format";
import { keyForMove, seededKey, seededKeys } from "@/lib/ordering";
import {
  deleteConfirmSchema,
  episodeEditSchema,
  episodeFormSchema,
  episodeRangeSchema,
  moveEntrySchema,
  movieEditSchema,
  recapCharactersSchema,
  tagNamesSchema,
  watchedSchema,
} from "@/lib/schemas";

// Server Actions for movies and episodes (the "entries" in the plan). Every write is validated with Zod first.

const DUPLICATE_EPISODE = "That episode already exists in this show.";
const MISSING_CHARACTER = "One of the characters no longer exists. Pick them again.";

// Thrown inside a transaction to roll it back when the episode number is taken.
class DuplicateEpisode extends Error {}

// Adds one episode to a show. It's placed by its year (§3.2), so the custom order is the only thing that moves it.
export async function createEpisode(titleId: string, formData: FormData): Promise<ActionResult<{ entryId: string }>> {
  const parsed = episodeFormSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const entryId = await getDb().transaction(async (tx) => {
      const [title] = await tx.select({ kind: titles.kind }).from(titles).where(eq(titles.id, titleId)).limit(1);
      if (!title || title.kind !== "show") return null;

      const [clash] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.titleId, titleId),
            eq(entries.seasonNumber, input.season),
            eq(entries.episodeNumber, input.episode),
          ),
        )
        .limit(1);
      if (clash) throw new DuplicateEpisode();

      const sortKey = seededKey(await readPlaceables(tx), input.inUniverseYear);
      const [row] = await tx
        .insert(entries)
        .values({
          titleId,
          seasonNumber: input.season,
          episodeNumber: input.episode,
          name: input.name,
          releaseDate: input.releaseDate,
          inUniverseYear: input.inUniverseYear,
          sortKey,
          watched: false,
        })
        .returning({ id: entries.id });
      return row.id;
    });

    if (!entryId) return fail("That show no longer exists.");
    revalidatePath("/", "layout");
    return ok({ entryId });
  } catch (error) {
    if (error instanceof DuplicateEpisode || isUniqueViolation(error)) {
      return fail(DUPLICATE_EPISODE, {
        episode: `${formatEpisodeCode(input.season, input.episode)} is already in this show`,
      });
    }
    throw error;
  }
}

type BlockResult =
  | { kind: "missing" }
  | { kind: "taken"; numbers: number[] }
  | { kind: "added"; count: number };

// Adds a block of episodes in one go, in episode order, placed by the block's year. None are added if any
// number in the range is already taken. The user can then drag single episodes elsewhere.
export async function addEpisodes(titleId: string, formData: FormData): Promise<ActionResult<{ count: number }>> {
  const parsed = episodeRangeSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;
  const count = input.toEpisode - input.fromEpisode + 1;

  try {
    const result: BlockResult = await getDb().transaction(async (tx) => {
      const [title] = await tx.select({ kind: titles.kind }).from(titles).where(eq(titles.id, titleId)).limit(1);
      if (!title || title.kind !== "show") return { kind: "missing" };

      const taken = await tx
        .select({ episode: entries.episodeNumber })
        .from(entries)
        .where(
          and(
            eq(entries.titleId, titleId),
            eq(entries.seasonNumber, input.season),
            sql`${entries.episodeNumber} between ${input.fromEpisode} and ${input.toEpisode}`,
          ),
        );
      if (taken.length > 0) {
        return { kind: "taken", numbers: taken.map((row) => row.episode ?? 0).sort((a, b) => a - b) };
      }

      const keys = seededKeys(await readPlaceables(tx), input.inUniverseYear, count);
      await tx.insert(entries).values(
        keys.map((sortKey, index) => ({
          titleId,
          seasonNumber: input.season,
          episodeNumber: input.fromEpisode + index,
          name: null,
          releaseDate: null,
          inUniverseYear: input.inUniverseYear,
          sortKey,
          watched: false,
        })),
      );
      return { kind: "added", count };
    });

    if (result.kind === "missing") return fail("That show no longer exists.");
    if (result.kind === "taken") {
      return fail("Some of these episodes already exist. Nothing was added.", {
        fromEpisode: `Already in this season: ${result.numbers.map((n) => String(n).padStart(2, "0")).join(", ")}`,
      });
    }
    revalidatePath("/", "layout");
    return ok({ count: result.count });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("Some of these episodes already exist. Nothing was added.");
    }
    throw error;
  }
}

// Saves an episode's details, its recap, and the characters who appear in it. Changing the year here doesn't
// move the episode in the order.
export async function saveEpisode(entryId: string, formData: FormData): Promise<ActionResult> {
  const parsed = episodeEditSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const characters = recapCharactersSchema.safeParse(formData.getAll("characterId").map(String));
  if (!characters.success) return validationFailure(characters.error);
  const tagNames = tagNamesSchema.safeParse(formData.getAll("tagName").map(String));
  if (!tagNames.success) return validationFailure(tagNames.error);
  const input = parsed.data;

  try {
    const saved = await getDb().transaction(async (tx) => {
      const updated = await tx
        .update(entries)
        .set({
          seasonNumber: input.season,
          episodeNumber: input.episode,
          name: input.name,
          releaseDate: input.releaseDate,
          inUniverseYear: input.inUniverseYear,
          recap: input.recap,
          notes: input.notes,
        })
        .where(and(eq(entries.id, entryId), sql`${entries.seasonNumber} is not null`))
        .returning({ id: entries.id });
      if (updated.length === 0) return false;
      await replaceRecapCharacters(tx, entryId, characters.data);
      await replaceEntryTags(tx, entryId, await tagIdsFor(tx, tagNames.data));
      return true;
    });
    if (!saved) return fail("That episode no longer exists.");
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail(DUPLICATE_EPISODE, {
        episode: `${formatEpisodeCode(input.season, input.episode)} is already in this show`,
      });
    }
    if (isForeignKeyViolation(error)) return fail(MISSING_CHARACTER);
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

// A movie's name, release date and year, its recap, and its characters. The name and release date belong to the
// title.
export async function saveMovie(entryId: string, formData: FormData): Promise<ActionResult> {
  const parsed = movieEditSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const characters = recapCharactersSchema.safeParse(formData.getAll("characterId").map(String));
  if (!characters.success) return validationFailure(characters.error);
  const tagNames = tagNamesSchema.safeParse(formData.getAll("tagName").map(String));
  if (!tagNames.success) return validationFailure(tagNames.error);
  const input = parsed.data;

  try {
    const saved = await getDb().transaction(async (tx) => {
      const [entry] = await tx
        .select({ titleId: entries.titleId })
        .from(entries)
        .where(and(eq(entries.id, entryId), sql`${entries.seasonNumber} is null`))
        .limit(1);
      if (!entry) return false;

      await tx
        .update(titles)
        .set({ name: input.name, releaseDate: input.releaseDate, updatedAt: sql`now()` })
        .where(eq(titles.id, entry.titleId));
      await tx
        .update(entries)
        .set({ inUniverseYear: input.inUniverseYear, recap: input.recap, notes: input.notes })
        .where(eq(entries.id, entryId));
      await replaceRecapCharacters(tx, entryId, characters.data);
      await replaceEntryTags(tx, entryId, await tagIdsFor(tx, tagNames.data));
      return true;
    });
    if (!saved) return fail("That movie no longer exists.");
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail(MISSING_CHARACTER);
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

// Moves an entry so it sits directly after `afterId` (null: at the start). Only that row is written (§3.2).
export async function moveEntry(input: { entryId: string; afterId: string | null }): Promise<ActionResult> {
  const parsed = moveEntrySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const items = await readPlaceables();
  if (!items.some((item) => item.id === parsed.data.entryId)) {
    return fail("That recap no longer exists.");
  }
  if (parsed.data.afterId !== null && !items.some((item) => item.id === parsed.data.afterId)) {
    return fail("The recap you dropped it after no longer exists. Try again.");
  }

  const sortKey = keyForMove(items, parsed.data.entryId, parsed.data.afterId);
  try {
    await getDb().update(entries).set({ sortKey }).where(eq(entries.id, parsed.data.entryId));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return fail("The order changed while you were moving this. Try again.");
    }
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

export async function setWatched(input: { entryId: string; watched: boolean }): Promise<ActionResult> {
  const parsed = watchedSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const updated = await getDb()
    .update(entries)
    .set({ watched: parsed.data.watched })
    .where(eq(entries.id, parsed.data.entryId))
    .returning({ id: entries.id });
  if (updated.length === 0) return fail("That recap no longer exists.");

  revalidatePath("/", "layout");
  return ok();
}

// Deletes one episode and its recap. Its appearances, tags and timeline links go with it (the timeline keeps the
// event and clears its recap link). The typed word is checked here too, then the user goes to `redirectTo`.
export async function deleteEpisode(entryId: string, redirectTo: string, formData: FormData): Promise<void> {
  const confirm = deleteConfirmSchema.safeParse(formData.get("confirm"));
  if (!confirm.success) {
    throw new Error("Type DELETE to confirm before deleting.");
  }

  await getDb()
    .delete(entries)
    .where(and(eq(entries.id, entryId), sql`${entries.seasonNumber} is not null`));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}
