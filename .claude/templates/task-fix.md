# Task: <developer|builder|tester> · round <n> (fix)

<!-- .design/sprints/<#>-<name>/tasks/<agent>-r<n>.md, written by the lead when a tester or reviewer round finds
must-fix items in this agent's files. Only must-fix items go here; suggestions go to close.md "Deferred". -->

Brief: `.design/sprints/<#>-<name>/brief.md` · Branch: `<branch>`
Report to: `.design/sprints/<#>-<name>/reports/<agent>-r<n>.md` (format: `.claude/templates/report.md`)
Source: `reports/<tester|reviewer>-r<m>.md`

## Fix
| # | Finding (from the source report) | File:line | Expected |
|---|---|---|---|
| F1 | | | |

## Done when
- Every row is fixed or explained in the report, and `npm run gate:fast` exits 0 (the tester re-runs e2e).
