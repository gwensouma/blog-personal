# Close: sprint 9

<!-- docs/sprints/9-comments/close.md, written by the lead before merging. The merge commit itself lives in Git. -->

- Rounds: developer 2, tester 2/3, reviewer 2/3
- Local gate: `npm run gate:fast` exit 0 (254 tests, lead, after the last change); `npm run test:e2e` exit 0
  (fresh build, 55 passed, tester round 2; no code changed after it)
- PR: #<n> · CI at merge time: gate <pass>, e2e <pass>
- Usage: `/usage` not available to the lead mid-session; agent runs: planner ×2, developer ×2, tester ×2, reviewer ×2

## Deferred
- Reviewer r1 #2: on an error the action echoes the raw name and body back uncapped (up to Next's 1 MB action body);
  cap the echo, e.g. to the field limits plus a margin. Cheap; worth doing before or with sprint 10.
- Reviewer r1 #3: `comment-form.tsx` imports `CommentEntry` from `comment-list.tsx`, pulling that module into the
  client bundle; move `CommentEntry` to its own file.
- Reviewer r1 #4: `className="h-9"` overrides the shadcn `Input` height; drop it or use a size variant.
- Tester r1 #1: the AC14 no-view e2e check can't be exact while `up-next.spec.ts` loads every post in parallel; a unit
  test of `PostViews` with mocked `headers()` would make it exact.
- Tester r1 #2: AC8 (honeypot) has only a unit test; add an e2e if the honeypot markup changes.
- Process: tester r2's first report skipped the template shape (written outside the hook's view); rewritten on request.
- No browser check this sprint (Playwright MCP failed to connect); JS behaviour rests on the e2e suite.
