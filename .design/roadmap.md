# Roadmap

Owner: planner (lead). Execution: orchestrator → builder ⇄ reviewer, per CLAUDE.md "Agent workflow".
Repo: https://github.com/gwensouma/blog-personal (branch `main`).
Last updated: 2026-10-10.

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
1. **Version control.** Add `origin` → the repo above, rename `master` → `main`, and commit the full baseline once the
   tree builds. Keep `.data/`, `.next/`, `.env` and `.playwright-mcp/` out of it (`.gitignore` already does this).
   After that, one commit per finished, reviewed task.
2. ✅ **Re-verify the store** (`lib/data/store.ts`): like ×3 then GET and check `.data/postStats.json`, then 20 parallel
   GETs + 20 parallel likes. Also check that the newsletter `role="alert"` is announced on Enter-submit.
3. **Agent definitions.** In `reviewer.md`, replace "editorial restraint" with the bold-motion direction and add a motion
   checklist: reduced motion, `transform`/`opacity` only, content visible without JS, `LazyMotion` + `m`. Mirror the
   motion rules in `builder.md` if anything is missing.
4. **TypeScript-only.** `next.config.js` → `next.config.ts`. Check whether `scripts/with-env.js` is still needed
   (Next loads `.env*` itself). Drop it, or make it TS.
5. **Quality gate.** Add a `typecheck` script (`tsc --noEmit`) and an ESLint flat config with a `lint` script
   (`next lint` is deprecated as of 15.5). The reviewer then runs typecheck, lint and build.
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

## Working rules
- One feature = one brief → builder → reviewer loop → build/typecheck/lint pass → commit → tick it here.
- Every UI feature records its design decisions in `.design/blog-refactor.md` (or a new `.design/<feature>.md` when long).
- Ask the user before adding any dependency (zod, MDX, test runner).
