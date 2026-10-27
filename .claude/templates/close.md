# Close: sprint <#>

<!-- docs/sprints/<#>-<name>/close.md, written by the lead before merging. The merge commit itself lives in Git. -->

- Rounds: developer <n>, tester <n>/3, reviewer <n>/3
- Local gate: `npm run gate:fast` exit <code>; `npm run test:e2e` exit <code> (tester r<n>, or rerun by the lead)
- PR: #<n> · CI at merge time: gate <pass>, e2e <pass>
- Findings: tester must-fix <n>, suggestions <n>; reviewer must-fix <n>, suggestions <n>; came back <n>

## Deferred
Suggestions and out-of-scope findings, each with its source report. Carry anything still wanted to the roadmap.
