"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb, type Tx } from "@/db";
import { entries, timelineEvents } from "@/db/schema";
import { fail, ok, validationFailure, type ActionResult } from "@/lib/action-result";
import { readEventPlaceables } from "@/lib/data/timeline";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { formStrings } from "@/lib/form";
import { keyInYear, type YearPlaceable } from "@/lib/ordering";
import { deleteConfirmSchema, eventFormSchema, eventMoveSchema } from "@/lib/schemas";

// Server Actions for timeline events (IMPLEMENTATION_PLAN §3.2). An event's sort_key only orders it within its year,
// so a move or a new placement always stays inside that year's block (see keyInYear).

const MISSING_LINK = "The title or recap you picked no longer exists. Pick it again.";

// Where a new key goes. `undefined` is the last place in the year, `null` the first, and an id is the event to
// follow. The event must be in the same year.
type Placement = { ok: true; afterId: string | null | undefined } | { ok: false; fieldErrors: Record<string, string> };

function placementFor(items: YearPlaceable[], year: number, choice: string): Placement {
  if (choice === "auto" || choice === "keep") return { ok: true, afterId: undefined };
  if (choice === "first") return { ok: true, afterId: null };
  const after = items.find((item) => item.id === choice);
  if (!after) {
    return { ok: false, fieldErrors: { placement: "That event no longer exists. Pick the order again." } };
  }
  if (after.year !== year) {
    return { ok: false, fieldErrors: { placement: "Pick an event in the same year, or choose automatic." } };
  }
  return { ok: true, afterId: choice };
}

// Checks the title and recap links. A recap always belongs to its title, so a recap alone sets the title.
async function resolveLinks(
  tx: Tx,
  titleId: string | null,
  entryId: string | null,
): Promise<{ ok: true; titleId: string | null; entryId: string | null } | { ok: false; fieldErrors: Record<string, string> }> {
  if (!entryId) return { ok: true, titleId, entryId: null };
  const [entry] = await tx
    .select({ titleId: entries.titleId })
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);
  if (!entry) return { ok: false, fieldErrors: { entryId: "That recap no longer exists. Pick it again." } };
  if (titleId && titleId !== entry.titleId) {
    return { ok: false, fieldErrors: { entryId: "That recap belongs to a different title." } };
  }
  return { ok: true, titleId: entry.titleId, entryId };
}

export async function createEvent(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = eventFormSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const result = await getDb().transaction(async (tx) => {
      const links = await resolveLinks(tx, input.titleId, input.entryId);
      if (!links.ok) return links;

      const items = await readEventPlaceables(tx);
      const placement = placementFor(items, input.year, input.placement);
      if (!placement.ok) return { ok: false as const, fieldErrors: placement.fieldErrors };

      const sortKey = keyInYear(items, input.year, placement.afterId);
      const [row] = await tx
        .insert(timelineEvents)
        .values({
          year: input.year,
          text: input.text,
          details: input.details,
          titleId: links.titleId,
          entryId: links.entryId,
          sortKey,
        })
        .returning({ id: timelineEvents.id });
      return { ok: true as const, id: row.id };
    });

    if (!result.ok) return fail("Check the highlighted fields.", result.fieldErrors);
    revalidatePath("/", "layout");
    return ok({ id: result.id });
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail(MISSING_LINK);
    throw error;
  }
}

// Saves an event. Leaving the order on "keep" keeps its place when its year is unchanged. Changing the year puts
// it last in the new year, unless another order is picked.
type UpdateOutcome =
  | { ok: true }
  | { ok: false; message: string }
  | { ok: false; fieldErrors: Record<string, string> };

export async function updateEvent(eventId: string, formData: FormData): Promise<ActionResult> {
  const parsed = eventFormSchema.safeParse(formStrings(formData));
  if (!parsed.success) return validationFailure(parsed.error);
  const input = parsed.data;

  try {
    const result: UpdateOutcome = await getDb().transaction(async (tx) => {
      const [current] = await tx
        .select({ year: timelineEvents.year, sortKey: timelineEvents.sortKey })
        .from(timelineEvents)
        .where(eq(timelineEvents.id, eventId))
        .limit(1);
      if (!current) return { ok: false as const, message: "That event no longer exists." };

      const links = await resolveLinks(tx, input.titleId, input.entryId);
      if (!links.ok) return { ok: false as const, fieldErrors: links.fieldErrors };

      const others = (await readEventPlaceables(tx)).filter((item) => item.id !== eventId);
      const keepPlace = input.placement === "keep" && current.year === input.year;
      if (!keepPlace) {
        const placement = placementFor(others, input.year, input.placement);
        if (!placement.ok) return { ok: false as const, fieldErrors: placement.fieldErrors };
        const sortKey = keyInYear(others, input.year, placement.afterId);
        await writeEvent(tx, eventId, input, links, sortKey);
      } else {
        await writeEvent(tx, eventId, input, links, current.sortKey);
      }
      return { ok: true as const };
    });

    if (!result.ok) {
      if ("message" in result) return fail(result.message);
      return fail("Check the highlighted fields.", result.fieldErrors);
    }
  } catch (error) {
    if (isForeignKeyViolation(error)) return fail(MISSING_LINK);
    throw error;
  }

  revalidatePath("/", "layout");
  return ok();
}

async function writeEvent(
  tx: Tx,
  eventId: string,
  input: { year: number; text: string; details: string | null },
  links: { titleId: string | null; entryId: string | null },
  sortKey: string,
) {
  await tx
    .update(timelineEvents)
    .set({
      year: input.year,
      text: input.text,
      details: input.details,
      titleId: links.titleId,
      entryId: links.entryId,
      sortKey,
    })
    .where(eq(timelineEvents.id, eventId));
}

const MOVE_REFUSED = {
  missing: "That event no longer exists.",
  gone: "The event you dropped it after no longer exists. Try again.",
  "other-year": "Events can only be reordered within their year.",
} as const;

// Moves one event so it follows `afterId` within its year (null: first in the year). Only that row is written.
export async function moveEvent(input: { eventId: string; afterId: string | null }): Promise<ActionResult> {
  const parsed = eventMoveSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const outcome = await getDb().transaction(async (tx) => {
    const items = await readEventPlaceables(tx);
    const moving = items.find((item) => item.id === parsed.data.eventId);
    if (!moving) return "missing" as const;

    const others = items.filter((item) => item.id !== moving.id);
    const after = parsed.data.afterId === null ? null : others.find((item) => item.id === parsed.data.afterId);
    if (parsed.data.afterId !== null && !after) return "gone" as const;
    if (after && after.year !== moving.year) return "other-year" as const;

    const sortKey = keyInYear(others, moving.year, parsed.data.afterId);
    await tx.update(timelineEvents).set({ sortKey }).where(eq(timelineEvents.id, moving.id));
    return "moved" as const;
  });

  if (outcome !== "moved") return fail(MOVE_REFUSED[outcome]);
  revalidatePath("/", "layout");
  return ok();
}

// Deletes an event. Its tags go with it. The typed word is checked here too, then the user is sent to `redirectTo`.
export async function deleteEvent(eventId: string, redirectTo: string, formData: FormData): Promise<void> {
  const confirm = deleteConfirmSchema.safeParse(formData.get("confirm"));
  if (!confirm.success) {
    throw new Error("Type DELETE to confirm before deleting.");
  }

  await getDb().delete(timelineEvents).where(eq(timelineEvents.id, eventId));
  revalidatePath("/", "layout");
  redirect(redirectTo);
}
