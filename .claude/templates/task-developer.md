# Task: developer · round <n>

<!-- docs/sprints/<#>-<name>/tasks/developer-r<n>.md. Self-contained: the developer reads this and the brief only. -->

Brief: `docs/sprints/<#>-<name>/brief.md` · Branch: `<branch>` (already checked out by the lead)
Report to: `docs/sprints/<#>-<name>/reports/developer-r<n>.md` (format: `.claude/templates/report.md`)

## Do
Concrete steps, in order. Name the functions, routes and types to add or change. For UI: what to design and build,
the data each component receives, and the states to cover (empty, long text, loading if any, error).

## Files you may change
- `app/...`, `lib/...`, `types/...`, `components/...`

## Acceptance criteria this task serves
AC1, AC3 (from the brief).

## Constraints
Validation and limits for any Server Action or route; no-JS rendering; no new dependency. For UI: editorial look,
tokens only, shadcn first, motion rules (`.claude/rules/ui.md`), widths 320/768/1280.

## Done when
- `npm run gate:fast` exits 0.
- The report lists, per AC, the cases the tester should cover (inputs, limits, states, widths, no-JS, reduced motion).
