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

## Commit and push after every change
- Pushes to `main` deploy to production (Vercel is connected to GitHub, and the live site is `https://marvel-movies-shows.vercel.app`). So every change goes through these steps before the turn ends:
  1. Run `npm run typecheck`, `npm run lint`, `npm run build` and `npm test`. Run `npx playwright test tests/e2e/smoke.spec.ts` too when the change touches pages or the database. If anything fails, fix it first. Never commit or push a failing change.
  2. Stage only the files you changed, with `git add <paths>`. Check `git status` first. Never stage `.env*`, `screenshots/`, `.vercel/`, `node_modules/` or `test-results/`.
  3. Commit to `main`. The message says what changed and why. End it with `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`.
  4. Push with `git push origin main`.
  5. Tell the user what changed: the files, what each change does, the commit hash, and the Vercel deployment status.
- Never force-push and never rewrite published history.
- Production database migrations are not automatic. Run `npm run db:migrate` (production) only when the user asks for it. Migrations go to the `test` branch first (`npm run db:migrate:test`).
