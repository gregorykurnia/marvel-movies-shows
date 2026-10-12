// Read queries for universes and characters. Plain data only, so it can be passed to Client Components.
import { asc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { appearances, characters, characterTags, tags, titles, universes } from "@/db/schema";

import { loadCatalog, loadTitleRows as loadTitleRowsForOptions, type CatalogEntry } from "./catalog";

export type UniverseRow = { id: string; name: string; characters: number };

// The universes for the form and the directory, with how many characters use each one.

export async function loadUniverseRows(): Promise<UniverseRow[]> {
  return getDb()
    .select({
      id: universes.id,
      name: universes.name,
      characters: sql<number>`count(${characters.id})::int`,
    })
    .from(universes)
    .leftJoin(characters, eq(characters.universeId, universes.id))
    .groupBy(universes.id)
    .orderBy(asc(universes.name));
}

export type CharacterRecord = {
  id: string;
  name: string;
  importance: "major" | "minor";
  status: "alive" | "deceased" | "unknown";
  universeId: string | null;
  predominantTitleId: string | null;
  firstEntryId: string | null;
  lastEntryId: string | null;
  notes: string | null;
};

// An entry's label in pickers and tables, e.g. "Loki · S01·E01 · Glorious Purpose" or "Thor · Movie".
export function entryLabel(entry: Pick<CatalogEntry, "titleName" | "titleKind" | "seasonNumber" | "episodeNumber" | "name">) {
  if (entry.titleKind === "movie") return `${entry.titleName} · Movie`;
  const code = `S${String(entry.seasonNumber).padStart(2, "0")}·E${String(entry.episodeNumber).padStart(2, "0")}`;
  return `${entry.titleName} · ${code} · ${entry.name ?? `Episode ${entry.episodeNumber}`}`;
}

export async function loadCharacterRecord(id: string): Promise<CharacterRecord | null> {
  const [row] = await getDb().select().from(characters).where(eq(characters.id, id)).limit(1);
  return row ?? null;
}

export async function loadAppearanceIds(characterId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ entryId: appearances.entryId })
    .from(appearances)
    .where(eq(appearances.characterId, characterId));
  return rows.map((row) => row.entryId);
}

export async function loadRecapCharacterIds(entryId: string): Promise<string[]> {
  const rows = await getDb()
    .select({ characterId: appearances.characterId })
    .from(appearances)
    .where(eq(appearances.entryId, entryId));
  return rows.map((row) => row.characterId);
}

// Every character, for pickers: "Loki · Earth-199999" tells variants apart.
export async function loadCharacterOptions() {
  return getDb()
    .select({
      id: characters.id,
      name: characters.name,
      universeName: universes.name,
    })
    .from(characters)
    .leftJoin(universes, eq(characters.universeId, universes.id))
    .orderBy(asc(characters.name), asc(universes.name));
}

export type CharacterTableRow = {
  id: string;
  name: string;
  importance: "major" | "minor";
  status: "alive" | "deceased" | "unknown";
  universeId: string | null;
  universeName: string | null;
  predominantTitleId: string | null;
  predominantTitleName: string | null;
  firstEntry: EntryChip | null;
  lastEntry: EntryChip | null;
};

// An entry as shown on a character row: its label, its watched state, and its place in the custom order.
export type EntryChip = { id: string; label: string; watched: boolean; rank: number };

// The directory table's data. Joins are done here, so filtering and sorting can stay in the browser.
export async function loadCharacterTable(): Promise<{ rows: CharacterTableRow[]; entries: EntryChip[] }> {
  const [characterRows, catalog] = await Promise.all([
    getDb()
      .select({
        id: characters.id,
        name: characters.name,
        importance: characters.importance,
        status: characters.status,
        universeId: characters.universeId,
        universeName: universes.name,
        predominantTitleId: characters.predominantTitleId,
        predominantTitleName: titles.name,
        firstEntryId: characters.firstEntryId,
        lastEntryId: characters.lastEntryId,
      })
      .from(characters)
      .leftJoin(universes, eq(characters.universeId, universes.id))
      .leftJoin(titles, eq(characters.predominantTitleId, titles.id))
      .orderBy(asc(characters.name)),
    loadCatalog(),
  ]);

  const chips = new Map<string, EntryChip>();
  catalog.forEach((entry, index) => {
    chips.set(entry.id, { id: entry.id, label: entryLabel(entry), watched: entry.watched, rank: index + 1 });
  });

  const rows: CharacterTableRow[] = characterRows.map((row) => ({
    id: row.id,
    name: row.name,
    importance: row.importance,
    status: row.status,
    universeId: row.universeId,
    universeName: row.universeName ?? null,
    predominantTitleId: row.predominantTitleId,
    predominantTitleName: row.predominantTitleName ?? null,
    firstEntry: row.firstEntryId ? (chips.get(row.firstEntryId) ?? null) : null,
    lastEntry: row.lastEntryId ? (chips.get(row.lastEntryId) ?? null) : null,
  }));

  return { rows, entries: [...chips.values()] };
}

// A character's page: its fields, notes, tags, and the recaps it appears in (in custom order).
export type CharacterDetail = CharacterTableRow & {
  notes: string | null;
  appearances: (EntryChip & { href: string; isMovie: boolean; code: string | null })[];
  tags: string[];
};

export async function loadCharacterDetail(id: string): Promise<CharacterDetail | null> {
  const { rows } = await loadCharacterTable();
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) return null;

  const [record, appearanceRows, tagRows, catalog] = await Promise.all([
    loadCharacterRecord(id),
    getDb().select({ entryId: appearances.entryId }).from(appearances).where(eq(appearances.characterId, id)),
    getDb()
      .select({ name: tags.name })
      .from(characterTags)
      .innerJoin(tags, eq(characterTags.tagId, tags.id))
      .where(eq(characterTags.characterId, id))
      .orderBy(asc(tags.name)),
    loadCatalog(),
  ]);

  const appearingIds = new Set(appearanceRows.map((link) => link.entryId));
  const appearancesList = catalog
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => appearingIds.has(entry.id))
    .map(({ entry, index }) => ({
      id: entry.id,
      label: entryLabel(entry),
      watched: entry.watched,
      rank: index + 1,
      href: `/recaps/${entry.id}`,
      isMovie: entry.titleKind === "movie",
      code: entry.seasonNumber === null ? null : `S${String(entry.seasonNumber).padStart(2, "0")}·E${String(entry.episodeNumber).padStart(2, "0")}`,
    }));

  return {
    ...row,
    notes: record?.notes ?? null,
    appearances: appearancesList,
    tags: tagRows.map((tag) => tag.name),
  };
}

export async function loadNeighbouringCharacters(id: string) {
  const { rows } = await loadCharacterTable();
  const index = rows.findIndex((row) => row.id === id);
  return {
    previous: index > 0 ? rows[index - 1] : null,
    next: index >= 0 && index < rows.length - 1 ? rows[index + 1] : null,
  };
}


// The dropdown options for the character form: universes, titles and every entry (as labels).
export async function loadCharacterFormOptions() {
  const [universeRows, titleRows, catalog] = await Promise.all([loadUniverseRows(), loadTitleRowsForOptions(), loadCatalog()]);
  return {
    universes: universeRows.map((row) => ({ id: row.id, name: row.name })),
    titles: titleRows.map((row) => ({ id: row.id, name: row.name })),
    entries: catalog.map((entry) => ({ id: entry.id, label: entryLabel(entry) })),
  };
}

// The characters who appear in one recap, for the recap page's side card.
export async function loadRecapCharacters(entryId: string): Promise<{ id: string; name: string; universeName: string | null }[]> {
  return getDb()
    .select({ id: characters.id, name: characters.name, universeName: universes.name })
    .from(appearances)
    .innerJoin(characters, eq(appearances.characterId, characters.id))
    .leftJoin(universes, eq(characters.universeId, universes.id))
    .where(eq(appearances.entryId, entryId))
    .orderBy(asc(characters.name));
}

// Every character as a picker option. The universe tells variants apart (PRODUCT_PLAN §2.3).
export async function loadCharacterPickerOptions(): Promise<{ value: string; label: string }[]> {
  const rows = await loadCharacterOptions();
  return rows.map((row) => ({ value: row.id, label: `${row.name} · ${row.universeName ?? "No universe"}` }));
}
