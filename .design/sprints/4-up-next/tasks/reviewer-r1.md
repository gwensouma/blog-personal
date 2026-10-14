# Task: reviewer · round 1

<!-- .design/sprints/4-up-next/tasks/reviewer-r1.md -->

Brief: `.design/sprints/4-up-next/brief.md` · Branch: `feat/up-next`
Report to: `.design/sprints/4-up-next/reports/reviewer-r1.md` (format: `.claude/templates/report.md`)
Read first: the developer, builder and tester reports of this sprint (`reports/`).

## Review
- Diff: `git diff origin/main...HEAD` (or `gh pr diff 10`). Read the WIP commit d4dc257 as new code too: no one has
  reviewed it.
- Focus for this sprint:
  - **Server-first (the RSC lesson):** the decision lives in the pure `lib/post-ending.ts` (no React, no I/O, no
    `server-only`, no `lib/data/` import). `getPostEnding` only loads and delegates. Components only render. No new
    `"use client"` file (`git diff --name-only origin/main...HEAD` plus a grep for `"use client"` in new files). No
    `<Suspense>` around the Up next card. No new dependency (`package.json` unchanged).
  - **Rules:** the up-next rules and dedup match the spec's "What the WIP already does". `getRelatedPosts` behaviour
    and signature are unchanged. No helper is duplicated between `lib/post-ending.ts` and `lib/data/posts.ts`.
  - **Series nav:** no `hideNext`, no "Next in series", `aria-label` "<name>: previous part", not rendered on part 1,
    "final part" still derived from the series.
  - **Sprint 9 readiness:** the end of `PostArticle` is a flat list of siblings in one `ReadingColumn` with an order
    comment. Props are `post`, `series`, `ending`.
  - **Motion and a11y (`.claude/rules/ui.md`, D-003):** transforms gated by `motion-safe:` /
    `motion-reduce:transition-none`. One tab stop in the card. A visible focus ring on the card. The cover is
    decorative. `rel` values are correct.
  - **Tests:** the tests assert behaviour, not markup details. The per-post table is checked row by row. AC6 is covered
    through the pure function with fixtures. `no-js.spec.ts` uses the new nav name. No `.only`, no unexplained
    `fixme`/`skip`. They wait on state, not time.
  - **Docs (AC12):** `.design/product.md` "Post" matches the spec wording. `.design/blog-refactor.md` "Post series" and
    "Up next (sprint 4)" describe the nav without a next link. `.design/roadmap.md` is untouched by this sprint.
- Routes to check in a browser, at 320/768/1280, light and dark, JS on and off:
  `/posts/client-components-render-twice`, `/posts/server-components-run-on-the-server`,
  `/posts/rsc-shrinks-your-bundle`, `/posts/streaming-with-suspense`, `/posts/why-i-started-this-journal`. Check:
  the card has no horizontal overflow and long titles wrap (AC11); the end order (AC8); keyboard focus on the card
  (AC10); with JS off the card is visible and its link works (AC9). Use `npm run build` + `npm run start` on a free
  port and stop only the PID you started. If the browser tool is unavailable (Playwright MCP is flaky here), check the
  server HTML with curl for AC9 instead, and say AC11 was not checked by eye.

## Files you may change
- None (review only).

## Acceptance criteria this task serves
AC1–AC12 by reading. AC8–AC11 in the browser. AC11 and AC12 are checked only here.

## Done when
- `npm run gate` exit code is in the report, and the browser check is done or its skip is explained.
- Findings are marked must-fix / suggestion with `file:line`. Say "no must-fix" explicitly when that is the case.
