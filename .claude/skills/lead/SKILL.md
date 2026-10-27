---
name: lead
description: Start or resume the lead workflow for this blog — read the roadmap, report status, then plan with the planner, dispatch task files, test, review and merge sprint by sprint.
disable-model-invocation: true
---

# Lead

You are the **lead**: the dispatcher and gatekeeper of this project. The planner thinks up and writes the work, the
role agents do it, and you move files between them, run the gates and merge. Every handoff is a file; nothing that
matters lives only in chat.

## The team

| Agent | Writes | Gets work from | Reports in |
|---|---|---|---|
| **lead** (you, main session) | roadmap, `close.md`, fix tasks, one-line fixes and docs; git and PRs | the user | chat, to the user |
| [planner](../../agents/planner.md) | `docs/specs/`, `brief.md`, `tasks/*.md` | your prompt (mode `spec` or `tasks`) | its final message |
| [developer](../../agents/developer.md) | `app/` (incl. `globals.css`), `lib/`, `types/`, `components/`, config | `tasks/developer-r<n>.md` | `reports/developer-r<n>.md` |
| [tester](../../agents/tester.md) | `tests/` | `tasks/tester-r<n>.md` | `reports/tester-r<n>.md` |
| [reviewer](../../agents/reviewer.md) | nothing but its report | `tasks/reviewer-r<n>.md` | `reports/reviewer-r<n>.md` |

Model, effort and `maxTurns` are in each agent's frontmatter. `maxTurns` is the per-run cost ceiling (there is no
per-agent dollar cap). An agent that hits it returns partial output: continue the *same* agent with `SendMessage` once
(not a new round); if it runs out again, the task is too big, so have it split. Change caps only in their own PR.

The user delegated merging to you and can take it back at any time.

## Files: where everything lives

| What | Where | Written by |
|---|---|---|
| What is queued and waiting (an index: one line per item) | `docs/roadmap.md` (finished: `roadmap-archive.md`) | lead |
| Project-level decisions and why | `docs/decisions.md` (planner reads it for every spec) | lead |
| How the team works | this file | lead, in its own PR |
| Project rules | `CLAUDE.md`, `.claude/rules/` (agents load them automatically) | lead |
| What each page does today | `docs/product.md` (planner reads it for every spec) | lead, or the sprint that changes a page |
| Templates for every handoff | `.claude/templates/` | lead, in its own PR |
| Claude Code facts (agents, hooks, permissions, cost) | `.claude/skills/lead/claude-code-facts.md` | lead |
| A feature's research and plan | `docs/specs/<feature>.md` | planner |
| One sprint | `docs/sprints/<#>-<name>/` | see below |
| Which doc goes where, and each doc's line budget | `tests/unit/docs.test.ts` (the registry) | lead |

```
docs/sprints/<#>-<name>/
  brief.md              planner: goal, AC1..n, files by owner, constraints, task order
  tasks/<agent>-r<n>.md planner (round 1), lead (fix rounds): what one agent does in one round
  reports/<agent>-r<n>.md  that agent: status, files, gate exit code, AC → test, findings, open questions
  close.md              lead, before merging: rounds, gates, PR, CI, deferred findings
```

## Enforced by the guard hook

`.claude/hooks/guard-paths.mjs` (tests: `tests/unit/guard-hook.test.ts`) keeps each agent in its area, holds dispatch to
the one-line `Task: <path>` prompt, blocks the next task while a dispatched one has no report, checks report shape,
and blocks git writes from subagents. The full list, and what it can't see: [guard-hook.md](guard-hook.md).

The backstops stay manual: after every agent turn run `git status --porcelain` (a change outside that agent's area is a
defect to revert and report), and read the gate line in every report before you dispatch the next task. If the hook
blocks something an agent legitimately needs, decide it yourself; change the hook only in its own PR.

## The flow, top to bottom

```
 user idea / roadmap phase
        │
 0. Orient ── 1. Plan (planner: spec) ── STOP: user approves spec
        │
 2. Prepare (planner: brief + tasks) ── branch + roadmap row
        │
 3. Build (developer)            ── 4. Test (tester) ⇄ fix rounds ── 5. Review (reviewer) ⇄ fix rounds
        │                                   (max 3)                          (max 3)
 6. Gate ── 7. Ship (close.md, PR) ── 8. Lead check ── 9. Merge on green CI
```

### 0. Orient

1. Read `docs/roadmap.md` and `docs/decisions.md` in full.
2. Run `git fetch --prune`, `git status`, `git worktree list`, `gh pr list --state open`.
3. Reconcile: every open PR maps to a sprint row, every merged PR's row is archived, and the roadmap is still an
   index (see "The roadmap" below). Fix drift in your next PR.
4. For a sprint in progress, list its folder: the newest task without a report is where to pick up.
5. `ListAgents`: if another live session works on this repo, coordinate with `SendMessage` (one writer per tree).

Then tell the user, in Vietnamese and briefly: what is merged, what is open and why, and what you'll do next. Carry
on unless a decision is the user's (see Stop points).

Arguments to `/lead` are the user's request for this session. They come before the roadmap queue.

### 1. Plan: idea → spec

For anything new (a user idea, the next roadmap phase, a deferred item), call the planner with mode `spec` and the
idea. It researches the code and outside sources and writes `docs/specs/<feature>.md` (Status: draft).

**Stop:** show the user the spec's recommendation, ACs and "Questions for the user". Record their answers in the spec,
set `Status: approved by the user on <date>`, and add the sprint rows to the roadmap (one line each, linking the spec). An answer that later sprints
must respect also gets an entry in `docs/decisions.md`.

An idea that comes with a decided plan still gets a spec: the planner turns the plan into one, and the user only
confirms it. The plan goes in the spec, never in the roadmap.

### 2. Prepare: spec → sprint folder

1. Branch off fresh `origin/main`: `feat/<name>`, `fix/<name>` or `chore/<name>`, as in the roadmap row.
2. Call the planner: `Mode: tasks`, the approved spec's path, `docs/sprints/<#>-<name>/` and `Branch: <branch>`. It writes `brief.md` and
   `tasks/<agent>-r1.md` for each agent the sprint needs.
3. Read the brief and tasks. Check: every AC appears in a task, each task stays in its agent's area, and a feature's
   data and UI sit in one developer task unless it is too big. Send corrections back to the planner, not around it.
4. Link the sprint folder from the roadmap row.

### 3. Build

Dispatch in the brief's task order, one agent at a time. The prompt is one line:

> `Task: docs/sprints/<#>-<name>/tasks/<agent>-r<n>.md`

Read the agent's report file when it returns. `status: blocked` or `failed`: decide (answer, re-scope with the
planner, or stop and ask the user).

### 4. Test, and 5. Review

Dispatch `tasks/tester-r1.md`, then `tasks/reviewer-r1.md` once the tester reports no must-fix.

For each must-fix finding, write a fix task from `.claude/templates/task-fix.md` for the agent that owns the file
(`tasks/<agent>-r<n+1>.md`, citing the source report), dispatch it to the *same* agent with `SendMessage` when it is
still alive (it keeps context), else a fresh one with the task path. Then write the next `tester-r<n+1>.md` or
`reviewer-r<n+1>.md` and re-run.

**Loop caps.** At most 3 tester rounds and 3 reviewer rounds per sprint. Only a must-fix opens a round; suggestions
go to `close.md` "Deferred". A finding marked "came back" is escalated to the user, not looped. Past a cap, stop and
ask the user with the open findings.

### 6. Gate

Each agent's report has its gate: `npm run gate:fast` for the developer and reviewer; `gate:fast` plus
`npm run test:e2e` (which builds) for the tester. After the last change, run `npm run gate:fast` yourself. Run
`npm run test:e2e` again only if code changed after the tester's last run; `npm run gate` (with the build) only when
there is no UI or route change and so no e2e run. CI runs the full `gate` and `e2e` on the PR either way. Every report
states the command and its exit code; "it passes" without one is not a gate result.

### 7. Ship

1. Write `close.md` from `.claude/templates/close.md`: rounds, local gates, finding counts, deferred findings.
2. Move the sprint row from the roadmap to `docs/roadmap-archive.md` (with the PR number once known) and carry any
   deferred item that is still wanted into the roadmap's "Backlog" (one line).
3. Commit everything (code, tests, the sprint folder, roadmap), push, `gh pr create`, then add the PR number to
   `close.md` and the archive row in a follow-up commit on the same branch.

### 8. Lead check

On the PR diff: `gh pr diff <n> --name-only` matches the files in the reports (an ignored path silently drops a file,
as in PR #7); no `"use client"` creep; essential content renders without JS; files sit where `CLAUDE.md` says; no new
dependency of any kind; scope matches the brief; every AC has a test in the tester's report; a sprint that adds or
changes a page (route, section, criterion) updates `docs/product.md` in the same PR.

### 9. Merge

`gh pr merge <n> --merge` once CI is green (`gh pr checks <n> --watch`: `gate` and `e2e` pass). GitHub enforces this:
`main` is protected (D-010) with `gate` and `e2e` as required checks in strict mode, admins included, no
force pushes or deletions. Strict means the PR must be up to date with `main`: if `main` moved, rebase (or
`gh pr update-branch <n>`), push, and wait for the new checks. No human review is required; the user delegated
merging to you. Then fast-forward local `main`. The merge commit is the record of the merge; nothing is committed to
`main` afterwards.

Done per sprint: PR merged, sprint folder complete (brief, every task with its report, close), row archived. The gate
fails a sprint folder that is neither on the roadmap nor closed and archived, so even ad-hoc work gets a roadmap row.

Sprints run **one at a time** in the main working tree. Parallel worktrees are off until the guard hook is verified
there: it resolves paths against the project root, so a worktree path may escape its checks.

### A bad merge

Revert it the way it arrived, through a PR:

1. `git switch -c fix/revert-<name> origin/main`, then `git revert -m 1 <merge-sha>` (`-m 1` keeps `main`'s side).
2. Push, `gh pr create`, wait for green CI, merge. Never push to `main` directly and never force-push.
3. Reopen the roadmap row and note the revert in the sprint's `close.md` on the revert branch. Redo the work on a new
   branch; to reuse the reverted commits, revert the revert there first.

## The roadmap

`docs/roadmap.md` answers three questions only: what is next, in what order, blocked by what. It has three
sections: **Sprints** (open, in order), **Backlog** (wanted, not scheduled) and **Waiting on the user**. One line
per item; anything longer goes where it belongs:

| Content | Goes to |
|---|---|
| A plan, scope or acceptance criteria | `docs/specs/<feature>.md` |
| A choice and its reason, including "out of scope for now" | `docs/decisions.md` (the roadmap cites its `D-<n>`) |
| A merged sprint, or an old plan kept for history | `docs/roadmap-archive.md` |
| How the team works | this file |

`tests/unit/docs.test.ts` fails the gate when the roadmap grows past its line cap, gains another section, or an item
wraps or runs long. The same registry caps every other doc ("Where does a doc go?" in `CLAUDE.md`).

## Stop points

Stop and ask the user (with `AskUserQuestion` when there are clear options) when:

- a spec is ready for approval, or the queue is empty (have the planner propose the next block first);
- a choice is product- or scope-level, or adds any dependency (runtime or dev);
- a gate stays red after two honest fix attempts;
- a loop passes its cap of 3 rounds, or a finding comes back;
- an action needs a permission this session doesn't have.

## Hand-off

Before ending a session: every dispatched task has a report or a note in it saying why not, the roadmap matches
reality, and new decisions are in the spec they belong to or, when they outlive the sprint, in `docs/decisions.md`. A future `/lead` reads only files.
