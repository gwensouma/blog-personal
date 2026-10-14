# Roadmap

Owner: the lead session (start it with `/lead`). How the team works lives in `.claude/skills/lead/SKILL.md`; this file
says only *what* is queued and deferred; decisions and their reasons are in [decisions.md](decisions.md). Finished
sprints and plans: [roadmap-archive.md](roadmap-archive.md).
Repo: https://github.com/gwensouma/blog-personal (branch `main`).
Last updated: 2026-10-14.

## Out of scope for now
- **AI features** (`lib/ai/`): postponed by the user. Keep the data layer extensible; build nothing yet.
- **Deploy and hosting**: postponed (re-confirmed 2026-10-13: no real data source or images yet, features first). The
  `.data/` JSON store and `NEXT_PUBLIC_SITE_URL` stay as they are; keep all data access behind `lib/data/`.
- **Data source migration** (Markdown → DB/CMS): parked. Phase C only adds an internal seam.
- **Agent teams** (Claude Code's experimental teammates that message each other): not adopted. Decided by the user on
  2026-10-14: keep the lead + subagents + file handoff, since the work is mostly sequential and sprint 8's problems were
  not about agents talking. Revisit if a sprint needs parallel review or debate.

## Feature map

```
                         ┌──────────────────────────── Personal blog (RSC learning) ────────────────────────────┐
                         │                                                                                       │
 DONE (phases 1–4)       │  Home hero · featured · latest   Archive + pagination   Tags   Search   About        │
                         │  Post page: cover, TOC spy, code copy, likes/views, share, related, prev/next         │
                         │  Newsletter (Server Action) · ⌘K palette · RSS · sitemap · OG · JSON-LD · bold motion │
                         └───────────────────────────────────────────────────────────────────────────────────────┘
                                                             │
        ┌─────────────────────────────┬──────────────────────┼──────────────────────┬──────────────────────────────┐
        ▼                             ▼                      ▼                      ▼                              ▼
 A. Stabilize               B. Reading experience    C. Content authoring    D. Community               E. Discovery
 git + main branch          post series              PostSource seam         comments (moderated)      popular posts (views)
 store re-verify            callouts / footnotes     draft preview           reactions? (no — likes    archive by year
 agent defs update          image zoom (leaf)          (draftMode)             are enough)             search: tag filter +
 JS → TS config             reading list / "next     MDX components                                      match highlight
 typecheck + lint           up" at end of post       content validation                                 /stats page (views)
 OG: Fraunces + covers                               (frontmatter schema)                               /now and /uses pages
```

Each feature names the RSC concept it teaches, because that is the point of the project.

## Phase B: Reading experience
| Feature | What | RSC lesson |
|---|---|---|
| Post series | `series:` + `seriesOrder:` frontmatter, a "Part 2 of 3" box and series nav | derived data in `lib/data/`, a Server Component only |
| Callouts and footnotes | `> [!NOTE]`-style callouts and GFM footnotes styled in `post-body.tsx` | the hast → React pipeline, no client JS |
| Image zoom | click-to-zoom on body images | a single client leaf wrapping server-rendered `<img>` |
| "Up next" | an end-of-post card: next in series, else the most related post | composing existing data calls |

## Phase C: Content authoring (no DB yet)
| Feature | What | RSC lesson |
|---|---|---|
| PostSource seam | an internal interface in `lib/data/posts.ts` with the Markdown impl behind it | a swappable data layer |
| Frontmatter validation | a schema check at load time with clear build errors (hand-written or zod; ask before adding zod) | failing loudly on the server |
| Draft preview | `draft: true` posts visible behind Next `draftMode()` via a secret route | dynamic vs static rendering |
| MDX components | optional: custom components inside posts | Server Components in content (ask the user first) |

## Phase D: Community
| Feature | What | RSC lesson |
|---|---|---|
| Comments | name + body, stored in the JSON store, held for moderation (shown after approval), honeypot + length caps | Server Actions, `useOptimistic`, `revalidatePath` |

## Phase E: Discovery
| Feature | What | RSC lesson |
|---|---|---|
| Popular posts | the top posts by views on home or archive | reading the store in a Server Component, streamed in `<Suspense>` |
| Archive by year | group `/posts` by year (keep pagination) | pure data shaping |
| Better search | tag filter chips + highlighted matches, all in URL params | search params as state, no client fetch |
| /stats | the totals of views/likes per post | dynamic rendering + caching trade-offs |
| /now, /uses | simple pages in `app/(site)/` | route groups |

## Order
A ✅ (archived) → B (series, callouts/footnotes, up next, image zoom) → E (popular, archive by year, search) → D (comments) →
C (seam, validation, preview). C goes last because the data layer is parked, but its seam is cheap and can move earlier
if a feature needs it.

## Sprints (from 2026-10-11)
Each line is one branch and one PR, planned by the planner (`.design/specs/`, `.design/sprints/<#>-<name>/`).
Open sprints only; merged ones move to the archive. Order: 4 → 9 → 10. Sprint 8 (merged) was the first full
run of the file handoff; its lessons are in `.design/sprints/8-home-no-js/close.md`. The dev container is built on branch `chore/devcontainer` but deferred by the user (2026-10-14); see
[agent-system-status.md](agent-system-status.md).

| # | Branch | Scope | Blocked by |
|---|---|---|---|
| 4 | `feat/up-next` | B: end-of-post card (next in series, else the most related post). Draft PR #10 predates the file handoff: the planner writes its spec, brief and tasks from the PR before work resumes | — |
| 9 | `feat/comments` | D: comments, visible immediately (see "Phase D plan") | sprint 4 |
| 10 | `feat/comments-admin` | D: /admin with password, hide/unhide comments | sprint 9 |

Deferred: button-styled links ("View all posts" and others) render with `role="button"` (sprint 8 tester and reviewer;
an a11y pass of its own). The `/search` empty-state title is a `<div>`, not a heading (a11y suggestion from the sprint T tester; fix it
with the next search touch). Also deferred inside B and E: **image zoom** (no post has body images yet), **/stats**, **/now**, **/uses** (they need
the user's own content).

## Phase D plan: comments (decided by the user on 2026-10-12)
Queue after sprint T, sprint 4 (`feat/up-next`) and sprint 8 (`fix/home-no-js`). Sprint 9 waits for sprint 4, because both edit
the end of `post-article.tsx`.

User choices: comments are **visible immediately**, and the owner can **hide** them from `/admin`. **Name only**: no
accounts and no auth library. Admin is protected by a **password in `.env`**. A **flat list**, with no replies.

**Sprint 9: `feat/comments`**
- `lib/data/comments.ts` on the existing store (key `comments`: `Record<slug, Comment[]>`). `Comment` = {id, slug, name,
  body, createdAt, hidden} in `types/comment.ts`. Exports `getComments(slug)` (visible only, oldest first) and
  `addComment()`.
- Limits: name 1–50 and body 1–2000 chars after trim, a honeypot, a 500-per-post cap, control/bidi characters
  stripped. Rate limit: with `TRUST_PROXY=1`, per left-most `x-forwarded-for`; otherwise a site-wide flood guard
  (30 per 10 min). Document the trade-off.
- `lib/actions/comments.ts` `addCommentAction` for `useActionState`: validates everything, checks that the slug
  exists, calls `revalidatePath`.
- The body is plain React text with line breaks kept: no Markdown, no HTML, no auto-links. `CommentList` is an RSC
  rendered inline (essential content, so no Suspense). `CommentForm` is the only client leaf (`useActionState` +
  `useOptimistic`), posts without JS, and puts errors in `role="alert"`. Files go in `components/comments/`. Show the
  count in the post meta. Notes go in `.design/comments.md`.

**Sprint 10: `feat/comments-admin`**
- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` (and `TRUST_PROXY`) go in `.env.example`. If either secret is unset,
  `/admin` returns 404.
- `lib/data/admin-session.ts`: login through a Server Action with `timingSafeEqual`. The cookie holds a 7-day expiry
  signed with HMAC-SHA256 (httpOnly, sameSite=lax, secure in prod), plus a logout action. Rotating the secret revokes
  all sessions.
- `app/(admin)/admin/login/page.tsx` and `app/(admin)/admin/page.tsx`: noindex, disallowed in `robots.ts`, and left out
  of the sitemap. The admin page lists recent comments across posts with Hide/Unhide as plain `<form action>` Server
  Actions (they work without JS). The page and every action re-check the session server-side.
- Login throttle: 10 failed attempts per 15 min (site-wide unless `TRUST_PROXY`), with a generic error message. A
  known caveat: someone else can lock the owner out for 15 min.
