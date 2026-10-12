// Reads every entry's key and year, in custom order. Used when placing new rows. Kept out of the action files:
// every export of a "use server" module becomes a callable endpoint.
import { asc } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { entries } from "@/db/schema";
import type { Placeable } from "@/lib/ordering";

export async function readPlaceables(tx: Tx | ReturnType<typeof getDb> = getDb()): Promise<Placeable[]> {
  return tx
    .select({ id: entries.id, sortKey: entries.sortKey, inUniverseYear: entries.inUniverseYear })
    .from(entries)
    .orderBy(asc(entries.sortKey));
}
