# Task: tester · round <n>

<!-- .design/sprints/<#>-<name>/tasks/tester-r<n>.md -->

Brief: `.design/sprints/<#>-<name>/brief.md` · Branch: `<branch>`
Report to: `.design/sprints/<#>-<name>/reports/tester-r<n>.md` (format: `.claude/templates/report.md`)
Read first: the developer and builder reports of this sprint (`reports/`).

## Cover
- Every AC in the brief, each with at least one test.
- The edge cases listed in the developer/builder reports, plus the ones nobody listed (boundaries, abuse, no-JS).
- Round > 1: re-run the tests that failed last round; they must pass now.

## Files you may change
- `tests/...` only.

## Done when
- `npm test` and `npm run test:e2e` run in full, with exit codes in the report.
- The report maps each AC → test, and lists defects as must-fix / suggestion with the suspected file.
