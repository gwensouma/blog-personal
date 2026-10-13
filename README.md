# Personal blog: a React Server Components learning project

A personal blog built to learn React Server Components with Next.js 15 (App Router), React 19, TypeScript,
Tailwind v4 and shadcn/ui. Posts are Markdown files in `content/posts/`; likes, views and newsletter sign-ups go to a
small JSON-file store in `.data/`.

## Setup

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
   with the developer, builder, tester and reviewer agents ([.claude/skills/lead/SKILL.md](.claude/skills/lead/SKILL.md)).
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
