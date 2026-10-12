# Marvel Directory

A personal web app with Marvel recaps, a timeline and a character directory. Read these before doing any work:

1. `PRODUCT_PLAN.md`: what the app does. Source of truth for features.
2. `IMPLEMENTATION_PLAN.md`: stack, schema, routes, and the phase checklists. Tick tasks off there as they're completed.
3. `DESIGN_GUIDE.md`: **binding visual rules for every page** (including forms, settings, 404 and error pages). `design-preview.html` is the visual reference. Open it in a browser and match it.

## Non-negotiables
- All styling uses the tokens in `src/styles/tokens.css` (copied from `DESIGN_GUIDE.md` §3). No raw hex values in components. Don't leave shadcn's default styling.
- Every page renders inside `AppShell` and starts with `PageHeader`.
- Run the design review checklist (`DESIGN_GUIDE.md` §13) before marking a phase done.
- Tests run against the Neon `test` branch, never `production`.
- Secrets live in `.env.local` / `.env.test` (gitignored). Never print, commit or copy connection strings into docs.
- Don't add features beyond `PRODUCT_PLAN.md` without asking. Ideas go to the user first.
