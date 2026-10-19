# Sprint 16: real post covers

Branch: `chore/post-covers` · Spec: none (content-only change; the user approved a tester-only fix with no spec on
2026-10-19) · Roadmap row: none (one-off, archived on merge) · Design note: none · PR: #31

## Goal
All eight posts now have a real cover image (commit `25a3e7a`). The site is fine (the user checked it in a production
build), but e2e on CI fails because some tests only work with the default branded cover. Make the tests work with
both real and default covers, without weakening what they check.

## Acceptance criteria
- AC1: The AC10 motion tests in `tests/e2e/up-next.spec.ts` (`:300` reduced motion, `:330` full motion) pass when
  the next post has a real cover, and still check the same behaviour (no lift/zoom/slide with reduced motion; lift,
  zoom and slide without it). The cover locator (`coverContent`, `:288`) finds the zooming element for a real
  `<img>` cover as well as for the default cover.
- AC2: The no-JS checks that the post list is shown (`tests/e2e/no-js.spec.ts:9` `/posts`, `:139` home) are not
  flaky: `expectShown` (`tests/e2e/helpers.ts`) waits for the entrance animation to finish rather than failing on a
  mid-animation `opacity: 0`, while still failing if an element stays hidden.
- AC3: `npm run test:e2e` passes in full; `npm test` passes.

## Files in scope, by owner
- tester (`tests/`): `tests/e2e/up-next.spec.ts`, `tests/e2e/helpers.ts`, `tests/e2e/no-js.spec.ts` if needed.
- developer: none. If a failure turns out to be a real product bug, report it as must-fix; don't work around it.

## Constraints
- No change outside `tests/`. No `.skip`/`.fixme` to get green; no `.only`. No new dependency.
- CI evidence (run 39220991718): AC10 tests fail every run with "Timeout 5000ms exceeded while waiting on the
  predicate" at `waitSettled` (`up-next.spec.ts:297`); the two no-JS tests fail with "element or an ancestor has
  opacity: 0" on an `article` with `motion-safe:animate-in motion-safe:fill-mode-backwards`, and are flaky.
- Local Windows runs also showed `page.goto` 30s timeouts on no-JS pages; they did not happen on CI (Linux). Note
  them if you see them, but CI is the reference.

## Task order
1. `tasks/tester-r1.md`
