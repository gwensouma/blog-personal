# Close: sprint 4

- Rounds: developer 1, builder 1, tester 2/3, reviewer 1/3. Tester r2 fixed two reviewer suggestions (#2, #3) at the
  user's request on 2026-10-14; no must-fix was found in any round.
- Local gate: `npm run gate` exit 0 (every report). `npm run test:e2e` (lead, default workers): exit 1, 42 passed,
  1 failed: the pre-existing Ctrl+K flake `tests/e2e/interactive.spec.ts:73` (all `up-next.spec.ts` tests passed).
  Tester r1: exit 0, 43 passed on two consecutive runs.
- PR: #10 · CI at merge time: see the PR checks.
- Usage: `/usage` is a user command; the lead can't read it. Subagent tokens: planner ~65k (spec) + ~78k (tasks),
  developer ~51k, builder ~96k, tester ~98k (r1) + ~41k (r2), reviewer ~150k.

## How the run went
- The WIP from before the file handoff was reused: `main` merged into `feat/up-next` (force pushes are denied), one
  conflict in `roadmap.md`, resolved with `main`'s version.
- The builder fixed a real defect the review of the WIP found: the card's top sweep bar swallowed clicks on hover
  (`pointer-events-none`).
- The reviewer hit its 40-turn cap before writing a report and was continued once to write it from what it had.
  It looked at 3 of 30 viewport/theme cases by eye; the other 27 rest on measurements. No-JS was checked with curl
  (the `playwright-nojs` MCP is still not enabled; see the roadmap's agent harness items).
- The developer's final chat message was several lines, not one (as in sprint 8). The tester's r2 first hand-back
  skipped the report file, citing a "no-report-files instruction" that doesn't exist; it wrote the file when asked.
- Tester r2 saw 30 s first-load timeouts in `up-next.spec.ts` at 6 workers (exit 1 twice, exit 0 at 2 workers); the
  lead's full run at default workers passed that spec. Likely machine load; watch it.

## Deferred
- Ctrl+K palette e2e flake, `tests/e2e/interactive.spec.ts:73/90` (tester-r1 #1, reviewer-r1 #1, came back): fix next
  in its own `fix/` PR (wait for the option's `aria-selected="true"` before Enter).
- `UpNext` returning nothing for `null` has no test; needs a component-test setup (tester-r1 #2).
- `tests/e2e/up-next.spec.ts` "XSS-safe" test checks static titles, nothing user-controlled: drop or rename
  (reviewer-r1 #4).
- `tests/e2e/up-next.spec.ts` hover guard compares to the raw `--border` token and may be vacuous (reviewer-r1 #5).
- `components/posts/post-article.tsx:29` and `.design/blog-refactor.md` "Up next (sprint 4)" name `getPostEnding`;
  the rules live in `decidePostEnding` in `lib/post-ending.ts` (reviewer-r1 #6).
- `up-next.spec.ts` slow first loads at 6 workers on Windows (tester-r2).
