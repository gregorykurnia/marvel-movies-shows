import { getTableName, is, Table } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { BACKUP_FORMAT, BACKUP_TABLE_NAMES, BACKUP_VERSION, buildBackupDocument } from "@/lib/backup/export";

describe("backup export", () => {
  it("covers every data table in the schema except backup_log", () => {
    const schemaTables = Object.values(schema)
      .filter((value) => is(value, Table))
      .map((table) => getTableName(table as Table))
      .filter((name) => name !== "backup_log");
    expect([...BACKUP_TABLE_NAMES].sort()).toEqual(schemaTables.sort());
  });

  it("wraps the tables in the documented format", () => {
    const doc = buildBackupDocument({ titles: [{ id: "a" }] }, new Date("2026-10-12T07:00:00Z"));
    expect(doc).toEqual({
      format: "marvel-directory-backup",
      version: 3,
      exportedAt: "2026-10-12T07:00:00.000Z",
      tables: { titles: [{ id: "a" }] },
    });
    expect(BACKUP_FORMAT).toBe("marvel-directory-backup");
    expect(BACKUP_VERSION).toBe(3);
  });
});
