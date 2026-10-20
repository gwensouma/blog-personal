# Task: tester · round 2 (fix)

<!-- docs/sprints/9-comments/tasks/tester-r2.md, written by the lead from the reviewer's must-fix. -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments`
Report to: `docs/sprints/9-comments/reports/tester-r2.md` (format: `.claude/templates/report.md`)
Source: `reports/reviewer-r1.md`
Read first: `reports/developer-r2.md` (the same fix in `lib/comment-input.ts`).

## Fix
| # | Finding (from the source report) | File:line | Expected |
|---|---|---|---|
| F1 | Raw invisible bidi characters (U+061C, U+200E/F, U+202A–U+202E, U+2066–U+2069) in test strings, 16 in all (Trojan Source pattern) | `tests/unit/comment-input.test.ts:46,81,89,127,132,160,169,189`, `tests/unit/comments.test.ts:316,360`, `tests/e2e/comments.spec.ts:276` | Each written as a `\u` escape (or built with `String.fromCharCode`), so the tests still send the same characters; 0 raw characters left in `tests/` (scan by code point, paste the result) |

## Cover
- Re-run the tests the fix touches; they must pass with the developer's round-2 code.

## Files you may change
- `tests/...` only.

## Done when
- `npm run gate:fast` exits 0, and `npm run test:e2e` without `E2E_SKIP_BUILD` (a fresh build, since `lib/` changed) exits 0; both exit codes in the report.
