# Roadmap archive

Finished sprints and the plans behind them, moved out of [roadmap.md](roadmap.md) so the live roadmap stays short.
Newest first. Read this for history; plan from the roadmap.

## Merged sprints

| # | Branch | Scope | Blocked by |
|---|---|---|---|
| 4 ✅ | `feat/up-next` | B: Up next card at the end of a post (next series part, else related, else newer/older); deduped ending; rules in `lib/post-ending.ts` ([spec](specs/up-next.md), [sprint folder](sprints/4-up-next/)). PR #10 | — |
| 8 ✅ | `fix/home-no-js` | Home renders featured, latest, topics and the cover deck inline (no `<Suspense>` on ISR `/`); no-JS home test un-parked; first full run of the file handoff ([sprint folder](sprints/8-home-no-js/)). PR #22 | — |
| 1 ✅ | `chore/stabilize` | A4 + A5, and update CLAUDE.md Commands | — |
| 2 ✅ | `feat/markdown-callouts-footnotes` | B: `> [!NOTE]/[!TIP]/[!WARNING]` callouts + styled GFM footnotes | — |
| 3 ✅ | `feat/post-series` | B: `series` + `seriesOrder` frontmatter, series box, series nav. First series "RSC Fundamentals": server-components-run-on-the-server (1) → client-components-render-twice (2) → rsc-shrinks-your-bundle (3) | — |
| 5 ✅ | `feat/archive-by-year` | E: `/posts` grouped by year, pagination kept | — |
| 6 ✅ | `feat/popular-posts` | E: top posts by views on home (ISR 5m, rendered inline, no `<Suspense>`) | — |
| 7 ✅ | `feat/search-filters` | E: tag chips + match highlight, URL params only | — |
| T ✅ | `chore/test-setup` | Vitest + Playwright Test (`js` / `no-js` projects), 81 unit + 18 e2e regression tests (see "Next up: test infrastructure") | — |

## Sprint T plan: test infrastructure (decided by the user on 2026-10-12)
The team gained a **developer** (senior fullstack) and a **tester** agent. The user chose automated tests. This sprint
runs **first**, right after #6 merges, so every later sprint ships with tests.

**Sprint T: `chore/test-setup`** (developer for config, tester for the first tests)
- Dev deps (approved): `vitest`, `@playwright/test` (plus the Chromium browser via `npx playwright install chromium`).
- `vitest.config.ts`: the `@/` alias, a Node environment, and an alias for the `server-only` import to an empty module
  so `lib/data/` can be imported. The store must be pointed at a temp dir in tests (add a small, explicit seam in
  `lib/data/store.ts`, e.g. an env var for the data dir, not test-only branches in app code).
- `playwright.config.ts`: `webServer` runs `next build && next start` on a free port, Chromium, and a `no-js` project
  with `javaScriptEnabled: false`.
- Scripts: `test` (vitest run), `test:e2e` (playwright test). Add `npm test` to the gates in CLAUDE.md "Commands",
  and gitignore the Playwright reports.
- First tests, which guard what we already learned the hard way:
  - unit: the store's serialized concurrent writes, search query normalization + highlight segmentation (an XSS
    payload stays text), series derivation, archive year counts/continued;
  - e2e: `/`, `/posts`, a post and `/search?q=…&tag=…` render their essential content with JS off; the like button
    toggles with JS on.
- `/` home with JS off is known-broken until sprint 8: mark that test `fixme` and link sprint 8.

Order after this: sprint 4 → sprint 8 → sprint 9 → sprint 10.

## Phase A: Stabilize (do first)
1. ✅ **Version control.** Add `origin` → the repo above, rename `master` → `main`, and commit the full baseline once the
   tree builds. Keep `.data/`, `.next/`, `.env` and `.playwright-mcp/` out of it (`.gitignore` already does this).
   After that, one commit per finished, reviewed task.
2. ✅ **Re-verify the store** (`lib/data/store.ts`): like ×3 then GET and check `.data/postStats.json`, then 20 parallel
   GETs + 20 parallel likes. Also check that the newsletter `role="alert"` is announced on Enter-submit.
3. ✅ **Agent definitions.** In `reviewer.md`, replace "editorial restraint" with the bold-motion direction and add a motion
   checklist: reduced motion, `transform`/`opacity` only, content visible without JS, `LazyMotion` + `m`. Mirror the
   motion rules in `builder.md` if anything is missing.
4. ✅ **TypeScript-only.** `next.config.js` → `next.config.ts`. `scripts/with-env.js` only exists so `PORT` from
   `.env.local` reaches the Next CLI. Node 22.14 is installed, so replace it with
   `node --env-file-if-exists=.env.local node_modules/next/dist/bin/next dev|start` and delete the script.
5. ✅ **Quality gate.** Add a `typecheck` script (`tsc --noEmit`) and an ESLint flat config with a `lint` script
   (`next lint` is deprecated as of 15.5). The reviewer then runs typecheck, lint and build. Update the "Commands"
   section of CLAUDE.md. Baseline on 2026-10-11: `tsc --noEmit` passes with no errors.
6. ✅ **OG leftovers.** Fraunces in `ImageResponse`, and the Phase 2 cover variations in the OG card.
