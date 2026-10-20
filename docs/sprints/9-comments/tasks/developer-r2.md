# Task: developer · round 2 (fix)

<!-- docs/sprints/9-comments/tasks/developer-r2.md, written by the lead from the reviewer's must-fix. -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments`
Report to: `docs/sprints/9-comments/reports/developer-r2.md` (format: `.claude/templates/report.md`)
Source: `reports/reviewer-r1.md`

## Fix
| # | Finding (from the source report) | File:line | Expected |
|---|---|---|---|
| F1 | The `CONTROLS_EXCEPT_NEWLINE` character class holds U+061C, U+200E, U+200F, U+202A–U+202E and U+2066–U+2069 as raw invisible characters (Trojan Source pattern; 7 raw characters in the file) | `lib/comment-input.ts:10` | Every such character written as a `\u` escape; same behaviour; no raw bidi or zero-width character left anywhere in `lib/`, `components/`, `app/` or `types/` (check with a script that scans for the code points, and paste its result in the report) |

The tester fixes the same pattern in `tests/` in its own round; don't touch `tests/`.

## Done when
- F1 is fixed, the scan shows 0 raw characters in your area, and `npm run gate:fast` exits 0.
