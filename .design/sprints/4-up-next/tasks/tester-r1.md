# Task: tester · round 1

<!-- .design/sprints/4-up-next/tasks/tester-r1.md -->

Brief: `.design/sprints/4-up-next/brief.md` · Branch: `feat/up-next`
Report to: `.design/sprints/4-up-next/reports/tester-r1.md` (format: `.claude/templates/report.md`)
Read first: `reports/developer-r1.md` (exported names in `lib/post-ending.ts`, the table check) and
`reports/builder-r1.md` (nav name, focus and reduced-motion hooks).

## Cover
Verify the spec's per-post table (`.design/specs/up-next.md`, "Per-post outcome with today's content") against the
code; don't just trust it. A mismatch is a defect to report, not an expectation to bend.

- **Fix `tests/e2e/no-js.spec.ts:43-75`** (fails today):
  - Line 63: the series nav is now named "RSC Fundamentals: previous part". Keep the "part 2 of 3" text and the
    "Previous in series" link. Line 67 becomes: no "Next in series" link in the nav (count 0). The next part is now the
    link inside the "Up next" region (AC1).
  - Line 72 (last-part test): same new name. Keep the "final part (3 of 3)" text and the count-0 next link (AC3).
- **Unit tests, `tests/unit/post-ending.test.ts`** (new; import `decidePostEnding` and anything else the developer
  exports from `@/lib/post-ending`, plus `getPostEnding`/`getPosts` from `@/lib/data/posts`):
  - AC7, content: for every post from `getPosts()`, `getPostEnding(slug)` matches the table row (upNext slug and
    reason, adjacent next/previous, related slugs in order). It also holds the invariants: no slug twice across upNext,
    adjacent and related; never the current slug; no own-real-series part in adjacent or related; `related.length <= 3`.
    Name content-dependent tests `content: …`.
  - AC6, fixtures through `decidePostEnding`: a single-post list gives the empty ending. An unknown slug gives the
    empty ending (fixture list and real list). Fixtures are `PostSummary` objects, newest first. Set `series.total` by
    hand, because the pure function doesn't stamp it.
  - Rule edge cases with small fixtures, each one rule: the series next part wins over a related post; the last part
    falls to related; a related pick in another real series becomes its part 1; a one-part "series" (`total: 1`) is
    treated as no series; no related post → `"newer"`; no newer → `"older"`; an adjacent post equal to the pick
    becomes null; related backfills past removed picks (more than 3 candidates, the pick among the top 3 → still 3
    results); ranking ties keep newest-first order.
- **E2E, new `tests/e2e/up-next.spec.ts`** (tag the content tests `@no-js` so they run in both projects; use
  `expectShown` from `@/tests/e2e/helpers`):
  - AC1–AC5, one test per post listed in the ACs. Scope to `page.getByRole("region", { name: "Up next" })`. Check the
    label text, exactly one link with the exact title, `href`, and `rel` where the AC says so (`rel` absent for
    "related"). Then check the series nav presence and name (none on part 1), the "Related posts" section, and the
    prev/next nav ("Previous and next posts") presence and links as the AC states.
  - AC9 (no JS): in the `no-js` project, the region, label, title, excerpt and link are shown with `expectShown`. At
    least once, click the card link and assert the target post's `h1` loads.
  - AC8 order: on one series post and one non-series post, assert the document order: the article `footer` (share
    links) → "Up next" region → newsletter section → "Previous and next posts" nav → "Related posts" section, skipping
    the ones absent per the table. Use `compareDocumentPosition` or bounding-box `y`. Wait on state, never on time.
  - AC10 (JS project, untagged): Tab through the card and confirm exactly one focus stop inside the Up next region (the
    title link) and that the card shows a focus indication (e.g. computed `box-shadow` or `border-color` changes on
    the `article` inside the region; use the hook the builder names). With `page.emulateMedia({ reducedMotion:
    "reduce" })`, hover/focus the card and assert the card's `translate`, the cover's `scale` and the arrow chip's
    `translate` stay at their resting value (`none`). Without reduce, assert the card's value changes, to prove the
    test can fail. Use `expect.poll`, never fixed waits.
  - AC6: `/posts/does-not-exist` stays 404 (already in `no-js.spec.ts:77`; keep it, no duplicate needed).
- Edge cases from the developer/builder reports, plus any you find (e.g. the card on a post with a real cover vs the
  default cover; no "Up next" heading when the ending is empty can only be unit-tested at the data level. Say so).

## Files you may change
- `tests/e2e/no-js.spec.ts`
- `tests/e2e/up-next.spec.ts` (new)
- `tests/unit/post-ending.test.ts` (new)
- `tests/unit/posts.test.ts` only if a shared case belongs there
- `tests/e2e/helpers.ts` only if a shared helper is truly needed

## Acceptance criteria this task serves
AC1–AC10. AC11 and the reading parts of AC12 are the reviewer's.

## Done when
- `npm test` and `npm run test:e2e` run in full (both projects), with exit codes in the report.
- The report maps each AC → test, lists the per-post table check (row by row: match / mismatch), and lists defects as
  must-fix / suggestion with the suspected file.
