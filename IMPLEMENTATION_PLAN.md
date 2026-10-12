# Marvel Directory: Implementation Plan

**Status:** Draft v0.2. Waiting for review. Nothing is built yet. This version adds online hosting (no access protection) and backup and restore.
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
| Backup storage | **Vercel Blob (private)** | Automatic backups are stored outside the database, so they survive even if the database is wiped. |
| Scheduled jobs | **Vercel Cron** | Runs the daily automatic backup. |
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
  - Daily automatic backups (§5.6).
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
| kind | enum `manual` \| `automatic` \| `pre_restore` | |
| created_at | timestamptz | |
| blob_path | text, nullable | Set for automatic and pre-restore backups (stored in Blob). Null for manual downloads. |
| size_bytes | int | |

### 3.2 Custom Ordering

- `sort_key` is a **fractional index**: a string that sorts between its neighbours (e.g. `a0`, `a0V`, `a1`). Moving an item gives it a new key between its new neighbours. **Only that one row is written.**
- Keys use the `"C"` collation, so the database sorts them in the same order as the JavaScript library.
- **Placing a new entry, seeded by year:** the entry goes right after the last entry in the current custom order whose `in_universe_year` is less than or equal to its own. If it has no year, it goes at the end. My manual order is never rewritten.
- **Bulk-adding episodes** (e.g. "add episodes 1 to 9 of season 1"): the episodes are inserted as a block, in episode-number order, at the position given by their year. I can then drag individual episodes elsewhere.
- **Timeline events** use the same mechanism, but order only among events of the **same year**. Dragging only reorders within a year, and the year itself is changed through the edit form.

### 3.3 Search

- One query searches the `search_vector` columns of entries, events and characters, plus trigram matches on title and character names and on tag names.
- Results are grouped by type and ranked. The top 10 per type are shown, with a "show all" link.

---

## 4. Pages and Routes

| Route | Purpose |
|---|---|
| `/` | Home: overall watched progress, quick links to each section, and recently edited items. |
| `/recaps` | The custom-ordered list of all entries. Filters: watched or unwatched, type, tag. A **Reorder mode** toggle enables drag-and-drop, so normal scrolling doesn't move things by accident. |
| `/recaps/[entryId]` | One recap: header details, rendered recap, characters, notes and tags, watched toggle, and previous and next buttons in custom order. |
| `/recaps/[entryId]/edit` | Edit the recap text (large paste area with a preview), year, notes, tags and appearances. |
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
| `/backup` | Download a backup, restore from a file, see the last backup time, and list and download automatic backups. |
| `/api/backup/export` | GET. Streams the full backup JSON as a file download and logs a `manual` backup. |
| `/api/cron/backup` | Called daily by Vercel Cron. Writes an `automatic` backup to Blob and deletes all but the newest 30. It only accepts requests carrying Vercel's `CRON_SECRET`. |

The global search box sits in the header on every page. Pressing `/` or `⌘K` focuses it.

---

## 5. Key Components

### 5.1 Recap List and Ordering
- A sortable list built with dnd-kit, keyboard accessible. On drop, a single Server Action writes the new `sort_key`.
- The screen updates before the database confirms, and rolls back if the save fails.
- Each row shows the title, S/E number, in-universe year, and a watched badge. Unwatched rows are visually muted, and watched rows get a check.
- Each show shows a season progress bar (e.g. "4 / 9").

### 5.2 Timeline
- **Compressed axis:** each distinct year that has at least one event gets one slot. Gaps between slots are shown as a break marker with the size of the gap (e.g. "⋯ 66 years ⋯"), so empty years take no space.
- **Layout:** horizontal and scrollable or draggable on desktop. It becomes a vertical list on narrow screens.
- **Zoom:** three levels, *year*, *decade* and *century*. Zooming out groups slots into buckets that show event counts, and clicking a bucket zooms into it.
- **Jump to year:** an input that scrolls to the nearest slot.
- **Event card:** a popover that opens on hover (desktop) or tap (mobile). It shows the year, text, details, and title, plus a "Read recap →" link if `entry_id` is set.
- Colour and icon come from the title kind. Filters: movies, shows, tag.

### 5.3 Character Directory
- A TanStack Table loaded with all characters plus joined names (universe, titles, entries).
- Search by name. Column filters for importance, status, universe, predominant title, first and last appearance. Click a header to sort, with direction toggling.
- Filters and sort are stored in the **URL query string**, so a filtered view survives a refresh and can be bookmarked.
- A "Clear all filters" button.

### 5.4 Forms (data entry)
Everything is typed by hand, so data entry speed is a priority:
- Searchable comboboxes for titles, entries and universes. The universe combobox has an inline **"+ Add universe"** option.
- **"Save and add another"** on every create form.
- Bulk episode add.
- A tag input with autocomplete that creates new tags on the fly.
- Validation errors appear next to the field. Nothing I typed is lost on error.

### 5.5 Markdown Recap Display
- `remark-breaks` keeps single line breaks from pasted text, `remark-gfm` adds lists and tables, and `rehype-sanitize` blocks scripts and HTML.
- The edit page shows a live preview next to the text area.

### 5.6 Backup and Restore
- **File format:**
  ```json
  { "format": "marvel-directory-backup", "version": 1, "exportedAt": "…", "tables": { "titles": [...], "entries": [...], ... } }
  ```
  It contains every data table (not `backup_log`). The `version` matches the schema, so future migrations can upgrade older backup files before restoring them.
- **Export:** a single read of all tables, serialised to JSON. At this data size it is small (likely well under 10 MB, even with long recaps).
- **Restore** is a Server Action and runs these steps in order:
  1. Validate the uploaded file with Zod (format, version, shape, references between rows).
  2. Write a `pre_restore` snapshot of the current data to Blob.
  3. In **one transaction**, delete all data tables and insert the backup's rows in dependency order. If anything fails, nothing changes.
  4. Show a summary, e.g. "Restored 412 entries, 87 characters…".
- **Confirmation:** I have to type `RESTORE` before the restore button is enabled.
- **Automatic backups:** daily at a quiet hour via Vercel Cron. The newest 30 are kept in private Blob, and each can be downloaded from `/backup`.

---

## 6. Phase Task Checklists

Phases match the product plan's build plan. Each phase ends with:
- Its checks passing (§7).
- **The design review checklist (`DESIGN_GUIDE.md` §13) passing for every page touched.**
- A short demo for me.

### Phase 0: Foundation
- [x] Store Neon connection strings in `.env.local` and add `.gitignore`
- [x] Verify the direct and pooled connections
- [ ] Upgrade Node.js to 24 LTS
- [x] Initialise a local git repo (no commit yet)
- [x] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui (shadcn-style components built on Radix, not via the shadcn CLI)
- [x] Set up Drizzle: client, `drizzle.config.ts`, the full schema from §3, the first migration (generated, not yet applied to any database)
- [x] Enable `pg_trgm`, add the generated `search_vector` columns and GIN indexes in the migration (verified by applying it to an in-process PostgreSQL)
- [x] Create Neon branch `test` and `.env.test` (branch created from the empty production branch on 2026-10-12; `.env.test` is gitignored)
- [ ] Run migrations on `test` (done, all 11 tables plus pg_trgm verified), then on `production` (waiting for approval)
- [ ] Design system foundation, per `DESIGN_GUIDE.md`:
  - [x] `src/styles/tokens.css` (exact §3 values), fonts loaded with `next/font`, Tailwind `@theme` mapping, shadcn variable mapping (§11)
  - [x] Base UI components restyled to §7: Button (all variants), Chip, Input/Select/Textarea, Combobox, Segmented control, Radio pills, Filter chip, Progress, Toast, Table, Dialog, Skeleton
  - [x] Layout components: `AppShell` (stripe, header, mobile nav, search box, theme toggle), `PageHeader`, `EmptyState`, `DangerZone`
  - [x] A dev-only `/styleguide` route that renders every component, used to compare against `design-preview.html`
  - [x] Message template for 404 and the error boundary
- [x] Set up Vitest and Playwright. Add a smoke test that loads the home page and reads from the database (unit tests and smoke tests pass against the test branch)
- [x] Add `noindex` metadata and a `robots.txt` that disallows everything
- [ ] Upgrade the Vercel CLI (currently 57.0.0, which is outdated). Create and link the Vercel project (**needs a one-time `! vercel login` from me**)
- [ ] Add the database environment variables to Vercel (done for Production, encrypted) and deploy to production (waiting for approval)
- **Done when:** the app is live on its `*.vercel.app` address, every table exists, and the smoke test passes both locally and against the live site.

### Phase 1: Titles and Recaps
- [ ] Title create, edit and delete (movie or show)
- [ ] Episode create and edit, plus bulk-add episodes
- [ ] Ordering helpers: a fractional key between neighbours, and year-seeded placement (with unit tests)
- [ ] `/recaps` list with Reorder mode and drag-and-drop
- [ ] Recap view page with Markdown display, previous and next
- [ ] Recap edit page with paste area and live preview
- [ ] Watched toggle, muted unwatched style, season, show and overall progress bars
- [ ] Watched and type filters
- **Done when:** I can add a show with episodes, paste recaps, drag an episode between two movies, mark things watched, and the order and progress survive a reload.

### Phase 2: Characters
- [ ] `/universes` management
- [ ] Character create and edit form with all comboboxes, inline add universe, and the status dropdown
- [ ] Appearances editor, on both the character form and the recap edit page
- [ ] `/characters` table with search, filters, sort, URL-synced state, clear all
- [ ] Character page with appearances list linked to recaps
- **Done when:** I can enter several Loki variants in different universes, then filter by universe and status and sort by any column.

### Phase 3: Timeline
- [ ] Event create and edit form
- [ ] Compressed axis layout logic (with unit tests: gaps, negative years, a single event, many events in one year)
- [ ] Timeline view: horizontal on desktop, vertical on mobile
- [ ] Hover and tap event card with the recap link
- [ ] Tie-break reordering within a year
- [ ] Zoom levels, jump to year, type filter
- **Done when:** events with real years (including a BCE year) appear in the right order, gaps are compressed, and the recap links work.

### Phase 4: Notes, Tags and Search
- [ ] Notes fields on all edit forms
- [ ] Tag input on entries, events and characters, plus `/tags` management
- [ ] Tag filter on the Recaps, Timeline and Characters views
- [ ] `/search` with grouped results, the header search box, `⌘K` and `/` shortcuts
- **Done when:** one search finds a match in a recap's text, an event, a character and a note, and tag filters work on every list.

### Phase 5: Backup and Polish
- [ ] Backup JSON format, a Zod schema for it, and the export endpoint
- [ ] `/backup` page with download, last-backup time, and the list of automatic backups
- [ ] Restore flow: validation, pre-restore snapshot, one-transaction replace, typed confirmation, summary
- [ ] Private Vercel Blob store connected to the project, plus the daily Vercel Cron backup with 30-copy retention (`CRON_SECRET` checked)
- [ ] Responsive pass on phone width. Empty states ("No recaps yet, add a title"). Error pages
- **Done when:** a downloaded backup restores the app to exactly the same state, a bad file is rejected without changing anything, the daily backup appears in the list, and the app is comfortable on my phone.

**Note:** backups only arrive in phase 5. Until then, Neon's built-in point-in-time restore is the safety net. If I'll be entering a lot of real data before phase 5, the backup **download** can be moved forward to the end of phase 1. It's about a day's work.

---

## 7. Testing and Verification

| Level | Tool | What it covers |
|---|---|---|
| Unit | Vitest | Ordering keys and year-seeded placement, timeline axis compression and zoom bucketing, Zod schemas. |
| Database | Vitest against the `test` branch | Constraints (unique episodes, delete rules), generated search columns, search ranking, and a **backup round trip**: export, wipe, restore, export again, and both files are identical. |
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
    search.ts
  actions/             # Server Actions per area (titles, entries, events, characters, tags, backup)
  lib/backup/          # backup format, Zod schema, export/restore, Blob storage
tests/
  unit/  db/  e2e/
```

---

## 9. Not Decided Yet

| Item | Blocks | Default if unanswered |
|---|---|---|
| Automatic daily backups (product plan, open question 1) | Phase 5 only | Yes, daily, keep 30 |
| Custom domain (product plan, open question 2) | Nothing | The free `*.vercel.app` address |
| Move backup download earlier (end of phase 1) | Nothing | Stays in phase 5 |
| Neon CLI extras (`neon skills`, `neon mcp`, `neon.ts`, `neon deploy`) | Nothing | Skipped. The app connects with the connection strings. The CLI is only needed to create the `test` branch. |

## 10. Things I Need to Do Myself

These need me at the keyboard. Everything else can run hands-free.

| When | Action | Why |
|---|---|---|
| Phase 0 | `! neon login` | Opens a browser to authorise the Neon CLI, which creates the `test` branch. |
| Phase 0 | `! vercel login` | Opens a browser to authorise deploying to my Vercel account. |
| Phase 0 | Approve the Node.js 24 upgrade | It changes my machine's global Node version. |
| End of each phase | A quick check with real data | Confirms it works the way I want before moving on. |
