# Report: tester · round 1 · status: blocked

Task: `tasks/tester-r1.md`

## Summary
- AC1: `coverContent` now matches the real `<img>` cover and the default cover div. Both AC10 tests pass.
- AC2: `expectShown` now polls until no ancestor has opacity 0. `no-js.spec.ts:9` and `:139` pass in this run.
- AC3 is not green locally: 11 `[no-js]` tests fail with `page.goto` 30s timeouts (the Windows issue the brief mentions). Every other test passes. CI on Linux is the reference.
- No assertion failures and no product defects found.

## Files
- `E:\CodeHehe\Web\RSC\tests\e2e\up-next.spec.ts` (`coverContent` locator: `> div > :is(img, div[aria-hidden="true"])`, first match)
- `E:\CodeHehe\Web\RSC\tests\e2e\helpers.ts` (`expectShown` uses `expect.poll`, default 5s; same failure message)

## Gate
- `npm test` → exit 0; 9 files, 152 tests passed.
- `npm run test:e2e` (fresh build) → exit 1; 32 passed, 11 failed. All 11 are `page.goto: Test timeout of 30000ms exceeded` in `[no-js]`:
  - `no-js.spec.ts:24`, `:73`, `:85`, `:96`
  - `up-next.spec.ts:121` (x3), `:195`, `:227` (x3)
- Log: `C:\Users\QUOC AN\AppData\Local\Temp\claude\E--CodeHehe-Web-RSC\08305e23-f361-4156-b4ec-5f99dcd9882f\scratchpad\e2e.log`

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | `up-next.spec.ts:301` (reduced motion) and `:331` (full motion), `[js]` | pass |
| AC2 | `no-js.spec.ts:9` (`/posts`) and `:139` (home), `[no-js]`; one run only, so flakiness not proven gone. No test checks that a stuck-hidden element still fails. | pass |
| AC3 | `npm test` passes. E2E fails locally only on `goto` timeouts (see Gate). | gap: confirm on CI |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion | n/a (environment) | Windows-only `[no-js]` `page.goto` timeouts waiting for `load`. If they also show on CI, something in no-JS page loads never finishes (a guess: `next/image` covers). | Run CI; if it is red on the same tests, investigate. | no |

## Open questions
- Do the 11 timeouts also occur on CI? I could not tell from here.
