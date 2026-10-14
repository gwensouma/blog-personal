# Task: developer · round <n>

<!-- .design/sprints/<#>-<name>/tasks/developer-r<n>.md. Self-contained: the developer reads this and the brief only. -->

Brief: `.design/sprints/<#>-<name>/brief.md` · Branch: `<branch>` (already checked out by the lead)
Report to: `.design/sprints/<#>-<name>/reports/developer-r<n>.md` (format: `.claude/templates/report.md`)

## Do
Concrete steps, in order. Name the functions, routes and types to add or change.

## Files you may change
- `app/...`, `lib/...`, `types/...`

## Acceptance criteria this task serves
AC1, AC3 (from the brief).

## Constraints
Validation and limits for any Server Action or route; no-JS rendering; no new dependency.

## Done when
- `npm run gate` exits 0.
- The report lists, per AC, the cases the tester should cover.
