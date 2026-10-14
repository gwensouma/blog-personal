# Personal blog: a React Server Components learning project

A personal blog built to learn React Server Components with Next.js 15 (App Router), React 19, TypeScript,
Tailwind v4 and shadcn/ui. Posts are Markdown files in `content/posts/`; likes, views and newsletter sign-ups go to a
small JSON-file store in `.data/`.

## Setup

### Recommended: the dev container

[.devcontainer/](.devcontainer/) runs the whole toolchain, Claude Code included, in a Linux container: Node 22, `gh`,
Playwright's Chromium (e2e) and Google Chrome (Playwright MCP), and a default-deny egress firewall
([init-firewall.sh](.devcontainer/init-firewall.sh)) that allows only Anthropic, GitHub, the npm registry, the
Playwright browser CDN, Google Fonts (`next/font` at build time) and VS Code's extension hosts. The container protects
the machine; the guard hook still enforces the agent roles inside it.

1. Install Docker Desktop, VS Code and the Dev Containers extension.
2. In VS Code run **Dev Containers: Clone Repository in Container Volume...** and enter
   `https://github.com/gwensouma/blog-personal`. A volume is much faster than bind-mounting a Windows folder for
   `npm ci` and `next build`. The first build takes several minutes; `npm ci` runs on create, the firewall on start.
3. In the container terminal: `claude` (sign in), then `gh auth login` (GitHub.com, HTTPS, browser).
4. Copy any local Claude Code memory into the container: auto-memory is keyed by project path, and the workspace is
   `/workspaces/blog-personal`, so from the host:
   ```powershell
   docker ps   # the container's name
   docker exec <name> mkdir -p /home/node/.claude/projects/-workspaces-blog-personal/memory
   docker cp "$env:USERPROFILE\.claude\projects\<host-project-dir>\memory\." <name>:/home/node/.claude/projects/-workspaces-blog-personal/memory/
   docker exec -u root <name> chown -R node:node /home/node/.claude/projects
   ```
5. Continue with steps 3 and 6–10 below (Node, `npm ci` and the browsers are already in the image).

A host the firewall doesn't allow fails fast (connection rejected), including `WebFetch` to arbitrary sites. To allow
one, add it to `ALLOWED_DOMAINS` in `init-firewall.sh` in a PR, then rebuild or run
`sudo /usr/local/bin/init-firewall.sh` (safe to re-run; a local dnsmasq keeps rotating CDN addresses allowed).

### On the host

1. **Node 22** (`^22.12` or `>=24`, see `engines` in `package.json`). CI uses Node 22.
2. **Install:** `npm ci`
3. **Environment:** `cp .env.example .env.local`, then set `PORT` if 3000 is taken. Everything else has a local
   default; see the comments in [.env.example](.env.example).
4. **Browser for e2e tests:** `npx playwright install chromium`
5. **Check it works:** `npm run gate` (typecheck, lint, unit tests, build), then `npm run dev`.

### For the Claude Code agent team (optional)

6. **Third-party skills:** follow [.claude/skills/SKILLS.md](.claude/skills/SKILLS.md). They are gitignored, so a
   fresh clone has only the project's own `lead` skill.
7. **Playwright MCP** (the reviewer's browser checks) is declared in [.mcp.json](.mcp.json) and enabled in
   `.claude/settings.json`; it runs through `npx`, so there is nothing to install. Approve it when Claude Code asks.
   If it fails to connect, the reviewer falls back to a static review and says so.
8. **Trust the workspace** when Claude Code asks: the `PreToolUse` hook in `.claude/hooks/guard-paths.mjs` enforces
   which agent may edit what.
9. **Start a session with `/lead`.** The lead reads [.design/roadmap.md](.design/roadmap.md) and runs the sprint loop
   with the planner, developer, builder, tester and reviewer agents; every task and report is a file under
   `.design/sprints/` ([.claude/skills/lead/SKILL.md](.claude/skills/lead/SKILL.md)).
10. **Spend limit:** agents are bounded by `maxTurns`, not dollars. Set a monthly limit on your account (Console
    workspace limit for an API key, or `/usage-credits` on a subscription).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server with hot reload, on `PORT` from `.env.local` |
| `npm run build` then `npm run start` | production build, then serve it (`start` fails without a build) |
| `npm run gate` | typecheck, lint, unit tests and build; must pass before a PR |
| `npm test` | Vitest unit tests (`tests/unit/`) |
| `npm run test:e2e` | Playwright tests (`tests/e2e/`) on their own build, port 3200; don't run alongside `npm run dev` |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `gate` and `e2e` on every pull request.

## Where to read more

- [CLAUDE.md](CLAUDE.md): project goals, architecture and where each new file goes.
- [.claude/rules/](.claude/rules/): UI, data and test rules.
- [.design/](.design/): roadmap, sprint records and design decisions.
