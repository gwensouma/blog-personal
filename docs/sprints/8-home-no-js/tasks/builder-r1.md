# Task: builder · round 1

<!-- .design/sprints/8-home-no-js/tasks/builder-r1.md. Self-contained: the builder reads this and the brief only. -->

Brief: `.design/sprints/8-home-no-js/brief.md` · Branch: `fix/home-no-js` (already checked out by the lead)
Report to: `.design/sprints/8-home-no-js/reports/builder-r1.md` (format: `.claude/templates/report.md`)

## Do
No new UI and no new props. This is a removal: the home sections must render inline so they are in the server HTML
without JS. The developer has already removed the `Suspense` and skeleton imports from `app/(blog)/page.tsx`; check
that first (`grep -n Skeleton "app/(blog)/page.tsx"` returns nothing) before deleting the exports below.

1. `components/home-hero.tsx`:
   - Render `<LatestCoverDeck />` directly inside the `hidden pt-2 md:block` div, without `<Suspense>`.
   - Remove `import { Suspense } from "react"` and the `CoverDeckSkeleton` import.
   - Fix the header comment: drop "(streamed behind its own Suspense; the title never waits for data)" and say instead
     that the deck is an async Server Component rendered inline, so it is in the prerendered HTML and visible without
     JS.
2. `components/posts/featured-post.tsx`: delete `FeaturedPostSkeleton` (around line 65) and any import or constant
   only it used (likely `Skeleton` from `@/components/ui/skeleton`; keep anything `FeaturedPost` still uses). Fix any
   comment that says the section is "streamed" or "inside <Suspense>".
3. `components/posts/latest-posts.tsx`: delete `LatestPostsSkeleton` (around line 45) and the `PostListSkeleton`
   import. Keep `LATEST_COUNT` if `LatestPosts` still uses it. Fix the same kind of comments.
4. `components/posts/cover-deck.tsx`: delete `CoverDeckSkeleton` (around line 64) and any import or constant only it
   used (`Skeleton`; check whether `cardBox` and the slot poses are still used by `LatestCoverDeck` before removing
   anything shared). Fix the same kind of comments.
5. Delete `components/posts/post-list-skeleton.tsx` (only `LatestPostsSkeleton` used it; confirm with a grep for
   `post-list-skeleton` and `PostListSkeleton` across `app/`, `components/`, `lib/`, `tests/`).
6. Leave `components/ui/skeleton.tsx` (shadcn primitive, still used by `post-engagement.tsx`) and
   `components/layout/command-palette.tsx` untouched.

States: the markup each section renders when it has data is unchanged. Keep each component's existing empty-state
behaviour (e.g. returning `null` with no posts); don't add or change any.

## Files you may change
- `components/home-hero.tsx`
- `components/posts/featured-post.tsx`
- `components/posts/latest-posts.tsx`
- `components/posts/cover-deck.tsx`
- `components/posts/post-list-skeleton.tsx` (delete)

## Acceptance criteria this task serves
AC1, AC2, AC4, AC6, AC7 (from the brief).

## Design constraints
No visual or motion change: classes, motion wrappers (`Reveal`, CSS entrances) and the deck layout stay as they are.
The motion wrappers are already safe without JS (`Reveal` uses `initial={false}`), so content must not end up at
opacity 0. Widths 320/768/1280: the deck stays hidden below `md`, visible from `md` up. No new dependency.

## Done when
- `npm run gate` exits 0.
- `grep -n "Suspense" components/home-hero.tsx` returns nothing, and no file imports a deleted skeleton.
- The report lists what the tester should check per AC: the deck link "Browse the archive" visible at 1280 without JS
  (AC4), no "Loading featured post…" / "Loading posts…" text on `/` (AC4), and section order and look with JS
  unchanged at 320/768/1280 (AC6).
