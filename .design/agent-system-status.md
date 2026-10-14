# Agent system status

> **Reading guide (2026-10-13).** §2–§4 are the audit snapshot of 2026-10-12, *before* the fixes: statements there
> such as "no agent sets `model:`" or "`.github/` does not exist" describe that day, not now. The current state is
> §8 (each step's ticks and notes) and the files themselves; the workflow is `.claude/skills/lead/SKILL.md`.

The multi-agent setup that builds this blog, as of 2026-10-12. It grew piece by piece on top of an existing project
(planner session → planner + orchestrator sessions → one `/lead` session with four subagents), so it has gaps and
drift that a from-scratch design would not. This file lists what exists, what is wrong, the target structure, and the
order to fix it.

This is a working document, not a decision record. When an item lands, tick it here and move the decision to the one
place it belongs (see §5). Delete this file once every step is done.

Legend: ✅ in place · ⚠️ in place but weak · ❌ missing · ➖ not needed at this scale.

## 0. Resuming in a new session

1. Read this file in full. It does not depend on chat history.
2. Do each step on its own `chore/<name>` branch off fresh `main`, never on a feature branch. Steps 1–6 are merged
   (PRs #11–#16). Step 7 (hosting) is deferred by the user. Step 8 (file handoff + planner) is merged (PRs #18,
   #19). A dev container is built on branch `chore/devcontainer` (Node 22, gh, Playwright, default-deny firewall;
   verified: gate 0, e2e 0) but deferred by the user on 2026-10-14; open its PR when the user asks.
   "Later" items are optional.
3. Start at the first unticked step in §8. Each step is meant to be one PR.
4. Open questions for the user are in §9. Ask them before the step that needs the answer, not all at once.

---

## 1. Verdict

The core shape is sound: four clear roles, a tester and a reviewer loop, state kept in files, one branch and one PR per
sprint. The way it is organized is not. The same information lives in several places with no single source of truth,
all mechanical work sits on the lead, nothing outside the agents verifies their claims, and nothing enforces the rules
except prompts. **Fix it, don't rebuild it.**

## 2. Current topology

```
user ──/lead──▶ LEAD (main session): plans, briefs, routes findings, re-runs gates, commits, pushes, opens PRs,
                 │                     checks its own PR, merges, updates roadmap and memory
                 │   state: .design/roadmap.md · .design/*.md · git · GitHub PRs · auto-memory
                 │
                 ├──▶ developer  data, Server Actions, types, routes, config      (Read Write Edit Grep Glob Bash)
                 ├──▶ builder    visual design + UI, 4 skills preloaded         (Read Write Edit Grep Glob Bash)
                 ├──▶ tester     Vitest + Playwright Test, reports defects      (Read Write Edit Grep Glob Bash)
                 └──▶ reviewer   read-only review + browser via Playwright MCP  (Read Grep Glob Bash + MCP)

Sprint loop (SKILL.md §3): branch → developer → builder → tester ⇄ owner → reviewer ⇄ owner → gates → PR → lead check → merge
```

- **Hub and spoke is a choice, not a limit.** Subagents *can* spawn subagents (up to three layers; corrected on
  2026-10-13), but this project keeps one dispatcher: role agents have no `Agent` tool, so every handoff goes through
  the lead and a file. The flaw is *how much* the hub does (see AS-19).
- **Framework:** Claude Code alone (subagents, skills, one MCP server, the `gh` CLI, Markdown for state). Right for a
  one-person blog with four agents. LangGraph, CrewAI or the Agent SDK would add overhead without benefit.

### Which model each agent runs

None of `.claude/agents/*.md` sets `model:`, so **every agent inherits the main session's model**. With `/model` set to
Opus 5.5 (the user's default since 2026-10-12), all five contexts run Opus 5.5. There is no central agent config file
in Claude Code: **each agent's frontmatter is its config**, and `/agents` lists them with their models. Don't add a
second file that repeats models; it will drift.

| Agent | `model` | `effort` | `maxTurns` | Preloaded skills |
|---|---|---|---|---|
| lead (main session) | session model (Opus 5.5) | session | – | `lead` (user-invoked) |
| developer | inherit → Opus 5.5 | inherit | none | – |
| builder | inherit → Opus 5.5 | inherit | none | hallmark, frontend-design, frontend-ui-engineering, shadcn |
| tester | inherit → Opus 5.5 | inherit | none | – |
| reviewer | inherit → Opus 5.5 | inherit | none | hallmark, frontend-ui-engineering, shadcn |

---

## 3. Inventory

| Path | Role | In git? | Notes |
|---|---|---|---|
| `CLAUDE.md` | project rules, file placement, **and** the agent workflow | yes | 113 lines but 15 KB (long lines, ~4k tokens); loaded into all five contexts |
| `.claude/skills/lead/SKILL.md` | the lead procedure (`/lead`) | yes | `disable-model-invocation: true` |
| `.claude/agents/{developer,builder,tester,reviewer}.md` | agent prompts and config | yes | no `model`, `maxTurns`, `effort` or hooks |
| `.claude/skills/{hallmark,frontend-design,frontend-ui-engineering,shadcn}/` | third-party skills | **no** (gitignored) | a fresh clone silently loses them; no record of their source |
| `.claude/settings.json` | enables the Playwright MCP server | yes | allow-list only; no `deny`, no hooks, no sandbox settings |
| `.mcp.json` | Playwright MCP `@playwright/mcp@0.0.83`, headless, isolated | yes | flaky connection; CDP fallback documented |
| `.design/roadmap.md` | sprint queue and decisions, **plus** "Working rules" (a third copy of the workflow) | yes | 197 lines; mixes plan, live status and history |
| `.design/{blog-refactor,search,popular-posts,archive}.md` | per-feature design notes | yes | |
| `tests/`, `vitest.config.mts`, `playwright.config.ts` | app test suite (81 unit, 18 e2e) | yes | tests the app, not the agents |
| `.env.example` | env template | yes | has `PORT`, `NEXT_PUBLIC_SITE_URL` only |
| `README.md` | human onboarding | yes | out of date: says Next.js 14 and "in-memory fake", no tests, no setup for agents |
| `~/.claude/projects/E--CodeHehe-Web-RSC/memory/` | auto-memory | no (per machine) | stale and contradictory (AS-10) |
| `~/.claude/settings.json` | user settings | no | one `SessionStart` hook (herdr), nothing project-specific |
| `.github/` | – | – | **does not exist**: no CI, no PR template |

---

## 4. Known issues

Numbered so commits can reference them (`fixes AS-3`).

### Verification and guardrails
| # | Issue | Evidence | Risk | Severity |
|---|---|---|---|---|
| AS-1 | No CI. The agents that wrote the code run and report the gates; the lead re-runs them and merges. | no `.github/`; `SKILL.md:63-68` | a broken PR reaches `main` unnoticed | high |
| AS-2 | Prohibitions are prompt-only: tester "edits only `tests/`", reviewer "never edits", "never `taskkill /IM`", subagents "never push or merge". | `tester.md:19-20`, `reviewer.md:4,11,33`, `builder.md:32`, `developer.md:31`; no `deny` in `.claude/settings.json` | one forgetful turn kills the user's Node processes or rewrites source/tests | high |
| AS-3 | Developer and builder can edit `tests/`; `test.fixme` / `.skip` can hide failures. | tool lists; `tests/e2e/no-js.spec.ts:138` | tests weakened to go green | high |
| AS-20 | No sandbox. Claude Code's sandbox (filesystem and network isolation for shell commands) does not run on native Windows, and this machine runs Claude Code natively on Windows. Every `npm install`, `npx -y …` and build runs with full user access. | Claude Code sandboxing docs; environment is win32 + PowerShell | a malicious package can read or send anything the user can | medium (makes AS-2 more urgent) |

### Workflow structure
| # | Issue | Evidence | Risk | Severity |
|---|---|---|---|---|
| AS-18 | The workflow is described in **three** places: `CLAUDE.md` "Agent workflow", `SKILL.md`, and `roadmap.md` "Working rules". They already disagree (`roadmap.md:3` says "lead → builder ⇄ reviewer"). Because `CLAUDE.md` loads into every subagent, all four read the lead's procedure, which is not their job. | `CLAUDE.md:102-113`, `SKILL.md`, `roadmap.md` "Working rules" and line 3 | drift; tokens wasted; confusion about who does what | high |
| AS-19 | The lead is overloaded with mechanical work: re-running gates, git, PRs, checking its own PR, merging, roadmap and memory bookkeeping. Every agent report flows into its context for the whole sprint. It plans, checks and approves its own work. | `SKILL.md:49-71`; memory `planner-merges-prs.md` | the lead's context bloats; one crash or compaction stalls the sprint; no independent check | high |
| AS-4 | Handoffs aren't persisted. Briefs go straight to agents and reports come back as free text, living only in the lead's context. | `developer.md:34-40`, `tester.md:41-46`; only sprint 4 has a hand-written status block | reports lost on compaction; sprints can't be audited | high |
| AS-5 | Gate results are prose ("pass/fail"), not command + exit code. | "Report back" sections | "passed" can't be checked | medium |
| AS-6 | Fix loops have no cap. | `SKILL.md:60,62` "until none remain"; the two-attempt rule (`:81`) covers gates only | long, expensive loops | medium–high |
| AS-12 | Ownership overlap: developer owns "routes and their wiring in `app/`", builder owns "new pages". | `developer.md:3`, `builder.md:3` | two agents edit the same page | low |
| AS-17 | No rollback procedure after a bad merge. | `SKILL.md` | ad-hoc recovery | low |

### Context, config and memory
| # | Issue | Evidence | Risk | Severity |
|---|---|---|---|---|
| AS-24 | No spend bound per agent. Claude Code has no per-subagent dollar cap, and no agent sets `maxTurns`, so one runaway agent turn has no ceiling. | frontmatter; Claude Code docs (Step 5, "Cost caps") | surprise usage | medium |
| AS-7 | No `model`, `effort` or `maxTurns` on any agent, so nobody can tell what each agent runs, and cost per sprint is high and unpredictable. | `.claude/agents/*.md` frontmatter | cost; no visibility | medium |
| AS-23 | `CLAUDE.md` is dense (15 KB) and mostly task-specific: Tailwind/motion rules matter only for UI, data rules only for `lib/`, test rules only for `tests/`, yet all five contexts load all of it. The official guidance is under 200 lines per file because longer files "consume more context and reduce adherence". | `CLAUDE.md`; memory docs | weaker rule-following; tokens wasted | medium |
| AS-8 | Builder preloads four skills in full (`hallmark/SKILL.md` alone is 558 lines plus ~80 references). Every agent says "Read `CLAUDE.md` first" although subagents load it automatically. | `builder.md:5-9,14`, `developer.md:11`, `tester.md:10`, `reviewer.md:13` | duplicate tokens | medium |
| AS-9 | Roadmap bloat: merged sprint plans (sprint T, sprint 4 status) stay inline, next to the "Working rules" copy. | `roadmap.md` | every `/lead` reads 197 lines | medium |
| AS-10 | Auto-memory is stale and contradictory. `git-feature-branch-pr.md` isn't indexed in `MEMORY.md` and says "merging is the user's call". `visual-upgrade-status.md` (~6 KB) is a 2026-10-09 snapshot. Several memories still speak of planner and orchestrator sessions that no longer exist. | memory folder | a new session follows an old rule | medium |
| AS-15 | No observability: no per-sprint record of rounds, agents or cost. | – | can't tell where time and money go | low |
| AS-16 | No agent evals. | – | prompt edits are blind | low–medium |

### Setup and hosting
| # | Issue | Evidence | Risk | Severity |
|---|---|---|---|---|
| AS-22 | No setup path for a new machine. `README.md` is out of date. `.env.example` lacks `BLOG_DATA_DIR` (used by the code) and the planned `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `TRUST_PROXY`. Nothing says how to install the third-party skills, `npx playwright install chromium`, or the Playwright MCP, or to start with `/lead`. | `README.md`, `.env.example`, `.gitignore` | the setup only works on this machine | medium |
| AS-11 | Third-party skills are gitignored with no manifest of where they came from. | `.gitignore` `.claude/skills/*` | same as AS-22 | low |
| AS-21 | Hosting is undecided, but sprints 9–10 depend on it. `lib/data/store.ts` writes likes, views, subscribers and soon comments to JSON files in `.data/`. On serverless hosts (Vercel, Netlify) the filesystem is ephemeral and per instance, so those writes would be lost. The comment rate limit (`TRUST_PROXY`, left-most `x-forwarded-for`) also depends on the host's proxy. | `lib/data/store.ts`; roadmap "Phase D plan" | sprint 9 designed around a store and proxy behavior that won't exist in production | medium (decide before sprint 9) |

---

## 5. Target structure: one home per concern

| Concern | The one place it lives | Today |
|---|---|---|
| Rules every agent needs (TypeScript, English, RSC-first, commands, file-placement ladder) | `CLAUDE.md`, short, with one line pointing to `/lead` for the workflow | mixed with everything else |
| Rules for one area of code (UI, data/security, tests) | `.claude/rules/<area>.md` with `paths:` frontmatter, loaded only when matching files are touched | in `CLAUDE.md` |
| Role, model, effort, tools, turn cap, per-agent hooks | `.claude/agents/<name>.md` frontmatter | role only |
| How the team works (sprint loop, briefs, routing, stop points, merge) | `.claude/skills/lead/SKILL.md` | here **and** in `CLAUDE.md` **and** in the roadmap |
| What to build, in which order, what is decided | `.design/roadmap.md` (no "how") | also holds working rules and finished plans |
| Finished sprints and plans | `.design/roadmap-archive.md` | inline in the roadmap |
| Brief, agent reports, gate evidence, rounds of one sprint | `.design/sprints/<n>-<branch>.md` | the lead's context |
| Per-feature design decisions | `.design/<feature>.md` | ✅ already |
| The gate commands | `package.json` script `gate`, run by agents and by CI | listed in four prompts |
| Independent verification | `.github/workflows/ci.yml` + branch protection | none |
| Hard limits | `.claude/settings.json` (`permissions.deny`, `hooks`) + `.claude/hooks/*.mjs` | prompts |
| Setup for a new machine | `README.md` "Setup" + a complete `.env.example` + `.claude/skills/SKILLS.md` | out of date / missing |
| Facts about the user (preferences, delegated rights) | auto-memory, nothing else | also holds sprint state |

### What the lead keeps after the move
Deciding, briefing, routing findings to the owning agent, asking the user at stop points, and pressing merge once CI is
green. The mechanical parts move:

| Lead does today | Moves to |
|---|---|
| re-runs typecheck, lint, test, build | `npm run gate` in the agent's own turn + CI on the PR |
| checks its own PR, then merges | required CI check (branch protection); the lead merges only on green |
| holds every report in context | the sprint file |
| reminds agents what not to touch | hooks |
| keeps sprint state in memory | the roadmap and sprint files |

---

## 6. `CLAUDE.md` split plan

Mechanisms (checked in the Claude Code memory docs):
- `.claude/rules/*.md` **with** `paths:` load only when Claude works with matching files. Without `paths:` they load at
  launch like `CLAUDE.md`.
- `CLAUDE.md` files in subfolders load on demand too, but rules files keep everything in one folder. Use rules.
- `@path` imports load at launch, so they **don't** save tokens. Use them only for organization.
- Block HTML comments (`<!-- … -->`) are stripped before injection. Free notes for humans.
- A rule a linter can check belongs in ESLint, not in prose.

| Current section | Destination |
|---|---|
| Project goals (10 lines) | keep in `CLAUDE.md`, cut to ~5 short bullets |
| Commands (11 lines) | keep in `CLAUDE.md`; add `npm run gate` |
| Architecture: folder tree (~45 lines) | mostly delete (agents can `ls`); keep ~6 lines on the layering principle |
| Architecture: Tailwind, shadcn, motion, icons; Design reference | `.claude/rules/ui.md`, `paths: ["components/**", "app/**/*.tsx"]` |
| Architecture: `lib/data`, Server Actions, security, `lib/ai` plan | `.claude/rules/data.md`, `paths: ["lib/**", "app/**/route.ts"]` |
| Test placement, `BLOG_DATA_DIR`, `resetStoreForTests()` | `.claude/rules/tests.md`, `paths: ["tests/**"]` |
| "Where does a new file go?" (~23 lines) | keep in `CLAUDE.md`, tightened (every agent creates files) |
| Agent workflow (11 lines) | delete; one line: "Team workflow: `/lead` (`.claude/skills/lead/SKILL.md`)." |
| kebab-case file names, `@/` imports, no raw hex or palette classes | ESLint (`eslint-plugin-check-file`, `no-restricted-imports`, `no-restricted-syntax`), then drop from prose |

Target: `CLAUDE.md` around 40–60 short lines.

---

## 7. Missing setup files

| File / setting | Purpose | Fixes | Priority |
|---|---|---|---|
| `package.json` → `"gate"` script | one command: typecheck, lint, test, build | AS-5, AS-19 | high |
| `.github/workflows/ci.yml` | run `gate` (then `test:e2e`) on every PR | AS-1 | high |
| Branch protection on `main` (GitHub setting) | require CI before merge | AS-1, AS-19 | high |
| `.claude/settings.json` → `permissions.deny` | hard-block dangerous commands | AS-2, AS-20 | high |
| `.claude/hooks/guard-paths.mjs` | `PreToolUse` on `Write\|Edit`, keyed on `agent_type` | AS-2, AS-3 | high |
| `.claude/rules/{ui,data,tests}.md` | path-scoped rules split out of `CLAUDE.md` | AS-23 | medium |
| `.design/sprints/_template.md` | handoff record per sprint | AS-4, AS-5, AS-15 | high |
| `.design/roadmap-archive.md` | finished sprints and plans | AS-9 | medium |
| frontmatter `model` / `effort` / `maxTurns` in each agent | visible, controlled config | AS-7, AS-6 | medium |
| `.github/pull_request_template.md` | AC → tests, gate evidence, file list | AS-1, AS-5 | medium |
| `.env.example` (complete) | every env var the code reads or will read, with comments | AS-22 | medium |
| `README.md` "Setup" section | clone → install → skills → Playwright → `.env.local` → `/lead` | AS-22 | medium |
| `.claude/skills/SKILLS.md` (re-included in `.gitignore`) | name, source, version and install step for each third-party skill | AS-11 | low |
| `tests/agent-evals/` (later) | seeded-bug patches + expected reviewer findings | AS-16 | low |

---

## 8. Plan, in order

One PR per step, on `chore/agent-harness` or a branch per step. Recommended: steps 1–2 before resuming sprint 4, so that
sprint merges through CI. Then interleave the rest with feature sprints.

### Step 1: one gate command and CI (AS-1, AS-5, AS-19)
Keywords: GitHub Actions, required status checks, branch protection, `gh pr checks --watch`.
- [x] Add `"gate": "npm run typecheck && npm run lint && npm test && npm run build"` to `package.json`.
- [x] `.github/workflows/ci.yml`: Node 22, `npm ci`, `npm run gate`. A second job: `npx playwright install --with-deps
      chromium` and `npm run test:e2e`.
- [x] Protect `main`: skipped on 2026-10-12, then enabled by the user's decision on 2026-10-13 (set from session
      rsc-0b): required checks `gate` + `e2e`, strict (up to date with `main`), `enforce_admins`, no force pushes or
      deletions, no required reviews. The lead keeps merging on green CI; the user doesn't review PRs.
- [x] `SKILL.md`: agents run `npm run gate` and paste the exit code; the lead merges only when `gh pr checks <n>` is
      green, and compares `gh pr diff <n> --name-only` with the files the agents reported. Agent prompts and
      `CLAUDE.md` "Commands" now point at `npm run gate`.

### Step 2: hard guardrails (AS-2, AS-3, AS-20)
Keywords: Claude Code hooks `PreToolUse`, `permissions.deny`, per-agent `hooks` frontmatter, least privilege.
- [x] `permissions.deny` in `.claude/settings.json`: force pushes, `git reset --hard`, `git clean -fd(x)`. Deny wins
      over allow; compound commands are matched part by part. Killing by image name lives in the hook instead,
      because a regex catches every flag order and case (`/F /IM`, `/im`), which prefix rules can't.
- [x] `.claude/hooks/guard-paths.mjs` (Node, so it runs the same on Windows) as a `PreToolUse` hook on
      `Write|Edit|MultiEdit|NotebookEdit|Bash|PowerShell`, using `agent_type` from the hook input:
      - tester: block paths in the project outside `tests/`;
      - reviewer: block every write;
      - developer, builder: block paths under `tests/`;
      - anyone but the tester: block new `test.fixme(` / `.skip(`; everyone: block new `.only(`;
      - subagents: block `git push|switch|checkout|rebase|merge|reset --hard` and `gh pr create|merge|close|ready`;
      - everyone: block killing processes by image name (any case, any flag order), in command position only.
      Covered by `tests/unit/guard-hook.test.ts` (black-box over stdin and exit codes) and confirmed live in a session.
      Known false positive: the kill check fires when a shell command's *text* puts the word right after `(`, `;`, `&`
      or `|`, e.g. a heredoc that quotes a permission rule. Edit such docs with the Edit tool, not through the shell.
- [x] Backstop in `SKILL.md` step 4: after each tester or reviewer turn, `git status --porcelain` must show no change
      outside the allowed paths (the hook can't see files written from a shell).

### Step 3: one source of truth per concern (AS-18, AS-23, AS-8, AS-9, AS-12)
Done on branch `chore/agent-single-source`. ESLint now rejects relative imports and palette/hex class strings;
kebab-case names and no barrels are checked by `tests/unit/conventions.test.ts` (no new dependency, so
`eslint-plugin-check-file` was not added). `CLAUDE.md` went from 115 to 62 lines.
Keywords: progressive disclosure, path-scoped rules, context budget, single source of truth.
- [x] Delete the "Agent workflow" section from `CLAUDE.md` (one pointer line stays) and "Working rules" from the
      roadmap; move anything in them that `SKILL.md` lacks into `SKILL.md`. Fix `roadmap.md:3`.
- [x] Split `CLAUDE.md` per §6 into `.claude/rules/{ui,data,tests}.md`; move the lint-checkable rules to ESLint.
- [x] Remove "Read `CLAUDE.md` first" from the four agent prompts (keep "its rules win over skills"). Drop
      `frontend-design` from builder's preloaded skills.
- [x] Move finished sprints and plans to `.design/roadmap-archive.md`.
- [x] AS-12: page structure and data wiring in `app/` → developer; JSX in `components/` → builder. Write this in both
      agent descriptions and in `SKILL.md`'s routing table.

### Step 4: persisted handoff, lighter lead (AS-4, AS-19, AS-6, AS-17)
Done on branch `chore/agent-handoff`. Loop cap 3 is the proposal from §9 Q3, taken as the default; change it in
`SKILL.md` if the user wants another number. The roadmap row → sprint file link starts with the next sprint.
Keywords: handoff schema, structured agent report, evaluator-optimizer termination, circuit breaker.
- [x] `.design/sprints/_template.md`:
      - **Brief**: goal, branch, files in scope, acceptance criteria `AC1..n`, constraints, linked `.design/` note.
      - **Reports** (one per agent turn): `agent`, `round`, `status: done | blocked | failed`, `files`, `gate` (exit
        code), `AC → test`, `open questions`.
      - **Close**: tester rounds, reviewer rounds, CI result, PR number.
- [x] `SKILL.md`: write the brief into the sprint file before delegating; paste each report on receipt. A resumed
      `/lead` reads the sprint file, not chat history. The roadmap row links to it.
- [x] Align every agent's "Report back" with the template fields.
- [x] Loop caps: at most 3 tester rounds and 3 reviewer rounds; past that, stop and ask the user. Only must-fix opens
      a round; suggestions go to "Deferred". A finding that returns after a fix is escalated, not re-looped.
- [x] Add a "bad merge" section: `git revert -m 1 <merge>` on a `fix/revert-…` branch, through a PR.

### Step 5: agent config (AS-7, AS-6, AS-15)
Done on branch `chore/agent-config` with the §9 Q2 proposal as the default; the user then set every agent to
`effort: medium` (Step 6 PR):

| Agent | model | effort | maxTurns |
|---|---|---|---|
| developer | opus | medium | 60 |
| builder | opus | medium | 60 |
| reviewer | opus | medium | 40 |
| tester | sonnet | medium | 50 |

`SKILL.md` says what to do when an agent hits `maxTurns` and records `/usage` per sprint. The account-level spend
limit is the user's to set (Console workspace limit or `/usage-credits`); nothing in the repo can do it. Telemetry
stays optional and off.
Keywords: model routing, `effort`, `maxTurns`, `CLAUDE_CODE_ENABLE_TELEMETRY`.
- [x] Set `model`, `effort` and `maxTurns` in every agent's frontmatter (proposal in §9 Q2; start `maxTurns` near 50).
- [x] Cost caps (AS-24): there is no per-agent dollar cap, so bound each agent with `maxTurns` and `effort`, put
      cheaper models where quality allows, and set a spend limit at the account level (see "Cost caps" below).
- [x] Record `/usage` at the end of each sprint in its sprint file. Optional: `CLAUDE_CODE_ENABLE_TELEMETRY=1` with a
      console exporter (metrics carry `agent.name` and `query_source`; custom agent names appear as `"custom"` unless
      `OTEL_LOG_TOOL_DETAILS=1`).

#### Cost caps: what exists (checked 2026-10-12)
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

### Step 6: setup for a new machine (AS-22, AS-11, AS-10)
Done on branch `chore/agent-setup`. Memory now holds three files: user profile, lead merges PRs, local environment.
- [x] Complete `.env.example`: `PORT`, `NEXT_PUBLIC_SITE_URL`, `BLOG_DATA_DIR`, and (commented, for sprints 9–10)
      `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `TRUST_PROXY`. CI secrets go in GitHub Secrets, not in a file.
- [x] Rewrite `README.md` with a "Setup" section: Node 22, `npm ci`, the third-party skills, `npx playwright install
      chromium`, the Playwright MCP, `.env.local`, then "start a session with `/lead`".
- [x] `.claude/skills/SKILLS.md` (re-included in `.gitignore`), unless the user chooses to commit the skills (§9 Q4).
- [x] Clean auto-memory: delete `visual-upgrade-status.md` and `git-feature-branch-pr.md`; rename planner → lead;
      keep only facts about the user that the repo doesn't record.

### Step 7: hosting direction, before sprint 9 (AS-21)
**Deferred by the user (2026-10-13):** there is no real data source or images yet, so features come first. Revisit
when the user decides to deploy. Until then sprint 9 keeps the JSON store as planned, and all reads and writes stay
behind `lib/data/` so only `store.ts` changes later.
- [ ] The user picks a direction (§9 Q5). Record it in the roadmap and update the Phase D plan: store backend,
      `TRUST_PROXY` default, where secrets live.
- [ ] If DB/KV: pull Phase C's PostSource seam and a store seam forward, before sprint 9.

### Step 8: explicit file handoff and a planner (decided by the user on 2026-10-13)
Done on branch `chore/agent-file-handoff`. The user found delegation was "all verbal": briefs lived only in the
`Agent` prompt, reports only in chat, and nobody owned research or new features.
- [x] **planner** agent (`.claude/agents/planner.md`, opus): mode `spec` researches the code and outside sources and
      writes `.design/specs/<feature>.md` for the user to approve; mode `tasks` turns an approved spec into
      `brief.md` + one `tasks/<agent>-r1.md` per agent. Writes nothing else; has no `Agent` tool, so it can't delegate.
- [x] **Templates** in `.claude/templates/`: `spec`, `brief`, `task-{developer,builder,tester,reviewer}`, `task-fix`,
      `report`, `close`. Agent files say *who* an agent is; templates say *what* it does this time.
- [x] **Sprint folder** `.design/sprints/<#>-<name>/{brief.md, tasks/, reports/, close.md}` replaces the single
      sprint file (`_template.md` removed).
- [x] **Hook enforcement** (`guard-paths.mjs`, 17 tests): spawning a role agent requires an existing task file of its
      own in the prompt (PreToolUse `Agent`); the **dispatch gate** blocks the next spawn while another task in the
      sprint has no report; each agent writes only its own report; only the planner (and the lead) write briefs and
      tasks; only the lead writes `close.md`. A `SubagentStop` block also asks for the report, but see below.
- [x] **Live checks in this session (2026-10-13):** the `Agent` matcher fires and blocks a spawn without a task file;
      the dispatch gate blocks; the reviewer (given the `Write` tool, which it lacked) writes its own report. The
      `SubagentStop` hook fires with the documented input and exits 2, yet a *background* subagent that ends with its
      hand-back still stops. So the report rule rests on the dispatch gate, not on `SubagentStop`.
- [x] Role agents read their task file and write their report file; the final chat message is one line.
- [x] `SKILL.md` rewritten top to bottom: team table, file map, flow 0–9 with a diagram, spec approval stop point.
- [x] Gaps from the review on 2026-10-13: `close.md` is written before the merge (no commit to `main` after);
      parallel worktrees off until the hook is verified there; "any dependency" everywhere.
- [x] Peer audit from session rsc-0b (2026-10-13) applied in the same PR: per-agent write areas (developer/builder
      were only kept out of `tests/`), helper agents can't edit the project, git writes caught after global options
      (`git -C . push`) plus `commit`, `gh api` writes blocked, `close.md` waits for every report, SKILL.md no longer
      overstates the hook, this reading guide added. The independent pre-merge gate is now branch protection
      (see Step 1). Still left to the user: the `gh` token scopes (`repo`, `workflow`) every agent's shell can use,
      and a sandbox (none on native Windows; WSL2 + `/sandbox` is the "Later" item AS-20).
- [x] Format checks (branch `chore/handoff-format-checks`, asked by the user on 2026-10-14): the dispatch prompt
      must be exactly `Task: <path>`; the task file must have its template's sections, `Brief:`, a matching
      `Report to:` and no placeholder left; a role agent's report must have the status line, `## Gate` with exit
      codes and its role's sections. Content quality stays with the lead's reading.
- [x] Dispatch gate deadlock, found in the first real run (sprint 8, 2026-10-14): the planner writes every round-1
      task up front, and the gate waited on all of them. The gate now waits only on dispatched tasks, which the hook
      records in `<sprint>/dispatched.txt`.
- [x] Fixes from sprint 8's close.md (2026-10-14): the planner prompt starts with `Mode: spec|tasks`, and `tasks` needs an
      approved spec, the sprint folder and a branch (hook); the reviewer template has `## Files you may change` and
      `## Acceptance criteria` like the others; the reviewer gets a no-JS browser (`playwright-nojs` MCP,
      `.claude/playwright-nojs.json`, verified to block page scripts).
- [ ] **User, by hand** (the auto-mode classifier blocks the lead from editing its own permissions): add the
      `playwright-nojs` server to `.mcp.json` and `enabledMcpjsonServers`, allow `mcp__playwright-nojs`, and allow
      `Edit(/app/**)`, `Edit(/lib/**)`, `Edit(/types/**)`, `Edit(/components/**)`, `Edit(/content/**)`,
      `Edit(/public/**)`, `Edit(/assets/**)`, `Edit(/tests/**)`, `Edit(/.design/**)` in `.claude/settings.json`, so
      subagents stop asking for every write (the hook still keeps each agent in its area). Until then the reviewer
      checks no-JS with curl.
- [ ] Verify in a new session: the planner's `WebFetch`/`WebSearch` tools load (the agent list shows them), and a
      foreground subagent honors the `SubagentStop` block.
- [ ] Sprint 4 started before this; on resume the planner writes its spec, brief and tasks from PR #10.

### Later
- [ ] AS-20: run Claude Code inside WSL2 and enable `/sandbox` (`sandbox.enabled`, `sandbox.network.allowedDomains`
      for npm and GitHub), if the user wants real isolation.
- [ ] AS-16: agent evals. 3–5 seeded-bug patches (raw hex color, needless `"use client"`, unvalidated Server Action
      input, content hidden without JS) with the expected finding each; re-run the reviewer after any prompt change.
- [ ] Preview deploys per PR, once a host exists.
- [ ] Agents in CI (`anthropics/claude-code-action@v1`, `claude -p`) or in the cloud (`claude --cloud`): not needed at
      this scale.

---

## 9. Questions for the user

1. **Merging:** keep it delegated to the lead once CI and branch protection exist? *(Answered 2026-10-13: yes;
   protection on, no required reviews.)*
2. **Models:** proposal: developer `opus`, reviewer `opus`, builder `opus` (design quality), tester `sonnet`; compare
   defect counts over two sprints before moving more to `sonnet`. Accept or change? *(Default taken in Step 5; revisit after two sprints.)*
3. **Loop cap:** 3 rounds per loop, then ask? *(Default taken in Step 4; open to change.)*
4. **Third-party skills:** commit them (license permitting) or keep them local with a manifest? *(Answered earlier:
   the user keeps them local. Manifest added in Step 6.)*
5. **Hosting:** a host with a persistent disk (VPS, Fly.io or Railway with a volume; the JSON store stays), or a
   serverless host with a DB/KV (SQLite/Turso, Postgres, Upstash; the store moves behind a seam)?
6. **Sandbox:** move Claude Code into WSL2 for `/sandbox`, or rely on deny rules and hooks on native Windows?
7. **Order:** steps 1–2 before resuming sprint 4?

---

## 10. Glossary

- **Sandbox (Claude Code):** OS-level isolation for shell commands (Bash, PowerShell and their child processes).
  Writes are limited to the project and temp folders; network goes through a proxy that allows only listed domains.
  It does not cover the Read/Edit/Write tools, MCP servers or hooks. macOS, Linux and WSL2 only; on native Windows,
  commands run unsandboxed.
- **Sandbox (general):** any isolated place an agent runs: a container, a devcontainer, a cloud VM (Claude Code on the
  web). Test data sandboxes such as `BLOG_DATA_DIR=.data-e2e` are a small version of the same idea. A git worktree
  isolates code, not access.
- **Hosting (the app):** where the blog runs in production. Decides whether the JSON store can stay (persistent disk)
  or must move to a DB/KV (serverless).
- **Hosting (the agents):** where Claude Code runs. Today: this laptop, interactive. Alternatives: headless in CI, the
  GitHub Action, cloud sessions.
- **Hub and spoke / orchestrator-worker:** one session plans and delegates; workers do one task each and report back.
- **Evaluator-optimizer:** a loop where one agent builds and another evaluates until a stop condition.
- **Handoff artifact:** the persisted record passed between agents (brief in, report out).

---

## 11. Verified Claude Code facts this plan relies on

Checked against the Claude Code docs on 2026-10-12. Re-check exact key spellings before writing config.
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
