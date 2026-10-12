# Marvel Directory: Implementation Plan

**Status:** Draft v0.3 (2026-10-12). This version adds the universe designation on recaps (Phase 6) and recaps on the timeline (Phase 7). Build progress is in §6.
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

**`titles`**: a movie or a show.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text, not null | e.g. "Loki" |
| kind | enum `movie` \| `show` | Drives colour and icon on the timeline. |
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
| `/recaps/[entryId]` | One recap: header details (including the universe), rendered recap, characters, notes and tags, watched toggle, and previous and next buttons in custom order. |
| `/recaps/[entryId]/edit` | Edit the recap text (large paste area with a preview), year, universe, notes, tags and appearances. |
| `/titles` | Manage movies and shows. |
| `/titles/new` | Add a movie or a show. |
| `/titles/[id]` | For a show: its seasons and episodes, progress bars, and **bulk-add episodes**. For a movie: a redirect to its recap. |
| `/timeline` | The grand timeline (§5.2). |
| `/timeline/new`, `/timeline/[id]/edit` | Event form: year, text, details, title, optional episode link, notes, tags. |
| `/characters` | The directory table (§5.3). |
| `/characters/new`, `/characters/[id]/edit` | Character form. All dropdowns are searchable comboboxes. |
| `/characters/[id]` | Character page: fields, notes, tags, and the appearances list (linked to recaps). |
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

### 5.3 Character Directory
- A TanStack Table loaded with all characters plus joined names (universe, titles, entries).
- Search by name. Column filters for importance, status, universe, predominant title, first and last appearance. Click a header to sort, with direction toggling.
- Filters and sort are stored in the **URL query string**, so a filtered view survives a refresh and can be bookmarked.
- A "Clear all filters" button.

### 5.4 Forms (data entry)
Everything is typed by hand, so data entry speed is a priority:
- Searchable comboboxes for titles, entries and universes. The universe combobox has an inline **"+ Add universe"** option.
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

### Phase 6: Universe designation on recaps
- [x] Migration: add `entries.universe_id` (nullable, references `universes`, restrict delete). Run it on `test` first (`npm run db:migrate:test`). The production migration (`npm run db:migrate`) runs only when I approve it, and before this code reaches `main`, because the live site reads the new column. Done on the test branch and on production (2026-10-12, after the owner approved it).
- [x] Zod: an optional universe id on `titleFormSchema`, `episodeFormSchema`, `episodeRangeSchema`, `episodeEditSchema` and `movieEditSchema`.
- [x] Actions save it: `createEpisode`, `addEpisodes`, `saveEpisode`, `saveMovie`, and the movie branch of title creation in `src/actions/titles.ts`.
- [x] Universe combobox with an inline "+ Add universe", beside In-universe year, on the movie form (`title-forms.tsx`), the episode form for single and bulk add (`episode-form.tsx`), and the recap edit page (`recap-edit-form.tsx`). Reuse the pattern in `character-form.tsx`.
- [x] Recap page: universe chip in the header next to the year, a "Universe" row in Details, and "No universe set" in muted text when empty.
- [x] Recap list row: universe chip in the meta row when set.
- [x] Delete rule: `deleteUniverse` and `loadUniverseRows` count recaps as well as characters. Update the in-use wording on `/universes` and in the universe manager.
- [x] Tests: a schema unit test; a database test (a universe used by a recap can't be deleted); an end-to-end test (set a universe on a recap, see the chip, delete is blocked).
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the recap page, recap edit page, recap list, movie and episode forms, and `/universes`, at 390px and 1280px, light and dark. Screenshots are in `screenshots/phase-6/` (git-ignored, 32 captures, none scroll sideways at 390px). Seven were checked by eye. The keyboard pass and the owner's review are still to do.
- **Done when:** I can set a universe on a movie or episode, see it on the recap page and in the list, and a universe used by a recap can't be deleted.

### Phase 7: Recaps on the timeline
- [ ] Read model: `loadTimelineEvents` also returns every movie and episode with an in-universe year, as read-only items. No table change.
- [ ] Merge: a pure function in `src/lib/timeline-merge.ts` (new). Hand-written events first, in their order, then recap items in recap order. Unit tests for BCE years, same-year ties, and a year with only recap items.
- [ ] Recap item cards: the "From recap" label, the text and chip from §5.2, and popover links "Read recap →" and "Edit recap". No "Edit event" on these items.
- [ ] Reorder: `onDragEnd` and `moveByMenu` use hand-written events only. Recap items aren't sortable and have no ⋯ menu.
- [ ] Type and tag filters apply to recap items.
- [ ] The header count includes both kinds.
- [ ] Update the Phase 3 end-to-end test (`tests/e2e/phase-3.spec.ts`). Its 2011 count and the 2010–2019 bucket count will change, because recap items are included.
- [ ] New end-to-end test: a year set on a recap appears in the right place, changing it moves the item, clearing it removes it, and reorder still works in a year that has a recap item.
- [ ] Design review (`DESIGN_GUIDE.md` §13) for the timeline at 390px and 1280px, light and dark.
- **Done when:** a recap's in-universe year shows on the timeline in the right place, moves when I change the year, and its link opens the recap.

---

## 7. Testing and Verification

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Ordering keys and year-seeded placement, timeline axis compression and zoom bucketing, Zod schemas, timeline merge order (Phase 7). |
| Database | Vitest against the `test` branch | Constraints (unique episodes, delete rules, a universe used by a recap), generated search columns, search ranking, and a **backup round trip**: export, wipe, restore, export again, and both files are identical. |
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
    …                  # feature components (recap-list, timeline, character-table, …)
  db/
    schema.ts          # Drizzle schema (§3)
    index.ts           # DB client (pooled URL)
    migrations/        # generated SQL
  lib/
    ordering.ts        # fractional keys + year-seeded placement
    timeline-layout.ts # compressed axis + zoom buckets
    timeline-merge.ts  # hand-written events and recap items, in one order (Phase 7)
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
