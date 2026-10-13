// Backup export (PRODUCT_PLAN §2.7, IMPLEMENTATION_PLAN §5.6). Reads every data table in one consistent snapshot and
// builds the JSON file. The generated search columns are left out, since they're derived from the text and can't be
// written back. backup_log is never part of a backup.
import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  appearances,
  backupLog,
  characters,
  characterTags,
  entries,
  entryTags,
  entryTimeJumps,
  eventTags,
  tags,
  timelineEvents,
  titles,
  universes,
} from "@/db/schema";

export const BACKUP_FORMAT = "marvel-directory-backup";
export const BACKUP_VERSION = 2;

// Every data table, by its database name. The unit test checks this against the schema.
export const BACKUP_TABLE_NAMES = [
  "titles",
  "entries",
  "entry_time_jumps",
  "timeline_events",
  "universes",
  "characters",
  "appearances",
  "tags",
  "entry_tags",
  "event_tags",
  "character_tags",
] as const;

// A row without its generated search column. Only entries, timeline_events and characters have one.
function withoutGenerated<T extends object>(row: T): Omit<T, "searchVector"> {
  const copy = { ...row } as Record<string, unknown>;
  delete copy.searchVector;
  return copy as Omit<T, "searchVector">;
}

// Every data table, read inside one transaction so the file is a single consistent snapshot.
export async function readBackupTables() {
  return getDb().transaction(
    async (tx) => ({
      titles: await tx.select().from(titles),
      entries: (await tx.select().from(entries)).map(withoutGenerated),
      entry_time_jumps: await tx.select().from(entryTimeJumps),
      timeline_events: (await tx.select().from(timelineEvents)).map(withoutGenerated),
      universes: await tx.select().from(universes),
      characters: (await tx.select().from(characters)).map(withoutGenerated),
      appearances: await tx.select().from(appearances),
      tags: await tx.select().from(tags),
      entry_tags: await tx.select().from(entryTags),
      event_tags: await tx.select().from(eventTags),
      character_tags: await tx.select().from(characterTags),
    }),
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export function buildBackupDocument(tables: Record<string, unknown[]>, exportedAt: Date) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: exportedAt.toISOString(), tables };
}

// Builds the file and logs it as a manual backup. Returns the JSON text and the file name.
export async function createBackup(now = new Date()) {
  const json = JSON.stringify(buildBackupDocument(await readBackupTables(), now), null, 2);
  await getDb().insert(backupLog).values({ kind: "manual", sizeBytes: Buffer.byteLength(json, "utf8") });
  return { json, filename: `marvel-directory-backup-${now.toISOString().slice(0, 10)}.json` };
}

// When the most recent manual backup was made, or null if there hasn't been one.
export async function loadLastBackup(): Promise<Date | null> {
  const [row] = await getDb()
    .select({ createdAt: backupLog.createdAt })
    .from(backupLog)
    .where(eq(backupLog.kind, "manual"))
    .orderBy(desc(backupLog.createdAt))
    .limit(1);
  return row?.createdAt ?? null;
}
