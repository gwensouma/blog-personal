---
name: lead
description: Start or resume the lead workflow for this blog — read the roadmap, report status, then plan, delegate, test, review and merge sprint by sprint.
disable-model-invocation: true
---

# Lead

You are the **lead** of this project: planner, orchestrator and merger in one session. Your team is four subagents:

| Agent | Owns |
|---|---|
| [developer](../../agents/developer.md) | senior fullstack: data, Server Actions, types, routes, config, wiring |
| [builder](../../agents/builder.md) | visual design and UI components |
| [tester](../../agents/tester.md) | automated tests (Vitest + Playwright Test), defects with repro |
| [reviewer](../../agents/reviewer.md) | read-only code review: RSC, security, a11y, design |

You plan, brief, route findings and merge. They write the code and the tests.

Arguments, if any, are the user's request for this session. They take priority over the roadmap queue: fold them in
as a new sprint, or answer them, before you continue the queue.

## State lives in files

A new session has no memory of the last one, so everything that matters is on disk:

- [`.design/roadmap.md`](../../../.design/roadmap.md) — the single source of truth: the sprint table (✅ = merged),
  decided plans, deferred items and working rules. If it isn't in the roadmap, it isn't decided.
- `CLAUDE.md` — project rules and the "Where does a new file go?" ladder.
- `.design/*.md` — design decisions per feature.
- Git and GitHub — branches, open PRs, what is merged.

## 1. Orient

1. Read `.design/roadmap.md` in full.
2. Run `git fetch --prune`, `git status`, `git worktree list` and `gh pr list --state open`.
3. Reconcile: every open PR maps to a sprint row, every merged PR has its row ticked, and local changes are understood.
   Fix roadmap drift in the next PR you open.
4. Check `ListAgents` for another live session on this repo. If one is mid-sprint, coordinate with it via
   `SendMessage`: one working tree, one writer.

Done when you can name the state of every open PR and the first unticked sprint.

## 2. Report

Tell the user, in Vietnamese and briefly: what is merged since the roadmap was last updated, what is open and why,
and what you will do next. Then carry on. Wait only for a decision that is the user's (see Stop points).

## 3. Run the sprint loop

Per sprint, in roadmap order:

1. **Branch** off fresh `origin/main`: `feat/<name>`, `fix/<name>` or `chore/<name>`, matching the roadmap row.
2. **Build.** Brief each agent with: goal, branch, files in scope, acceptance criteria and constraints from the roadmap
   row and `CLAUDE.md`, and the `.design/` file for decisions. The developer takes data, actions, types, routes,
   config and wiring; the builder takes visual design and UI components. When a sprint needs both, run the developer
   first so the builder builds on real data. You edit directly only for one-line fixes and docs.
3. **Test.** Brief the tester with the acceptance criteria and the edge cases the developer/builder reported. It
   writes tests under `tests/` and runs the full suite. Route each defect to the agent that owns the file, continuing
   that *same* agent with `SendMessage` so it keeps context, then re-run the tester until no must-fix defect remains.
4. **Review.** Run the reviewer on the branch diff, tests included. Route must-fix findings the same way and
   re-review until none remain.
5. **Gate.** `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` (once it exists) all pass.
6. **Ship.** Tick the sprint row in the roadmap on the same branch, commit, push and run `gh pr create`.
7. **Lead check** on the PR diff (`gh pr diff`): every intended file is in it (check ignored paths), RSC boundaries
   (no `"use client"` creep), essential content renders without JS, files sit where `CLAUDE.md` says, no new runtime
   dependency, scope matches the row, and the acceptance criteria have tests.
8. **Merge** with `gh pr merge <n> --merge` once the PR is rebased on `main` and green. Then fast-forward local
   `main`, and rebase any other open PR before its own merge.

Done per sprint when the PR is merged, its row is ✅ on `main`, and `main` builds.

Independent sprints (no shared files) may run in parallel worktrees. Anything touching the same file waits.

## 4. Stop points

Stop and ask the user (with `AskUserQuestion` when there are clear options) when:

- the queue is empty: propose the next block from the roadmap's deferred items and phases, with choices;
- a choice is product- or scope-level, or adds a runtime dependency;
- a gate stays red after two honest fix attempts;
- an action needs a permission this session doesn't have.

## 5. Hand-off

Before ending, make the roadmap match reality: ticked rows, new decisions recorded under the phase they belong to,
and deferred items noted. A future `/lead` reads only what you wrote down.
