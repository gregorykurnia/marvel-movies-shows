# Marvel Directory: Product Plan

**Status:** Draft v0.10 (2026-10-13). Adds the universe on recap items on the timeline, and a universe filter on the timeline (build phase 10). v0.9 added a universe on each flashback, flash-forward and time travel, shown on the timeline (build phase 9). v0.8 added flashbacks, flash-forwards and time travel on recaps, shown on the timeline (build phase 8). v0.7 added a universe designation on recaps and recaps on the timeline (phases 6 and 7). The database is connected, and the implementation details live in [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md). Hosting and backup are now decided.

## 1. Overview

A personal directory of Marvel movies and shows, for my own use only. It has three main parts, plus a few features that work across all of them:

1. **Recaps**: episode and movie recaps that I paste in, shown in a custom order that I control.
2. **Timeline**: a separate, hand-written timeline of events, positioned by in-universe year.
3. **Characters**: a searchable, filterable, sortable list of characters with key stats.

Cross-cutting features: **watched tracking**, **global search**, **notes and tags**, and **backup and restore**.

**Basic principles**
- Single user (me). **No login, no accounts.** Hosted online and reachable by link, without access protection (see §5).
- **All data is entered by hand.** The forms for entering and editing data therefore need to be quick and comfortable to use, because they will be used constantly.
- Recaps and Timeline are **two separate things**. Timeline events that I write myself are never generated from recaps, though they can optionally link to one. A recap with an in-universe year is different: it appears on the timeline automatically, as a read-only item (see 2.2).

---

## 2. Components

### 2.1 Recaps

**Purpose:** Keep a recap for every movie and every episode, arranged in the order I want to watch or read them.

**Requirements**
- A recap belongs to a **movie**, a **short** or a **show episode**. Episodes sit under a show and a season. A short is one recap, like a movie.
- Recap text is **pasted in by me** into a large text field. It is stored exactly as pasted and **displayed as Markdown**. Plain text with line breaks looks the same as pasted, and if I add Markdown (headings, **bold**, lists), it renders as formatting.
- The custom order is **per episode**. Episodes of one show can be placed between other movies and shows, not just kept together.
- The order is **adjustable at any time** (drag and drop, or move up and down), and the change is saved.
- Each entry also stores an **in-universe year**. This is used to seed the order, and I can then adjust the order by hand. Changing the order never changes the year, and the reverse is also true.
- Each entry also has an optional **universe designation**, such as Earth-616. I pick it from the universes list (§2.3), beside the in-universe year. A recap has one universe at most. It can be left empty, and the recap then shows "No universe set" so the gap is visible. A universe used by a recap can't be deleted, the same as for characters.
- A movie, episode or short can also have **other years it visits**: a flashback, a flash-forward or time travel. Each one has a year, a kind (Flashback, Flash-forward or Time travel) and an optional short note, e.g. *1988: young Peter at his mother's bedside*. A recap can have any number of them, and two can share a year. They sit under the in-universe year on the recap edit page, which stays the main year. They need a main year to be set first. Each one can also have its own **universe**, picked from the universes list, e.g. time travel to another timeline. Left empty, it uses the recap's universe. On the timeline, each of these items shows its universe.
- Each recap shows: title (and season and episode number if it's an episode), release date, in-universe year, other years (with their kind and note), universe designation, the recap text, the characters who first appear in it, and my notes and tags. The universe designation is shown clearly on the recap page and in the list.
- On the recap edit page, **First Appearance Characters** sets which characters first appear in this movie or episode. I can pick existing characters or type a new name, which adds a new character with the recap's universe, status Unknown, and the importance I've chosen beside the picker (Major or Minor, Minor by default). I fill in the rest later.
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
- **Recaps appear here automatically.** Every movie and episode with an in-universe year is shown, even if its recap text is still empty. These items are shown, not copied: changing a recap's year moves it here, clearing the year removes it, and deleting the recap removes it. I edit them on the recap, not on the timeline.
- **Order within a year:** my hand-written events come first, in my order. Recap items come after them, in recap order. Recap items can't be dragged. Only hand-written events can be reordered.
- **Recap items look different** from events. They have a small "From recap" label, and their links are "Read recap →" and "Edit recap". They have no "Edit event" link.
- **Flashbacks, flash-forwards and time travel** (§2.1) also appear here, one item per year, in the same read-only way. Each is clearly marked with its kind and the title it comes from, e.g. "Flashback · Guardians of the Galaxy", so it doesn't read as the title's main story. The expanded view shows the note and the main year ("Main story: 2014"), with the same "Read recap →" and "Edit recap" links. In a year, they come after the main recap items, in recap order.
- A **"Show flashbacks" toggle**, on by default, hides or shows these items (all three kinds). They follow the type and tag filters too, and the count at the top includes them.
- **Every recap item shows its universe**, the same way flashbacks do (Phase 9): a universe chip on the card and a "Universe" line in the expanded view. No chip when the recap has no universe.
- A **universe filter** narrows the timeline to one universe, e.g. only Earth-838. It sits beside the type and tag filters and works the same way: pick one universe, or clear it to see everything. It also has a "No universe set" choice, to find items that still need one. Each item is matched by the universe it shows: a recap item by its recap's universe, a flashback by its own universe (or the recap's). A hand-written event uses the universe of the recap it links to, and has none when it isn't linked. The filter is kept in the address, like the other filters.
- If a hand-written event is linked to the same recap, both are shown. I delete the one I don't need.
- Recap items follow the same filters as events: movies, shows, tags and universe. A recap item's tags are its recap's tags.
- Recap items are not separate search results, because recaps are already searchable.
- The count at the top includes both kinds.
- Navigation: scroll or drag along the time axis, zoom in and out on eras, and jump to a year.
- Events from movies, shows and shorts look different (colour or icon), and I can filter by type.
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
- I enter characters, and the dropdowns are fed from lists I manage. I can add a new universe from a "manage universes" screen, or inline while filling in a character. A universe name I type that doesn't exist yet is added to the list.
- In First appearance and Last appearance I can add a title that doesn't exist yet. I choose Movie, Show or Short. For a movie or short I type its name. For a show I type the show, season number, episode number and episode name, and the show is added too if it's new.
- **Search:** free-text search by name.
- **Filter:** by importance, status, multiverse designation, predominant title, and first or last appearance.
- **Sort:** by any column, ascending or descending.
- Several filters can be combined, and they can all be cleared in one click.
- First and last appearance link to the matching recap.
- A character page shows the character's fields, my notes and tags, and their first and last appearance. The full list of every appearance is no longer shown or edited. Earlier data is kept.

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

**Status (2026-10-12):** the first version is download-only: the Download button and the last backup time. Restoring from a file, including the typed confirmation and the automatic save before a restore, comes later.

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

- **Title**: a movie, a show or a short. Fields: name, type, release date.
- **Episode**: belongs to a show, with season and episode number. Fields: name, release date, in-universe year, universe designation.
- **Recap**: attached to a movie or an episode. Holds the pasted text. A movie's in-universe year and universe designation are kept on its recap.
- **Recap order**: the custom position of each movie or episode. Stored separately from the content, so reordering never changes the content.
- **Timeline event**: year, short text, tie-break order, and an optional link to a title or episode.
- **Timeline item (from a recap, not stored)**: every movie and episode with an in-universe year, shown read-only on the timeline with its recap's universe. Nothing is stored for it, so it always follows its recap.
- **Other year (flashback, flash-forward or time travel)**: belongs to a movie, episode or short. Fields: year, kind, optional note. Shown read-only on the timeline, the same way as the main year.
- **Character**: the fields from 2.3. Every variant is a separate record.
- **Universe**: a name or number such as Earth-616. The list is maintained by me and feeds the character and recap dropdowns.
- **Appearance**: links a character to every movie or episode they appear in. Kept for earlier data, but no longer shown or edited (2026-10-13).
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
| **6. Recap universe** | Universe field on movies and episodes: create, bulk add and recap edit. Universe chip on the recap page and in the list. Delete rule for universes used by recaps | I can set a universe on a recap, see it on the recap page and in the list, and a universe used by a recap can't be deleted |
| **7. Recaps on the timeline** | Movies and episodes with an in-universe year appear on the timeline as read-only items. They sort after my events in each year and can't be dragged. Filters and links work | A recap's year shows on the timeline in the right place, moves when I change the year, and its link opens the recap |
| **8. Flashbacks on the timeline** | Other years on a recap (flashback, flash-forward, time travel), each with an optional note. Shown on the recap page and as marked, read-only items on the timeline, with a toggle to hide them | A flashback I add on a recap shows in its year on the timeline, clearly marked with its kind and title, and the toggle hides it |
| **9. Universe on flashbacks** | A universe on each flashback, flash-forward or time travel, picked in its row on the recap edit page. Shown on the recap page and on its timeline card and popover | A universe I pick on a flashback shows on the timeline next to it, or the recap's universe when I leave it empty |
| **10. Universe on the timeline** | The recap's universe on each "From recap" card and popover. A universe filter beside the type and tag filters, with a "No universe set" choice, kept in the address | Every recap item shows its universe, and picking a universe in the filter leaves only the items in that universe |
| **11. First appearances and inline adds** | First Appearance Characters on the recap edit page, with inline character add. Inline movie, short or episode add from First and Last appearance. Typed universes added on save. First and last appearance on the character page instead of the appearances list. Universe chips on the titles list | I can add a character's first appearance, including a title I haven't entered yet, and the titles list shows each title's universes |

**Suggested checkpoints**
- After phase 1, I enter a handful of real titles to test the data entry flow. It matters because everything is typed by hand.
- After phase 3, I check the timeline with a real set of years, including the oldest and newest ones.
- After phase 7, I check that recap years sit in the right place on the timeline, using real years.
- After phase 8, I enter a few real flashbacks and check that they read clearly as flashbacks, not main story.

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
- 2026-10-12: Recaps with an in-universe year appear on the timeline automatically, for movies and episodes. They are shown, not copied. This replaces the earlier rule that timeline events are never generated from recaps.
- 2026-10-12: Within a year, my hand-written events come first, in my order. Recap items come after them, in recap order, and can't be dragged.
- 2026-10-12: Each recap has one optional universe designation, chosen from the universes list and entered beside the in-universe year. A universe used by a recap can't be deleted.
- 2026-10-12: Shorts are a third title kind, next to movies and shows. A short works like a movie: one recap, no episodes, with its own in-universe year and universe. It is shown in orange (DESIGN_GUIDE §2).
- 2026-10-13: A recap can list other years it visits, each marked Flashback, Flash-forward or Time travel, with an optional note. They appear on the timeline as marked, read-only items after the main recap items in each year, and a toggle hides them.
- 2026-10-13: Each flashback, flash-forward or time travel can have its own universe. Left empty, it uses the recap's universe. The timeline shows it on the item.
- 2026-10-13: Recap items on the timeline show their universe, and the timeline gets a universe filter. A hand-written event takes the universe of the recap it links to. This is a filter on the one timeline, not the separate multiverse timeline view that stays out of scope (§4).
- 2026-10-13: Characters record their first and last appearance only. The full appearances list is no longer shown or edited, but its data is kept. A recap lists the characters who first appear in it. New characters, titles, episodes and universes can be added inline from the dropdowns that use them.
- 2026-10-13: A character added from a recap's First Appearance Characters picker takes the importance chosen beside the picker, Major or Minor, Minor by default. It shows in the characters table with that importance.
- 2026-10-13: The titles list shows a chip for each universe set on a title's movie, short or episodes.

---

## 8. Open Questions

1. **Automatic backups.** *Decided 2026-10-12: no daily backups. Backups are made by hand from the Backup page. Restore still saves a copy of the current data before it replaces anything.*
2. **Web address.** Is the free default address from the host fine (e.g. `marvel-directory.vercel.app`), or do I want my own domain? *Default: the free address.*
