# Report: builder · round 1 · status: done

Task: `tasks/builder-r1.md`

## Summary
- This was a removal only. There is no design change, and classes, motion wrappers, deck layout and empty states are unchanged. First I confirmed that `app/(blog)/page.tsx` no longer imports any skeleton or `Suspense` (only its header comment mentions `<Suspense>`).
- `HomeHero` now renders `<LatestCoverDeck />` directly inside the `hidden pt-2 md:block` div. I removed the `Suspense` and `CoverDeckSkeleton` imports and rewrote the header comment: the deck is an async Server Component rendered inline, so it is in the prerendered HTML and visible without JS.
- I deleted `FeaturedPostSkeleton` (and the `Skeleton` import), `LatestPostsSkeleton` (and the `PostListSkeleton` import) and `CoverDeckSkeleton` (and the `Skeleton` import). I kept `coverFrame`, `LATEST_COUNT`, `LatestPostsHeading`, `deckBox`, `cardBox` and `slots` because the live components still use them. Comments that said "streamed" or "inside <Suspense>" now say "rendered inline".
- I deleted `components/posts/post-list-skeleton.tsx`. It has no remaining references in `app/`, `components/`, `lib/` or `tests/`. The delete is in the worktree only and not staged.
- Sanity check: `.next/server/app/index.html` from the build contains "Browse the archive" and no "Loading featured post…" or "Loading posts…".

## Files
- `components/home-hero.tsx`
- `components/posts/featured-post.tsx`
- `components/posts/latest-posts.tsx`
- `components/posts/cover-deck.tsx`
- `components/posts/post-list-skeleton.tsx` (deleted)

## Gate
- `npm run gate` → exit 0. The build lists `/` as `○` static with Revalidate `5m`.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | For the tester: JS off, any width. The "Featured" h2 and the "Server Components run on the server" link pass `expectShown` (not hidden, not opacity 0). | for tester |
| AC2 | For the tester: JS off. The "Latest posts" h2, 4 visible h3 title links (not the featured post) and a visible "View all posts" link to `/posts`. | for tester |
| AC4 | For the tester: JS off at 1280 (≥ md). The hero shows a visible link to `/posts` named "Browse the archive" (sr-only text, so check the link box with `expectShown`). At 320 the deck stays hidden (`hidden md:block`) by design. "Loading featured post…" and "Loading posts…" appear nowhere on `/`. | for tester |
| AC6 | For the tester: JS on at 320/768/1280. Section order is hero, Featured, Latest posts, (Most read), Browse by topic, newsletter. The cover deck is hidden at 320 and visible at 768/1280, and fans out on hover/focus. CSS entrances still play, and with reduced motion the deck cards and featured card show without animation. | for tester |
| AC7 | `grep -n Suspense components/home-hero.tsx` returns nothing. No file imports a deleted skeleton. | pass |

## Open questions
none
