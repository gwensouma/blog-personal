# Task: developer · round 1

<!-- .design/sprints/4-up-next/tasks/developer-r1.md. Self-contained: the developer reads this and the brief only. -->

Brief: `.design/sprints/4-up-next/brief.md` · Branch: `feat/up-next` (already checked out by the lead)
Report to: `.design/sprints/4-up-next/reports/developer-r1.md` (format: `.claude/templates/report.md`)

## Do
The WIP data code is on the branch but nobody has reviewed it. Read `git diff main...HEAD -- lib types app` as new code
first. Then:

1. **New `lib/post-ending.ts` (pure, no React, no I/O, no `server-only`).** Export
   `decidePostEnding(posts: PostSummary[], slug: string): PostEnding`. Move the body of `getPostEnding`
   (`lib/data/posts.ts:291-332`) into it unchanged in behaviour, with the `RELATED_LIMIT` it uses. Put the doc comment
   that lists the up-next rules and the dedup priority on this function. State the precondition in the comment: `posts`
   is newest first and every `series.total` is already stamped, as `loadAllPosts` delivers it. An unknown slug returns
   the empty ending `{ upNext: null, adjacent: { previous: null, next: null }, related: [] }`.
2. **Shared helpers.** `realSeriesSlug`, `seriesPartsOf` and `rankRelated` (`lib/data/posts.ts:243-267`) are used by
   `decidePostEnding`, `getRelatedPosts` and `getPostSeries`. Pick one:
   - (a) move them to `lib/post-ending.ts` and export them, with `lib/data/posts.ts` importing them; or
   - (b) keep them in `posts.ts` and pass them in.
   (a) is simpler. Don't duplicate them. Keep `RELATED_LIMIT` in one place (export it if `getRelatedPosts` needs it as
   its default).
3. **`getPostEnding` in `lib/data/posts.ts`** becomes: load the summaries via `loadAllPosts()` and return
   `decidePostEnding(posts, slug)`. Keep its exported signature `getPostEnding(slug): Promise<PostEnding>` and a
   one-line comment that points to `decidePostEnding` for the rules. Drop now-unused imports (`AdjacentPosts`, `UpNext`
   in `posts.ts` if they move).
4. **Review while moving** (behaviour must not change; if you find a real bug, report it, and fix it only if the spec's
   per-post table still holds afterwards):
   - `topRelatedStart.slug !== slug` (posts.ts:314) can never be false, because `rankRelated` already excludes the
     current post's own series. Simplify it or keep it as a guard with a comment. Your call; say which in the report.
   - `types/post.ts:79-104`: check the comments on `AdjacentPosts`, `UpNextReason`, `UpNext` and `PostEnding` still
     match the code (e.g. "decided once by lib/data (getPostEnding)" should now point at `decidePostEnding` in
     `lib/post-ending.ts`).
   - `app/(blog)/posts/[slug]/page.tsx`: the three parallel calls share the `cache()`d `loadAllPosts`. No change
     expected. Confirm that `notFound()` still runs for an unknown slug (`dynamicParams = false`).
5. **Check the table.** In a scratch script (not committed, not in `tests/`), or by reasoning from the code, run
   `decidePostEnding` over the real post list and compare it with the spec's per-post table
   (`.design/specs/up-next.md`, "Per-post outcome with today's content"). Paste the 8 outcomes in your report
   (slug → upNext slug/reason, adjacent next/previous, related).
6. **`.design/product.md`, section "Post `/posts/[slug]`" only:**
   - Replace the bullet "Ends with likes and views, share links, the series box and nav (when in a series), related
     posts and prev/next." with: "Ends with likes and views, share links, an **Up next** card (the next series part,
     else the most related post, else the newer or older post), the newsletter, prev/next and related posts; a post
     appears at most once in this ending. When in a series: the series box at the top and a series nav back to the
     previous part (none on part 1)."
   - In the "No JS:" bullet, add "the Up next card" to the visible list (e.g. "the body, series box and nav, the Up next
     card, related posts and prev/next are visible"). Change nothing else.

## Files you may change
- `lib/post-ending.ts` (new)
- `lib/data/posts.ts`
- `types/post.ts` (comments, or types only if the move needs it)
- `app/(blog)/posts/[slug]/page.tsx` (only if the review finds something)
- `.design/product.md` ("Post `/posts/[slug]`" section only)

## Acceptance criteria this task serves
AC1–AC7 (data side), AC12 (product.md).

## Constraints
- No behaviour change: same outcomes, same `PostEnding` shape, `getRelatedPosts(slug, limit)` unchanged (it is tested
  in `tests/unit/posts.test.ts:34-70`). `getAdjacentPosts` stays removed.
- `lib/post-ending.ts` must be importable from Vitest and from any server code without the `server-only` stub. Imports
  allowed: `@/lib/tags`, `@/types/post`.
- No new dependency. English comments only. Don't touch `components/` (the builder's) or `tests/` (the tester's).

## Done when
- `npm run gate` exits 0.
- The report gives the exported names and signatures from `lib/post-ending.ts` (the tester imports them), the 8-row
  table check (match or mismatch per row), and per AC the cases the tester should cover. Include the fixture fields
  that matter: `series.total` must be set by hand in fixtures, because `loadAllPosts` stamps it, not the pure function.
  The list order is newest first.
