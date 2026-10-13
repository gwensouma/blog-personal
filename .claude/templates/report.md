# Report: <agent> · round <n> · status: done | failed | blocked

<!-- Written by the agent to the "Report to" path in its task. The final chat message is one line:
"<status> — <report path>". Keep it short; no praise, no restating the code. -->

Task: `tasks/<agent>-r<n>.md`

## Summary
2–5 bullets: what was done (developer/builder), tested (tester), checked (reviewer), or researched (planner).

## Files
Changed paths (none for the reviewer).

## Gate
- `<command>` → exit <code>; failures verbatim when non-zero.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | `tests/...` or "for the tester: …" | pass / fail / gap |

## Findings
Tester and reviewer only. Most severe first.
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | must-fix / suggestion | | | | no |

## Open questions
Or "none".
