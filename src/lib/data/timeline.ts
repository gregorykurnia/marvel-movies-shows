// Read queries for timeline events. Plain data only, so it can be passed to Client Components. Kept out of the action
// files: every export of a "use server" module becomes a callable endpoint (see placeables.ts).
import { asc, eq } from "drizzle-orm";

import { getDb, type Tx } from "@/db";
import { entryTimeJumps, timelineEvents, titles } from "@/db/schema";
import type { YearPlaceable } from "@/lib/ordering";
import type { TimeJumpKind } from "@/lib/time-jump";

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

// One other year (flashback, flash-forward or time travel) on a movie or episode, as a read-only timeline item
// (PRODUCT_PLAN §2.2, IMPLEMENTATION_PLAN §5.2 Phase 8). Read from entry_time_jumps every time the timeline loads, so
// it always follows its recap. `id` is `jump:<id>`, which can't collide with an event id or a recap item id.
export type TimelineJump = {
  source: "jump";
  id: string;
  entryId: string;
  year: number;
  // The note, or the episode name, "Episode N" or the movie title when there's no note.
  text: string;
  // The show name for an episode. "Movie" or "Short" for a title with one recap.
  chip: string;
  titleKind: TitleKind;
  // The show or movie or short name, shown on the card's kind label, e.g. "Flashback · Guardians of the Galaxy".
  titleName: string;
  // The episode label (the name, or "Episode N"), for the popover's "title and episode" line. Null for a movie or short.
  episodeLabel: string | null;
  jumpKind: TimeJumpKind;
  note: string | null;
  // The recap's main in-universe year, shown as "Main story: <year>" in the popover.
  mainYear: number | null;
  tags: string[];
};

// Anything on the timeline: a hand-written event, a recap item, or a time jump item.
export type TimelineItem = TimelineEvent | TimelineRecap | TimelineJump;

function recapText(entry: CatalogEntry): string {
  if (entry.titleKind !== "show") return entry.titleName;
  return entry.name ?? `Episode ${entry.episodeNumber}`;
}

// Every other year on every movie and episode, in recap order, and in sort_key order within one recap.
export async function loadTimeJumpItems(): Promise<TimelineJump[]> {
  const [catalog, rows] = await Promise.all([
    loadCatalog(),
    getDb()
      .select({
        id: entryTimeJumps.id,
        entryId: entryTimeJumps.entryId,
        year: entryTimeJumps.year,
        kind: entryTimeJumps.kind,
        note: entryTimeJumps.note,
      })
      .from(entryTimeJumps)
      .orderBy(asc(entryTimeJumps.sortKey)),
  ]);

  const byEntry = new Map<string, typeof rows>();
  for (const row of rows) {
    byEntry.set(row.entryId, [...(byEntry.get(row.entryId) ?? []), row]);
  }

  return catalog.flatMap((entry): TimelineJump[] =>
    (byEntry.get(entry.id) ?? []).map((row) => ({
      source: "jump",
      id: `jump:${row.id}`,
      entryId: entry.id,
      year: row.year,
      text: row.note ?? recapText(entry),
      chip: entry.titleKind === "show" ? entry.titleName : KIND_LABEL[entry.titleKind],
      titleKind: entry.titleKind,
      titleName: entry.titleName,
      episodeLabel: entry.titleKind === "show" ? recapText(entry) : null,
      jumpKind: row.kind,
      note: row.note ?? null,
      mainYear: entry.inUniverseYear,
      tags: entry.tags,
    })),
  );
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
