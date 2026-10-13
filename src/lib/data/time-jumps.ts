// Reads and writes for other years (flashbacks, flash-forwards and time travel) on a recap (IMPLEMENTATION_PLAN §3.1,
// Phase 8). A recap's set is always replaced as a whole, inside the caller's transaction, the same as its characters
// and tags. Kept out of the action files (see placeables.ts).
import { asc, eq } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { entryTimeJumps } from "@/db/schema";
import { keysBetween } from "@/lib/ordering";
import type { TimeJump, TimeJumpKind } from "@/lib/time-jump";

// One recap's other years, in sort_key order (the order the recap page and the edit form show them in).
export async function loadEntryTimeJumps(entryId: string): Promise<TimeJump[]> {
  return getDb()
    .select({
      id: entryTimeJumps.id,
      year: entryTimeJumps.year,
      kind: entryTimeJumps.kind,
      note: entryTimeJumps.note,
    })
    .from(entryTimeJumps)
    .where(eq(entryTimeJumps.entryId, entryId))
    .orderBy(asc(entryTimeJumps.sortKey));
}

// Replaces a recap's other years with `jumps`, in the order given. The keys come from one block between the open
// ends, so the stored order is exactly the order of the rows. Nothing else in the custom order is touched.
export async function replaceEntryTimeJumps(
  tx: Tx,
  entryId: string,
  jumps: { year: number; kind: TimeJumpKind; note: string | null }[],
) {
  await tx.delete(entryTimeJumps).where(eq(entryTimeJumps.entryId, entryId));
  if (jumps.length === 0) return;
  const keys = keysBetween(null, null, jumps.length);
  await tx.insert(entryTimeJumps).values(
    jumps.map((jump, index) => ({
      entryId,
      year: jump.year,
      kind: jump.kind,
      note: jump.note,
      sortKey: keys[index],
    })),
  );
}
