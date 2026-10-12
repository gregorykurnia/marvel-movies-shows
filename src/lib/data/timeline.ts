// Read queries for timeline events. Plain data only, so it can be passed to Client Components. Kept out of the action
// files: every export of a "use server" module becomes a callable endpoint (see placeables.ts).
import { asc, eq } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { timelineEvents, titles } from "@/db/schema";
import type { YearPlaceable } from "@/lib/ordering";

import { KIND_LABEL } from "@/lib/title-kind";

import { loadCatalog, type CatalogEntry, type TitleKind } from "./catalog";
import { entryLabel } from "./characters";
import { loadEventTagNames, loadTagNames } from "./tags";

// One hand-written event as the timeline shows it. `source` tells it apart from a recap item.
export type TimelineEvent = {
  source: "event";
  id: string;
  year: number;
  text: string;
  details: string | null;
  notes: string | null;
  titleId: string | null;
  titleName: string | null;
  titleKind: TitleKind | null;
  entryId: string | null;
  entryLabel: string | null;
  sortKey: string;
  tags: string[];
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
  const [rows, catalog, tagNames] = await Promise.all([
    getDb()
      .select({
        id: timelineEvents.id,
        year: timelineEvents.year,
        text: timelineEvents.text,
        details: timelineEvents.details,
        notes: timelineEvents.notes,
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
    loadEventTagNames(),
  ]);

  const labels = new Map(catalog.map((entry) => [entry.id, entryLabel(entry)]));
  return rows.map((row) => ({
    ...row,
    source: "event" as const,
    details: row.details ?? null,
    notes: row.notes ?? null,
    titleName: row.titleName ?? null,
    titleKind: row.titleKind ?? null,
    entryLabel: row.entryId ? (labels.get(row.entryId) ?? null) : null,
    tags: tagNames.get(row.id) ?? [],
  }));
}

// A movie or an episode with an in-universe year, as a read-only timeline item (PRODUCT_PLAN §2.2). Nothing is stored
// for it: it is read from the recap every time, so it always follows the recap's year. `id` is `entry:<entryId>`, which
// can't collide with an event id, and no event lookup or move ever reads it.
export type TimelineRecap = {
  source: "recap";
  id: string;
  entryId: string;
  year: number;
  // The episode name, "Episode N" when an episode has none, or the movie or short title.
  text: string;
  // The show name for an episode. "Movie" or "Short" for a title with one recap.
  chip: string;
  titleKind: TitleKind;
  tags: string[];
};

// Anything on the timeline: a hand-written event, or a recap item.
export type TimelineItem = TimelineEvent | TimelineRecap;

function recapText(entry: CatalogEntry): string {
  if (entry.titleKind !== "show") return entry.titleName;
  return entry.name ?? `Episode ${entry.episodeNumber}`;
}

// Every movie and episode with an in-universe year, in recap order (the order the recap list shows).
export async function loadRecapItems(): Promise<TimelineRecap[]> {
  const catalog = await loadCatalog();
  return catalog.flatMap((entry): TimelineRecap[] => {
    if (entry.inUniverseYear === null) return [];
    return [
      {
        source: "recap",
        id: `entry:${entry.id}`,
        entryId: entry.id,
        year: entry.inUniverseYear,
        text: recapText(entry),
        chip: entry.titleKind === "show" ? entry.titleName : KIND_LABEL[entry.titleKind],
        titleKind: entry.titleKind,
        tags: entry.tags,
      },
    ];
  });
}

// One event, for its edit page. Only hand-written events: a recap item is never found here.
export async function loadEventDetail(id: string): Promise<TimelineEvent | null> {
  const found = await loadTimelineEvents();
  return found.find((event) => event.id === id) ?? null;
}

// The pickers on the event form: every title, every movie or episode (with its title), every event (for the
// tie-break choices, which the form filters to one year), and every tag name (for the autocomplete).
export async function loadEventFormOptions() {
  const [titleRows, catalog, eventRows, tagList] = await Promise.all([
    getDb().select({ id: titles.id, name: titles.name, kind: titles.kind }).from(titles).orderBy(asc(titles.name)),
    loadCatalog(),
    getDb()
      .select({ id: timelineEvents.id, year: timelineEvents.year, text: timelineEvents.text })
      .from(timelineEvents)
      .orderBy(asc(timelineEvents.year), asc(timelineEvents.sortKey)),
    loadTagNames(),
  ]);
  return {
    titles: titleRows,
    entries: catalog.map((entry) => ({ id: entry.id, titleId: entry.titleId, label: entryLabel(entry) })),
    events: eventRows,
    tagNames: tagList,
  };
}
