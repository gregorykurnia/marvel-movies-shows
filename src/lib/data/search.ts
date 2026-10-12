// Global search (PRODUCT_PLAN §2.5, IMPLEMENTATION_PLAN §3.3). One query per group. Each group returns its best matches
// and the total, so the page can show "Show all N". A match comes from the generated search_vector columns (prefix
// words), trigram similarity on names, or a tag whose name contains the query.
import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { characters, characterTags, entries, entryTags, eventTags, tags, timelineEvents, titles } from "@/db/schema";
import { toPrefixQuery } from "@/lib/search-query";

export const PREVIEW_LIMIT = 10;
const SHOW_ALL_LIMIT = 500;

export type SearchGroup = "recaps" | "events" | "characters";

// ts_headline wraps each match in these control characters. The page turns them into highlights, so no HTML is
// ever built from database text.
export const HIGHLIGHT_START = "\u0002";
export const HIGHLIGHT_STOP = "\u0003";
const HEADLINE_OPTIONS = `StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_STOP}, MaxWords=24, MinWords=8, MaxFragments=1`;

export type Group<T> = { total: number; items: T[] };

export type RecapHit = {
  id: string;
  titleName: string;
  kind: "movie" | "show";
  seasonNumber: number | null;
  episodeNumber: number | null;
  episodeName: string | null;
  watched: boolean;
  snippet: string | null;
};

export type EventHit = {
  id: string;
  year: number;
  text: string;
  snippet: string | null;
};

export type CharacterHit = {
  id: string;
  name: string;
  snippet: string | null;
};

export type SearchResults = {
  recaps: Group<RecapHit>;
  events: Group<EventHit>;
  characters: Group<CharacterHit>;
};

const emptyGroup = { total: 0, items: [] };

// With showAll set, only that group is searched, and the others come back empty.
export async function searchDirectory(query: string, showAll: SearchGroup | null = null): Promise<SearchResults> {
  const tsquery = toPrefixQuery(query);
  if (!tsquery) return { recaps: emptyGroup, events: emptyGroup, characters: emptyGroup };

  const limit = showAll === null ? PREVIEW_LIMIT : SHOW_ALL_LIMIT;
  const [recaps, events, characterResults] = await Promise.all([
    showAll === null || showAll === "recaps" ? findRecaps(query, tsquery, limit) : emptyGroup,
    showAll === null || showAll === "events" ? findEvents(query, tsquery, limit) : emptyGroup,
    showAll === null || showAll === "characters" ? findCharacters(query, tsquery, limit) : emptyGroup,
  ]);
  return { recaps, events, characters: characterResults };
}

// Escapes % and _ so a typed tag fragment matches literally.
function containsPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

async function findRecaps(query: string, tsquery: string, limit: number): Promise<Group<RecapHit>> {
  const db = getDb();
  const text = sql`to_tsquery('english', ${tsquery})`;
  const pattern = containsPattern(query);
  const rows = await db
    .select({
      id: entries.id,
      titleName: titles.name,
      kind: titles.kind,
      seasonNumber: entries.seasonNumber,
      episodeNumber: entries.episodeNumber,
      episodeName: entries.name,
      watched: entries.watched,
      snippet: sql<string | null>`nullif(ts_headline('english', coalesce(${entries.recap}, '') || ' ' || coalesce(${entries.notes}, ''), ${text}, ${HEADLINE_OPTIONS}), '')`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(entries)
    .innerJoin(titles, eq(titles.id, entries.titleId))
    .where(
      sql`${entries.searchVector} @@ ${text}
        or ${titles.name} % ${query}
        or exists (
          select 1 from ${entryTags}
          inner join ${tags} on ${tags.id} = ${entryTags.tagId}
          where ${entryTags.entryId} = ${entries.id} and ${tags.name} ilike ${pattern}
        )`,
    )
    .orderBy(sql`ts_rank(${entries.searchVector}, ${text}) desc`, sql`similarity(${titles.name}, ${query}) desc`, entries.sortKey)
    .limit(limit);

  return toGroup(rows, (row) => ({
    id: row.id,
    titleName: row.titleName,
    kind: row.kind,
    seasonNumber: row.seasonNumber,
    episodeNumber: row.episodeNumber,
    episodeName: row.episodeName,
    watched: row.watched,
    snippet: cleanSnippet(row.snippet),
  }));
}

async function findEvents(query: string, tsquery: string, limit: number): Promise<Group<EventHit>> {
  const text = sql`to_tsquery('english', ${tsquery})`;
  const pattern = containsPattern(query);
  const rows = await getDb()
    .select({
      id: timelineEvents.id,
      year: timelineEvents.year,
      text: timelineEvents.text,
      snippet: sql<string | null>`nullif(ts_headline('english', coalesce(${timelineEvents.details}, '') || ' ' || coalesce(${timelineEvents.notes}, ''), ${text}, ${HEADLINE_OPTIONS}), '')`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(timelineEvents)
    .where(
      sql`${timelineEvents.searchVector} @@ ${text}
        or exists (
          select 1 from ${eventTags}
          inner join ${tags} on ${tags.id} = ${eventTags.tagId}
          where ${eventTags.eventId} = ${timelineEvents.id} and ${tags.name} ilike ${pattern}
        )`,
    )
    .orderBy(sql`ts_rank(${timelineEvents.searchVector}, ${text}) desc`, timelineEvents.year, timelineEvents.sortKey)
    .limit(limit);

  return toGroup(rows, (row) => ({
    id: row.id,
    year: row.year,
    text: row.text,
    snippet: cleanSnippet(row.snippet),
  }));
}

async function findCharacters(query: string, tsquery: string, limit: number): Promise<Group<CharacterHit>> {
  const text = sql`to_tsquery('english', ${tsquery})`;
  const pattern = containsPattern(query);
  const rows = await getDb()
    .select({
      id: characters.id,
      name: characters.name,
      snippet: sql<string | null>`nullif(ts_headline('english', coalesce(${characters.notes}, ''), ${text}, ${HEADLINE_OPTIONS}), '')`,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(characters)
    .where(
      sql`${characters.searchVector} @@ ${text}
        or ${characters.name} % ${query}
        or exists (
          select 1 from ${characterTags}
          inner join ${tags} on ${tags.id} = ${characterTags.tagId}
          where ${characterTags.characterId} = ${characters.id} and ${tags.name} ilike ${pattern}
        )`,
    )
    .orderBy(sql`ts_rank(${characters.searchVector}, ${text}) desc`, sql`similarity(${characters.name}, ${query}) desc`, characters.name)
    .limit(limit);

  return toGroup(rows, (row) => ({
    id: row.id,
    name: row.name,
    snippet: cleanSnippet(row.snippet),
  }));
}

// Every row carries the total from the window count, so the total is the same on each row.
function toGroup<T extends { total: number }, U>(rows: T[], toHit: (row: T) => U): Group<U> {
  return { total: rows[0]?.total ?? 0, items: rows.map(toHit) };
}

// Recaps are Markdown, so drop the heading and emphasis marks before showing a snippet. Highlight markers are kept.
function cleanSnippet(snippet: string | null) {
  return snippet === null ? null : snippet.replace(/[#*`]+/g, "").replace(/\s+/g, " ").trim();
}
