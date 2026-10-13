# Marvel Directory: Implementation Plan

**Status:** Draft v0.6 (2026-10-13). This version adds the universe on recap items and a universe filter on the timeline (Phase 10). v0.5 added a universe on each flashback, flash-forward and time travel, shown on the timeline (Phase 9). v0.4 added flashbacks, flash-forwards and time travel on recaps and the timeline (Phase 8). v0.3 added the universe designation on recaps (Phase 6) and recaps on the timeline (Phase 7). Build progress is in §6.
**Companion to:** [`PRODUCT_PLAN.md`](./PRODUCT_PLAN.md). That file is the source of truth for *what* the app does. This file covers *how* it gets built, and it will change as work progresses.
**Look and feel:** [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md) and its visual reference [`design-preview.html`](./design-preview.html) are **binding for every page**, including forms, settings and error pages.

---

## 1. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | One codebase for pages and server logic. Easy to host later. |
| Database | **Neon Postgres** (already connected) | Already set up. Postgres covers full-text search and ordering. |
| DB access | **Drizzle ORM** + `@neondatabase/serverless` driver | Typed queries. The schema lives in code. Migrations are plain SQL files. The driver's WebSocket `Pool` mode is used, so restore can run as one all-or-nothing transaction. |
| Hosting | **Vercel** | Built for Next.js. Free tier is enough. Gives a free `*.vercel.app` address. |
| Backups | **Manual download only** | No file store and no scheduled jobs. Each backup is downloaded from `/backup`. The only server-side copy is the pre-restore snapshot (§9). |
| Migrations | **drizzle-kit** (generate + migrate) | Migration files are checked into the repo, so schema history is visible. |
| Styling / UI | **Tailwind CSS v4 + shadcn/ui**, restyled with the design tokens | Ready-made accessible inputs, dialogs, comboboxes and tables. Every component is restyled to `DESIGN_GUIDE.md` §7, with no default shadcn look. |
| Fonts | `next/font/google`: Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono | Self-hosted at build time, so there's no layout shift. See `DESIGN_GUIDE.md` §4. |
| Icons | `lucide-react` | Matches shadcn. 2px stroke. |
| Forms / validation | **Server Actions + Zod** | No separate API layer is needed. The same validation runs on the server for every write. |
| Drag-and-drop | **dnd-kit** | Works with keyboard and touch. Handles long sortable lists. |
| Ordering keys | **fractional-indexing** | Moving an item changes one row, not the whole list (see §3.2). |
| Markdown | **react-markdown + remark-gfm + remark-breaks + rehype-sanitize** | Pasted plain text keeps its line breaks. Markdown renders. Raw HTML is stripped. |
| Character table | **TanStack Table** | Client-side search, filter and sort. Instant at this data size (hundreds of rows). |
| Search | **Postgres full-text search + `pg_trgm`** | Searches recap text, and finds names even with typos. No extra service. |
| Tests | **Vitest** (logic) + **Playwright** (key flows) | See §7. |

**Runtime:** Node.js **24 LTS**. The machine currently has Node 20, which has reached end of life, so it gets upgraded in phase 0.

**Exact package versions** are pinned to the latest stable releases at setup time and recorded in `package.json`.

---

## 2. Environments and Secrets

| Environment | Database | Used for |
|---|---|---|
| Live site (Vercel production) | Neon branch `production` | Day-to-day use and data entry |
| Local development | Neon branch `production` | Running the app on my machine. It uses the same real data, since there's only one user. |
| Automated tests | Neon branch `test` (copy of the schema, throwaway data) | Playwright and DB tests, so tests never touch my real data |

- Connection strings live in `.env.local` (real data) and `.env.test` (test branch). Both are gitignored. **Done:** `.env.local` and `.gitignore` exist, and both connections were verified.
- The same variables are added to the Vercel project as encrypted environment variables. They're never committed.
- The app uses `DATABASE_URL_POOLED`. Migrations use `DATABASE_URL` (direct connection).
- Migrations are always run on `test` first, then on `production`.
- **Hosting:** Vercel production deployment on the free `*.vercel.app` address, **with no access protection**. This is a deliberate product decision (product plan §5). Mitigations:
  - `noindex` metadata on every page, plus a `robots.txt` that disallows everything, so the site stays out of search engines.
  - Pre-restore snapshots (§5.6).
  - Vercel's own preview deployments keep their default Vercel Authentication. Only production is open.
- **Adding protection later** is a configuration change (Vercel Deployment Protection, or a single password check in middleware), not a rebuild.

---

## 3. Database Schema

The product plan's data model maps to these tables. One change from the draft: **a recap is stored as a column on the movie or episode entry**, not as its own table, because every entry has exactly one recap. The same applies to notes.

### 3.1 Tables

**`titles`**: a movie, a show or a short.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text, not null | e.g. "Loki" |
| kind | enum `movie` \| `show` \| `short` | Drives colour and icon on the timeline. A movie and a short each have one entry. Added the short kind on 2026-10-12 (migration `0002`). |
| release_date | date, nullable | For a show, the premiere date. |
| notes | text, nullable | |
| created_at / updated_at | timestamptz | |

**`entries`**: one row per **movie** or **episode**. This is the unit that gets recapped, ordered, marked watched, and appeared in.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title_id | uuid FK → titles, cascade delete | A movie has exactly one entry. A show has one entry per episode. |
| season_number | int, nullable | Null for movies. |
| episode_number | int, nullable | Null for movies. |
| name | text, nullable | Episode name. For a movie, the title name is used. |
| release_date | date, nullable | |
| in_universe_year | int, nullable | Can be negative (BCE). Seeds the recap order. |
| universe_id | uuid FK → universes, nullable, restrict delete | The universe designation, e.g. Earth-616. Empty is allowed. Added in Phase 6. |
| sort_key | text **COLLATE "C"**, unique, not null | Custom recap order (§3.2). |
| watched | boolean, default false | |
| recap | text, nullable | Raw pasted text. Rendered as Markdown. |
| notes | text, nullable | |
| search_vector | tsvector, generated | Built from name, recap and notes. GIN index. |

Constraints:
- `(title_id, season_number, episode_number)` is unique.
- A movie title can't have more than one entry. This is enforced in app logic.

**`timeline_events`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| year | int, not null | Can be negative. |
| text | text, not null | The short label, e.g. "Captain America wakes up from the ice". |
| details | text, nullable | Longer text, shown when the event is expanded. |
| title_id | uuid FK → titles, nullable, set null on delete | Which movie or show the event belongs to. Drives its colour. |
| entry_id | uuid FK → entries, nullable, set null on delete | Optional link to a specific recap. Must belong to `title_id`. |
| sort_key | text COLLATE "C", not null | Tie-break order within the same year. |
| notes | text, nullable | |
| search_vector | tsvector, generated | Built from text, details and notes. |

Index on `(year, sort_key)`.

Recap items (Phase 7) are not stored here. They are read from `entries` when the timeline loads (§5.2).

**`entry_time_jumps`** (Phase 8): the other years a movie, episode or short visits.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| entry_id | uuid FK → entries, not null, cascade delete | |
| year | int, not null | Can be negative. |
| kind | enum `flashback` \| `flash_forward` \| `time_travel` | Set by hand, never worked out from the main year. Time travel can go either way. |
| note | text, nullable | Short, e.g. "Young Peter at his mother's bedside". |
| sort_key | text COLLATE "C", not null | Order on the recap edit page and the recap page. |
| universe_id | uuid FK → universes, nullable, restrict delete | The universe this year takes place in, e.g. a time travel to another timeline. Empty means the recap's own universe. Added in Phase 9. |

Index on `entry_id`. An entry with time jumps must have an `in_universe_year`. This is enforced in app logic (Zod and the save action), not by the database.

**`universes`**: the list I maintain.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text, unique, not null | e.g. "Earth-616" |
| description | text, nullable | |

**`characters`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text, not null | Each variant is its own row. |
| importance | enum `major` \| `minor` | |
| status | enum `alive` \| `deceased` \| `unknown` | Fixed list of three. |
| universe_id | uuid FK → universes, nullable, restrict delete | A universe that's in use can't be deleted. |
| predominant_title_id | uuid FK → titles, nullable, set null | |
| first_entry_id | uuid FK → entries, nullable, set null | Entered by hand. |
| last_entry_id | uuid FK → entries, nullable, set null | Entered by hand. |
| notes | text, nullable | |
| search_vector | tsvector, generated | Built from name and notes. |

Trigram index on `name` for fuzzy search.

**`appearances`**: `character_id` + `entry_id`, composite primary key, cascade on both sides.

**`tags`**: `id`, `name` (unique, case-insensitive).
**`entry_tags`**, **`event_tags`**, **`character_tags`**: join tables with a composite primary key, cascading on both sides. These are three small tables instead of one generic table, so the database enforces real foreign keys.

**`backup_log`**: a record of every backup, used for "last backup" on the Backup page. Restore never touches this table.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| kind | enum `manual` \| `automatic` (unused) \| `pre_restore` | |
| created_at | timestamptz | |
| blob_path | text, nullable | Unused since Blob was dropped (2026-10-12). Leave it, or remove it in a Phase 5 migration. |
| size_bytes | int | |

### 3.2 Custom Ordering

- `sort_key` is a **fractional index**: a string that sorts between its neighbours (e.g. `a0`, `a0V`, `a1`). Moving an item gives it a new key between its new neighbours. **Only that one row is written.**
- Keys use the `"C"` collation, so the database sorts them in the same order as the JavaScript library.
- **Placing a new entry, seeded by year:** the entry goes right after the last entry in the current custom order whose `in_universe_year` is less than or equal to its own. If it has no year, it goes at the end. My manual order is never rewritten.
- **Bulk-adding episodes** (e.g. "add episodes 1 to 9 of season 1"): the episodes are inserted as a block, in episode-number order, at the position given by their year. I can then drag individual episodes elsewhere.
- **Timeline events** use the same mechanism, but order only among events of the **same year**. Dragging only reorders within a year, and the year itself is changed through the edit form.
- **Recap items** on the timeline have no sort key of their own. In each year they come after the hand-written events, in the order of the recap list (§5.2).

### 3.3 Search

- One query searches the `search_vector` columns of entries, events and characters, plus trigram matches on title and character names and on tag names.
- Results are grouped by type and ranked. The top 10 per type are shown, with a "show all" link.

---

## 4. Pages and Routes

| Route | Purpose |
|---|---|
| `/` | Home: overall watched progress and quick links to each section. |
| `/recaps` | The custom-ordered list of all entries. Filters: watched or unwatched, type, tag. A **Reorder mode** toggle enables drag-and-drop, so normal scrolling doesn't move things by accident. |
| `/recaps/[entryId]` | One recap: header details (including the universe), rendered recap, first-appearance characters (Phase 11), notes and tags, watched toggle, and previous and next buttons in custom order. |
| `/recaps/[entryId]/edit` | Edit the recap text (large paste area with a preview), year, other years (Phase 8), universe, notes, tags and first-appearance characters (Phase 11). |
| `/titles` | Manage movies and shows. Each title shows its universes (Phase 11). |
| `/titles/new` | Add a movie or a show. |
| `/titles/[id]` | For a show: its seasons and episodes, progress bars, and **bulk-add episodes**. For a movie: a redirect to its recap. |
| `/timeline` | The grand timeline (§5.2). |
| `/timeline/new`, `/timeline/[id]/edit` | Event form: year, text, details, title, optional episode link, notes, tags. |
| `/characters` | The directory table (§5.3). |
| `/characters/new`, `/characters/[id]/edit` | Character form. All dropdowns are searchable comboboxes. |
| `/characters/[id]` | Character page: fields, notes, tags, and first and last appearance (linked to recaps, Phase 11). |
| `/universes` | Manage universes: add, rename, delete if not in use. |
| `/tags` | Manage tags: rename, merge, delete. |
| `/search?q=` | Global search results. |
| `/backup` | Download a backup and see the last backup time. Restore from a file comes later. |
| `/api/backup/export` | GET. Streams the full backup JSON as a file download and logs a `manual` backup. |

The global search box sits in the header on every page. Pressing `/` or `⌘K` focuses it.

---

## 5. Key Components

### 5.1 Recap List and Ordering
- A sortable list built with dnd-kit, keyboard accessible. On drop, a single Server Action writes the new `sort_key`.
- The screen updates before the database confirms, and rolls back if the save fails.
- Each row shows the title, S/E number, in-universe year, universe chip (when set), and a watched badge. Unwatched rows are visually muted, and watched rows get a check.
- Each show shows a season progress bar (e.g. "4 / 9").

### 5.2 Timeline
- **Compressed axis:** each distinct year that has at least one event or recap item gets one slot. Gaps between slots are shown as a break marker with the size of the gap (e.g. "⋯ 66 years ⋯"), so empty years take no space.
- **Layout:** horizontal and scrollable or draggable on desktop. It becomes a vertical list on narrow screens.
- **Zoom:** three levels, *year*, *decade* and *century*. Zooming out groups slots into buckets that show event counts, and clicking a bucket zooms into it.
- **Jump to year:** an input that scrolls to the nearest slot.
- **Event card:** a popover that opens on hover (desktop) or tap (mobile). It shows the year, text, details, and title, plus a "Read recap →" link if `entry_id` is set.
- Colour and icon come from the title kind. Filters: movies, shows, tag.
- **Recap items (Phase 7):** every movie and episode with an in-universe year is added when the timeline loads, read from `entries`. Nothing is written to `timeline_events`, so nothing can go out of sync. Each item carries its entry id, title, kind, tags and label.
- **Recap item card:** the text is the episode name (or "Episode N") for an episode, or the movie title for a movie. The chip is the show name, or "Movie". A small "From recap" label marks it. The popover links are "Read recap →" and "Edit recap" (to `/recaps/[entryId]/edit`). There is no "Edit event" link. Dashed borders stay reserved for events without a title.
- **Order in a year:** hand-written events first, in their tie-break order, as now. Then recap items, in the order of the recap list.
- **Reorder:** only hand-written events can be sorted. `onDragEnd`, `moveByMenu` and `neighbourForMove` take their groups from hand-written events only, so a move never names a recap item. The `moveEvent` action reads `timeline_events` only.
- **Filters and count:** the type filter uses the title kind, and the tag filter uses the recap's tags. The header count includes both kinds.
- **Merge:** a pure function in `src/lib/timeline-merge.ts` (new) puts the two lists in that order. `timeline-layout.ts` stays as it is.
- **Search:** recap items are not separate search results, because recaps are already searchable.
- **Time jump items (Phase 8):** one read-only item per `entry_time_jumps` row, read when the timeline loads, with ids `jump:<id>`. Each carries the recap item fields plus `kind`, `note` and the entry's main year.
  - **Card:** the kind label ("Flashback", "Flash-forward" or "Time travel") replaces "From recap", followed by the title, e.g. "Flashback · Guardians of the Galaxy". The text is the note, or the episode name or movie title when there's no note. A visual cue built from tokens marks these cards. Dashed borders stay reserved for events without a title.
  - **Popover:** kind, note, title (and episode), "Main story: <year>", then "Read recap →" and "Edit recap".
  - **Order in a year:** hand-written events, then main recap items, then time jump items, each in recap order. Jumps of the same entry keep their `sort_key` order.
  - **Toggle:** a "Show flashbacks" switch beside the type and tag filters, on by default, covers all three kinds. It's kept in the URL (`?jumps=off`) like the other filters. Turning it off counts as a filter, so reorder is off while it's off.
  - Type and tag filters use the entry's title kind and tags. The header count includes these items. They are not sortable and not separate search results.
  - **Universe (Phase 9):** each time jump item carries a universe name: its own `universe_id`, or the recap's universe when that's empty. The card shows it as a universe chip on its own line under the kind label and title, and the popover adds a "Universe" line. Both are built in `event-pin.tsx`. No chip when neither is set.
- **Universe on recap items (Phase 10):** `TimelineRecap` gets `universeName` (the entry's universe, already in `loadCatalog`). The card shows the same universe chip as a time jump card, on its own line under "From recap", and the popover adds the same "Universe" line. Both come from one helper in `event-pin.tsx`, shared by recap and jump items. No chip when null.
- **Universe filter (Phase 10):** a `FilterMenu` labelled "Universe", beside the tag filter, built like `TagFilter`. Its options are the universes used by the items on the timeline (not the whole universes list), sorted by name, plus a "No universe set" choice at the end, shown only when some item on the timeline has no universe. Single choice; ✕ clears it.
  - **Matching:** each item's universe is the one it shows. A recap item uses its recap's universe, a time jump its own or the recap's (Phase 9). A hand-written event uses the universe of its linked entry (`timeline_events.entry_id` → `entries.universe_id`), so `TimelineEvent` gets `universeName` from `loadTimelineEvents` with a left join. An event without a linked entry has none. No table change and no migration.
  - **Match by name, case-insensitive,** like the tag filter, because universe names are unique.
  - **URL:** `?universe=<name>`, or `?universe=none` for "No universe set". It's read on load like `type`, `tag` and `jumps`, and an unknown name falls back to no filter.
  - **Counts and reorder:** the header count follows the filter. A universe filter counts as a filter, so reorder is off while it's set, with the same "Clear the filters to reorder events." hint.
  - The event popover does not get a "Universe" line: the event's universe is its recap's, which the linked recap item already shows.

### 5.3 Character Directory
- A TanStack Table loaded with all characters plus joined names (universe, titles, entries).
- Search by name. Column filters for importance, status, universe, predominant title, first and last appearance. Click a header to sort, with direction toggling.
- Filters and sort are stored in the **URL query string**, so a filtered view survives a refresh and can be bookmarked.
- A "Clear all filters" button.
- **Bulk edit (Phase 12):** a checkbox on each row and a select-all checkbox in the header for the rows the filters show. Selecting rows opens a bulk action bar that applies one change to every selected character in one transaction.

### 5.4 Forms (data entry)
Everything is typed by hand, so data entry speed is a priority:
- **Other years** (Phase 8) on the recap edit page, under In-universe year: a repeatable row of year, kind (select: Flashback, Flash-forward, Time travel), universe (Phase 9, the same universe combobox, placeholder "Same as recap") and note, with "+ Add another year" and a remove button per row. Saving replaces the entry's rows in one transaction.
- Searchable comboboxes for titles, entries and universes. The universe combobox has an inline **"+ Add universe"** option, and a typed name that isn't picked is created on save (Phase 11).
- First appearance and Last appearance have an inline **"+ Add new…"** that creates a movie, a short, or a show episode (creating the show if needed). The recap's First Appearance Characters picker has an inline **"+ Add character"** (Phase 11).
- **"Save and add another"** on every create form.
- Bulk episode add. The universe combobox sits beside In-universe year on the movie form, the episode form and the recap edit page. A bulk add gives every episode in the block the one universe that I pick.
- A tag input with autocomplete that creates new tags on the fly.
- Validation errors appear next to the field. Nothing I typed is lost on error.

### 5.5 Markdown Recap Display
- `remark-breaks` keeps single line breaks from pasted text, `remark-gfm` adds lists and tables, and `rehype-sanitize` blocks scripts and HTML.
- The edit page shows a live preview next to the text area.

### 5.6 Backup and Restore (restore comes later)
- **File format:**
  ```json
  { "format": "marvel-directory-backup", "version": 1, "exportedAt": "…", "tables": { "titles": [...], "entries": [...], ... } }
  ```
  It contains every data table (not `backup_log`). The `version` matches the schema, so future migrations can upgrade older backup files before restoring them.
- **Export:** a single read of all tables, serialised to JSON. At this data size it is small (likely well under 10 MB, even with long recaps).
- **Restore** (later, not in Phase 5) is a Server Action and runs these steps in order:
  1. Validate the uploaded file with Zod (format, version, shape, references between rows).
  2. Save a `pre_restore` snapshot of the current data (where it's kept is open, see §9).
  3. In **one transaction**, delete all data tables and insert the backup's rows in dependency order. If anything fails, nothing changes.
  4. Show a summary, e.g. "Restored 412 entries, 87 characters…".
- **Confirmation:** I have to type `RESTORE` before the restore button is enabled.
- **No automatic backups.** Each backup is made by hand from `/backup`. The only automatic copy is the `pre_restore` snapshot.

---

## 6. Phase Task Checklists

Phases match the product plan's build plan. Each phase ends with:
- Its checks passing (§7).
- **The design review checklist (`DESIGN_GUIDE.md` §13) passing for every page touched.**
- A short demo for me.

### Phase 0: Foundation
- [x] Store Neon connection strings in `.env.local` and add `.gitignore`
- [x] Verify the direct and pooled connections
- [x] Upgrade Node.js to 24 LTS
- [x] Initialise a local git repo (no commit yet)
- [x] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui (shadcn-style components built on Radix, not via the shadcn CLI)
- [x] Set up Drizzle: client, `drizzle.config.ts`, the full schema from §3, the first migration (generated, not yet applied to any database)
- [x] Enable `pg_trgm`, add the generated `search_vector` columns and GIN indexes in the migration (verified by applying it to an in-process PostgreSQL)
- [x] Create Neon branch `test` and `.env.test` (branch created from the empty production branch on 2026-10-12; `.env.test` is gitignored)
- [x] Run migrations on `test` (done, all 11 tables plus pg_trgm verified), then on `production` (done, confirmed 2026-10-12)
- [ ] Design system foundation, per `DESIGN_GUIDE.md`:
  - [x] `src/styles/tokens.css` (exact §3 values), fonts loaded with `next/font`, Tailwind `@theme` mapping, shadcn variable mapping (§11)
  - [x] Base UI components restyled to §7: Button (all variants), Chip, Input/Select/Textarea, Combobox, Segmented control, Radio pills, Filter chip, Progress, Toast, Table, Dialog, Skeleton
  - [x] Layout components: `AppShell` (stripe, header, mobile nav, search box, theme toggle), `PageHeader`, `EmptyState`, `DangerZone`
  - [x] A dev-only `/styleguide` route that renders every component, used to compare against `design-preview.html`
  - [x] Message template for 404 and the error boundary
- [x] Set up Vitest and Playwright. Add a smoke test that loads the home page and reads from the database (unit tests and smoke tests pass against the test branch)
- [x] Add `noindex` metadata and a `robots.txt` that disallows everything
- [x] Upgrade the Vercel CLI (now 63.1.2, confirmed 2026-10-12). Deploys come from the GitHub integration. This checkout has no `.vercel/` link, so the CLI isn't linked here.
- [x] Add the database environment variables to Vercel (done for Production, encrypted) and deploy to production (live, confirmed 2026-10-12)
- **Done when:** the app is live on its `*.vercel.app` address, every table exists, and the smoke test passes both locally and against the live site.

### Phase 1: Titles and Recaps
- [x] Title create, edit and delete (movie or show)
- [x] Episode create and edit, plus bulk-add episodes
- [x] Ordering helpers: a fractional key between neighbours, and year-seeded placement (with unit tests)
- [x] `/recaps` list with Reorder mode and drag-and-drop
- [x] Recap view page with Markdown display, previous and next
- [x] Recap edit page with paste area and live preview
- [x] Watched toggle, muted unwatched style, season, show and overall progress bars
- [x] Watched and type filters
- **Done when:** I can add a show with episodes, paste recaps, drag an episode between two movies, mark things watched, and the order and progress survive a reload.

### Phase 2: Characters
- [x] `/universes` management
- [x] Character create and edit form with all comboboxes, inline add universe, and the status choice (built as radio pills, per DESIGN_GUIDE §7)
- [x] Appearances editor, on both the character form and the recap edit page
- [x] `/characters` table with search, filters, sort, URL-synced state, clear all
- [x] Character page with appearances list linked to recaps
- **Done when:** I can enter several Loki variants in different universes, then filter by universe and status and sort by any column.

### Phase 3: Timeline
- [x] Event create and edit form (also a delete on the edit page, approved 2026-10-12)
- [x] Compressed axis layout logic (with unit tests: gaps, negative years, a single event, many events in one year)
- [x] Timeline view: horizontal on desktop, vertical on mobile
- [x] Hover and tap event card with the recap link
- [x] Tie-break reordering within a year
- [x] Zoom levels, jump to year, type filter
- **Done when:** events with real years (including a BCE year) appear in the right order, gaps are compressed, and the recap links work.

### Phase 4: Notes, Tags and Search
- [x] Notes fields on all edit forms (titles, episodes, events, characters)
- [x] Tag input on entries, events and characters, plus `/tags` management (rename, merge, delete)
- [x] Tag filter on the Recaps, Timeline and Characters views
- [x] Episode and character delete, with the typed DELETE confirmation (approved 2026-10-12, with the timeline event delete)
- [x] `/search` with grouped results, the header search box, `⌘K` and `/` shortcuts (Postgres full-text on the search columns, trigram for names, tag names; the design review ran on 390px and 1280px, light and dark)
- **Done when:** one search finds a match in a recap's text, an event, a character and a note, and tag filters work on every list.

### Phase 5: Backup and Polish (download only; restore comes later)
- [x] Backup export: the JSON format and `GET /api/backup/export`, which logs a `manual` backup
- [x] `/backup` page with the Download button and the last backup time
- [ ] Responsive pass on phone width. Empty states ("No recaps yet, add a title"). Error pages
- **Done when:** a downloaded backup contains every data table with the same row counts as the database (checked by the end-to-end test), and the app is comfortable on my phone.
- **Later, not in Phase 5:** restore from a file (Zod validation, pre-restore snapshot, one-transaction replace, typed RESTORE, summary) and its round-trip test.

**Note:** backups arrive in phase 5. Until then, Neon's built-in point-in-time restore is the safety net. Blob and automatic backups were dropped on 2026-10-12.

---

### Phase 6: Universe designation on recaps (done 2026-10-12)
- [x] Migration: add `entries.universe_id` (nullable, references `universes`, restrict delete). Run it on `test` first (`npm run db:migrate:test`). The production migration (`npm run db:migrate`) runs only when I approve it, and before this code reaches `main`, because the live site reads the new column. Done on the test branch and on production (2026-10-12, after the owner approved it).
- [x] Zod: an optional universe id on `titleFormSchema`, `episodeFormSchema`, `episodeRangeSchema`, `episodeEditSchema` and `movieEditSchema`.
- [x] Actions save it: `createEpisode`, `addEpisodes`, `saveEpisode`, `saveMovie`, and the movie branch of title creation in `src/actions/titles.ts`.
- [x] Universe combobox with an inline "+ Add universe", beside In-universe year, on the movie form (`title-forms.tsx`), the episode form for single and bulk add (`episode-form.tsx`), and the recap edit page (`recap-edit-form.tsx`). Reuse the pattern in `character-form.tsx`.
- [x] Recap page: universe chip in the header next to the year, a "Universe" row in Details, and "No universe set" in muted text when empty.
- [x] Recap list row: universe chip in the meta row when set.
- [x] Delete rule: `deleteUniverse` and `loadUniverseRows` count recaps as well as characters. Update the in-use wording on `/universes` and in the universe manager.
- [x] Tests: a schema unit test; a database test (a universe used by a recap can't be deleted); an end-to-end test (set a universe on a recap, see the chip, delete is blocked).
- [x] Design review (`DESIGN_GUIDE.md` §13) for the recap page, recap edit page, recap list, movie and episode forms, and `/universes`, at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-6/` (git-ignored, 32 captures, none scroll sideways at 390px). Seven were checked by eye, then the owner signed off on 2026-10-12.
- **Done when:** I can set a universe on a movie or episode, see it on the recap page and in the list, and a universe used by a recap can't be deleted.

### Phase 7: Recaps on the timeline
- [x] Read model: `loadRecapItems` in `src/lib/data/timeline.ts` returns every movie and episode with an in-universe year, as read-only items with ids `entry:<entryId>`, next to `loadTimelineEvents`. No table change. `loadEventDetail` and `moveEvent` still read `timeline_events` only.
- [x] Merge: a pure function in `src/lib/timeline-merge.ts` (new). Hand-written events first, in their order, then recap items in recap order. Unit tests in `tests/unit/timeline-merge.test.ts` for BCE years, same-year ties, and a year with only recap items.
- [x] Recap item cards: the "From recap" label, the text and chip from §5.2, and popover links "Read recap →" and "Edit recap". No "Edit event" on these items, and no drag handle or ⋯ menu.
- [x] Reorder: `onDragEnd` and `moveByMenu` use hand-written events only. Recap items aren't sortable.
- [x] Type and tag filters apply to recap items.
- [x] The header count includes both kinds.
- [x] Update the Phase 3 end-to-end test (`tests/e2e/phase-3.spec.ts`). Its 2011 count is now 3 and the 2010–2019 bucket reads "3 events", because the 2011 Thor movie is a recap item too.
- [x] New end-to-end test (`tests/e2e/phase-7.spec.ts`): a year set on a recap appears in the right place, changing it moves the item, clearing it removes it, and reorder still works in a year that has a recap item.
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the timeline at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-7/` (git-ignored, 4 captures, none scroll sideways at 390px). Checked by eye against the guide, not yet side by side with `design-preview.html`. Waiting for the owner's sign-off.
- **Done when:** a recap's in-universe year shows on the timeline in the right place, moves when I change the year, and its link opens the recap.

### Phase 8: Flashbacks, flash-forwards and time travel on the timeline
- [ ] Migration: `entry_time_jumps` table and its `kind` enum (§3.1). Run it on `test` first (`npm run db:migrate:test`). The production migration (`npm run db:migrate`) runs only when I approve it, and before this code reaches `main`. **Test branch done (2026-10-13). Production waits for the owner's approval, and this code is not pushed until it has run.**
- [x] Zod: a `timeJumps` array (year, kind, optional note) on `episodeEditSchema` and `movieEditSchema`. It's rejected when the main in-universe year is empty.
- [x] Actions: `saveEpisode` and `saveMovie` replace the entry's time jumps in the same transaction as the rest of the recap.
- [x] Recap edit page: the "Other years" rows from §5.4 in `recap-edit-form.tsx`.
- [x] Recap page: an "Other years" row in Details, listing each as "1988 · Flashback · <note>", in `sort_key` order. Hidden when there are none.
- [x] Read model: `loadTimeJumpItems` in `src/lib/data/timeline.ts`, next to `loadRecapItems`, with ids `jump:<id>`.
- [x] Merge: `mergeTimeline` takes the time jump items as a third list, after recap items in each year. Unit tests in `tests/unit/timeline-merge.test.ts`: a year with all three kinds, BCE jumps, and two jumps from one entry in the same year.
- [x] Timeline cards and popover from §5.2, in `event-pin.tsx` and `timeline-view.tsx`. No drag handle, ⋯ menu or "Edit event".
- [x] "Show flashbacks" toggle, kept in the URL. Type and tag filters apply to these items, and the header count includes them.
- [x] Backup: `entry_time_jumps` in the export, and bump `BACKUP_VERSION` (§5.6).
- [x] Tests: a schema unit test; a database test (deleting an entry deletes its time jumps); an end-to-end test (`tests/e2e/phase-8.spec.ts`): add a flashback on a recap, see it in its year with its kind and title, the toggle hides it, and removing it on the recap removes it from the timeline.
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the recap edit page, recap page and timeline, at 390px and 1280px, light and dark. Screenshots go in `screenshots/phase-8/`.
- **Done when:** a flashback I add on a recap shows in its year on the timeline, clearly marked with its kind and title, the popover links to the recap, and the toggle hides it.

### Phase 9: A universe on each flashback, flash-forward and time travel
- [ ] Migration: add `entry_time_jumps.universe_id` (nullable, references `universes`, restrict delete). File `0004_soft_tony_stark.sql`. Run it on `test` first (`npm run db:migrate:test`). **Test branch done (2026-10-13). The production migration (`npm run db:migrate`) waits for the owner's approval, and this code is not pushed until it has run.**
- [x] Zod: an optional universe id on each `timeJumps` row in `episodeEditSchema` and `movieEditSchema` (`src/lib/schemas.ts`, `src/lib/time-jump.ts`).
- [x] Actions: `saveEpisode` and `saveMovie` save the universe with each row, in the same transaction as now. A deleted universe is named on the form (`isMissingTimeJumpUniverseViolation` in `src/lib/db-errors.ts`).
- [x] Recap edit page: a universe combobox in each "Other years" row (`recap-edit-form.tsx`), labelled "Universe for this year", with "Same as recap" as its clear option. It reuses `UniverseField`, which now takes a field name and labels.
- [x] Recap page: the "Other years" row shows the universe when it's set and differs from the recap's.
- [x] Read model: `loadTimeJumpItems` joins `universes` for the jump's universe and falls back to the entry's universe. The item gets a `universeName` field.
- [x] Timeline: a universe chip on time jump cards and a "Universe" line in the popover, both built in `event-pin.tsx`. No chip when null. Tokens only.
- [x] Delete rule: `deleteUniverse` and `loadUniverseRows` count time jumps as well as recaps and characters. The in-use wording on `/universes` and in the manager is updated.
- [x] Backup: `universe_id` is in the `entry_time_jumps` export (the export selects every column), and `BACKUP_VERSION` is 3 (§5.6).
- [x] Tests: schema unit tests (`tests/unit/schemas.test.ts`); database tests (`tests/db/constraints.test.ts`: a universe used by another year can't be deleted, and a missing one is named); `tests/e2e/phase-9.spec.ts` (set a universe on a flashback, see it on the card and popover, clear it and the recap's universe shows instead, and a universe in use shows "In use"). Phase 6's in-use test and the backup spec were updated for the new wording and version.
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the recap edit page, recap page and timeline, at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-9/` (git-ignored, 16 captures from `tests/e2e/screenshots-phase-9.spec.ts`). Checked by eye so far: the recap edit page at 1280px and the timeline at 390px and 1280px. Waiting for the owner's sign-off.
- **Done when:** I can pick a universe on a flashback, flash-forward or time travel, and the timeline shows that universe on its card and popover (or the recap's universe when I leave it empty).

### Phase 10: Universe on recap items, and a universe filter on the timeline
- [x] Read model: `universeName` on `TimelineRecap` in `loadRecapItems`, and on `TimelineEvent` in `loadTimelineEvents` (left join through the linked entry to `universes`). No migration.
- [x] Recap item card and popover: the universe chip and "Universe" line from §5.2, through one helper in `event-pin.tsx` shared with time jump items. Tokens only.
- [x] Universe filter: a `UniverseFilter` on `FilterMenu`, beside the tag filter in `timeline-view.tsx`, with options from the items on the timeline and a "No universe set" choice.
- [x] Filtering: a pure `itemUniverse` helper and a filter function (e.g. in `src/lib/timeline-filter.ts`, new) that the `shown` memo calls, so the matching rules can be unit tested.
- [x] URL: `?universe=<name>` and `?universe=none`, read by the timeline page and written by the `replaceState` effect.
- [x] A universe filter turns reorder off, like the other filters. **Header count not done as written:** it still counts every item, as it does for the type and tag filters, until the owner decides whether all filters should change it.
- [x] Tests: unit tests for the filter (recap item, jump with its own universe, jump falling back to the recap's, linked event, unlinked event, "No universe set", case-insensitive match); `tests/e2e/phase-10.spec.ts` (a recap item shows its universe chip and popover line; picking a universe hides items from other universes and keeps the URL; "No universe set" shows an unlinked event; clearing the filter brings everything back).
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the timeline at 390px and 1280px, light and dark, with the filter row wrapping cleanly at 390px. Screenshots are in `screenshots/phase-10/` (git-ignored, 12 captures from `tests/e2e/screenshots-phase-10.spec.ts`). Waiting for the owner's sign-off.
- **Done when:** every recap item on the timeline shows its universe, and picking a universe in the filter leaves only the items in that universe.

### Phase 11: First appearances, inline titles and characters, and universes on the titles list
- [x] Read model: no migration. `characters.first_entry_id` and `last_entry_id` hold the first and last appearance. The `appearances` table and its rows are kept (and stay in the backup). Nothing reads or writes them any more, and the appearances data is no longer shown or edited.
- [x] Recap edit page: "Characters in this recap" is now **"First Appearance Characters"**. Picking a character sets its `first_entry_id` to this entry, and removing one clears it. Picking a character whose first appearance is elsewhere moves it here. `replaceFirstAppearances` in `src/lib/data/first-appearances.ts` replaces `replaceRecapCharacters`. The hint says so.
- [x] Inline character create: typing a name that doesn't exist offers "＋ Add character “…”". It creates a character with status Unknown, in the universe set on the recap form, with the importance chosen beside the picker (Major or Minor, Minor by default), then selects it (`createCharacterInline`). The characters table shows that importance. The rest is filled in later on the character form.
- [x] Recap page: the characters card lists the characters whose first appearance is this entry, under "First appearances".
- [x] Character form: the "Appears in" picker is removed. First appearance and Last appearance stay as comboboxes.
- [x] Inline title create from First appearance and Last appearance: "＋ Add new…" opens `FirstAppearanceDialog` with a Movie, Show or Short choice (`RadioPills`).
  - Movie or short: a title. Creates the title and its one entry, then selects it.
  - Show: pick an existing show or type a new one, then season, episode number and an optional episode name. A new show is created, and an existing show is matched by name ignoring case. A season and episode that already exist are selected, not duplicated.
  - The new entry goes to the end of the recap order, with no year and no universe.
  - One shared server action, `createFirstAppearanceEntry` in `src/actions/entries.ts`, with the logic in `addFirstAppearanceEntry`.
- [x] Universe comboboxes (character, movie, episode, bulk episode and recap forms): a name that's typed but not picked is kept in the form (`Combobox` `text` and `onTextChange`, opt-in) and sent as `universeName`. The save finds it by name, ignoring case, or adds it in the same transaction (`resolveUniverseId`). **Not covered:** the universe on other-year rows, which still needs a picked universe.
- [x] Character page: the appearances list is replaced by a **First and last appearance** section, each linked to its recap with the watched chip (§2.4). The Details card no longer repeats First and Last.
- [x] Titles list (`/titles`): one universe chip per distinct universe set on a title's movie, short or episodes. Other-year universes don't count. Nothing set shows no chip. `loadTitleRows` gets `universes: string[]`.
- [x] Tests: schema unit tests (`tests/unit/schemas.test.ts`: universe name, `firstAppearanceSchema`, `inlineCharacterSchema`); database tests (`tests/db/first-appearances.test.ts`: a first appearance moves and clears; an existing show and episode are reused; a show typed in a different case is reused; a universe is matched by name, ignoring case); `tests/e2e/phase-11.spec.ts` (inline character on a recap, seen on the character page; a show episode added from the dialog, then saved; a typed universe added on save, and a show with two universe chips). `tests/e2e/phase-2.spec.ts` is updated for the new flow. `tests/e2e/screenshots-phase-11.spec.ts` is added.
- [x] Regression: `smoke`, `phase-1`, `phase-4`, `phase-5-backup`, `phase-6`, `phase-8`, `phase-9` and `shorts` pass (18 of 18).
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the recap edit page, recap page, character form, character page and titles list, at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-11/` (git-ignored, 24 captures from `tests/e2e/screenshots-phase-11.spec.ts`). Checked by eye: all six pages at 390px and 1280px, light and dark, with no sideways scroll. One fix came out of it: on phones the First and Last rows on the character page put the title on its own line, under the kind and watched chips. Waiting for the owner's sign-off.
- **Done when:** I can add a character's first appearance from a recap or from the character form, including a movie, short or episode I haven't entered yet, and the titles list shows each title's universes.

### Phase 12: Bulk edit in the character directory
- [x] Read model: no migration. Every bulk action writes the existing `characters` columns and `character_tags`. `loadBulkEditOptions` in `src/lib/data/characters.ts` feeds the bar its universes, titles and tags. The entries come from the table's own read, so the catalog loads once.
- [x] Selection in `character-table.tsx`: a checkbox column first in the table (a new `Checkbox` in `src/components/ui/checkbox.tsx`, native input, 40×40px target, mixed state), and a header checkbox that selects or clears every row the search, filters and tag filter show (indeterminate when some are). Selection is by character id and lives in component state, not the URL. Changing a filter keeps hidden rows selected, and the bar's count says "N selected (M hidden)" when some are filtered out. Escape and a "Clear selection" button empty it (Escape is left alone while a list, dialog or text field has it). An id whose character was deleted is ignored, because the bar only looks at rows that still exist. Checkboxes are at least 40×40px hit targets (DESIGN_GUIDE §10).
- [x] Bulk action bar (`character-bulk-bar.tsx`): shown while at least one row is selected, between the toolbar and the table, built from the existing panel, buttons, `RadioPills`, `Combobox` and `TagInput` pieces (no new look). **Sticks to the top of the viewport, not the bottom as first planned:** the pickers open downwards, and a bottom bar would push their lists off the screen. Actions:
  - **Importance:** Major or Minor.
  - **Status:** Alive, Deceased or Unknown.
  - **Universe:** a universe combobox with a "None" choice. A typed name goes in through the "＋ Add universe" row, which closes the list so it can't sit over Confirm. It is found by name or added on save (`resolveUniverseId`), as on the character form.
  - **Predominant title:** a title combobox with a "None" choice.
  - **First appearance** and **Last appearance:** the entry combobox with a "None" choice, and "＋ Add new…" through `FirstAppearanceDialog`, as on the character form.
  - **Tags:** a tag input for tags to add and one for tags to remove. A character's other tags are kept. A tag that doesn't exist is created (`tagIdsFor`). The remove list offers the tags the selected characters have.
  - **Delete:** a dialog that lists how many characters will be deleted and asks for DELETE to be typed (`deleteConfirmSchema`), like the single delete.
- [x] Each action asks for one confirm click ("Set status to Deceased for 7 characters?") except delete, which uses the typed confirm. On success: a toast ("Updated 7 characters"), the table refreshes and the selection is kept so another action can follow. Delete clears the selection.
- [x] Server actions in `src/actions/characters.ts`: `bulkUpdateCharacters(ids, patch)` for the single-column fields, `bulkEditCharacterTags(ids, add, remove)` and `bulkDeleteCharacters(ids, confirm)`, with the writes in `src/lib/data/bulk-characters.ts`. Each validates with a new schema in `src/lib/schemas.ts` (`bulkCharacterIdsSchema`: 1 to 500 uuids; `bulkCharacterPatchSchema`: exactly one field; `bulkTagEditSchema`: no tag both added and removed), runs in one transaction, and returns how many rows changed. Ids that no longer exist are skipped and counted, so the toast can say "Updated 6 characters, 1 no longer exists". A deleted reference (universe, title, entry) fails with the existing `referenceFailure` message. `revalidatePath("/", "layout")` once per action.
- [x] Tests: schema unit tests (id list limits, a patch with zero or two fields is rejected, "None" maps to null); database tests (`tests/db/bulk-characters.test.ts`: a status set on three characters; universe set to None; tags added and removed while other tags stay; a missing id is skipped and counted; bulk delete removes the characters and their tags); `tests/e2e/phase-12.spec.ts` (select two rows and set Major; select all, then a filter hides some and the bar counts them; a universe picked, typed and cleared; first appearance set and cleared; tags added and removed; bulk delete with DELETE typed); `tests/e2e/screenshots-phase-12.spec.ts`. `vitest.config.ts` now runs test files one at a time (`fileParallelism: false`): the database tests share the test branch, and each one's cleanup removes every "E2E…" row, which could delete another file's rows halfway through.
- [x] Regression: `smoke`, `phase-2`, `phase-4` and `phase-11` pass (13 of 13).
- [ ] Design review (`DESIGN_GUIDE.md` §13) for `/characters` with nothing selected, rows selected, each action open, and the delete dialog, at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-12/` (git-ignored, 24 captures from `tests/e2e/screenshots-phase-12.spec.ts`: nothing selected, rows selected, importance, universe list, tags and the delete dialog). Checked by eye at 390px and 1280px, light and dark, with no sideways scroll. Waiting for the owner's sign-off.
- **Done when:** I can tick several characters (or all the filtered ones) and in one step set their importance, status, universe, predominant title, first or last appearance, add or remove tags, or delete them.

---

## 7. Testing and Verification

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Ordering keys and year-seeded placement, timeline axis compression and zoom bucketing, Zod schemas, timeline merge order (Phase 7), time jump order (Phase 8). |
| Database | Vitest against the `test` branch | Constraints (unique episodes, delete rules, a universe used by a recap, time jumps deleted with their entry), generated search columns, search ranking, and a **backup round trip**: export, wipe, restore, export again, and both files are identical. |
| End-to-end | Playwright against the `test` branch | Each phase's "done when" scenario, run as a script in a real browser. |
| Visual | Playwright screenshots | Every page at 390px and 1280px, in light and dark mode, compared by eye with `design-preview.html` (`DESIGN_GUIDE.md` §13). |
| Manual | Me | A short check at the end of each phase with real data. |

Tests never run against `production`. Every phase ends with type-check, lint, unit tests and Playwright all passing.

---

## 8. Project Structure

```
src/
  app/                 # routes from §4
  styles/tokens.css    # design tokens, exactly as DESIGN_GUIDE.md §3
  components/
    ui/                # restyled shadcn building blocks (DESIGN_GUIDE.md §7)
    layout/            # AppShell, PageHeader, EmptyState, DangerZone
    …                  # feature components (recap-list, timeline, character-table, character-bulk-bar, …)
  db/
    schema.ts          # Drizzle schema (§3)
    index.ts           # DB client (pooled URL)
    migrations/        # generated SQL
  lib/
    ordering.ts        # fractional keys + year-seeded placement
    timeline-layout.ts # compressed axis + zoom buckets
    timeline-merge.ts  # hand-written events, recap items and time jumps, in one order (Phases 7 and 8)
    search.ts
  actions/             # Server Actions per area (titles, entries, events, characters, tags, backup)
  lib/backup/          # backup format, Zod schema, export/restore
tests/
  unit/  db/  e2e/
```

---

## 9. Not Decided Yet

| Item | Blocks | Default if unanswered |
|---|---|---|
| Where the pre-restore snapshot is kept (Blob is dropped) | Restore, which comes after Phase 5 | A JSON row in a `pre_restore_snapshots` table in Neon, outside the tables a restore replaces. Only the newest is kept. |
| Custom domain (product plan, open question 2) | Nothing | The free `*.vercel.app` address |
| Universe of a hand-written event that isn't linked to a recap (Phase 10) | Nothing | It has none: hidden when a universe is picked, shown under "No universe set". A universe field on events would need a migration, so it waits until I ask for it. |
| Neon CLI extras (`neon skills`, `neon mcp`, `neon.ts`, `neon deploy`) | Nothing | Skipped. The app connects with the connection strings. The CLI is only needed to create the `test` branch. |

## 10. Things I Need to Do Myself

These need me at the keyboard. Everything else can run hands-free.

| When | Action | Why |
|---|---|---|
| Phase 0 | `! neon login` | Opens a browser to authorise the Neon CLI, which creates the `test` branch. |
| Phase 0 | `! vercel login` | Opens a browser to authorise deploying to my Vercel account. |
| Phase 0 | Approve the Node.js 24 upgrade | It changes my machine's global Node version. |
| End of each phase | A quick check with real data | Confirms it works the way I want before moving on. |
| Phase 6 | Approve running the production migration (`npm run db:migrate`) | The live site reads the new column, so it has to run before the Phase 6 code is pushed. Migrations never run on production automatically. |
| Phase 8 | Approve running the production migration (`npm run db:migrate`) | The live site reads the new `entry_time_jumps` table, so it has to run before the Phase 8 code is pushed. |
