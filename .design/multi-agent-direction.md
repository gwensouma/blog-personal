# Multi-agent direction (open question, 2026-10-14)

Status: **open**, for a new session to discuss with the user. Nothing here is decided.

## The question
The user wants "a multi-agent workflow" and, after sprint 8, felt the current setup is "only subagents" because the
agents never talk to each other. Is the current model the wrong direction?

## What exists today (merged on `main`)
- **Orchestrator–worker (hub and spoke).** The lead (main session) spawns Claude Code subagents defined in
  `.claude/agents/`: planner, developer, builder, tester, reviewer. Each runs in its own context, does one task and
  returns to the lead. Agents never message each other; they hand over through files in
  `.design/sprints/<#>-<name>/` (brief, `tasks/`, `reports/`, `close.md`). Workflow: `.claude/skills/lead/SKILL.md`.
- **Enforced by `.claude/hooks/guard-paths.mjs`:** one-line `Task: <path>` dispatch, task and report templates
  (`.claude/templates/`), per-agent write areas, the dispatch gate (`dispatched.txt`), planner `Mode: spec|tasks` with
  an approved spec, no git writes by subagents.
- **First full run:** sprint 8 (PR #22). Its lessons are in `.design/sprints/8-home-no-js/close.md`; most are fixed
  (PRs #21, #23). Still open: the user applies the permission and `playwright-nojs` MCP entries listed in
  `.design/agent-system-status.md` (the auto-mode classifier blocks the lead from editing its own permissions).

## The alternative: Claude Code agent teams
Docs: https://code.claude.com/docs/en/agent-teams (read 2026-10-14). Experimental, enabled with
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.
- Teammates are separate Claude Code sessions that message each other directly, share a task list with dependencies
  and self-claim work; the user can talk to any teammate. One team per session; only the lead spawns teammates.
- Subagent definitions in `.claude/agents/` can be reused as teammate types (tools, model, body apply).
- Quality-gate hooks: `TaskCreated`, `TaskCompleted`, `TeammateIdle` (exit 2 blocks with feedback).
- Costs and limits: much higher token use (each teammate is a full session); no `/resume` of in-process teammates;
  task status can lag; teammates' permission prompts go to the lead; split panes need tmux or iTerm2 (not Windows
  Terminal or the VS Code terminal; in-process mode works anywhere).
- Docs' guidance: teams pay off for parallel research and review, competing hypotheses, and cross-layer work with
  separate file ownership; for sequential work or same-file edits, subagents are better.

## Options the lead proposed (the user hasn't chosen)
1. **Hybrid (lead's recommendation):** keep the lead, files, hooks and PR gates; use a team where talking or
   parallelism helps: 2–3 reviewers that challenge each other, planner vs reviewer debating a spec, developer and
   tester talking directly inside a fix loop.
2. **Full agent teams:** every role is a teammate on a shared task list; rewrite SKILL.md and the hook gates around
   `TaskCompleted`/`TeammateIdle`.
3. **Keep subagents:** keep patching the gaps found in sprint 8.
4. **Learning first:** try several coordination styles on purpose, since the project exists to learn.

## For the new session
Ask the user what "multi-agent" should mean here (agents that talk, parallel work, or a learning goal), then pick an
option and record the decision in `.design/roadmap.md` and `.design/agent-system-status.md`. Next sprint in the queue:
4 (`feat/up-next`, the planner rebuilds its spec from draft PR #10).
