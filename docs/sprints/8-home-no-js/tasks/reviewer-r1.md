# Task: reviewer · round 1

<!-- .design/sprints/8-home-no-js/tasks/reviewer-r1.md -->

Brief: `.design/sprints/8-home-no-js/brief.md` · Branch: `fix/home-no-js`
Report to: `.design/sprints/8-home-no-js/reports/reviewer-r1.md` (format: `.claude/templates/report.md`)

## Review
- Diff: `git diff origin/main...HEAD` (or `gh pr diff` with the PR number once the PR exists).
- Focus for this sprint:
  - AC7 by reading the code: no `Suspense` in `app/(blog)/page.tsx` or `components/home-hero.tsx`; no `loading.tsx`
    under `app/(blog)/`; `revalidate = 300` kept and no `dynamic` export.
  - Dead code: no remaining reference to `FeaturedPostSkeleton`, `LatestPostsSkeleton`, `CoverDeckSkeleton`,
    `PostListSkeleton` or `post-list-skeleton`; no now-unused imports or constants left in the edited components.
  - Comments: none still says these sections are "streamed" or "behind/inside <Suspense>"; the page comment explains
    why there's no boundary on an ISR route. English only.
  - Scope: no change to `/posts/[slug]` (its `<Suspense>` around views and likes is correct), the command palette,
    `lib/`, or the look and motion of the home sections.
  - Tests: the home no-JS test is a real `test` with no `fixme`, asserts AC1–AC4 with `expectShown`, and has the
    caveat-2 comment for "Most read"; `tests/e2e/home.spec.ts` checks section order with JS.
  - Docs: `.design/product.md` Home has no "Known gap"; `.design/popular-posts.md` marks the follow-up done.
- Routes to check in a browser, JS on and off: `/` at 320/768/1280, light and dark (all sections present, the cover
  deck from 768 up, no skeletons or "Loading…" text without JS). Also spot-check `/posts`, `/posts/[slug]`, `/tags`
  and `/search` with JS off, as the roadmap row asks. Use `npm run build` + `npm run start` on a free port and stop
  only the PID you started. If the browser tool is unavailable, check the server HTML with curl instead (the section
  headings must be outside any `<div hidden id="S:…">`) and say so in the report.
- Round > 1: only the findings listed below from the last round, plus anything their fixes touched.

## Files you may change
- None (review only).

## Acceptance criteria this task serves
AC1–AC7 (from the brief), with AC7 checked only here.

## Done when
- `npm run gate` exit code is in the report, and the browser check is done or its skip is explained.
- Findings are marked must-fix / suggestion with `file:line`; "no must-fix" is said explicitly when true.
