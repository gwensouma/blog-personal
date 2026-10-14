# Spec: up-next

Status: approved by the user on 2026-10-14 (all four defaults kept; the WIP is reused by merging `main` into
`feat/up-next`, so PR #10 stays) · Roadmap: phase B, sprint 4 (`feat/up-next`, draft PR #10) · Author: planner

## Problem
A reader who finishes a post has no single clear "what to read next". The end of the page offers three link
blocks (the series nav, the prev/next cards and related posts) that can point at the same post, and on a series post
`PostArticle` hides the duplicates with a stopgap filter (`components/posts/post-article.tsx:42-51`, "Sprint 4 reworks
this end block"). The owner wants one recommended next read at the end of every post: the next part of the series,
else the most related post, with the rest of the ending deduped around it.

## RSC lesson
**Derive the view once on the server and pass plain props.** One `lib/data/` call (`getPostEnding`) decides the whole
post ending (pick, neighbours, related, dedup) in one pass over the post list, so components only render and no
client code ever sees the full list. The card itself is a Server Component with CSS-only hover and focus effects; its
only client code is the existing `Reveal` wrapper, which passes server-rendered children through. Secondary lesson: a
pure decision function, separate from I/O, is what makes server logic unit-testable for edge cases that the real
content can't produce.

## Research

### What the WIP already does (commit `d4dc257`, branch `origin/feat/up-next`, draft PR #10)
Read with `git diff main...origin/feat/up-next`; 8 files, +285/-59. The gates (typecheck, lint, build, `npm test`
81/81) passed on its own base; no reviewer or tester has seen it.

- **Data** (`lib/data/posts.ts`): `getPostEnding(slug): Promise<PostEnding>` replaces `getAdjacentPosts` (removed;
  only the post page used it). The helpers `realSeriesSlug`, `seriesPartsOf` and `rankRelated` are shared with
  `getRelatedPosts` (kept, `tests/unit/posts.test.ts:34-70` uses it) and `getPostSeries`. Up-next rules, first match
  wins:
  1. a real series (2+ parts) and not the last part: the next part (`reason: "series"`);
  2. else the top related post (`"related"`); if that post is a part of *another* real series, the pick becomes that
     series' part 1;
  3. else the newer chronological neighbour (`"newer"`), else the older one (`"older"`); series parts of the current
     post's own series are skipped;
  4. else `null`.
  Dedup, priority up next > adjacent > related: an adjacent slot is null when it holds the pick or an own-series part;
  related drops the pick and both neighbours *before* taking the top 3, so the list stays full when it can.
- **Types** (`types/post.ts`): `UpNextReason`, `UpNext`, `PostEnding`.
- **UI** (`components/posts/up-next.tsx`, new, a Server Component): a `<section aria-labelledby>` (via `Reveal
  as="section"`) with an `h2` "Up next", a card with cover, reason label, `h3` title link stretched over the card with
  `::after`, excerpt, reading time and an arrow chip. `rel="next"`/`"prev"` where the order is real. Hover/focus
  motion is CSS (`motion-safe:` / `motion-reduce:transition-none`); the card draws its own focus ring
  (`has-focus-visible:`) because `overflow-hidden` would clip it. Renders nothing for `null`.
- **Wiring**: the page fetches `[getPost, getPostSeries, getPostEnding]` in parallel
  (`app/(blog)/posts/[slug]/page.tsx`); `PostArticle` takes `ending` instead of `adjacent` + `related` and drops its
  stopgap filter. New end order: article footer (like/share) → Up next → newsletter → prev/next → related.
- **Series nav** (`components/posts/post-series.tsx`): `PostSeriesNav` gets `hideNext`; the Up next card replaces its
  "Next in series" link, and on part 1 the nav isn't rendered at all (no way back, and the box at the top already says
  where the reader is).
- **Docs**: `.design/blog-refactor.md` gets an "Up next (sprint 4)" section (layout, labels, motion, focus, the
  series-nav decision); its copy of `.design/roadmap.md` gets a "Sprint 4 status" section.

### What remains (from the WIP's "Sprint 4 status", checked against `main`)
1. `tests/e2e/no-js.spec.ts:67` expects a "Next in series" link in the series nav: it fails with the WIP. It must expect
   the link inside the "Up next" region instead, and no next link in the series nav.
2. Unit tests for the ending: the per-post table below and the invariants.
3. An e2e no-JS check of the Up next card.
4. The open naming point: the series nav's `aria-label` "<name>: previous and next part" is no longer accurate.
5. Reviewer pass with a browser check at 320/768/1280 (the builder only checked the server HTML), full gates and e2e.
6. Not in the WIP list but needed: `.design/product.md` "Post" update (the ending changed), and the empty-ending case
   (no candidate at all) is not testable against the real content (see AC6).

### What changed on `main` since the WIP base (36 commits)
`git diff --stat origin/feat/up-next~1 main` touches none of the WIP's code files or `.design/blog-refactor.md`.
Sprint 8 changed the home page only (`app/(blog)/page.tsx`, `featured-post`, `latest-posts`, `cover-deck`, removed
`post-list-skeleton.tsx`); the post page, `post-article.tsx`, `post-series.tsx`, `lib/data/posts.ts` and
`types/post.ts` are as the WIP left them. New on `main`: `tests/unit/conventions.test.ts` (kebab-case names, no
barrels; `up-next.tsx` passes), `tests/unit/guard-hook.test.ts`, more `no-js.spec.ts` and `home.spec.ts` cases, and the
guard hook. **The only conflict is `.design/roadmap.md`**, which `main` rewrote; the WIP's roadmap hunk (status section,
`🚧` row) should be dropped, since this spec and the sprint brief now hold that state.

### Checked against decisions and product
- **D-011**: the card renders inline, with no `<Suspense>` around it, and `Reveal` uses `initial={false}`
  (`components/motion/reveal.tsx:33`), so the server HTML is visible without JS. Compliant. Likes and views keep their
  own `<Suspense>` (allowed: per-visitor, JS-dependent).
- **D-003** (bold motion, transform/opacity, reduced motion): the card animates `translate`, `scale` and
  `border-color`/`color` transitions (colour transitions are not layout animation; acceptable, as elsewhere in the
  site). Compliant.
- **D-007 / sprint 9**: comments also land at the end of `post-article.tsx` (roadmap "Phase D plan"). See Scope.
- **product.md "Post `/posts/[slug]`"** changes on purpose (listed under Scope).
- No new dependency; no new client component.

### Per-post outcome with today's content (WIP rules; the tester's fixture table)
| Post | Up next (reason, label) | Series nav | Prev/next cards | Related |
|---|---|---|---|---|
| `rsc-shrinks-your-bundle` (part 3/3) | `streaming-with-suspense` (related, "Related reading") | previous only, "final part (3 of 3)" | none | `caching-in-the-app-router`, `designing-the-rsc-boundary` |
| `client-components-render-twice` (part 2/3) | `rsc-shrinks-your-bundle` (series, "Next in RSC Fundamentals · Part 3 of 3") | previous only, "part 2 of 3" | none | `designing-the-rsc-boundary` |
| `server-components-run-on-the-server` (part 1/3) | `client-components-render-twice` (series, "… Part 2 of 3") | not rendered | older: `streaming-with-suspense` | `designing-the-rsc-boundary` |
| `streaming-with-suspense` | `server-components-run-on-the-server` (related, "Start the RSC Fundamentals series") | — | older: `server-actions-for-mutations` | `rsc-shrinks-your-bundle`, `caching-in-the-app-router` |
| `server-actions-for-mutations` (no related) | `streaming-with-suspense` (newer, "Newer post") | — | older: `caching-in-the-app-router` | none |
| `caching-in-the-app-router` | `server-components-run-on-the-server` (related, "Start the …") | — | newer: `server-actions-for-mutations`, older: `designing-the-rsc-boundary` | `rsc-shrinks-your-bundle`, `streaming-with-suspense` |
| `designing-the-rsc-boundary` | `server-components-run-on-the-server` (related, "Start the …") | — | newer: `caching-in-the-app-router`, older: `why-i-started-this-journal` | `rsc-shrinks-your-bundle`, `client-components-render-twice` |
| `why-i-started-this-journal` (no series, no related) | `designing-the-rsc-boundary` (newer, "Newer post") | — | none | none |

The tester verifies this table against the code rather than trusting it; a mismatch is a finding, not a test to bend.

### Outside sources
None changed the plan. Reference only: React `cache` (https://react.dev/reference/react/cache, `loadAllPosts` is
wrapped at `lib/data/posts.ts:124`, so the three parallel calls read the files once per request) and Next.js
parallel data fetching (https://nextjs.org/docs/app/getting-started/fetching-data).

## Options
| Option | How | Cost | Risk |
|---|---|---|---|
| A. Reuse the WIP | The lead cherry-picks `d4dc257` onto a fresh branch from `main` (or rebases `feat/up-next`), resolves `.design/roadmap.md` by keeping `main`'s version, then the sprint finishes "What remains" | Low: one trivial conflict; the sprint is tests, a small refactor and a review | The code was written before the file handoff and never reviewed; the reviewer must read it as new code. Mitigated by the per-post table and the invariant tests |
| B. Redo from this spec | Close PR #10, re-implement data and UI from scratch | High: repeats ~285 lines of working, gated code | Low code risk, but likely converges on the same design; wastes a sprint |
| C. Reuse data, redo UI smaller | Keep `getPostEnding`; replace the card with a plain link and leave the series nav as it is | Medium | Loses the card the user's design direction asks for (D-003), and keeps the series-nav duplicate the feature is meant to remove |

Recommendation: **A**. `main` has not touched any WIP code file, so reuse costs one docs conflict, and the remaining
work (tests, review, two small cleanups) is what a fresh build would need anyway. Rebase vs cherry-pick is the lead's
call; a cherry-pick onto a new branch from `main` that then replaces `feat/up-next` keeps PR #10's history simple
(only `main` is protected, D-010).

Two cleanups on top of the WIP, both small:
1. **Pure decision function.** Move the decision in `getPostEnding` into a pure, exported function in
   `lib/post-ending.ts` (CLAUDE.md rule 7: no React, no I/O), e.g. `decidePostEnding(posts: PostSummary[], slug:
   string): PostEnding`, with `realSeriesSlug`/`seriesPartsOf`/`rankRelated` beside it or kept in `posts.ts` and
   passed in, the developer's choice. `getPostEnding` loads the list and delegates. This makes the empty ending (AC6)
   and other edge cases testable with small fixtures, since the real content always has a neighbour.
2. **Series nav without a next link.** With the WIP rules, whenever a next part exists the up-next pick *is* that
   part, so `PostSeriesNav` never shows "Next in series" any more; `hideNext` is always true where it matters. Drop the
   next link and the prop, keep "Previous in series" and the "part n of N" / "final part" line, and rename the
   `aria-label` to "<name>: previous part" (the WIP's open point 4). The builder confirms this reading of the code.

## Questions for the user
1. **Fallback beyond the roadmap line.** The roadmap says "next in series, else the most related post". The WIP also
   falls back to the newer, then older post, so every post gets a card (today `server-actions-for-mutations` and
   `why-i-started-this-journal` have no related post). Default: keep the fallback.
2. **Related pick inside another series starts at part 1.** On `streaming-with-suspense`, `caching-in-the-app-router`
   and `designing-the-rsc-boundary`, the most related post is a later RSC Fundamentals part, so the card says "Start the
   RSC Fundamentals series" and links part 1, which may share no tag with the current post (true for streaming and
   caching), while the later part still appears under Related. Default: keep (a series is read from the start).
3. **Series nav shrinks.** The "Next in series" link moves into the Up next card, and part 1 shows no series nav at
   all (the series box at the top stays). Default: keep, with the cleanup above.
4. **End order.** Like/share → Up next → newsletter → prev/next → related (Up next before the newsletter). Default:
   keep.

**Answered by the user on 2026-10-14: keep all four defaults.**

No conflict with `.design/decisions.md`.

## Scope
- In:
  - Bring the WIP onto `main` (option A); drop its roadmap hunk.
  - Developer: `lib/post-ending.ts` pure decision function; `getPostEnding` delegates; keep `getRelatedPosts` and its
    behaviour; review the WIP data code and types as new code. Update `.design/product.md` "Post `/posts/[slug]`"
    (below).
  - Builder: `PostSeriesNav` without a next link or `hideNext`, `aria-label` "<name>: previous part"; `PostArticle`
    passes no `hideNext`; review `up-next.tsx` against the UI rules and at 320/768/1280, light and dark; update the
    "Up next (sprint 4)" and "Post series" bullets in `.design/blog-refactor.md` to match.
  - **A clean place for sprint 9:** keep the end of `PostArticle` a flat list of sibling sections in the one
    `ReadingColumn` (no wrapper that couples Up next with the newsletter or the cards), with the order comment above
    it, so sprint 9 adds its comment section as one sibling (or inside `<article>` after the footer) without touching
    the Up next logic. `PostArticle`'s props stay `post`, `series`, `ending`; comments will add their own prop. Where
    comments go is sprint 9's spec, not this one.
  - Tester: fix `tests/e2e/no-js.spec.ts:63-74` (new label, no next link in the nav), add Up next no-JS e2e and
    `getPostEnding`/`decidePostEnding` unit tests (table + invariants + fixtures).
  - product.md change, "Post `/posts/[slug]`": second bullet becomes "Ends with likes and views, share links, an
    **Up next** card (the next series part, else the most related post, else the newer or older post), the newsletter,
    prev/next and related posts; a post appears at most once in this ending. When in a series: the series box at the
    top and a series nav back to the previous part (none on part 1)." No-JS bullet: add "the Up next card" to the
    visible list.
- Out (deferred):
  - A `/series/<slug>` page; reading lists; "Continue where you left off" (needs per-visitor state).
  - Any change to the related-post ranking (tag overlap) or to `getRelatedPosts`.
  - Comment placement (sprint 9).
  - Tracking clicks on the card (analytics are a non-goal).

## Acceptance criteria
Content-dependent ACs use `content/posts` as the fixture (as `no-js.spec.ts` does).

- AC1: On `/posts/client-components-render-twice` (part 2 of 3) a region named "Up next" shows the label "Next in RSC
  Fundamentals · Part 3 of 3" and one link "RSC helps shrink the JavaScript sent to the browser" to
  `/posts/rsc-shrinks-your-bundle` with `rel="next"`. The series nav (named "RSC Fundamentals: previous part") shows
  "RSC Fundamentals, part 2 of 3" and a "Previous in series" link, and has no "Next in series" link.
- AC2: On `/posts/server-components-run-on-the-server` (part 1) the Up next card links
  `/posts/client-components-render-twice`; the series box is shown at the top and no series nav is rendered.
- AC3: On `/posts/rsc-shrinks-your-bundle` (last part) the series nav says "RSC Fundamentals, final part (3 of 3)"
  with no next link, and the Up next card is labelled "Related reading" and links a post outside the series.
- AC4: On `/posts/streaming-with-suspense` (no series, top related post is in a series) the card is labelled "Start
  the RSC Fundamentals series" and links `/posts/server-components-run-on-the-server`.
- AC5: **No series and no related post:** on `/posts/why-i-started-this-journal` the card is labelled "Newer post",
  links `/posts/designing-the-rsc-boundary` with `rel="next"`, no "Related posts" section is rendered, and no prev/next
  block is rendered (its only neighbour is already the card). On `/posts/server-actions-for-mutations` the card is
  "Newer post" → `streaming-with-suspense`, the prev/next block shows only the older post, and there is no related
  section.
- AC6: **No candidate at all** (unit test with a fixture list, e.g. a single post, through the pure function): the
  ending is `upNext: null`, both adjacent slots `null`, `related: []`; `UpNext` renders nothing for `null` (no heading,
  no empty section). An unknown slug gives the same empty ending, and `/posts/does-not-exist` stays a 404.
- AC7: For every post in `content/posts`: no slug appears twice across up next, prev/next and related; the current
  post never appears; no part of the post's own real series appears in prev/next or related; related has at most 3
  posts; the outcome matches the table in Research (or the mismatch is reported).
- AC8: The end of every post reads, top to bottom: like/share footer, Up next (when present), newsletter, prev/next
  (when present), related (when present).
- AC9: **No JS:** with JavaScript disabled, on the posts in AC1–AC5 the Up next region, its label, title, excerpt and
  link are visible in the server HTML (not a skeleton, not hidden), and following the link loads the target post. The
  series nav and the other end blocks stay visible as in product.md.
- AC10: Keyboard: the card has exactly one tab stop (the title link; the cover is decorative), and focusing it shows a
  visible focus indication on the card. With `prefers-reduced-motion: reduce` the card doesn't lift, zoom or slide.
- AC11: At 320, 768 and 1280 px, light and dark, the card has no horizontal overflow and long titles wrap (reviewer,
  by eye).
- AC12: No new `"use client"` file and no new dependency; `npm run gate` and `npm run test:e2e` pass;
  `.design/product.md` and `.design/blog-refactor.md` describe the new ending.

## Sprint split
| Sprint | Branch | Scope | Owners |
|---|---|---|---|
| 4 | `feat/up-next` (PR #10, refreshed on `main`) | Lead brings `d4dc257` onto `main`; developer: pure `lib/post-ending.ts`, data/type review, product.md; builder: series nav cleanup, card review, blog-refactor.md; tester: AC1–AC10 tests; reviewer: full pass incl. browser at 320/768/1280 | lead, developer, builder, tester, reviewer |
