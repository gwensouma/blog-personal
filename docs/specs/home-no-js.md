# Spec: home-no-js

Status: approved by the lead on 2026-10-14 (the user waived spec review for this sprint: "just run one full flow, no need for my approval"). Open point settled: the developer updates `.design/product.md` (Home) and `.design/popular-posts.md` in its task · Roadmap: sprint 8 (`fix/home-no-js`), a fix outside the phases · Author: planner

## Problem
With JavaScript disabled, a reader who opens `/` sees the intro, a skeleton for the featured post and a skeleton list
for the latest posts. The real featured post, the latest posts, the "Browse by topic" strip and the hero cover deck
never appear. `/` is prerendered with ISR (`revalidate = 300`), and each `<Suspense>` boundary in prerendered HTML puts
the resolved content in a `<div hidden id="S:n">` that only an inline script swaps in. The owner's rule "Essential
content renders without JS" (`CLAUDE.md`) is broken on the most visited page, and the regression test for it is
parked as `test.fixme`.

## RSC lesson
**Where a `<Suspense>` boundary is worth its cost.** A boundary only helps when the page is rendered per request, so
there's something to stream. On a static or ISR page the whole document is generated ahead of time: a boundary can't
stream, and all it does is hide its content behind a script. Async Server Components don't need a boundary at all.
The page simply awaits them on the server, and the HTML arrives complete. The rule this sprint teaches is to wrap only
content that is non-essential or JS-dependent, and never on a prerendered route. Sprint 6 already applied it to
`PopularPosts`. This sprint applies it to the rest of the home page.

## Research
- What exists in the code:
  - `app/(blog)/page.tsx:16` `export const revalidate = 300` (ISR). Lines 27–33 and 40–42 wrap `FeaturedPost`,
    `LatestPosts` and `TopicsSection` in `<Suspense>`. Lines 35–38 already render `PopularPosts` inline, and the
    comment there explains why.
  - `components/home-hero.tsx:36-40` wraps `LatestCoverDeck` in `<Suspense fallback={<CoverDeckSkeleton />}>`. It has
    the same defect: without JS, desktop readers keep the deck skeleton for good. It is the same kind of async Server
    Component (`components/posts/cover-deck.tsx`, `getPosts()`).
  - The async sections need no changes to render inline: `components/posts/featured-post.tsx:22`,
    `components/posts/latest-posts.tsx:21`, `components/tags/topics-section.tsx:6` and
    `components/posts/cover-deck.tsx` (`LatestCoverDeck`). Their data calls share the `cache()`d `loadAllPosts`
    (`lib/data/posts.ts:124`), so rendering them inline adds no extra reads.
  - Once the boundaries go, these skeletons are used nowhere: `FeaturedPostSkeleton` (`featured-post.tsx:65`),
    `LatestPostsSkeleton` (`latest-posts.tsx:45`), `CoverDeckSkeleton` (`cover-deck.tsx:64`), and
    `PostListSkeleton` (`components/posts/post-list-skeleton.tsx`, used only by `LatestPostsSkeleton`).
  - The client wrappers are already safe without JS. `Reveal` (`components/motion/reveal.tsx`) uses
    `initial={false}`, and the featured card's CSS entrance (`lib/motion.ts:66`) runs before hydration. The test
    helper `expectShown` (`tests/e2e/helpers.ts`) also fails on `opacity: 0`.
  - `.design/popular-posts.md`, "Caveats" 1 and 2: it describes the hidden-div mechanism, which was checked with curl
    against `next start`. It also lists this sprint as the "known follow-up". **Caveat 2 matters for the test:** the
    e2e server wipes `.data-e2e` before `next build` (`playwright.config.ts:42`), so the prerendered `/` has no
    views. "Most read" only shows up after an ISR regeneration more than 300 s after the build. As a result, the
    `Most read` assertion in the parked test (`tests/e2e/no-js.spec.ts:145`) can't pass during an e2e run, whatever
    this sprint does.
  - `.design/product.md` (Home) records the "Known gap" this sprint closes.
- Outside sources:
  - Next.js, [Streaming guide](https://nextjs.org/docs/app/guides/streaming), section "Verifying that streaming
    works". A resolved boundary arrives as a `<div hidden id="S:0">` plus a script that swaps it in. This confirms the
    mechanism, so nothing that sits inside a boundary on a prerendered page is visible without JS. The same guide,
    under LCP, also says: "if there's a Suspense boundary, React might use it … don't add one you don't need." That
    supports removing them rather than working around them.
  - Next.js, [`loading.js` reference](https://nextjs.org/docs/app/api-reference/file-conventions/loading): a
    `loading.tsx` wraps the page in a boundary too. So the fix must not add a `loading.tsx` to `app/(blog)/`. There is
    none today.
  - A web search for a documented no-JS fallback for streamed boundaries found nothing official. That ruled out
    option B below.

## Options
| Option | How | Cost | Risk |
|---|---|---|---|
| A | Remove the `<Suspense>` around `FeaturedPost`, `LatestPosts`, `TopicsSection` (page) and `LatestCoverDeck` (hero), render them inline like `PopularPosts`, delete the now-unused skeletons | Small: 2 edited routes/components, 4 small deletions | Low. In prod the ISR page is served from cache, so nothing is lost. In `next dev` the first paint of `/` waits for the post files (ms, local disk) |
| B | Keep the boundaries and add a `<noscript><style>` that unhides `div[hidden][id^="S:"]` and hides the fallbacks | Small | High: depends on React's private markup (`S:`/`B:` ids, `$RC`), the fallback and the content would both show or be out of order, and it can break silently on a React upgrade |
| C | Make `/` dynamic (`force-dynamic`) so the boundaries really stream | Small | Doesn't fix it: streamed content still arrives in hidden divs plus scripts, and the page loses ISR caching (sprint 6 decision) |

Recommendation: **A**. It is the only option that puts the content in the HTML. It matches the existing `PopularPosts`
pattern and the CLAUDE.md principle, and it removes code instead of adding any.

## Questions for the user
Spec review is waived for this sprint, so each default below is the decision.
1. Does the hero cover deck (desktop only, a decorative link to `/posts`) count as essential? **Decided: render it
   inline too.** It isn't essential (the "View all posts" link covers the same target), but without JS the reader
   would see a skeleton forever, and on an ISR page a boundary gains nothing.
2. Should the unused skeletons be deleted or kept for a future `loading.tsx`? **Decided: delete** `FeaturedPostSkeleton`,
   `LatestPostsSkeleton`, `CoverDeckSkeleton` and `components/posts/post-list-skeleton.tsx`. A future dynamic route
   can bring them back from git history.
3. The parked test asserts "Most read", which can't appear in an e2e run (the build sees an empty store, and ISR
   regenerates only after 300 s). **Decided: drop the `Most read` assertion** and the `request.get` that seeds a view
   from the no-JS home test. Add a code comment pointing to `.design/popular-posts.md` caveat 2. `PopularPosts` is
   already inline (sprint 6), so the no-JS fix doesn't affect it. Seeding `.data-e2e` before the build would mean
   changing `playwright.config.ts` and is out of scope.
4. Keep `revalidate = 300` on `/`? **Decided: yes**, no change to the rendering mode.

## Scope
- In:
  - `app/(blog)/page.tsx`: render `FeaturedPost`, `LatestPosts` and `TopicsSection` inline, drop the `Suspense`
    import and the skeleton imports, and update the comments (one short comment covering the whole page instead of
    the `PopularPosts`-only one).
  - `components/home-hero.tsx`: render `LatestCoverDeck` inline and fix its header comment ("streamed behind its own
    Suspense").
  - `components/posts/featured-post.tsx`, `latest-posts.tsx` and `cover-deck.tsx`: delete the skeleton exports and
    fix the comments that say "streamed" / "inside <Suspense>". Delete `components/posts/post-list-skeleton.tsx`.
  - `tests/e2e/no-js.spec.ts`: turn the home `test.fixme` into a `test` (see AC1–AC4), drop the comment above it
    and the `Most read` assertion.
  - Docs: in `.design/product.md` (Home), replace the "Known gap" line with "No JS: every section above is visible."
    In `.design/popular-posts.md`, mark the "Known follow-up" as done in sprint 8. The lead or the developer makes
    these edits, as the brief decides.
- Out (deferred):
  - Other routes. `/posts/[slug]` keeps its `<Suspense>` around views and likes, which is correct: likes depend on
    JS, the views count is non-essential, and the route is dynamic. The reviewer still checks routes with JS
    disabled, as the roadmap row says.
  - Seeding views before the e2e build so "Most read" can be tested without JS (see question 3).
  - Any visual or motion change to the home sections.

## Acceptance criteria
- AC1 (no JS): with JavaScript disabled, `/` shows the "Featured" `h2` and a visible link to the featured post
  ("Server Components run on the server" in the `content/posts` fixture). Neither is inside a hidden element or at
  opacity 0 (checked with `expectShown`).
- AC2 (no JS): with JavaScript disabled, `/` shows the "Latest posts" `h2`, 4 visible post title links under it
  (the featured post is not among them), and a visible "View all posts" link to `/posts`.
- AC3 (no JS): with JavaScript disabled, `/` shows the "Browse by topic" `h2` and a visible "All tags" link to `/tags`.
- AC4 (no JS, desktop viewport ≥ md): with JavaScript disabled, the hero shows the cover deck link "Browse the archive"
  to `/posts`, visible, and no "Loading featured post…" or "Loading posts…" status text appears anywhere on `/`.
- AC5: `tests/e2e/no-js.spec.ts` has no `test.fixme` or `.skip` left for the home page, and the home test passes in the
  `no-js` project.
- AC6 (with JS): `/` still shows the same sections in the same order (hero, Featured, Latest posts, Most read when it
  has views, Browse by topic, newsletter). The `js` project and `npm run gate` pass. The build output still lists `/`
  as static with Revalidate `5m`.
- AC7: no `<Suspense>` remains in `app/(blog)/page.tsx` or `components/home-hero.tsx`, and no `loading.tsx` is added
  under `app/(blog)/`. The reviewer checks this by reading the code. It is not an e2e assertion.

## Sprint split
| Sprint | Branch | Scope | Owners |
|---|---|---|---|
| 8 | `fix/home-no-js` | All of the above, one PR | developer (`app/(blog)/page.tsx`, first: page wiring and comments), builder (`components/home-hero.tsx`, the three post components, deleting `post-list-skeleton.tsx`), tester (`tests/e2e/no-js.spec.ts`), reviewer (checks routes with JS disabled, AC7) |

Order note: the developer and the builder touch disjoint files, but the page imports the skeletons the builder
deletes. The developer goes first and removes the skeleton imports from `page.tsx`, then the builder deletes the
exports, so the tree typechecks after each step. No new data or props pass between them.
