# Marvel Directory: Product Plan

**Status:** Draft v0.6. Not implemented yet. The database is connected, and the implementation details live in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Hosting and backup are now decided.

## 1. Overview

A personal directory of Marvel movies and shows, for my own use only. It has three main parts, plus a few features that work across all of them:

1. **Recaps**: episode and movie recaps that I paste in, shown in a custom order that I control.
2. **Timeline**: a separate, hand-written timeline of events, positioned by in-universe year.
3. **Characters**: a searchable, filterable, sortable list of characters with key stats.

Cross-cutting features: **watched tracking**, **global search**, **notes and tags**, and **backup and restore**.

**Basic principles**
- Single user (me). **No login, no accounts.** Hosted online and reachable by link, without access protection (see §5).
- **All data is entered by hand.** The forms for entering and editing data therefore need to be quick and comfortable to use, because they will be used constantly.
- Recaps and Timeline are **two separate things**. Timeline events are not generated from recaps. I write them myself, though they can optionally link to a recap.

---

## 2. Components

### 2.1 Recaps

**Purpose:** Keep a recap for every movie and every episode, arranged in the order I want to watch or read them.

**Requirements**
- A recap belongs to either a **movie** or a **show episode**. Episodes sit under a show and a season.
- Recap text is **pasted in by me** into a large text field. It is stored exactly as pasted and **displayed as Markdown**. Plain text with line breaks looks the same as pasted, and if I add Markdown (headings, **bold**, lists), it renders as formatting.
- The custom order is **per episode**. Episodes of one show can be placed between other movies and shows, not just kept together.
- The order is **adjustable at any time** (drag and drop, or move up and down), and the change is saved.
- Each entry also stores an **in-universe year**. This is used to seed the order, and I can then adjust the order by hand. Changing the order never changes the year, and the reverse is also true.
- Each recap shows: title (and season and episode number if it's an episode), release date, in-universe year, the recap text, the characters who appear in it, and my notes and tags.
- Previous and next buttons follow my custom order.
- Each entry has a **watched** marker (see 2.4).

---

### 2.2 Grand Timeline

**Purpose:** An overview of the whole universe laid out by year, where I describe the key events myself.

**Requirements**
- The timeline is made of **events that I type in**. Each event has a **year** and a **short text**. Example: *2012: Captain America wakes up from the ice.*
- Events are positioned by **in-universe year**. When several events share a year, my **custom order breaks the tie**, and I can adjust that order.
- Each event has a **year only** (no exact date). Years can be negative for events before 1 AD.
- The time axis **adapts to the years I've entered**. It has no fixed start or end, and it stretches or shrinks as I add events. Years with no events don't take up space.
- **Hover (or tap on mobile) expands an event** to show its details: the year, the full event text, and which movie or show it belongs to.
- An event can **optionally link to a recap** from 2.1. When linked, the expanded view has a link that opens that recap.
- Navigation: scroll or drag along the time axis, zoom in and out on eras, and jump to a year.
- Events from movies and shows look different (colour or icon), and I can filter by type.
- Events are created and edited with a simple form: year, text, order, and the optional link to a title or episode.

---

### 2.3 Character Directory

**Purpose:** A table of characters with quick facts that can be searched, filtered and sorted.

**Fields per character**

| Field | Description | Input |
|---|---|---|
| Name | Character name (e.g. "Loki") | Free text |
| Importance | Major or minor | Dropdown |
| Predominant movie/show | The title where they're most prominent | Dropdown of titles I've entered |
| Multiverse designation | Their universe or Earth number (e.g. Earth-616, Earth-199999) | Dropdown of universes **I maintain** |
| First appearance | Movie or episode they first show up in | Dropdown of entries I've entered |
| Last appearance | Movie or episode they most recently show up in | Dropdown of entries I've entered |
| Status | **Alive, Deceased or Unknown** | Dropdown (fixed list of three) |
| Notes and tags | My own notes and tags | Free text |

**Requirements**
- **Every variant is its own character entry.** For example, each Loki variant gets a separate row, with its own universe and status.
- I enter characters, and the dropdowns are fed from lists I manage. I can add a new universe from a "manage universes" screen, or inline while filling in a character.
- **Search:** free-text search by name.
- **Filter:** by importance, status, multiverse designation, predominant title, and first or last appearance.
- **Sort:** by any column, ascending or descending.
- Several filters can be combined, and they can all be cleared in one click.
- First and last appearance link to the matching recap.
- A character page shows the character's fields, my notes and tags, and the movies and episodes they appear in.

---

### 2.4 Watched Tracking

**Purpose:** Show which movies and episodes I've watched and which I haven't.

**Requirements**
- Every movie and episode has a **watched** marker that I toggle by hand. There are only two states, watched and not watched.
- Watched and unwatched entries **look clearly different** in the Recaps list, and wherever the entry appears elsewhere (for example in the first and last appearance of a character).
- Shows and seasons display a **progress bar** (e.g. 4 of 9 episodes watched). Movies and episodes that I haven't watched don't show a watched marker.
- Progress is shown as a count and a percentage, and also as an overall total across everything.
- I can filter the Recaps list by watched or unwatched.

---

### 2.5 Global Search

**Purpose:** One search box that finds anything.

**Requirements**
- Always available from every page.
- Searches across **recap text and titles, timeline events, characters, and my notes and tags**.
- Results are grouped by type (Recaps, Timeline, Characters), and each result links to its page.

---

### 2.6 Notes and Tags

**Purpose:** Let me add my own annotations.

**Requirements**
- Notes and tags can be added to **recaps, timeline events and characters**.
- Notes are free text. Tags are short labels (e.g. "rewatch", "favourite", "important") that I create as I go.
- I can **filter by tag** in each list, and notes and tags are included in global search.

---

### 2.7 Backup and Restore

**Purpose:** Make sure the hand-typed data is never lost, whether through a mistake, a bug, or someone else editing the site.

**Requirements**
- A **Backup page** with a one-click **"Download backup"** button. It saves everything (titles, episodes, recaps, order, watched, events, characters, universes, appearances, notes, tags) as a single file on my device.
- **Restore from a backup file:** upload a backup file to bring the app back to exactly that state.
  - Restore **replaces all current data**. It asks me to type a confirmation word first.
  - Just before restoring, the app **automatically saves a backup of the current data**, so a restore can always be undone.
- The backup file is readable (JSON). Even without the app, the data isn't locked in.
- The page shows when the last backup was made.
- Neon's own built-in restore (rolling the database back to an earlier point in time) is a second safety net. How far back it goes depends on the Neon plan.

---

## 3. Shared Data Model (draft)

- **Title**: a movie or a show. Fields: name, type, release date.
- **Episode**: belongs to a show, with season and episode number. Fields: name, release date, in-universe year.
- **Recap**: attached to a movie or an episode. Holds the pasted text.
- **Recap order**: the custom position of each movie or episode. Stored separately from the content, so reordering never changes the content.
- **Timeline event**: year, short text, tie-break order, and an optional link to a title or episode.
- **Character**: the fields from 2.3. Every variant is a separate record.
- **Universe**: a name or number such as Earth-616. The list is maintained by me and feeds the character dropdown.
- **Appearance**: links a character to every movie or episode they appear in.
- **Watched**: a flag on each movie or episode.
- **Note** and **Tag**: attached to recaps, timeline events and characters.

---

## 4. Out of Scope (for now)

These were suggested, and I decided not to include them yet. They may come back later.

- Spoiler protection (blur until clicked)
- A character relationship map
- A separate multiverse timeline view
- Several saved alternate orders (e.g. release order vs. chronological)
- Login, accounts, sharing and multiple users
- Access protection (password, host protection, read-only mode for visitors)

---

## 5. Technical Approach

- **Web app**, opened in a browser. It should work on desktop and phone widths.
- **Neon (Postgres)** is the database and stores all data. The Neon project already exists (project ID `lively-poetry-66281408`, branch `production`). The connection is set up and verified.
- **Stack, schema, routes and the detailed task list** are in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).
- **Look and feel:** bright, comic-panel-inspired and modern. Defined in [`DESIGN_GUIDE.md`](./DESIGN_GUIDE.md), with a visual preview in [`design-preview.html`](./design-preview.html). It applies to every page, including inner pages like forms and backup.
- **Hosted online, with no login and no access protection.** This was my deliberate choice. Anyone who has or finds the link can view **and edit or delete** data. Built-in safeguards:
  - The site asks search engines not to index it, so it won't show up in search results.
  - Backups (2.7) mean any unwanted change can be undone.
  - Access protection can be added later without rebuilding anything.
- **Pasted recaps are stored as raw text** and displayed as Markdown (see 2.1). The display is sanitised.
- **Timeline years are plain integers**, and negative numbers are allowed for years before 1 AD.

---

## 6. Build Plan

There are no other users to roll out to, so this is a **build order**, not a formal rollout. Each phase is usable by itself, so I can start entering data early and give feedback before the next phase starts. Recaps go first because titles and episodes are what characters and timeline events link to.

This is the high-level view. The task-by-task checklist for each phase is in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) §6.

| Phase | What gets built | Done when |
|---|---|---|
| **0. Foundation** | Project setup, database schema, a separate test database, basic layout and navigation, first online deployment | The app is live online and can read and write to the Neon database |
| **1. Titles and Recaps** | Forms to add movies, shows, seasons and episodes. Recap paste field with Markdown display. Custom order with drag and drop. Watched toggle and progress bars. Previous and next navigation | I can enter a show, paste recaps, reorder episodes across movies and shows, and mark things watched |
| **2. Characters** | "Manage universes" screen. Character form with all dropdowns. Directory table with search, filter and sort. Character page with appearances | I can enter variants, filter by universe or status, and sort by any column |
| **3. Timeline** | Event form. Year axis that fits the years entered. Tie-break order. Hover expand, optional link to a recap. Type filter and zoom | Events appear in the right year order, and hover shows details and a working recap link |
| **4. Cross-cutting** | Notes and tags on recaps, events and characters, with a tag filter. Global search across everything | One search finds a recap, event, character or note, and tags filter every list |
| **5. Backup and Polish** | Backup download and restore. Responsive layout check, empty and error states | I can download a backup, restore it, and the app is comfortable on my phone |

**Suggested checkpoints**
- After phase 1, I enter a handful of real titles to test the data entry flow. It matters because everything is typed by hand.
- After phase 3, I check the timeline with a real set of years, including the oldest and newest ones.

---

## 7. Decisions So Far

- Recap order is per episode. The list is seeded by in-universe year, and my manual order is final.
- Timeline events are written by me, separate from recaps. They are placed by year, and my custom order breaks ties.
- The timeline axis adapts to whatever years have entries. No fixed range.
- Year only (no exact dates) for events.
- Recaps are pasted by me, stored as raw text and displayed as Markdown.
- Watched has two states only: watched and not watched.
- Every character variant is its own entry. Status is Alive, Deceased or Unknown.
- Universe dropdown is fed from a list I maintain.
- Web app with a Neon Postgres database, for one user.
- Hosted online with no access protection. I accept that anyone with the link could edit it.
- Backup and restore are included (2.7).

---

## 8. Open Questions

1. **Automatic backups.** Do I also want the app to make a backup **automatically** (e.g. once a day), and keep the last 30? This matters more because the site is open: if someone else wipes it, a recent backup exists even if I forgot to download one. *Default if unanswered: yes, daily.*
2. **Web address.** Is the free default address from the host fine (e.g. `marvel-directory.vercel.app`), or do I want my own domain? *Default: the free address.*
