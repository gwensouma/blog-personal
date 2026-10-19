# Close: sprint 8

- Rounds: developer 1, builder 1, tester 1/3, reviewer 1/3
- Local gate: `npm run gate` exit 0 (developer, builder, reviewer reports); `npm run test:e2e` exit 0, 20 passed (tester,
  reviewer reports)
- PR: #22 · CI at merge time: gate pass, e2e pass
- Usage: `/usage` is a user command; the lead can't read it. Subagent tokens: planner ~65k (spec) + ~47k (tasks),
  developer ~22k, builder ~64k, tester ~36k, reviewer ~101k.

## First full run of the file handoff: what it showed
- The dispatch gate deadlocked: the planner writes every round-1 task up front and the gate waited on all of them.
  Fixed in PR #21 (the gate waits only on dispatched tasks, recorded in `dispatched.txt`).
- Every subagent write asks the user for permission; one accidental "deny" stopped the planner mid-run.
- The planner's prompt is free text; only the four role agents get the one-line `Task: <path>` check.
- The planner believed the hook requires `## Files you may change` and `## Acceptance criteria` in the reviewer task;
  it doesn't. The reviewer template and the hook's list should say the same thing.
- The developer's final chat message was a paragraph, not the one line the agent file asks for (the hook can't see
  chat). The builder, tester and reviewer kept to it.
- File deletions from a shell (the builder's `rm` of `post-list-skeleton.tsx`) bypass the hook; the lead's
  `git status --porcelain` check is the only backstop.
- The reviewer's Playwright MCP can't turn JavaScript off, so the no-JS check fell back to curl on the server HTML.
- CI e2e failed once on PR #21 because `next/font/google` couldn't fetch the fonts; a re-run passed.

## Deferred
- "View all posts" and other button-styled links render with `role="button"` (`components/posts/latest-posts.tsx:32`),
  pre-existing (tester-r1, reviewer-r1). Fix in its own a11y pass.
- Reflow the comment in `components/posts/latest-posts.tsx:18-20` (reviewer-r1).
- Inline helpers that were only shared with the deleted skeletons (reviewer-r1, optional).
- `.design/blog-refactor.md:260-263` still describes the removed skeletons (reviewer-r1).
