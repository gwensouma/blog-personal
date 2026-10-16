# Task: reviewer · round <n>

<!-- .design/sprints/<#>-<name>/tasks/reviewer-r<n>.md -->

Brief: `.design/sprints/<#>-<name>/brief.md` · Branch: `<branch>`
Report to: `.design/sprints/<#>-<name>/reports/reviewer-r<n>.md` (format: `.claude/templates/report.md`)

## Review
- Diff: `git diff origin/main...HEAD` (or `gh pr diff <n>` once the PR exists).
- Focus for this sprint: e.g. Server Action validation, no-JS rendering, motion.
- Routes to check in a browser: `/…` at 320/768/1280, light and dark, JS on and off.
- Round > 1: only the findings listed below from the last round, plus anything their fixes touched.

## Files you may change
None: the reviewer writes only its report.

## Acceptance criteria this task serves
AC1..n (from the brief): which ones this review checks by reading or in the browser.

## Done when
- `npm run gate:fast` exit code is in the report, and the browser check is done or its skip is explained.
- Findings are marked must-fix / suggestion with `file:line`; "no must-fix" is said explicitly when true.
