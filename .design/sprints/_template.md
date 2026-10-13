# Sprint <#>: <title>

<!-- Copy to .design/sprints/<#>-<branch-name>.md when the sprint starts. The lead writes the Brief before delegating
and pastes every agent report on receipt, so a resumed /lead reads this file instead of chat history. -->

Branch: `<feat|fix|chore>/<name>` · Roadmap row: <#> · Design note: `.design/<feature>.md` (or none) · PR: #<n>

## Brief

**Goal:** one or two sentences.

**Files in scope:** paths or folders, grouped by owner (developer: `app/`, `lib/`, `types/`; builder: `components/`;
tester: `tests/`).

**Acceptance criteria:**
- AC1: an observable behaviour, testable.
- AC2: …

**Constraints:** no-JS behaviour, security limits, no new dependency, anything the roadmap row decided.

## Reports

<!-- One block per agent turn, newest last. Round 1 is the first build/test/review; +1 each time a fix is routed back. -->

### <agent> · round <n> · status: done | blocked | failed
- **Files:** changed paths.
- **Gate:** `<command>` → exit <code> (error verbatim if non-zero).
- **AC → test:** AC1 → `tests/...` (tester); for developer/builder, the cases the tester should cover.
- **Findings:** must-fix / suggestion (tester and reviewer), with `file:line`.
- **Open questions:** or "none".

## Deferred

<!-- Suggestions and out-of-scope findings that don't open a round. Carry anything still wanted to the roadmap. -->

## Close

- Tester rounds: <n>/3 · Reviewer rounds: <n>/3
- Local gate: `npm run gate` exit <code>; `npm run test:e2e` exit <code> (UI or route changes)
- CI: gate <pass|fail>, e2e <pass|fail> · PR #<n> merged as `<sha>`
- Usage: `/usage` at the end of the sprint (optional)
