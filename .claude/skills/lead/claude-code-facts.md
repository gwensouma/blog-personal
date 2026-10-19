# Claude Code facts the lead relies on

Reference for changing the agent harness (agents, hooks, permissions, cost). Moved from the retired
`.design/agent-system-status.md` (git history has the 2026-10-12 audit and the eight-step plan it drove). Checked
against the Claude Code docs on 2026-10-12; re-check exact key spellings before writing config.

## Docs facts

- **Subagents** (https://code.claude.com/docs/en/sub-agents.md): frontmatter supports `model` (`sonnet`, `opus`,
  `haiku`, `fable`, a full ID, `inherit`), `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `hooks`,
  `permissionMode`, `memory`, `isolation: worktree`, `omitClaudeMd`, `mcpServers`, `background`. Unknown fields are
  silently ignored. Subagents load `CLAUDE.md` automatically. `skills:` preloads full skill content; skills with
  `disable-model-invocation: true` can't be preloaded. Subagents can spawn subagents up to three layers below the
  main session (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`; checked 2026-10-13). The spawning tool is `Agent` (renamed
  from `Task` in 2.1.63); its PreToolUse `tool_input` has `prompt`, `description`, `subagent_type`, `model`.
  `SubagentStop` input has `agent_type`, `agent_transcript_path`, `stop_hook_active`, `last_assistant_message`; exit 2
  keeps the subagent running with stderr as its next instruction; its matcher is the agent type.
- **Hooks** (https://code.claude.com/docs/en/hooks.md): input includes `agent_id` and `agent_type` inside a subagent.
  Hooks in agent frontmatter run only while that agent is active; a frontmatter `Stop` becomes `SubagentStop`. Project
  hooks run after the workspace trust prompt is accepted.
- **Permissions** (https://code.claude.com/docs/en/permissions.md): `Bash(git push --force *)` is the current form
  (`:*` still works as a trailing suffix). Deny beats allow. Compound commands are matched per subcommand.
- **Sandboxing** (https://code.claude.com/docs/en/sandboxing.md): shell commands only; off by default (`/sandbox` or
  `sandbox.enabled`); keys include `sandbox.autoAllowBashIfSandboxed`, `sandbox.allowUnsandboxedCommands`,
  `sandbox.excludedCommands`, `sandbox.filesystem.*`, `sandbox.network.allowedDomains`. Not on native Windows.
- **Memory** (https://code.claude.com/docs/en/memory.md): target under 200 lines per `CLAUDE.md`. `.claude/rules/*.md`
  with `paths:` load on demand; without `paths:` at launch. Subfolder `CLAUDE.md` files load on demand. `@path` imports
  load at launch (no token saving). Block HTML comments are stripped. Auto-memory loads the first 200 lines or 25 KB
  of `MEMORY.md`.
- **Headless and CI** (https://code.claude.com/docs/en/headless.md, https://code.claude.com/docs/en/github-actions.md):
  `claude -p`; `--bare` skips hooks, skills, MCP, memory and `CLAUDE.md` and needs `ANTHROPIC_API_KEY`;
  the GitHub Action is `anthropics/claude-code-action@v1`.
- **Cost** (https://code.claude.com/docs/en/cli-reference.md, https://code.claude.com/docs/en/costs.md,
  https://code.claude.com/docs/en/statusline.md): no per-subagent budget field or settings key. `--max-budget-usd` is
  print mode only and counts subagent spend; the Agent SDK has `maxBudgetUsd`. Workspace spend limits live in the
  Console; subscription overage limits in claude.ai (`/usage-credits`). The statusline input has
  `cost.total_cost_usd`; hook inputs carry no running cost.
- **Telemetry** (https://code.claude.com/docs/en/monitoring-usage.md): `CLAUDE_CODE_ENABLE_TELEMETRY=1` with
  `OTEL_METRICS_EXPORTER` / `OTEL_LOGS_EXPORTER`; cost and token metrics carry `agent.name` and `query_source`.

## Cost caps (checked 2026-10-12)

There is **no per-subagent dollar cap** in Claude Code: no frontmatter field, no settings key. What exists:

| Lever | Scope | Caps dollars? | Fits this setup? |
|---|---|---|---|
| `maxTurns` in agent frontmatter | one subagent run | no, turns | **yes**: the practical per-agent cap |
| `effort` / `model` in agent frontmatter | one subagent | no, lowers cost per turn | **yes** |
| `claude -p --max-budget-usd 5` | one headless run, subagents included | yes (client-side estimate, can overshoot by one response) | only if an agent runs as a separate `claude -p` call, e.g. in CI; not in the interactive `/lead` session |
| Agent SDK `maxBudgetUsd` | one `query()` | yes | only with a custom SDK orchestrator; overkill now |
| Console workspace spend limit | all Claude Code use on an API key | yes, monthly | if billed through the API |
| claude.ai usage-credit spend limit (`/usage-credits`) | paid overage on Pro/Max | yes, monthly | if on a subscription |
| `/usage` attribution, statusline `cost.total_cost_usd` | session | no, visibility only | for the sprint record |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | session | no, count | not needed |

Hooks can't read a running cost total, so they can't enforce a budget either.


## Permissions the user adds by hand

The auto-mode classifier blocks the lead from editing its own permissions, so the user adds these (roadmap "Waiting
on the user"): the `playwright-nojs` server in `.mcp.json` (config: `.claude/playwright-nojs.json`) and in
`enabledMcpjsonServers`; `mcp__playwright-nojs` in `permissions.allow`; and `Edit(/app/**)`, `Edit(/lib/**)`,
`Edit(/types/**)`, `Edit(/components/**)`, `Edit(/content/**)`, `Edit(/public/**)`, `Edit(/assets/**)`,
`Edit(/tests/**)`, `Edit(/.design/**)` in `.claude/settings.json`, so subagents stop asking for every write (the hook
still keeps each agent in its area). Until then the reviewer checks no-JS with curl.
