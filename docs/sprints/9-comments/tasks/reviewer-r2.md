# Task: reviewer · round 2

<!-- docs/sprints/9-comments/tasks/reviewer-r2.md, written by the lead after the round-2 fixes. -->

Brief: `docs/sprints/9-comments/brief.md` · Branch: `feat/comments`
Report to: `docs/sprints/9-comments/reports/reviewer-r2.md` (format: `.claude/templates/report.md`)

## Review
- Diff: `git diff` (uncommitted, on `feat/comments`); read `reports/developer-r2.md` and `reports/tester-r2.md`.
- Round 2: only finding 1 of `reports/reviewer-r1.md` (raw bidi characters in `lib/comment-input.ts:10` and the
  tests), plus anything its fix touched. Check that the escapes cover exactly the code points the old class held
  (U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069), and that a scan by code point over `lib/`, `components/`,
  `app/`, `types/` and `tests/` finds none.
- Suggestions 2–4 from round 1 are deferred to `close.md` by the lead; don't re-raise them.
- No browser check this round: the change is a regex escape, covered by the unit tests and the tester's e2e run.

## Files you may change
None: the reviewer writes only its report.

## Acceptance criteria this task serves
AC7 (control and bidi characters stripped), by reading and by the unit tests.

## Done when
- `npm run gate:fast` exit code is in the report.
- Finding 1 is marked fixed or came back; "no must-fix" is said explicitly when true.
