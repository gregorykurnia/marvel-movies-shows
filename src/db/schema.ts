// Database schema, from IMPLEMENTATION_PLAN.md §3. Source of truth for the tables.
// Migrations are generated from this file by drizzle-kit (see drizzle.config.ts).
import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Sort keys use the "C" collation, so Postgres orders them byte by byte, the same way
// JavaScript compares strings. Fractional keys therefore sort identically in both places.
const collatedText = customType<{ data: string }>({
  dataType: () => 'text COLLATE "C"',
});

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const titleKind = pgEnum("title_kind", ["movie", "show"]);
export const importance = pgEnum("character_importance", ["major", "minor"]);
export const characterStatus = pgEnum("character_status", [
  "alive",
  "deceased",
  "unknown",
]);
export const backupKind = pgEnum("backup_kind", [
  "manual",
  "automatic",
  "pre_restore",
]);

// A movie or a show.
export const titles = pgTable(
  "titles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: titleKind("kind").notNull(),
    releaseDate: date("release_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("titles_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`)],
);

// One row per movie or episode. This is the unit that gets recapped, ordered, watched and appeared in.
// Rule kept in app logic: a movie title has at most one entry.
export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => titles.id, { onDelete: "cascade" }),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    name: text("name"),
    releaseDate: date("release_date"),
    inUniverseYear: integer("in_universe_year"),
    // The universe designation (PRODUCT_PLAN §2.1). Optional. A universe used by a recap can't be deleted.
    universeId: uuid("universe_id").references(() => universes.id, { onDelete: "restrict" }),
    sortKey: collatedText("sort_key").notNull().unique(),
    watched: boolean("watched").notNull().default(false),
    recap: text("recap"),
    notes: text("notes"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql.raw(
        `to_tsvector('english', coalesce("name", '') || ' ' || coalesce("recap", '') || ' ' || coalesce("notes", ''))`,
      ),
    ),
  },
  (t) => [
    unique("entries_title_season_episode_uq").on(
      t.titleId,
      t.seasonNumber,
      t.episodeNumber,
    ),
    index("entries_search_idx").using("gin", t.searchVector),
  ],
);

// Hand-written timeline events, placed by in-universe year.
export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    year: integer("year").notNull(),
    text: text("text").notNull(),
    details: text("details"),
    titleId: uuid("title_id").references(() => titles.id, {
      onDelete: "set null",
    }),
    // Must belong to titleId. Enforced in app logic.
    entryId: uuid("entry_id").references(() => entries.id, {
      onDelete: "set null",
    }),
    sortKey: collatedText("sort_key").notNull(),
    notes: text("notes"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql.raw(
        `to_tsvector('english', coalesce("text", '') || ' ' || coalesce("details", '') || ' ' || coalesce("notes", ''))`,
      ),
    ),
  },
  (t) => [
    index("timeline_events_year_sort_idx").on(t.year, t.sortKey),
    index("timeline_events_search_idx").using("gin", t.searchVector),
  ],
);

// The universes I maintain, for example Earth-616.
export const universes = pgTable("universes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

// Each variant is its own row.
export const characters = pgTable(
  "characters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    importance: importance("importance").notNull(),
    status: characterStatus("status").notNull(),
    universeId: uuid("universe_id").references(() => universes.id, {
      onDelete: "restrict",
    }),
    predominantTitleId: uuid("predominant_title_id").references(
      () => titles.id,
      { onDelete: "set null" },
    ),
    firstEntryId: uuid("first_entry_id").references(() => entries.id, {
      onDelete: "set null",
    }),
    lastEntryId: uuid("last_entry_id").references(() => entries.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql.raw(
        `to_tsvector('english', coalesce("name", '') || ' ' || coalesce("notes", ''))`,
      ),
    ),
  },
  (t) => [
    index("characters_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
    index("characters_search_idx").using("gin", t.searchVector),
  ],
);

// Which characters appear in which entries.
export const appearances = pgTable(
  "appearances",
  {
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.entryId] })],
);

// Tags are unique by name, ignoring case.
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
  },
  (t) => [
    uniqueIndex("tags_name_lower_uq").on(sql`lower(${t.name})`),
    index("tags_name_trgm").using("gin", sql`${t.name} gin_trgm_ops`),
  ],
);

export const entryTags = pgTable(
  "entry_tags",
  {
    entryId: uuid("entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.tagId] })],
);

export const eventTags = pgTable(
  "event_tags",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => timelineEvents.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.tagId] })],
);

export const characterTags = pgTable(
  "character_tags",
  {
    characterId: uuid("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.characterId, t.tagId] })],
);

// A record of every backup, used for the "last backup" line. Restore never touches this table.
export const backupLog = pgTable("backup_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: backupKind("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  blobPath: text("blob_path"),
  sizeBytes: integer("size_bytes").notNull(),
});

export type Title = typeof titles.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type Universe = typeof universes.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Tag = typeof tags.$inferSelect;
