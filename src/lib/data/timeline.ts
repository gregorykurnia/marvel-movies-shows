// Read queries for timeline events. Plain data only, so it can be passed to Client Components. Kept out of the
// action files: every export of a "use server" module becomes a callable endpoint (see placeables.ts).
import { asc, eq } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { timelineEvents, titles } from "@/db/schema";
import type { YearPlaceable } from "@/lib/ordering";

import { loadCatalog, type TitleKind } from "./catalog";
import { entryLabel } from "./characters";

// One event as the timeline shows it.
export type TimelineEvent = {
  id: string;
  year: number;
  text: string;
  details: string | null;
  titleId: string | null;
  titleName: string | null;
  titleKind: TitleKind | null;
  entryId: string | null;
  entryLabel: string | null;
  sortKey: string;
};

// Every event's key and year, in custom order. Used when placing an event. Passing a transaction keeps the read
// inside the same write.
export async function readEventPlaceables(tx: Tx | ReturnType<typeof getDb> = getDb()): Promise<YearPlaceable[]> {
  return tx
    .select({ id: timelineEvents.id, sortKey: timelineEvents.sortKey, year: timelineEvents.year })
    .from(timelineEvents)
    .orderBy(asc(timelineEvents.sortKey));
}

// Every event, ordered by year and then by its tie-break order.
export async function loadTimelineEvents(): Promise<TimelineEvent[]> {
  const [rows, catalog] = await Promise.all([
    getDb()
      .select({
        id: timelineEvents.id,
        year: timelineEvents.year,
        text: timelineEvents.text,
        details: timelineEvents.details,
        titleId: timelineEvents.titleId,
        titleName: titles.name,
        titleKind: titles.kind,
        entryId: timelineEvents.entryId,
        sortKey: timelineEvents.sortKey,
      })
      .from(timelineEvents)
      .leftJoin(titles, eq(timelineEvents.titleId, titles.id))
      .orderBy(asc(timelineEvents.year), asc(timelineEvents.sortKey)),
    loadCatalog(),
  ]);

  const labels = new Map(catalog.map((entry) => [entry.id, entryLabel(entry)]));
  return rows.map((row) => ({
    ...row,
    titleName: row.titleName ?? null,
    titleKind: row.titleKind ?? null,
    entryLabel: row.entryId ? (labels.get(row.entryId) ?? null) : null,
  }));
}

// One event, for its edit page.
export async function loadEventDetail(id: string): Promise<TimelineEvent | null> {
  const found = await loadTimelineEvents();
  return found.find((event) => event.id === id) ?? null;
}

// The pickers on the event form: every title, every movie or episode (with its title), and every event (for the
// tie-break choices, which the form filters to one year).
export async function loadEventFormOptions() {
  const [titleRows, catalog, eventRows] = await Promise.all([
    getDb().select({ id: titles.id, name: titles.name, kind: titles.kind }).from(titles).orderBy(asc(titles.name)),
    loadCatalog(),
    getDb()
      .select({ id: timelineEvents.id, year: timelineEvents.year, text: timelineEvents.text })
      .from(timelineEvents)
      .orderBy(asc(timelineEvents.year), asc(timelineEvents.sortKey)),
  ]);
  return {
    titles: titleRows,
    entries: catalog.map((entry) => ({ id: entry.id, titleId: entry.titleId, label: entryLabel(entry) })),
    events: eventRows,
  };
}
