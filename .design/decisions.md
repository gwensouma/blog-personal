# Decisions

Project-level decisions: choices that outlive one sprint, with the reason behind each, so a later sprint sees them
without digging through specs, reports or chat. Newest first.

- **What goes here:** a product, scope, process or architecture choice by the user (or a default the user accepted)
  that later sprints must respect. A choice that only shapes one feature stays in that feature's spec; when a spec's
  answer constrains later work too, it gets an entry here as well.
- **Who writes:** the lead, in the same PR as the change the decision drives (or a docs PR if there is none). The
  planner reads this file for every spec and flags any conflict under "Questions for the user".
- **Changing a decision:** never delete or rewrite an entry. Add a new one and mark the old one
  `Superseded by D-<n>`.
- Standing code rules (RSC first, TypeScript only, no new dependency without asking, …) live in `CLAUDE.md`; what is
  queued lives in [roadmap.md](roadmap.md).

## Open questions

Decisions the user hasn't made yet. Ask before the work that needs the answer.

- **Hosting** (needed when D-008 is revisited): a host with a persistent disk (VPS, or Fly.io/Railway with a volume;
  the JSON store stays), or a serverless host with a DB/KV (SQLite/Turso, Postgres, Upstash; the store moves behind a
  seam)?
- **Sandbox:** run Claude Code inside WSL2 to get `/sandbox`, or keep relying on deny rules and the guard hook on
  native Windows? (See D-010.)

## Log

### D-019 · 2026-10-19 · Frontmatter validation is hand-written
- **Decision:** the frontmatter check (sprint 14) is a hand-written validator in `lib/`; no `zod` or other schema
  library is added.
- **Why:** the default in the planner's 2026-10-16 plan; it avoids a new dependency for a small, fixed schema.
- **Source:** the user accepted the default, 2026-10-19.

### D-018 · 2026-10-19 · The post page goes static again; no views without JS
- **Decision:** sprint 11 makes `/posts/[slug]` static (ISR) again. The like button reads the "liked" cookie itself
  instead of the page reading it during render, and views are recorded outside render by a small client call, so a
  visit with JS off no longer counts a view. This is the "bigger fix" D-016 left open.
- **Why:** the like cookie is what makes the route render per request; on a cached page, `revalidatePath` (comments)
  and `draftMode()` (sprint 15) show their real value. Views are non-essential, so losing no-JS views is acceptable.
- **Source:** the user accepted the planner's defaults, 2026-10-19.

### D-017 · 2026-10-16 · One build per test round
- **Decision:** the developer, builder and reviewer run `npm run gate:fast` (typecheck, lint, unit; no build). The
  production build runs once per round inside the tester's `npm run test:e2e`, into its own `.next-e2e/`, and in CI.
  `E2E_SKIP_BUILD=1` reuses that build when only `tests/` changed. E2E runs 2 workers locally and retries once on CI.
  Shiki preloads only the languages the posts use.
- **Why:** the user found the test process too slow. A sprint ran `next build` 7–8 times (every agent's `gate`, plus
  e2e's own build), about 1.5–2 minutes each, and re-running one e2e test rebuilt too. The flaky timeouts at 6 workers
  came from Shiki preloading every bundled grammar: the first post render on a cold server took 11.4s (0.87s now), so
  parallel first loads crossed the 30s timeout. The e2e build in `.next/` also broke a running `npm run dev`. Measured
  full e2e: 213s → 137s with a build, 66s without.
- **Source:** the user, 2026-10-16.

### D-016 · 2026-10-14 · Simulated data latency is opt-in; rendered posts are memoised
- **Decision:** the fixed 300ms `setTimeout` in `lib/data/posts.ts` is off by default and set with `BLOG_LATENCY_MS`.
  Rendered Markdown is memoised per slug for the server process. `/posts/[slug]` gets **no** `loading.tsx`.
- **Why:** the user found opening a post slow. Measured on the dev server: about 0.52s per navigation, 300ms of it the
  artificial delay and about 200ms re-running Markdown + Shiki (the route is dynamic because of the like cookie, so it
  renders per request). A route-level `loading.tsx` was tried and dropped: it puts the whole article behind a
  Suspense boundary, so without JS the streamed content stays in a hidden div and only the skeleton shows (the no-JS
  e2e tests caught it). Making the route static again (moving the liked-state read to the client) is the bigger fix
  and is not done here.
- **Source:** the user, 2026-10-14.

### D-015 · 2026-10-14 · Petrol replaces the deep-blue palette
- **Decision:** `--primary` is a deep petrol teal, `#076b6f` / `oklch(0.48 0.08 200)` (6.3:1 on white), lifted to
  `oklch(0.78 0.09 195)` in dark (9.9:1). Neutrals and the dark surfaces carry a faint tint of the same hue (200–215)
  instead of blue (262), and the `--brand-*` cover tones follow. Every text pair clears 4.5:1.
- **Why:** the user found the old `#1d4ed8` (Tailwind's stock `blue-700`) ugly: generic and too saturated for a
  reading-first blog. Petrol is calm and distinct while keeping the cool, technical tone. Terracotta was rejected as
  too close to the warning/caution callouts, forest green as a clash with the tip callout (hue 155).
- **Source:** the user asked for a researched alternative and accepted the recommendation, 2026-10-14.

### D-014 · 2026-10-14 · Project-level decisions get their own log
- **Decision:** keep this file, `.design/decisions.md`, as the one place for decisions that outlive a sprint.
- **Why:** decisions were spread across specs, sprint reports, the roadmap, `agent-system-status.md` and auto-memory,
  so the next sprint couldn't see them.
- **Source:** the user, 2026-10-14.

### D-013 · 2026-10-14 · Keep subagents with file handoff, no agent teams
- **Decision:** keep the lead + subagents + file handoff. Don't adopt Claude Code's experimental agent teams.
- **Why:** the work is mostly sequential, and sprint 8's problems were not about agents talking to each other.
- **Revisit when:** a sprint needs parallel review or debate between agents.
- **Source:** the user, 2026-10-14 (PR #24).

### D-012 · 2026-10-14 · Dev container deferred
- **Decision:** the dev container (Node 22, gh, Playwright, default-deny firewall) stays on branch
  `chore/devcontainer` without a PR.
- **Why:** not recorded.
- **Revisit when:** the user asks to open its PR.
- **Source:** the user, 2026-10-14.

### D-011 · 2026-10-14 · Essential content on ISR pages renders inline
- **Decision:** on statically rendered (ISR) pages, essential sections render inline, with no `<Suspense>` boundary.
  `<Suspense>` stays for non-essential or JS-dependent content on dynamic routes (e.g. likes and views on a post).
- **Why:** with JS off, a Suspense fallback on a cached page stays a skeleton forever, and on an ISR page the boundary
  gains nothing. Unhiding React's streamed markup with `<noscript>` CSS depends on private markup and breaks silently.
- **Source:** sprint 8, [specs/home-no-js.md](specs/home-no-js.md) (option A).

### D-010 · 2026-10-13 · Lead merges on green CI; `main` is protected
- **Decision:** the lead session merges PRs; the user doesn't review them. `main` requires the `gate` and `e2e` checks,
  strict (up to date with `main`), enforced for admins, no force pushes or deletions, no required reviews.
- **Why:** the user was the bottleneck on reviewed PRs; GitHub now refuses a red merge instead of a person checking.
- **Revisit when:** the user takes merging back (they can at any time).
- **Source:** the user, 2026-10-12 (merging) and 2026-10-13 (protection).

### D-009 · 2026-10-13 · Work is handed over in files, with a planner
- **Decision:** a planner agent writes specs, briefs and task files; role agents read a task file and write a report
  file; the lead writes `close.md`. The guard hook enforces the handoff (see `.claude/skills/lead/SKILL.md`).
- **Why:** delegation was "all verbal": briefs lived only in prompts and reports only in chat, so nothing survived a
  new session, and nobody owned research or new features.
- **Source:** the user, 2026-10-13 (PRs #18, #19).

### D-008 · 2026-10-13 · Deploy and hosting deferred
- **Decision:** no deploy yet. The `.data/` JSON store and `NEXT_PUBLIC_SITE_URL` stay as they are; all data access
  stays behind `lib/data/`, so only `store.ts` changes later.
- **Why:** there is no real data source or images yet; features come first.
- **Revisit when:** the user decides to deploy (see "Hosting" in Open questions).
- **Source:** the user, 2026-10-13 (re-confirmed).

### D-007 · 2026-10-12 · Comments: visible at once, hidden from /admin
- **Decision:** comments are visible immediately; the owner hides them from `/admin`. Name only, no accounts and no
  auth library. `/admin` is protected by a password in `.env`. A flat list, no replies.
- **Why:** not recorded.
- **Source:** the user, 2026-10-12. Full plan: roadmap "Phase D plan" (sprints 9 and 10).

### D-006 · 2026-10-12 · Agent models, effort and loop caps
- **Decision:** developer, builder and reviewer run `opus`, the tester `sonnet`, all at `effort: medium`, each bounded
  by `maxTurns`. A tester or reviewer loop stops after 3 rounds and asks the user.
- **Why:** quality where it matters, with per-run cost bounded by turns (Claude Code has no per-agent dollar cap).
- **Revisit when:** two sprints have run; compare defect counts before moving more agents to `sonnet`.
- **Source:** defaults the user accepted, 2026-10-12; effort set to medium by the user.

### D-005 · 2026-10-12 · Automated tests: Vitest and Playwright
- **Decision:** Vitest for server logic and Playwright Test for end-to-end, with a `no-js` project. Both dev
  dependencies approved.
- **Why:** so every sprint ships with tests, including the no-JS rendering that had already regressed.
- **Source:** the user, 2026-10-12 (sprint T, see [roadmap-archive.md](roadmap-archive.md)).

### D-004 · 2026-10-12 · Third-party skills stay local
- **Decision:** third-party skills are not committed; they stay local and gitignored, with their sources listed in
  `.claude/skills/SKILLS.md`.
- **Source:** the user.

### D-003 · Bold motion on an editorial look
- **Decision:** bold, noticeable motion on top of the editorial design, animating only `transform`/`opacity`, never
  hiding first paint, and respecting `prefers-reduced-motion`.
- **Why:** the user asked for it in Phase 3.
- **Source:** the user; rules in [blog-refactor.md](blog-refactor.md) "Motion (Phase 3)". Date not recorded.

### D-002 · AI features postponed
- **Decision:** build nothing in `lib/ai/` yet, but keep the data layer easy to swap.
- **Source:** the user. Date not recorded (by 2026-10-10).

### D-001 · Markdown stays the data source
- **Decision:** posts stay Markdown files; moving to a database or CMS is parked. Phase C adds only an internal
  `PostSource` seam.
- **Source:** the user. Date not recorded (by 2026-10-10).
