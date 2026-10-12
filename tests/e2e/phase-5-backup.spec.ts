import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";
import { sql } from "drizzle-orm";

import { connectTestDatabase, removeE2eData, seedBrowseData } from "../support/e2e-data";

// Phase 5 backup (PRODUCT_PLAN §2.7): the Backup page downloads one JSON file with every data table, and the download
// is logged so the page can show when the last backup was made. Runs against the test branch.

const run = `backup${Date.now().toString(36)}`;

// The data tables the file must contain, by their database names.
const dataTables = [
  "titles",
  "entries",
  "timeline_events",
  "universes",
  "characters",
  "appearances",
  "tags",
  "entry_tags",
  "event_tags",
  "character_tags",
];

test.beforeAll(async () => {
  await seedBrowseData(run);
});

test.afterAll(async () => {
  await removeE2eData();
});

test("the Backup page downloads every table, with the same row counts as the database", async ({ page }) => {
  await page.goto("/backup");
  await expect(page.getByRole("heading", { level: 1, name: "Backup", exact: true })).toBeVisible();

  const downloaded = page.waitForEvent("download");
  await page.getByRole("link", { name: "⬇ Download backup", exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^marvel-directory-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const doc = JSON.parse(readFileSync(await download.path(), "utf8")) as {
    format: string;
    version: number;
    tables: Record<string, unknown[]>;
  };
  expect(doc.format).toBe("marvel-directory-backup");
  expect(doc.version).toBe(1);
  expect(Object.keys(doc.tables).sort()).toEqual([...dataTables].sort());
  expect(doc.tables.titles.length).toBeGreaterThan(0);

  const db = connectTestDatabase();
  for (const table of dataTables) {
    const counted = await db.execute(sql.raw(`select count(*)::int as n from "${table}"`));
    expect(doc.tables[table].length, table).toBe((counted.rows[0] as { n: number }).n);
  }

  // Generated search columns are derived from the text, so they are not stored in a backup.
  expect(JSON.stringify(doc)).not.toContain("searchVector");

  // The download was logged, so the page now shows the last backup time.
  await page.reload();
  await expect(page.getByText(/Last backup/)).toBeVisible();
});
