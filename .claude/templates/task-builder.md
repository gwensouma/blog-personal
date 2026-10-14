# Task: builder · round <n>

<!-- .design/sprints/<#>-<name>/tasks/builder-r<n>.md. Self-contained: the builder reads this and the brief only. -->

Brief: `.design/sprints/<#>-<name>/brief.md` · Branch: `<branch>` (already checked out by the lead)
Report to: `.design/sprints/<#>-<name>/reports/builder-r<n>.md` (format: `.claude/templates/report.md`)

## Do
The UI to design and build, the data it receives (props, from the developer's report if any), and the states to cover
(empty, long text, loading if any, error).

## Files you may change
- `components/...`
- `.design/<feature>.md` for design decisions that change direction

## Acceptance criteria this task serves
AC2 (from the brief).

## Design constraints
Editorial look, tokens only, shadcn first, motion rules (`.claude/rules/ui.md`), widths 320/768/1280, visible without JS.

## Done when
- `npm run gate` exits 0.
- The report lists what the tester should check per AC (states, widths, no-JS, reduced motion).
