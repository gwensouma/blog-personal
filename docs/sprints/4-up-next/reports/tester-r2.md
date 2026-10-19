# Report: tester · round 2 · status: done

Task: `tasks/tester-r2.md`

## Summary
- F1: added the real rule-3 case to `tests/unit/post-ending.test.ts`. Fixture, newest first: `[p1 (own part), p2 (last part, total 2), old (no series)]`, no related posts. `decidePostEnding(list, "p2")` gives `upNext` = `old`, reason `older`, both adjacent slots null, related empty. The code behaves as expected; no defect. The old assertions (last part with only own-series neighbours gives `upNext` null; part 1 gets p2, `adjacent.previous` = `old`) moved to a separate test with a matching title.
- F2: the "no post linked twice" check in `tests/e2e/up-next.spec.ts` now reads `href`s from the rendered Up next region, the prev/next nav and the related h3 links. It asserts at least one href, all unique, and `/posts/<current slug>` absent. It no longer uses the test's `CASES` data.
- up-next.spec.ts is flaky under the default 6 workers (slow first page loads); green with 2 workers.

## Files
- `tests/unit/post-ending.test.ts`
- `tests/e2e/up-next.spec.ts`

## Gate
- `npm run gate` → exit 0 (8 unit files, 149 tests passed, build ok).
- `npx playwright test tests/e2e/up-next.spec.ts` (6 workers), run 1 → exit 1, 6 failed / 17 passed. Failed: [js] AC10 tab stop, [js] AC10 reduced motion, [js] AC10 hover lifts, [js] whole card clickable, [js] XSS-safe card, [no-js] AC1 client-components-render-twice. All 30s timeouts.
- Same command, run 2 → exit 1, 2 failed / 21 passed. Failed: [js] AC10 hover lifts (timeout); [js] whole card clickable (URL stayed on the source post, timeout).
- `npx playwright test tests/e2e/up-next.spec.ts --workers=2` → exit 0, 23 passed.
- Full e2e not run, so the known Ctrl+K flake in `interactive.spec.ts` was not observed.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| F1 | `tests/unit/post-ending.test.ts` "a newer neighbour in the own series is skipped, so the older one is picked" | pass |
| F2 | `tests/e2e/up-next.spec.ts` "content: <AC> <slug> ends with the right card and blocks" (rendered-href uniqueness, every post, both projects) | pass |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion | `tests/e2e/up-next.spec.ts` (motion/keyboard tests), Playwright config | With 6 workers the first page loads took about 29s on this Windows box, so tests hit the 30s timeout. A different set failed on each run, so it is load-related, not a product defect. | Run this spec with fewer workers (e.g. 2) or raise the test timeout / warm the server before the tests. | no |

## Open questions
none
