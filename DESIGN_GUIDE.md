# Marvel Directory: Design Guide

**Status:** v1. Approved design direction, pending my review.
**Visual reference:** [`design-preview.html`](./design-preview.html). Open it in a browser. Every component and screen described here is drawn there, in light and dark mode, at desktop and phone width.
**Companions:** [`PRODUCT_PLAN.md`](./PRODUCT_PLAN.md) (what), [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) (how).

> **For whoever implements this (human or model):** this guide is binding for **every** page, including forms, edit pages, the backup page, 404 and error pages, and loading states. When a page needs something not covered here, build it from the existing pieces (panel, page header, chips, buttons) and the tokens. Don't introduce a new look. Before a phase is marked done, run the review checklist in §13.

---

## 1. Personality

**"Comic-panel bright, modern clean."**

- **Bright:** five saturated hero colours on warm paper. Colour is used with confidence, but every colour has one job.
- **Bold:** 2px ink outlines and hard offset "pop" shadows, like comic panels. Chunky display headings.
- **Clear:** generous spacing, a calm reading layout for recaps, consistent components. The comic flavour is in the frame, never in the way of the content.

There are three signature elements, and they're what make it look like *this* app:

1. **Panel:** a 2px ink outline, 14px radius and a 4px offset shadow.
2. **Five-colour stripe:** red, yellow, blue, green, violet. It sits at the very top of the app.
3. **Halftone dots:** decoration only, in page header corners, empty states and the hero.

**Branding:** this is a personal fan app. Don't use official Marvel logos, logo lockups or studio artwork. The app's wordmark is "Marvel Directory", set in our own display font, with the tilted yellow ★ logo mark.

---

## 2. Semantic Colour Map

Every colour has exactly one meaning. **Never reuse a colour for something else.**

| Meaning | Colour | Where |
|---|---|---|
| Primary action, brand | **Hero Red** `--red` | One primary button per view, logo burst, list markers in recaps |
| **Movie** | **Hero Red** `--movie` | Kind bar, Movie chip, timeline pins and shadows |
| **Show** | **Shield Blue** `--show` | Kind bar, Show chip, timeline pins and shadows |
| Focus, secondary action | **Shield Blue** `--blue` | Focus rings, active input, "Reorder" button |
| **Watched**, progress, success, Alive | **Gamma Green** `--green` | Watched chip, progress fill, Alive chip, success toasts |
| Highlight, Unknown, empty states | **Infinity Gold** `--yellow` | Logo mark, bold highlighter in recaps, row hover, Unknown chip, Download backup button |
| Characters section, importance, active filters | **Cosmic Violet** `--violet` | Characters page accent, Major/Minor chips, active filter chips |
| **Universe designation** | **Quantum Cyan** `--cyan` | Universe chips only |
| Timeline section accent, warnings | **Repulsor Orange** `--orange` | Timeline page header accent |
| Danger | Red outline, not filled | Restore, delete (`.btn-danger`: red outline and red shadow) |
| Deceased | Neutral (`--surface-2` / `--ink-3`) | Deceased chip. It's deliberately not red, to avoid clashing with Movie. |
| Tags | Neutral (`--surface-2` / `--ink-2`) with `#` prefix | Tag chips |

**Section accents** (eyebrow bar and halftone corner of the page header):
- Recaps: red
- Recap detail: blue if it's an episode, red if it's a movie
- Timeline: orange
- Characters and universes: violet
- Backup: green
- Search, tags, home: red

---

## 3. Design Tokens

These are the **exact** values. They're mirrored in `design-preview.html`, and that file and this section must stay in sync.

Each bright colour has four tokens:
- `--x`: the fill.
- `--x-soft`: a tint for chip backgrounds.
- `--x-ink`: a darker or lighter shade for **text** in that colour.
- `--on-x`: the text colour to use **on top of** the fill.

```css
:root {
  /* Neutrals */
  --paper: #FAF7F2;      /* page background */
  --surface: #FFFFFF;    /* panels, inputs, header */
  --surface-2: #F3EFE7;  /* table heads, tags, progress tracks */
  --ink: #16141C;        /* text, outlines, shadows */
  --ink-2: #4A4756;      /* secondary text */
  --ink-3: #6B6878;      /* hints, placeholders, meta */
  --line: #16141C;       /* panel and input outlines */
  --line-soft: #E6E1D8;  /* dividers, table row lines */
  --shadow-ink: #16141C; /* pop-shadow colour */
  --dot: rgb(22 20 28 / .10); /* halftone dots */

  /* Hero colours: fill / soft tint / text shade / text-on-fill */
  --red: #E11D3A;    --red-soft: #FFE2E7;    --red-ink: #AE1029;    --on-red: #FFFFFF;
  --blue: #2563FF;   --blue-soft: #E2EAFF;   --blue-ink: #1A45C4;   --on-blue: #FFFFFF;
  --yellow: #FFC61A; --yellow-soft: #FFF3C7; --yellow-ink: #7D5A00; --on-yellow: #16141C;
  --green: #14B86E;  --green-soft: #D8F6E7;  --green-ink: #08743F;  --on-green: #16141C;
  --violet: #7B4DFF; --violet-soft: #ECE4FF; --violet-ink: #5228D1; --on-violet: #FFFFFF;
  --cyan: #14C3E8;   --cyan-soft: #D9F6FC;   --cyan-ink: #06718A;   --on-cyan: #16141C;
  --orange: #FF7A1A; --orange-soft: #FFE8D5; --orange-ink: #A64700; --on-orange: #16141C;

  /* Semantic aliases */
  --movie: var(--red);  --movie-soft: var(--red-soft);  --movie-ink: var(--red-ink);
  --show: var(--blue);  --show-soft: var(--blue-soft);  --show-ink: var(--blue-ink);
  --focus: var(--blue);

  /* Type */
  --font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  /* Shape */
  --radius-sm: 8px;   /* inputs, popovers */
  --radius: 14px;     /* panels, cards */
  --radius-lg: 20px;  /* large frames, modals */
  --radius-pill: 999px; /* buttons, chips, segmented controls */
  --border: 2px;

  /* Elevation */
  --shadow-pop: 4px 4px 0 var(--shadow-ink);    /* resting panel */
  --shadow-pop-lg: 6px 6px 0 var(--shadow-ink); /* hovered panel, modal */
  --shadow-float: 0 2px 4px rgb(22 20 28 / .08), 0 12px 32px rgb(22 20 28 / .14); /* popovers, menus */

  /* Motion */
  --ease: cubic-bezier(.2, .8, .2, 1);
  --dur: 160ms;
}

/* Dark mode: follows the system, unless overridden by data-theme. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* same values as [data-theme="dark"] below */ }
}
:root[data-theme="dark"] {
  --paper: #121118; --surface: #1C1A24; --surface-2: #26232F;
  --ink: #F6F3EE; --ink-2: #CAC6D4; --ink-3: #9C98AA;
  --line: #5A5670; --line-soft: #2F2C3A; --shadow-ink: #050407; --dot: rgb(246 243 238 / .07);
  --red: #FF4560;    --red-soft: #3D1620;    --red-ink: #FF8FA0;    --on-red: #16141C;
  --blue: #4F82FF;   --blue-soft: #152349;   --blue-ink: #9DB8FF;   --on-blue: #0F0E14;
  --yellow: #FFD23F; --yellow-soft: #3A2E08; --yellow-ink: #FFD86A;
  --green: #2BD38A;  --green-soft: #0F3324;  --green-ink: #6FE6B0;
  --violet: #9673FF; --violet-soft: #261A4D; --violet-ink: #C3B0FF; --on-violet: #0F0E14;
  --cyan: #33D3F2;   --cyan-soft: #0B3340;   --cyan-ink: #8BE6F7;
  --orange: #FF8E3C; --orange-soft: #3D2210; --orange-ink: #FFB27A;
  --shadow-float: 0 2px 4px rgb(0 0 0 / .4), 0 12px 32px rgb(0 0 0 / .5);
}
```

In the real CSS file, the dark values are written out in **both** dark blocks, as in `design-preview.html`. The comment above is shorthand.

**Contrast:**
- Every text/background pair above meets **WCAG AA** (at least 4.5:1 for body text).
- In dark mode, the bright fills get **dark** text (`--on-*`), because white on the lighter dark-mode brights fails contrast.

---

## 4. Typography

| Role | Font | Weight | Size / line-height | Tracking | Use |
|---|---|---|---|---|---|
| Display | Bricolage Grotesque | 800 | 56–88 / 0.95 | −3.5% | Home hero only |
| H1 (page title) | Bricolage Grotesque | 800 | `clamp(28px, 4.2vw, 40px)` / 1.05 | −2% | One per page, inside the page header |
| H2 | Bricolage Grotesque | 700 | 28 / 1.15 | −2% | Section headings (e.g. "Season 1") |
| H3 | Bricolage Grotesque | 700 | 18–20 / 1.25 | −1% | Card titles, recap row titles |
| Body | Plus Jakarta Sans | 400 / 500 | 16 / 1.6 | 0 | Everything else |
| Reading | Plus Jakarta Sans | 400 | 17 / 1.75, **max 68ch** | 0 | Recap text only |
| Small | Plus Jakarta Sans | 500 | 14 / 1.5 | 0 | Meta, hints, table cells |
| Label | Plus Jakarta Sans | 700 | 14 | 0 | Form labels |
| Eyebrow | JetBrains Mono | 700 | 12, UPPERCASE | +10% | Above page titles, section labels |
| Data | JetBrains Mono | 500 / 700 | 13–15, tabular numbers | 0 | Years, `S01·E01` codes, counts, universe names |

**Loading the fonts** in Next.js uses `next/font/google`: `Bricolage_Grotesque` (500, 700, 800), `Plus_Jakarta_Sans` (400, 500, 600, 700) and `JetBrains_Mono` (500, 700). Each is exposed as a CSS variable that feeds `--font-display`, `--font-body` and `--font-mono`.

**Formats:**
- Episode code: `S01·E01`, with a middle dot.
- BCE years: written with a real minus sign, `−5000`.
- Year ranges: `1942–1945`, with an en dash.

---

## 5. Layout and Spacing

- **Spacing scale (4px base):** 4, 8, 12, 16, 20, 24, 32, 40, 56, 64. Use only these values.
- **Content width:** max 1200px, centred.
- **Side gutters:** 16px on phones, 20px on tablets, 32px on desktop. **The page never scrolls sideways.** Wide content (tables, the timeline) scrolls inside its own panel.
- **Breakpoints:** 520px (small phone tweaks), 700px (timeline switches to vertical), 860px (header nav moves to a scrollable tab row), 900px (detail pages go to one column).
- **Grids:**
  - Recap detail: content plus a 300px side column, stacking under 900px.
  - Forms: 2 columns, stacking under 640px.
  - Card grids: `repeat(auto-fit, minmax(min(100%, 340px), 1fr))`.

---

## 6. Signature Elements

### Panel
`background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow-pop);`
- When it's **clickable**, it moves up and left by 2px on hover, and the shadow grows to `--shadow-pop-lg`.
- When it's **not clickable**, it doesn't move.

### App header (every page)
1. The 6px **five-colour stripe** sits at the very top.
2. Below it, a surface bar 64px tall with a 2px bottom outline. It holds:
   - The logo mark (yellow, tilted −6°, ink outline).
   - The "Marvel Directory" wordmark.
   - Nav pills: the active one is filled ink, with paper-coloured text.
   - The global search box on the right, with a `⌘K` hint.
3. Under 860px, the nav moves to a horizontally scrollable pill row under the header, and the search box fills the header width.

### Page header (every page, no exceptions)
A panel at the top of the content containing:
- **Eyebrow:** a short coloured bar plus mono uppercase context, e.g. "LOKI · SEASON 1 · EPISODE 1" or "CHARACTERS · NEW".
- **H1 title**, plus an optional subtitle line or progress bar.
- **Actions** aligned right. They wrap below the title on phones.
- A **halftone dot corner** in the section accent colour, top right, at about 35% opacity, fading out.

### Halftone
A radial-gradient dot pattern (`--dot`, 10–12px grid). It's for decoration only: page header corners, empty states, the home hero. It never sits behind text that has to be read.

---

## 7. Components

Build these once in `src/components/ui/` (shadcn/ui restyled with the tokens), and use them everywhere.

| Component | Spec |
|---|---|
| **Button: primary** | Red fill, `--on-red` text, 2px ink outline, pill, min height 42px, 700 weight, 3px offset shadow. Hover moves it −1px with a 4px shadow. Pressed moves it +2px with a 1px shadow. **Max one per view.** |
| **Button: secondary** | Surface fill, ink text, same outline and shadow. |
| **Button: blue / yellow** | For named secondary actions only: blue for "Reorder", yellow for "Download backup". |
| **Button: ghost** | No outline or shadow. Surface-2 background on hover. Used for Cancel and Clear all. |
| **Button: danger** | Surface fill, `--red-ink` text, red outline, red offset shadow. Never filled red, so it can't be mistaken for primary. |
| **Button sizes** | Default 42px. `sm` 34px. Icon-only buttons are 42px square, with an `aria-label`. |
| **Chip** | Pill, 26px tall, 12px bold. Exact chip colours are in §2. Movie and Show chips have a leading dot. Tag chips have a `#` prefix. Universe chips use mono. |
| **Watched chip** | Green fill, "✓ Watched". **Not watched:** transparent, dashed `--ink-3` outline, `--ink-3` text. |
| **Episode code / year** | Mono 700, 12–13px. Codes sit on a `--surface-2` rounded tag. Years are plain `--ink-2` text. |
| **Input / select / textarea** | Surface background, 2px ink outline, 8px radius, min height 44px. On focus: blue outline, a 4px `--blue-soft` ring and a 3px blue offset shadow. On error: red outline, a `--red-soft` ring, and a message below in `--red-ink`, 600 weight. The recap paste area uses mono 14px. |
| **Combobox** | Input plus a popover: 2px outline, `--shadow-float`. The active option is `--blue-soft` with `--blue-ink` text. The universe combobox ends with a dashed divider and "＋ Add universe '…'" in `--violet-ink`. |
| **Segmented control** | Pill group with a 2px outline and dividers. The selected segment is ink-filled. Used for Watched/Not watched, Movies/Shows and timeline zoom. |
| **Radio pills** | For short fixed choices (Importance, Status, Movie/Show). A row of outlined pills. The selected one is filled with its meaning's colour (Alive green, Major violet) plus a 2px shadow. Use these instead of a dropdown when there are 4 options or fewer. |
| **Filter chip** | 34px pill with an outline and a ▾ caret. When **active**: `--violet-soft` fill, violet outline, plus a round violet ✕ to remove it. |
| **Search box** | Pill, 42px, outlined, with a magnifier icon and a `⌘K` key hint (the hint is hidden on phones). |
| **Progress bar** | 14px pill track (`--surface-2`, 2px outline). The fill has green diagonal stripes, with an ink edge. The label sits next to it in mono, e.g. "4 / 6" or "38%". |
| **Toast** | Ink background, paper-coloured text, yellow offset shadow. Bottom right on desktop, bottom centre on phones. Auto-dismisses after 4 seconds. |
| **Table** | Inside an outlined panel that scrolls sideways when needed. Header row: `--surface-2`, mono uppercase 12px, 2px bottom outline. The sorted column shows a red ▲ or ▼. Rows: 1.5px `--line-soft` dividers, `--yellow-soft` on hover. Linked cells are underlined with a `--line-soft` underline. |
| **Recap row** | A panel with: drag handle (only in Reorder mode), 6px kind bar (red or blue), title in H3, then a meta row (chip, code, year, tags), and the watched chip on the right. **Unwatched:** paper background, dashed outline, no shadow, `--ink-2` title. **While dragging:** blue outline, 8px blue shadow, rotated −0.35°. |
| **Group label** | Mono uppercase `--ink-3` text plus a line that fills the rest of the width, e.g. "1940S". Used to break up the recap list by decade. |
| **Timeline pin** | A 136px card with a coloured dot and a 3px offset shadow in the movie or show colour. On hover or focus it lifts, and a **popover** opens: a surface panel with `--shadow-float` containing the chip, title, details and a "Read recap →" link in `--red-ink`. The popover is **portalled** (Radix Popover or HoverCard), so the scrolling timeline can't clip it. On phones it's tap to expand, inline. |
| **Timeline axis** | A 6px ink line. Year pills are mono, outlined and on surface. Gap markers are dashed pills reading "⋯ 50 yrs ⋯" that interrupt the line. |
| **Side card (detail page)** | A panel with an H4 heading and a key/value list: labels in `--ink-3`, values right-aligned at 600 weight, numbers in mono. |
| **Character avatar** | A 24px circle with an ink outline and the initial in display 800, on a hero-colour fill picked from the name. The colour is consistent per character. |
| **Empty state** | Dashed `--ink-3` outline, halftone background, a tilted yellow icon tile with an outline and pop shadow, an H3, one sentence, and one primary action. |
| **Danger zone** | A panel with a red outline and red shadow, a heading in `--red-ink`, plain-language consequences, a typed confirmation input, and a danger button that stays disabled until the text matches. |
| **Modal / dialog** | A `--radius-lg` panel with `--shadow-pop-lg`, over an ink backdrop at 40% opacity. Same header pattern as the page header, without the halftone. |
| **Skeleton (loading)** | `--surface-2` blocks shaped like the final content, with a gentle 1.2-second pulse. Never a lone spinner for page loads. |

**Icons:** use `lucide-react` with 2px stroke, at 18px inline or 20px in buttons. Icons always appear alongside a text label, except for icon-only buttons, which have an `aria-label`.

---

## 8. Page Templates

Every route in the implementation plan uses one of these. **No route gets a bespoke layout.**

| Template | Structure | Routes |
|---|---|---|
| **List** | Page header (title, count eyebrow, primary action) → toolbar (segmented filters, filter chips, result count) → list or table → empty state if there are no items | `/recaps`, `/characters`, `/titles`, `/universes`, `/tags`, `/search` |
| **Detail** | Page header (context eyebrow, title, chips, Edit) → 2-column grid (reading panel and side cards) → previous/next panels | `/recaps/[id]`, `/characters/[id]`, `/titles/[id]` |
| **Form** | Page header ("SECTION · NEW/EDIT" eyebrow, title, a one-line hint) → one panel with the form grid → footer: Cancel (ghost), Save & add another (secondary), Save (primary) | every `/new` and `/edit` route |
| **Canvas** | Page header → toolbar → full-width visual (the timeline) | `/timeline` |
| **Settings** | Page header → a stack of panels, one per task. Destructive tasks go in a danger zone panel at the bottom. | `/backup` |
| **Message** | Centred empty-state-style panel: a tilted icon tile, an H1 (e.g. "Lost in the multiverse"), one sentence, and a "Back to Recaps" primary button | 404, error boundary |

The home page `/` shows:
- A hero-style page header with the overall watched progress.
- Three large clickable panels (Recaps, Timeline, Characters), each in its section accent colour.
- A "Recently edited" list.

---

## 9. Motion

- Default transition is `var(--dur)` (160ms) with `var(--ease)`, on transform, box-shadow, background and opacity only.
- Allowed movement: hover lift (−1 or −2px), press sink (+2px), popover fade plus 6px slide, toast slide-in, and drag tilt.
- Under `prefers-reduced-motion: reduce`, all transitions and animations are turned off.

---

## 10. Accessibility

- **Focus:** every interactive element shows a 3px `--focus` outline with a 2px offset, or the input focus ring. Never remove focus styles.
- **Hit targets:** at least 40×40px (buttons are 42px tall, `sm` is 34px but only used in dense toolbars, with 8px gaps).
- **Colour is never the only signal:**
  - Movie and Show chips include the word.
  - Watched shows "✓ Watched".
  - Status chips include the word.
  - Unwatched rows also use a dashed outline.
- **Drag and drop has a keyboard path:** dnd-kit's keyboard sensor, plus "Move up/down" items in each row's ⋯ menu.
- **Timeline popovers** open on focus as well as hover, and close on Esc.
- **Text contrast:** all pairs come from the token table, which meets AA. Never put white text on yellow, green, cyan or orange.

---

## 11. Implementation Mapping

- **Tokens file:** `src/styles/tokens.css` holds §3 exactly, imported once in `app/globals.css`.
- **Tailwind v4:** expose the tokens with `@theme inline`, e.g. `--color-paper: var(--paper); --color-red: var(--red); --radius-panel: var(--radius); --shadow-pop: var(--shadow-pop); --font-display: var(--font-display)`, so classes like `bg-paper text-ink shadow-pop rounded-panel font-display` work.
- **shadcn/ui variables** map onto our tokens:

  | shadcn variable | Our token |
  |---|---|
  | `--background` | `--paper` |
  | `--foreground` | `--ink` |
  | `--card` / `--popover` | `--surface` |
  | `--primary` | `--red` |
  | `--primary-foreground` | `--on-red` |
  | `--secondary` / `--muted` | `--surface-2` |
  | `--muted-foreground` | `--ink-3` |
  | `--accent` | `--yellow-soft` |
  | `--destructive` | `--red` |
  | `--border` / `--input` | `--line` |
  | `--ring` | `--focus` |
  | `--radius` | `14px` |

  After adding each shadcn component, restyle it to the §7 spec: 2px outlines, pop shadows, pills. Don't keep shadcn's default thin grey look.
- **Theme switch:** `data-theme` on `<html>`, defaulting to the system setting, with a toggle in the header menu. The choice is remembered in `localStorage`, wrapped in try/catch.
- **Shared layout components** in `src/components/layout/`: `AppShell` (stripe, header, mobile nav), `PageHeader` (eyebrow, title, subtitle, actions, accent), `EmptyState`, `DangerZone`. **Every page must render inside `AppShell` and start with `PageHeader`.**

---

## 12. Rules

**Do**
- Use tokens for every colour, radius, shadow and font. Components contain no raw hex values.
- Start every page with `PageHeader`, using the correct section accent.
- Keep red for movies and blue for shows, everywhere.
- Set years, episode codes, counts and universe names in mono.
- Give every list and table an empty state.
- Check every screen at 390px and 1280px, in light and dark mode.

**Don't**
- Don't use more than one primary (red) button per view.
- Don't put white text on yellow, green, cyan or orange fills.
- Don't put halftone or bursts behind readable text, or use them as wallpaper.
- Don't leave shadcn's default styling on any component.
- Don't create one-off layouts, colours or fonts for "just this page".
- Don't use official Marvel logos or artwork.

---

## 13. Design Review Checklist (run at the end of every phase)

For each new or changed page:

- [ ] Renders inside `AppShell` and starts with `PageHeader`, with the correct accent and an eyebrow
- [ ] Matches the matching template in §8 and looks like its screen in `design-preview.html`
- [ ] No raw hex values or one-off styles in the diff (`grep -E "#[0-9a-fA-F]{3,6}" src/components src/app` returns only token files)
- [ ] Movie is red and Show is blue. Watched is green. Chips match §2.
- [ ] Years, codes and counts are in mono
- [ ] Works at **390px** (no sideways page scroll, actions wrap) and at **1280px**
- [ ] Works in **light and dark**
- [ ] Keyboard: Tab reaches everything, focus is visible, Esc closes popovers and dialogs
- [ ] Empty, loading (skeleton) and error states are designed, not left as defaults
- [ ] Playwright screenshots of the page (light and dark, 390 and 1280) are taken and checked against the preview
