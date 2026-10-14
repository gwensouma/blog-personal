# Third-party skills

The skills below are installed locally and gitignored (`.claude/skills/*`): the user chose not to redistribute them.
This manifest is what a new machine needs to get them back. Project-owned skills (`lead/`) are committed.

| Skill | Used by | Source | License |
|---|---|---|---|
| `hallmark` (v1.1.0) | builder, reviewer | https://github.com/Nutlope/hallmark | see the repo |
| `frontend-ui-engineering` | builder, reviewer | https://github.com/addyosmani/agent-skills | see the repo |
| `shadcn` | builder, reviewer | https://github.com/shadcn-ui/ui (its `shadcn` skill folder) | MIT (repo) |
| `frontend-design` | none preloaded; available to the main session | Claude Code official plugin `frontend-design` (`claude-plugins-official` marketplace) | Apache-2.0 (`LICENSE.txt`) |

## Install

Each skill is a folder with a `SKILL.md` at its root, copied to `.claude/skills/<name>/`:

```bash
# hallmark, frontend-ui-engineering, shadcn: clone the repo, find the folder whose SKILL.md says `name: <skill>`,
# and copy that whole folder (references and assets included).
git clone --depth 1 https://github.com/Nutlope/hallmark.git /tmp/hallmark
grep -rl --include=SKILL.md "^name: hallmark" /tmp/hallmark   # → .../hallmark/SKILL.md
cp -r /tmp/hallmark/<path-to>/hallmark .claude/skills/

# frontend-design: install the official plugin (/plugin in Claude Code), then copy its skill folder.
cp -r ~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design .claude/skills/
```

Check: `ls .claude/skills` shows `frontend-design  frontend-ui-engineering  hallmark  lead  shadcn`, and the agents
load without a missing-skill warning. When you update a skill, update its row here (version or commit).
