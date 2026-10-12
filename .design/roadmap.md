# Roadmap

Owner: the lead session (start it with `/lead`). Execution: lead → builder ⇄ reviewer, per CLAUDE.md "Agent workflow".
Repo: https://github.com/gwensouma/blog-personal (branch `main`).
Last updated: 2026-10-11.

## Out of scope for now
- **AI features** (`lib/ai/`): postponed by the user. Keep the data layer extensible; build nothing yet.
- **Deploy**: postponed. The `.data/` JSON store and `NEXT_PUBLIC_SITE_URL` stay as they are.
- **Data source migration** (Markdown → DB/CMS): parked. Phase C only adds an internal seam.

## Feature map

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

## Phase B: Reading experience
| Feature | What | RSC lesson |
|---|---|---|
| Post series | `series:` + `seriesOrder:` frontmatter, a "Part 2 of 3" box and series nav | derived data in `lib/data/`, a Server Component only |
| Callouts and footnotes | `> [!NOTE]`-style callouts and GFM footnotes styled in `post-body.tsx` | the hast → React pipeline, no client JS |
| Image zoom | click-to-zoom on body images | a single client leaf wrapping server-rendered `<img>` |
| "Up next" | an end-of-post card: next in series, else the most related post | composing existing data calls |

## Phase C: Content authoring (no DB yet)
| Feature | What | RSC lesson |
|---|---|---|
| PostSource seam | an internal interface in `lib/data/posts.ts` with the Markdown impl behind it | a swappable data layer |
| Frontmatter validation | a schema check at load time with clear build errors (hand-written or zod; ask before adding zod) | failing loudly on the server |
| Draft preview | `draft: true` posts visible behind Next `draftMode()` via a secret route | dynamic vs static rendering |
| MDX components | optional: custom components inside posts | Server Components in content (ask the user first) |

## Phase D: Community
| Feature | What | RSC lesson |
|---|---|---|
| Comments | name + body, stored in the JSON store, held for moderation (shown after approval), honeypot + length caps | Server Actions, `useOptimistic`, `revalidatePath` |

## Phase E: Discovery
| Feature | What | RSC lesson |
|---|---|---|
| Popular posts | the top posts by views on home or archive | reading the store in a Server Component, streamed in `<Suspense>` |
| Archive by year | group `/posts` by year (keep pagination) | pure data shaping |
| Better search | tag filter chips + highlighted matches, all in URL params | search params as state, no client fetch |
| /stats | the totals of views/likes per post | dynamic rendering + caching trade-offs |
| /now, /uses | simple pages in `app/(site)/` | route groups |

## Order
A (all) → B (series, callouts/footnotes, up next, image zoom) → E (popular, archive by year, search) → D (comments) →
C (seam, validation, preview). C goes last because the data layer is parked, but its seam is cheap and can move earlier
if a feature needs it.

## Sprints (from 2026-10-11)
Each line is one branch and one PR. The lead merges. Order: T → 4 → 8 → 9 → 10.

| # | Branch | Scope | Blocked by |
|---|---|---|---|
| 1 ✅ | `chore/stabilize` | A4 + A5, and update CLAUDE.md Commands | — |
| 2 ✅ | `feat/markdown-callouts-footnotes` | B: `> [!NOTE]/[!TIP]/[!WARNING]` callouts + styled GFM footnotes | — |
| 3 ✅ | `feat/post-series` | B: `series` + `seriesOrder` frontmatter, series box, series nav. First series "RSC Fundamentals": server-components-run-on-the-server (1) → client-components-render-twice (2) → rsc-shrinks-your-bundle (3) | — |
| 4 | `feat/up-next` | B: end-of-post card (next in series, else the most related post) | sprint 3 |
| 5 ✅ | `feat/archive-by-year` | E: `/posts` grouped by year, pagination kept | — |
| 6 ✅ | `feat/popular-posts` | E: top posts by views on home (ISR 5m, rendered inline, no `<Suspense>`) | — |
| 7 ✅ | `feat/search-filters` | E: tag chips + match highlight, URL params only | — |
| T ✅ | `chore/test-setup` | Vitest + Playwright Test (`js` / `no-js` projects), 81 unit + 18 e2e regression tests (see "Next up: test infrastructure") | — |
| 8 | `fix/home-no-js` | Remove `test.fixme` from the home no-JS test in `tests/e2e/no-js.spec.ts`. Render essential home sections inline (no `<Suspense>` on ISR `/`); add the "Suspense only around non-essential or JS-dependent content" principle to CLAUDE.md; reviewer checks routes with JS disabled | — |
| 9 | `feat/comments` | D: comments, visible immediately (see "Phase D plan") | sprint T, sprint 4 |
| 10 | `feat/comments-admin` | D: /admin with password, hide/unhide comments | sprint 9 |

Deferred: the `/search` empty-state title is a `<div>`, not a heading (a11y suggestion from the sprint T tester; fix it
with the next search touch). Also deferred inside B and E: **image zoom** (no post has body images yet), **/stats**, **/now**, **/uses** (they need
the user's own content). Re-plan after sprint 7: D (comments) next, then C.

## Working rules
- One feature = one branch (`feat/…`, `fix/…`, `chore/…` off `main`) → briefs → developer/builder → tester loop →
  reviewer loop → typecheck/lint/build/test pass → tick it here → push → `gh pr create` → lead check → the lead
  merges. Feature work always lands on `main` through a PR. The full procedure is in `/lead`.
- Branch the next sprint off `main` only after the previous PR is merged, unless the two don't touch the same files.
- Every UI feature records its design decisions in `.design/blog-refactor.md` (or a new `.design/<feature>.md` when long).
- Ask the user before adding any dependency (zod, MDX, test runner).

## Next up: test infrastructure (decided by the user on 2026-10-12)
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

## Phase D plan: comments (decided by the user on 2026-10-12)
Queue after sprint T, sprint 4 (`feat/up-next`) and sprint 8 (`fix/home-no-js`). Sprint 9 waits for sprint 4, because both edit
the end of `post-article.tsx`.

User choices: comments are **visible immediately**, and the owner can **hide** them from `/admin`. **Name only**: no
accounts and no auth library. Admin is protected by a **password in `.env`**. A **flat list**, with no replies.

**Sprint 9: `feat/comments`**
- `lib/data/comments.ts` on the existing store (key `comments`: `Record<slug, Comment[]>`). `Comment` = {id, slug, name,
  body, createdAt, hidden} in `types/comment.ts`. Exports `getComments(slug)` (visible only, oldest first) and
  `addComment()`.
- Limits: name 1–50 and body 1–2000 chars after trim, a honeypot, a 500-per-post cap, control/bidi characters
  stripped. Rate limit: with `TRUST_PROXY=1`, per left-most `x-forwarded-for`; otherwise a site-wide flood guard
  (30 per 10 min). Document the trade-off.
- `lib/actions/comments.ts` `addCommentAction` for `useActionState`: validates everything, checks that the slug
  exists, calls `revalidatePath`.
- The body is plain React text with line breaks kept: no Markdown, no HTML, no auto-links. `CommentList` is an RSC
  rendered inline (essential content, so no Suspense). `CommentForm` is the only client leaf (`useActionState` +
  `useOptimistic`), posts without JS, and puts errors in `role="alert"`. Files go in `components/comments/`. Show the
  count in the post meta. Notes go in `.design/comments.md`.

**Sprint 10: `feat/comments-admin`**
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (and `TRUST_PROXY`) go in `.env.example`. If either secret is unset,
  `/admin` returns 404.
- `lib/data/admin-session.ts`: login through a Server Action with `timingSafeEqual`. The cookie holds a 7-day expiry
  signed with HMAC-SHA256 (httpOnly, sameSite=lax, secure in prod), plus a logout action. Rotating the secret revokes
  all sessions.
- `app/(admin)/admin/login/page.tsx` and `app/(admin)/admin/page.tsx`: noindex, disallowed in `robots.ts`, and left out
  of the sitemap. The admin page lists recent comments across posts with Hide/Unhide as plain `<form action>` Server
  Actions (they work without JS). The page and every action re-check the session server-side.
- Login throttle: 10 failed attempts per 15 min (site-wide unless `TRUST_PROXY`), with a generic error message. A
  known caveat: someone else can lock the owner out for 15 min.
