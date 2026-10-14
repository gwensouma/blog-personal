# Report: developer · round 1 · status: done

Task: `tasks/developer-r1.md`

## Summary
- New pure module `lib/post-ending.ts` (imports only `@/lib/tags` and `@/types/post`; no React, I/O or `server-only`).
  `getPostEnding`'s body moved there unchanged as `decidePostEnding`, with the doc comment (up-next rules, dedup
  priority, precondition, empty ending for an unknown slug).
- Shared helpers: option (a). `realSeriesSlug`, `seriesPartsOf`, `rankRelated` and `RELATED_LIMIT` moved to
  `lib/post-ending.ts` and are exported. `lib/data/posts.ts` imports them (`getRelatedPosts` keeps
  `limit = RELATED_LIMIT`, `getPostSeries` uses `seriesPartsOf`). Nothing is duplicated.
- `getPostEnding(slug): Promise<PostEnding>` now loads the summaries and returns `decidePostEnding(posts, slug)`.
  Removed the unused `AdjacentPosts` and `UpNext` imports from `posts.ts`.
- Review: I kept `topRelatedStart.slug !== slug` as a guard, with a comment. With consistent totals it can't be
  false, because every part of a series has the same `total`, so if the top related post's series is real, the current
  post's copy of it is real too and `rankRelated` drops it. It still blocks a self-recommendation when a hand-made
  fixture has mismatched totals. `types/post.ts`: the `PostEnding` comment now names `decidePostEnding`
  (`lib/post-ending.ts`, via `getPostEnding`). The `adjacent` comment now says "a part of this post's own real series"
  instead of "a series part", which was too broad. The other comments match the code. `page.tsx`: no change. An
  unknown slug gives `getPost` → null → `notFound()`, and `dynamicParams = false` stays. `getPostEnding` returns the
  empty ending for that slug, harmlessly, in the same `Promise.all`.
- Updated `.design/product.md`, section "Post `/posts/[slug]`" only, as worded in the task.

## Files
- `lib/post-ending.ts` (new)
- `lib/data/posts.ts`
- `types/post.ts` (comments only)
- `.design/product.md`

### Interface (`lib/post-ending.ts`, the tester imports these)
```ts
export const RELATED_LIMIT = 3;
export function realSeriesSlug(post: PostSummary): string | null;
export function seriesPartsOf(posts: PostSummary[], seriesSlug: string): PostSummary[];
export function rankRelated(posts: PostSummary[], current: PostSummary): PostSummary[];
export function decidePostEnding(posts: PostSummary[], slug: string): PostEnding;
```
`lib/data/posts.ts`: the exported interface is unchanged (`getPostEnding(slug)`, `getRelatedPosts(slug, limit = 3)`,
`getPostSeries(slug)`).

## Gate
- `npm run gate` → exit 0 (typecheck, lint, unit tests, build all pass).

## Table check (scratch Vitest run, outside the repo, over the real `getPosts()` list)
I also confirmed that `getPostEnding(slug)` deep-equals `decidePostEnding(posts, slug)` for every post.

| Post | upNext (reason) | adjacent next / previous | related | vs spec |
|---|---|---|---|---|
| rsc-shrinks-your-bundle | streaming-with-suspense (related) | – / – | caching-in-the-app-router, designing-the-rsc-boundary | match |
| client-components-render-twice | rsc-shrinks-your-bundle (series) | – / – | designing-the-rsc-boundary | match |
| server-components-run-on-the-server | client-components-render-twice (series) | – / streaming-with-suspense | designing-the-rsc-boundary | match |
| streaming-with-suspense | server-components-run-on-the-server (related) | – / server-actions-for-mutations | rsc-shrinks-your-bundle, caching-in-the-app-router | match |
| server-actions-for-mutations | streaming-with-suspense (newer) | – / caching-in-the-app-router | none | match |
| caching-in-the-app-router | server-components-run-on-the-server (related) | server-actions-for-mutations / designing-the-rsc-boundary | rsc-shrinks-your-bundle, streaming-with-suspense | match |
| designing-the-rsc-boundary | server-components-run-on-the-server (related) | caching-in-the-app-router / why-i-started-this-journal | rsc-shrinks-your-bundle, client-components-render-twice | match |
| why-i-started-this-journal | designing-the-rsc-boundary (newer) | – / – | none | match |

`does-not-exist` → `{"upNext":null,"adjacent":{"previous":null,"next":null},"related":[]}`.

## AC → test
Fixture notes for unit tests on `decidePostEnding`: the list must be **newest first**, and the fixtures must set
**`series.total` by hand** on every series post (`loadAllPosts` stamps it, not the pure function). A post with
`series` but no `total`, or `total: 1`, counts as outside any real series. Fields that matter: `slug`, `date` (only
for ties inside `seriesPartsOf`), `tags` (compared by `tagSlug`, so "App Router" and "app-router" match), and
`series.{slug, order, total}`.

| AC | Test or check | Result |
|---|---|---|
| AC1 | For the tester: unit test, middle part of a 3-part series → `upNext` = part 3, reason "series", and neither adjacent slot holds a series part. e2e on `client-components-render-twice` as in the brief. | gap (tester) |
| AC2 | For the tester: part 1 → `upNext` = part 2 ("series"), and `previous` is the older non-series post (`streaming-with-suspense` in real content). | gap (tester) |
| AC3 | For the tester: last part → reason "related", the pick is outside its own series, and adjacent is empty when both neighbours are its own parts. | gap (tester) |
| AC4 | For the tester: a non-series post whose top related post is part 2 or 3 of a real series → `upNext` is that series' part 1, reason "related". A one-part series (`total: 1`) is not redirected. Mismatched-totals fixture: the guard never recommends the current post. | gap (tester) |
| AC5 | For the tester: no tag overlap → "newer" when there is a newer non-series neighbour, else "older" (oldest post with one newer neighbour that is a series part → that part is skipped and the result is "older" or null). The newer pick isn't repeated in `adjacent.next`. | gap (tester) |
| AC6 | For the tester: a single-post list → the empty ending. An unknown slug and an empty list → the empty ending. e2e: `/posts/does-not-exist` → 404. | gap (tester) |
| AC7 | For the tester: loop over `getPosts()` (or the real list via `getPostEnding`). Check no duplicate slug across upNext/adjacent/related, the current slug is absent, no own-real-series part in adjacent or related, `related.length <= RELATED_LIMIT`, and the 8 rows above. Also a fixture with more than 3 related candidates where the upNext pick and the neighbours are among the top ones: related still has 3 (backfilled). | checked by scratch run (table); invariants gap (tester) |
| AC12 | `.design/product.md` updated. No new `"use client"` file, no new dependency. Gate is green. | pass (data side) |

## Open questions
None.
