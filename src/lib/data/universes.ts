// Universe lookups for writes. Kept out of the action files, since every export of a "use server" module becomes a
// callable endpoint.
import { sql } from "drizzle-orm";

import type { Tx } from "@/db";
import { universes } from "@/db/schema";

// The universe a form saves. A picked universe wins. A typed name that isn't picked is found by name (ignoring case)
// or added, so a new universe appears in the list on save (PRODUCT_PLAN §2.1). Runs inside the caller's transaction,
// so a save that fails also adds no universe.
export async function resolveUniverseId(tx: Tx, universeId: string | null, universeName: string | null): Promise<string | null> {
  if (universeId) return universeId;
  if (!universeName) return null;

  const [existing] = await tx
    .select({ id: universes.id })
    .from(universes)
    .where(sql`lower(${universes.name}) = lower(${universeName})`)
    .limit(1);
  if (existing) return existing.id;

  const [created] = await tx.insert(universes).values({ name: universeName }).returning({ id: universes.id });
  return created.id;
}
