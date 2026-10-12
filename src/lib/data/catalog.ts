// Read queries for titles, episodes and recaps. Everything returned is plain data, so it can be passed from a
// Server Component to a Client Component. Recap text is left out of list queries (it can be long).
import { and, asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { entries, titles } from "@/db/schema";

export type TitleKind = "movie" | "show";

// One movie or episode, with the fields its title needs. This is the row for every list.
export type CatalogEntry = {
  id: string;
  titleId: string;
  titleName: string;
  titleKind: TitleKind;
  titleReleaseDate: string | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  name: string | null;
  releaseDate: string | null;
  inUniverseYear: number | null;
  watched: boolean;
  hasRecap: boolean;
  sortKey: string;
};

const catalogColumns = {
  id: entries.id,
  titleId: entries.titleId,
  titleName: titles.name,
  titleKind: titles.kind,
  titleReleaseDate: titles.releaseDate,
  seasonNumber: entries.seasonNumber,
  episodeNumber: entries.episodeNumber,
  name: entries.name,
  releaseDate: entries.releaseDate,
  inUniverseYear: entries.inUniverseYear,
  watched: entries.watched,
  hasRecap: sql<boolean>`${entries.recap} is not null`,
  sortKey: entries.sortKey,
};

// Every movie and episode in custom order (the order the recap list shows).
export async function loadCatalog(): Promise<CatalogEntry[]> {
  return getDb()
    .select(catalogColumns)
    .from(entries)
    .innerJoin(titles, eq(entries.titleId, titles.id))
    .orderBy(asc(entries.sortKey));
}

// One show's episodes, in season and episode order (the order a show page lists them in).
export async function loadEpisodesForTitle(titleId: string): Promise<CatalogEntry[]> {
  return getDb()
    .select(catalogColumns)
    .from(entries)
    .innerJoin(titles, eq(entries.titleId, titles.id))
    .where(eq(entries.titleId, titleId))
    .orderBy(asc(entries.seasonNumber), asc(entries.episodeNumber));
}

export type TitleRow = {
  id: string;
  name: string;
  kind: TitleKind;
  releaseDate: string | null;
  total: number;
  watched: number;
  // A movie has exactly one entry. Its id is the one the recap page uses.
  movieEntryId: string | null;
};

// Every title with its episode counts, for the titles list.
export async function loadTitleRows(): Promise<TitleRow[]> {
  return getDb()
    .select({
      id: titles.id,
      name: titles.name,
      kind: titles.kind,
      releaseDate: titles.releaseDate,
      total: sql<number>`count(${entries.id})::int`,
      watched: sql<number>`(count(${entries.id}) filter (where ${entries.watched}))::int`,
      movieEntryId: sql<string | null>`max(${entries.id}::text)`,
    })
    .from(titles)
    .leftJoin(entries, eq(entries.titleId, titles.id))
    .groupBy(titles.id)
    .orderBy(asc(titles.name));
}

export type TitleRecord = {
  id: string;
  name: string;
  kind: TitleKind;
  releaseDate: string | null;
};

export async function loadTitle(id: string): Promise<TitleRecord | null> {
  const [row] = await getDb()
    .select({ id: titles.id, name: titles.name, kind: titles.kind, releaseDate: titles.releaseDate })
    .from(titles)
    .where(eq(titles.id, id))
    .limit(1);
  return row ?? null;
}

export type EntryDetail = CatalogEntry & {
  recap: string | null;
};

// One entry with its recap text, for the recap page and its edit page.
export async function loadEntryDetail(id: string): Promise<EntryDetail | null> {
  const [row] = await getDb()
    .select({ ...catalogColumns, recap: entries.recap })
    .from(entries)
    .innerJoin(titles, eq(entries.titleId, titles.id))
    .where(eq(entries.id, id))
    .limit(1);
  if (!row) return null;
  return { ...row, recap: row.recap ?? null };
}

// Used by the movie flow: the one entry a movie title owns, or null if it doesn't exist.
export async function loadMovieEntryId(titleId: string): Promise<string | null> {
  const [row] = await getDb()
    .select({ id: entries.id })
    .from(entries)
    .where(and(eq(entries.titleId, titleId), sql`${entries.seasonNumber} is null`))
    .limit(1);
  return row?.id ?? null;
}

// Totals for the whole catalogue, used by the progress bars.
export function progressOf(rows: { watched: boolean }[]) {
  const total = rows.length;
  const watched = rows.filter((row) => row.watched).length;
  const percent = total === 0 ? 0 : (watched / total) * 100;
  return { total, watched, percent };
}
