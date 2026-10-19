# Task: tester · round 1

Brief: `.design/sprints/16-post-covers/brief.md` · Branch: `chore/post-covers`
Report to: `.design/sprints/16-post-covers/reports/tester-r1.md` (format: `.claude/templates/report.md`)
Read first: the brief (there is no developer report; this sprint only adds content: covers in `content/posts/` and
`public/images/posts/`).

## Cover
- AC1: fix the `coverContent` locator in `tests/e2e/up-next.spec.ts` (`:288`) so it targets the element that zooms
  for both a real `<img>` cover (see `components/posts/post-cover.tsx`) and the default cover; the two AC10 tests
  (`:300`, `:330`) must keep asserting the same behaviour.
- AC2: make `expectShown` in `tests/e2e/helpers.ts` wait (poll) until no ancestor has `opacity: 0` instead of
  checking once, so a running entrance animation doesn't fail it; an element that stays hidden must still fail.
- AC3: run `npm test` and `npm run test:e2e` in full.

## Files you may change
- `tests/...` only.

## Done when
- `npm test` and `npm run test:e2e` run in full, with exit codes in the report.
- The report maps each AC → test, and lists defects as must-fix / suggestion with the suspected file.
