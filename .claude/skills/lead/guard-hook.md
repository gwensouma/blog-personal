# What the guard hook enforces

Reference for the lead: read it when the hook blocks something or before changing the hook. Linked from
[SKILL.md](SKILL.md).

## Blocks

`.claude/hooks/guard-paths.mjs` (tests: `tests/unit/guard-hook.test.ts`) blocks, not just asks:

- spawning developer, tester or reviewer with any prompt other than the one line `Task: <path>`, naming an
  existing `tasks/<that-agent>-r<n>.md` that has its template's sections (`## Do`, `## Cover`, `## Fix`, …), a
  `Brief:` line, a `Report to:` line naming the matching report, and no unfilled placeholder such as `<branch>`;
- spawning the next task while any task already dispatched in the same sprint has no report yet (the dispatch gate:
  a missing report stops the sprint, so continue that agent until it writes one). The hook records each dispatch in
  the sprint's `dispatched.txt`, so tasks the planner wrote ahead don't block;
- you writing `close.md` while any task of that sprint has no report (this catches the last agent of a sprint,
  which no later dispatch would);
- a foreground role agent finishing before its report exists. Background agents can finish past this block (checked
  live), which is why the two gates above exist;
- a planner prompt that doesn't start with `Mode: spec` or `Mode: tasks`, and a `Mode: tasks` prompt without an
  existing spec that says `Status: approved`, the sprint folder and `Branch: <branch>`;
- a role agent's report without the template's shape: the `# Report: <agent> · round <n> · status: …` line, a
  `## Gate` section with `exit <code>` per command, and its role's sections (`## Files`, `## AC → test`,
  `## Findings`);
- Write/Edit outside each agent's area: developer `app/`, `lib/`, `types/`, `components/`, `content/`, `public/`,
  `assets/` and root config files; tester `tests/`; reviewer its report only; planner specs,
  briefs and tasks. `.github/`, `.claude/`, `CLAUDE.md`, `README.md`, the roadmap and `decisions.md` are yours alone;
- helper agents (general-purpose, claude, Explore, …, and any unknown type such as the retired `builder`) editing
  anything in the project: they research, they don't write, so code work can't bypass the task files;
- only the tester adds `test.fixme`/`.skip`; nobody adds `.only`;
- subagents running git writes (`push`, `commit`, `switch`, `checkout`, `rebase`, `merge`, `cherry-pick`, `revert`,
  `tag`, `reset --hard`, also after global options like `git -C . push`), `gh pr create|merge|close|ready|edit|review`,
  or `gh api` with a non-GET method or fields;
- anyone killing processes by image name.

## What it can't see

Files written from a shell (`echo > file`, a script), whether a stated exit code is true, and whether a section
says anything useful. The manual backstops for these are in SKILL.md.
