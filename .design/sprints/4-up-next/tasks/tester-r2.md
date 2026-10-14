# Task: tester · round 2 (fix)

<!-- .design/sprints/4-up-next/tasks/tester-r2.md. The user chose (2026-10-14) to fix these two reviewer suggestions in
this sprint before merging; the Ctrl+K flake (reviewer-r1 #1) goes to a separate fix PR, not here. -->

Brief: `.design/sprints/4-up-next/brief.md` · Branch: `feat/up-next`
Report to: `.design/sprints/4-up-next/reports/tester-r2.md` (format: `.claude/templates/report.md`)
Source: `reports/reviewer-r1.md` (findings #2 and #3)

## Fix
| # | Finding (from the source report) | File:line | Expected |
|---|---|---|---|
| F1 | The test title claims "a newer neighbour in the own series is skipped, so the older one is picked", but no case asserts it; the rule-3 skip-newer-then-older path is untested. | `tests/unit/post-ending.test.ts:251-260` | A fixture where the current post is the last part of its series, has no related post, its newer neighbour is an own-series part and its older neighbour is a non-series post; `decidePostEnding` gives `upNext` = the older post with reason `older`. Keep the test title true to what it asserts. If the code doesn't behave this way, report it as a defect; don't bend the test. |
| F2 | The "no post is linked twice" check builds its list from the test's `CASES` data, not the page, so it can never fail. | `tests/e2e/up-next.spec.ts:181-189` | Collect the `href`s from the rendered Up next region, the prev/next nav and the related section, and assert they are unique and don't include the current post's slug. |

## Files you may change
- `tests/unit/post-ending.test.ts`
- `tests/e2e/up-next.spec.ts`

## Done when
- Both rows are fixed or explained in the report.
- `npm run gate` exits 0, and `npx playwright test tests/e2e/up-next.spec.ts` exits 0 (the full e2e has a known
  unrelated Ctrl+K flake in `interactive.spec.ts`; report it if seen, don't fix it).
