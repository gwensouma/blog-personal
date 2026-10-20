# Report: reviewer · round 2 · status: done

Task: `tasks/reviewer-r2.md`

## Summary
- Re-checked round-1 finding 1 (raw bidi characters) in `lib/comment-input.ts` and in the three test files the tester
  changed. Read `reports/developer-r2.md` and `reports/tester-r2.md`.
- `lib/comment-input.ts:11-12`: the class is now
  `[\u0000-\u0009\u000B-\u001F\u007F-\u009F؜‎‏‪-‮⁦-⁩]`. The bidi part matches the
  set from round 1 exactly: U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069. Nothing was added (U+200B–U+200D and
  U+2060–U+2065 are still not in it) and nothing was dropped. The C0/C1 ranges are unchanged, and `\n` (U+000A) is
  still the only gap.
- I wrote my own scan by code point over every `.ts/.tsx/.mjs/.js/.css/.json/.md` file in `lib/`, `components/`,
  `app/`, `types/` and `tests/` (155 files). It looked for U+061C, U+200B–U+200F, U+202A–U+202E, U+2060–U+2069,
  U+FEFF, U+00AD, and C0 (except tab/LF/CR) and C1 controls. It found 0 hits.
- In the tests, every bidi character at the lines round 1 flagged is now a `\u` escape
  (`comment-input.test.ts:46,81,89,127,132,160,169,189`, `comments.test.ts:316,360`, `comments.spec.ts:276`).
- No browser check, as the task says: the change is a regex escape. The tester's fresh e2e run passed (exit 0,
  55 passed).

## Files
None (review only).

## Gate
- `npm run gate:fast` → exit 0 (typecheck, lint, 13 files, 254 unit tests passed).

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC7 | `tests/unit/comment-input.test.ts:6-8,26-28,71-73`: builds every C0 (except tab/LF/CR), C1 and bidi code point (`BIDI` lists all 11) with `String.fromCharCode`, then checks that the name and the body strip each one. If any escape were wrong, these tests would fail. Also lines 88 and 168 (a body of only controls), the action at `comments.test.ts:316,360`, and e2e `comments.spec.ts:276`. Reading the regex confirms the same set. | pass |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | — | `lib/comment-input.ts:11-12`, tests | Round-1 finding 1 (raw bidi characters): **fixed**. Every bidi character is now an escape, and the scan finds 0. | — | no |

No must-fix.

## Open questions
none
