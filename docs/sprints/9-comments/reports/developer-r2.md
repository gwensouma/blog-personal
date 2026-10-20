# Report: developer · round 2 · status: done

Task: `tasks/developer-r2.md`

## Summary
- F1: `CONTROLS_EXCEPT_NEWLINE` in `lib/comment-input.ts` now writes every bidi and format character as a `\u` escape
  (`؜‎‏‪-‮⁦-⁩`). The character set is the same as before, so behaviour does not change.
  The regex moved onto its own line to stay within the line width.
- Scan (a Node script that walks `.ts/.tsx/.css/.mjs/.js/.json/.md` files and counts U+061C, U+200B–U+200F,
  U+202A–U+202E, U+2060–U+2069 and U+FEFF):
  - before: `lib\comment-input.ts 7 U+061C U+200E U+200F U+202A U+202E U+2066 U+2069`
  - after: `scanned 134 files in lib, components, app, types: 0 raw bidi/zero-width characters (U+061C, U+200B-U+200F, U+202A-U+202E, U+2060-U+2069, U+FEFF)`
- A second check found 0 raw C0/C1 control characters in `lib/comment-input.ts`.
- No interface changes in `lib/data/` or `lib/actions/`. No UI changes.

## Files
- `lib/comment-input.ts`

## Gate
- `npm run gate:fast` → exit 0 (13 test files, 254 tests passed).

## AC → test
| AC | Test or check | Result |
|---|---|---|
| F1 | Code-point scan above (0 in `lib/`, `components/`, `app/`, `types/`). The existing `tests/unit/comment-input.test.ts` bidi/control stripping cases still pass. For the tester: keep those cases covering ALM, LRM/RLM, LRE..RLO and LRI..PDI. | pass |

## Open questions
none
