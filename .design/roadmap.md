# Roadmap

The queue, and nothing else: what is next, in what order, blocked by what. Owner: the lead (`/lead`).
How the team works: `.claude/skills/lead/SKILL.md` · Why: [decisions.md](decisions.md) · Done: [roadmap-archive.md](roadmap-archive.md)
· Out of scope for now: AI (D-002), deploy (D-008), DB/CMS (D-001), agent teams (D-013), dev container (D-012).
Repo: https://github.com/gwensouma/blog-personal (branch `main`). Last updated: 2026-10-19.

**One line per item.** Details go where they belong: a plan in `.design/specs/`, a reason in `decisions.md`, history
in the archive. An item that needs a second line needs a spec. `tests/unit/docs.test.ts` caps this file.

## Sprints
Open sprints in order; one branch and one PR each. Merged rows move to the archive.

| # | Branch | Scope | Spec | Blocked by |
|---|---|---|---|---|
| 9 | `feat/comments` | D: comments, visible at once (D-007) | [comments](specs/comments.md) (draft from before D-020/D-022: planner refreshes it; Q1–Q2 open) | — |
| 10 | `feat/comments-admin` | D: `/admin` with a password, hide/unhide comments | [comments](specs/comments.md) "Sprint 10 plan" | 9 |
| 11 | `feat/static-post` | `/posts/[slug]` static (ISR) again; no views without JS (D-018) | — | 10 |
| 12 | `fix/a11y-pass` | button-styled links drop `role="button"`; `/search` empty-state title becomes a heading | — | — |
| 13 | `feat/post-source-seam` | C: `PostSource` interface in `lib/data/posts.ts`, Markdown impl behind it (D-001) | — | — |
| 14 | `feat/frontmatter-validation` | C: frontmatter schema check at load time, hand-written (D-019) | — | — |
| 15 | `feat/draft-preview` | C: `draft: true` posts behind `draftMode()` via a secret route | — | 11 |

## Backlog
Wanted, not scheduled. A row becomes a sprint through a spec.

- Image zoom on body images (a client leaf; waits for a post with body images)
- `/stats` page (views and likes per post; dynamic rendering vs caching)
- `/now` and `/uses` pages (wait for the user's own content)
- MDX components in posts (ask the user first)
- Harness: verify in a fresh session that the planner's `WebFetch`/`WebSearch` load and a foreground subagent honors `SubagentStop`
- Archive: a year jump index once posts span 4+ years
- Harness: agent evals (seeded-bug patches with expected reviewer findings); WSL2 + `/sandbox` (open question in decisions.md)

## Waiting on the user
- Permissions the lead can't grant itself: `playwright-nojs` in `.mcp.json`, `Edit(/<area>/**)` per agent area (list: `claude-code-facts.md`)
- Spec 9: answer Q1–Q2 in [specs/comments.md](specs/comments.md) and approve it
