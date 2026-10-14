# Sprint 4: Up next, one recommended read at the end of every post

<!-- Written by the planner from the approved spec .design/specs/up-next.md. Every task links here. -->

Branch: `feat/up-next` (draft PR #10, refreshed on `main` by merge commit 3514d14) · Spec: `.design/specs/up-next.md` ·
Roadmap row: 4 · Design note: `.design/blog-refactor.md` ("Up next (sprint 4)" and "Post series")

## Goal
Finish the WIP (commit d4dc257, already on the branch) so every post ends with one **Up next** card: the next part of
the series, else the most related post (part 1 when that post is in another series), else the newer, then the older
post. The rest of the ending is deduped around it. RSC lesson: derive the whole post ending once on the server and pass
plain props. The decision moves into a pure function so its edge cases can be unit-tested. The series nav loses its
now-redundant "Next in series" link. All four spec defaults were kept by the user (fallback to newer/older, a related
pick in another series starts at part 1, the series nav shrinks, Up next comes before the newsletter).

## Acceptance criteria
Content-dependent ACs use `content/posts` as the fixture (as `no-js.spec.ts` does).

- AC1: On `/posts/client-components-render-twice` (part 2 of 3) a region named "Up next" shows the label "Next in RSC
  Fundamentals · Part 3 of 3" and one link "RSC helps shrink the JavaScript sent to the browser" to
  `/posts/rsc-shrinks-your-bundle` with `rel="next"`. The series nav (named "RSC Fundamentals: previous part") shows
  "RSC Fundamentals, part 2 of 3" and a "Previous in series" link, and has no "Next in series" link.
- AC2: On `/posts/server-components-run-on-the-server` (part 1) the Up next card links
  `/posts/client-components-render-twice`. The series box is shown at the top and no series nav is rendered.
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
  ending is `upNext: null`, both adjacent slots `null`, `related: []`. `UpNext` renders nothing for `null` (no heading,
  no empty section). An unknown slug gives the same empty ending, and `/posts/does-not-exist` stays a 404.
- AC7: For every post in `content/posts`: no slug appears twice across up next, prev/next and related. The current
  post never appears. No part of the post's own real series appears in prev/next or related. Related has at most 3
  posts. The outcome matches the table in the spec's Research section (or the mismatch is reported).
- AC8: The end of every post reads, top to bottom: like/share footer, Up next (when present), newsletter, prev/next
  (when present), related (when present).
- AC9: **No JS:** with JavaScript disabled, on the posts in AC1–AC5 the Up next region, its label, title, excerpt and
  link are visible in the server HTML (not a skeleton, not hidden), and following the link loads the target post. The
  series nav and the other end blocks stay visible as in product.md.
- AC10: Keyboard: the card has exactly one tab stop (the title link; the cover is decorative), and focusing it shows a
  visible focus indication on the card. With `prefers-reduced-motion: reduce` the card doesn't lift, zoom or slide.
- AC11: At 320, 768 and 1280 px, light and dark, the card has no horizontal overflow and long titles wrap (reviewer,
  by eye).
- AC12: No new `"use client"` file and no new dependency. `npm run gate` and `npm run test:e2e` pass.
  `.design/product.md` and `.design/blog-refactor.md` describe the new ending.

## Files in scope, by owner
- developer (`app/`, `lib/`, `types/`, config): new `lib/post-ending.ts`; `lib/data/posts.ts` (`getPostEnding`
  delegates; shared series/related helpers); `types/post.ts` (review only, edit if needed);
  `app/(blog)/posts/[slug]/page.tsx` (review only). Docs: `.design/product.md` ("Post `/posts/[slug]`" only).
- builder (`components/`): `components/posts/post-series.tsx`, `components/posts/post-article.tsx`; review
  `components/posts/up-next.tsx`. Docs: `.design/blog-refactor.md` ("Post series" and "Up next (sprint 4)" only).
- tester (`tests/`): `tests/e2e/no-js.spec.ts`, new `tests/e2e/up-next.spec.ts`, new
  `tests/unit/post-ending.test.ts` (or new `describe` blocks in `tests/unit/posts.test.ts`).
- reviewer: none (report only).

## Constraints
- Behaviour of the WIP rules is kept. The refactor to a pure function must not change any outcome in the spec's
  per-post table. `getRelatedPosts` keeps its signature and behaviour (out of scope: any ranking change).
- `lib/post-ending.ts` is a pure helper (CLAUDE.md rule 7): no React, no I/O, no `server-only`, no `lib/data/` import.
  It may import `@/lib/tags` and `@/types/post`. `lib/data/posts.ts` keeps all file reading.
- No `<Suspense>` around the Up next card, no new `"use client"` file, no new dependency (D-011, D-003). Likes and
  views keep their own `<Suspense>`.
- Keep the end of `PostArticle` a flat list of sibling sections in the one `ReadingColumn`, with the order comment
  above it, and `PostArticle` props `post`, `series`, `ending`. Sprint 9 adds comments there as one more sibling.
- Motion: transforms only under `motion-safe:` or with `motion-reduce:transition-none`. Content never at opacity 0
  without JS.
- English only in comments and copy. Don't edit `.design/roadmap.md`; the lead owns it.
- e2e: `npm run test:e2e` rebuilds `.next/` on port 3200. Don't run it alongside `npm run dev`. Stop only PIDs you
  started.

## Task order
1. `tasks/developer-r1.md` (first: the pure function and its exported shape are what the tester's unit tests import)
2. `tasks/builder-r1.md`
3. `tasks/tester-r1.md`
4. `tasks/reviewer-r1.md`
