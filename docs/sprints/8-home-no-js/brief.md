# Sprint 8: Home page visible without JavaScript

<!-- Written by the planner from the approved spec .design/specs/home-no-js.md. Every task links here. -->

Branch: `fix/home-no-js` · Spec: `.design/specs/home-no-js.md` · Roadmap row: 8 · Design note: `.design/popular-posts.md` (caveats 1 and 2)

## Goal
With JavaScript disabled, `/` shows the featured post, the latest posts, the "Browse by topic" strip and the desktop
hero cover deck. The fix removes the `<Suspense>` boundaries on the prerendered (ISR) home page and renders those async
Server Components inline, the same way `PopularPosts` already renders. RSC lesson: a boundary on a static/ISR route
can't stream and only hides its content behind an inline script.

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

## Files in scope, by owner
- developer (`app/`, `lib/`, `types/`, config): `app/(blog)/page.tsx`; docs `.design/product.md` (Home section) and
  `.design/popular-posts.md` (caveat 1 follow-up line).
- builder (`components/`): `components/home-hero.tsx`, `components/posts/featured-post.tsx`,
  `components/posts/latest-posts.tsx`, `components/posts/cover-deck.tsx`; delete
  `components/posts/post-list-skeleton.tsx`.
- tester (`tests/`): `tests/e2e/no-js.spec.ts`; new `tests/e2e/home.spec.ts` for the JS check (AC6).

## Constraints
- Keep `export const revalidate = 300` on `/`. No `force-dynamic`, no `loading.tsx` under `app/(blog)/` (it would wrap
  the page in a boundary again).
- Don't touch other routes: `/posts/[slug]` keeps its `<Suspense>` around views and likes (dynamic route, likes need
  JS, views are non-essential). `components/layout/command-palette.tsx` keeps its own boundary (client, JS-only dialog).
- No visual or motion change to the home sections. No new dependency. No data-layer change: the sections already share
  the `cache()`d `loadAllPosts` (`lib/data/posts.ts:124`).
- "Most read" can't appear in an e2e run (the e2e build sees an empty `.data-e2e`, and ISR regenerates only after
  300 s; `.design/popular-posts.md` caveat 2). Tests don't assert it; seeding views before the build is out of scope.
- English only in comments; every comment that says "streamed" or "inside <Suspense>" about these sections is fixed.

## Task order
1. `tasks/developer-r1.md` (first: removes the skeleton imports from `page.tsx`, so the builder's deletions typecheck)
2. `tasks/builder-r1.md`
3. `tasks/tester-r1.md`
4. `tasks/reviewer-r1.md`
