# Close: sprint 17

<!-- docs/sprints/17-hero-backdrop/close.md, written by the lead before merging. The merge commit itself lives in Git. -->

Written late, on 2026-10-27, from `reports/developer-r1.md`, the PR and its CI (D-026). The sprint ran from a chat
approval with no roadmap row, and the close step was skipped at merge time.

- Rounds: developer 1, tester 0/3, reviewer 0/3 (no tester or reviewer task was dispatched)
- Local gate: `npm run gate:fast` exit 0 (developer r1, 159 unit tests); `npm run test:e2e` not run locally; the
  developer built `.next-e2e/` only to check the CSS and measure AC4 contrast
- PR: #37 · CI at merge time: gate pass, e2e pass
- Findings: none (no tester or reviewer round)

## Deferred
- Developer r1, open question: the comment saying a looser mask (to 80%) breaks 4.5:1 was not verified; light mode's
  worst case is 4.82:1, so the margin is small.
- The AC1–AC3 and AC5 checks the developer listed "for the tester" have no e2e test; AC4 rests on the developer's
  one-off measurement.
