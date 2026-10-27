# Roadmap

The queue, and nothing else: what is next, in what order, blocked by what. Owner: the lead (`/lead`), whose team is the subject (D-025).
How the team works: `.claude/skills/lead/SKILL.md` · Why: [decisions.md](decisions.md) · Done: [roadmap-archive.md](roadmap-archive.md)
· Out of scope for now: AI (D-002), deploy (D-008), DB/CMS (D-001), agent teams (D-013), dev container (D-012).
Repo: https://github.com/gwensouma/blog-personal (branch `main`). Last updated: 2026-10-27.

**One line per item.** Details go where they belong: a plan in `docs/specs/`, a reason in `decisions.md`, history
in the archive. An item that needs a second line needs a spec. `tests/unit/docs.test.ts` caps this file.

## Sprints
Open sprints in order (D-026: harness first); one branch and one PR each. Merged rows move to the archive.

| # | Branch | Scope | Spec | Blocked by |
|---|---|---|---|---|
| 18 | `chore/verify-hooks` | Harness: in a fresh session, the planner's `WebFetch`/`WebSearch` load and a foreground subagent honors `SubagentStop` | — | — |
| 19 | `feat/agent-evals` | Harness: agent evals (seeded-bug patches with the reviewer findings expected); spec first | — | 18, sandbox answer |
| 10 | `feat/comments-admin` | `/admin` with a password, hide/unhide comments; plus sprint 9 deferred (error echo cap, `CommentEntry` split, `Input` height) | [comments](specs/comments.md) "Sprint 10 plan" | — |
| 11 | `feat/static-post` | `/posts/[slug]` static (ISR) again; no views without JS (D-018) | — | — |
| 13 | `feat/post-source-seam` | `PostSource` interface in `lib/data/posts.ts`, Markdown impl behind it (D-001) | — | — |
| 14 | `feat/frontmatter-validation` | Frontmatter schema check at load time, hand-written (D-019), in the Markdown source | — | 13 |
| 15 | `feat/draft-preview` | `draft: true` posts behind `draftMode()` via a secret route; `draft` in the schema | — | 11, 14 |

## Backlog
Wanted, not scheduled. A row becomes a sprint through a spec.

- Image zoom on body images (a client leaf; waits for a post with body images)
- `/stats` page (views and likes per post; dynamic rendering vs caching)
- `/now` and `/uses` pages (wait for the user's own content)
- MDX components in posts (ask the user first)
- Archive: a year jump index once posts span 4+ years
- Harness: WSL2 + `/sandbox`, if the user picks it (open question in decisions.md)

## Waiting on the user
- Sandbox: WSL2 + `/sandbox`, or deny rules and the guard hook on Windows? Ask before the agent evals spec (sprint 19)
- Permissions the lead can't grant itself: `playwright-nojs` in `.mcp.json`, `Edit(/<area>/**)` per agent area (list: `claude-code-facts.md`)
