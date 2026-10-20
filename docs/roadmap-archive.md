# Roadmap archive

Finished sprints and the plans behind them, moved out of [roadmap.md](roadmap.md) so the live roadmap stays short.
Newest first. Read this for history; plan from the roadmap.

## Merged sprints

| # | Branch | Scope | Blocked by |
|---|---|---|---|
| — ✅ | `feat/perf-and-palette` | Post navigation speed (opt-in `BLOG_LATENCY_MS`, memoised Markdown; D-016) and the petrol palette (D-015). Lead-run, no sprint folder. PR #27 | — |
| — ✅ | `chore/faster-tests` | One build per test round (`gate:fast`, e2e in `.next-e2e/`, `E2E_SKIP_BUILD`), Shiki preloads only used languages, Ctrl+K flake fixed (D-017). Lead-run, no sprint folder. PR #28 | — |
| 9 ✅ | `feat/comments` | D: comments on the post page, visible at once; Server Action + `useOptimistic`, works without JS; abuse limits D-024 ([spec](specs/comments.md), [sprint folder](sprints/9-comments/)). PR #38 | — |
| 16 ✅ | `chore/post-covers` | Real covers on all eight posts; e2e `coverContent` locator handles a real `<img>`, `expectShown` polls past entrance animations ([sprint folder](sprints/16-post-covers/)). PR #31 | — |
| 4 ✅ | `feat/up-next` | B: Up next card at the end of a post (next series part, else related, else newer/older); deduped ending; rules in `lib/post-ending.ts` ([spec](specs/up-next.md), [sprint folder](sprints/4-up-next/)). PR #10 | — |
| 8 ✅ | `fix/home-no-js` | Home renders featured, latest, topics and the cover deck inline (no `<Suspense>` on ISR `/`); no-JS home test un-parked; first full run of the file handoff ([sprint folder](sprints/8-home-no-js/)). PR #22 | — |
| 1 ✅ | `chore/stabilize` | A4 + A5, and update CLAUDE.md Commands | — |
| 2 ✅ | `feat/markdown-callouts-footnotes` | B: `> [!NOTE]/[!TIP]/[!WARNING]` callouts + styled GFM footnotes | — |
| 3 ✅ | `feat/post-series` | B: `series` + `seriesOrder` frontmatter, series box, series nav. First series "RSC Fundamentals": server-components-run-on-the-server (1) → client-components-render-twice (2) → rsc-shrinks-your-bundle (3) | — |
| 5 ✅ | `feat/archive-by-year` | E: `/posts` grouped by year, pagination kept | — |
| 6 ✅ | `feat/popular-posts` | E: top posts by views on home (ISR 5m, rendered inline, no `<Suspense>`) | — |
| 7 ✅ | `feat/search-filters` | E: tag chips + match highlight, URL params only | — |
| T ✅ | `chore/test-setup` | Vitest + Playwright Test (`js` / `no-js` projects), 81 unit + 18 e2e regression tests (see "Next up: test infrastructure") | — |

## Original feature plan (2026-10-11)
The feature map and phase tables the roadmap carried until 2026-10-19, kept for history. Merged items are in the
table above; what is still wanted is in the roadmap's Sprints and Backlog.

### Feature map

```
                         ┌──────────────────────────── Personal blog (RSC learning) ────────────────────────────┐
                         │                                                                                       │
 DONE (phases 1–4)       │  Home hero · featured · latest   Archive + pagination   Tags   Search   About        │
                         │  Post page: cover, TOC spy, code copy, likes/views, share, related, prev/next         │
                         │  Newsletter (Server Action) · ⌘K palette · RSS · sitemap · OG · JSON-LD · bold motion │
                         └───────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
        ┌─────────────────────────────┬──────────────────────┼──────────────────────┬──────────────────────────────┐
        ▼                             ▼                      ▼                      ▼                              ▼
 A. Stabilize               B. Reading experience    C. Content authoring    D. Community               E. Discovery
 git + main branch          post series              PostSource seam         comments (moderated)      popular posts (views)
 store re-verify            callouts / footnotes     draft preview           reactions? (no — likes    archive by year
 agent defs update          image zoom (leaf)          (draftMode)             are enough)             search: tag filter +
 JS → TS config             reading list / "next     MDX components                                      match highlight
 typecheck + lint           up" at end of post       content validation                                 /stats page (views)
 OG: Fraunces + covers                               (frontmatter schema)                               /now and /uses pages
```

Each feature names the RSC concept it teaches, because that is the point of the project.

### Phase B: Reading experience
| Feature | What | RSC lesson |
|---|---|---|
| Post series | `series:` + `seriesOrder:` frontmatter, a "Part 2 of 3" box and series nav | derived data in `lib/data/`, a Server Component only |
| Callouts and footnotes | `> [!NOTE]`-style callouts and GFM footnotes styled in `post-body.tsx` | the hast → React pipeline, no client JS |
| Image zoom | click-to-zoom on body images | a single client leaf wrapping server-rendered `<img>` |
| "Up next" | an end-of-post card: next in series, else the most related post | composing existing data calls |

### Phase C: Content authoring (no DB yet)
| Feature | What | RSC lesson |
|---|---|---|
| PostSource seam | an internal interface in `lib/data/posts.ts` with the Markdown impl behind it | a swappable data layer |
| Frontmatter validation | a schema check at load time with clear build errors (hand-written or zod; ask before adding zod) | failing loudly on the server |
| Draft preview | `draft: true` posts visible behind Next `draftMode()` via a secret route | dynamic vs static rendering |
| MDX components | optional: custom components inside posts | Server Components in content (ask the user first) |

### Phase D: Community
| Feature | What | RSC lesson |
|---|---|---|
| Comments | name + body, stored in the JSON store, visible at once and hidden from `/admin` (D-007), honeypot + length caps | Server Actions, `useOptimistic`, `revalidatePath` |

### Phase E: Discovery
| Feature | What | RSC lesson |
|---|---|---|
| Popular posts | the top posts by views on home or archive | reading the store in a Server Component, streamed in `<Suspense>` |
| Archive by year | group `/posts` by year (keep pagination) | pure data shaping |
| Better search | tag filter chips + highlighted matches, all in URL params | search params as state, no client fetch |
| /stats | the totals of views/likes per post | dynamic rendering + caching trade-offs |
| /now, /uses | simple pages in `app/(site)/` | route groups |

### Order
A ✅ (archived) → B (series, callouts/footnotes, up next, image zoom) → E (popular, archive by year, search) → D (comments) →
C (seam, validation, preview). C goes last because the data layer is parked, but its seam is cheap and can move earlier
if a feature needs it.

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
