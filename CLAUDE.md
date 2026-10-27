# CLAUDE.md

A personal blog, now the testbed for learning agentic workflows (the `/lead` team below is the subject; D-025):
Next.js 15 App Router, React 19, TypeScript, Tailwind v4, shadcn/ui (`base-nova` on Base UI). Area rules load on demand from `.claude/rules/` (`ui.md`, `data.md`, `tests.md`).
Team workflow: `/lead` ([.claude/skills/lead/SKILL.md](.claude/skills/lead/SKILL.md)); plan: [docs/roadmap.md](docs/roadmap.md);
decisions and why: [docs/decisions.md](docs/decisions.md);
what each page does today: [docs/product.md](docs/product.md) (read it before changing a page).

## Project goals

- **Server first.** Server Components by default; push `"use client"` down to the smallest leaf (like
  [components/posts/like-button.tsx](components/posts/like-button.tsx)). Fetch on the server, not in effects.
  Essential content renders without JS: `<Suspense>` only around non-essential or JS-dependent content.
- **TypeScript only** (`.ts`/`.tsx`). **English only** in comments and UI copy; translate Vietnamese comments you touch.
- **AI features are planned** for `lib/ai/`. Keep the data layer easy to swap rather than fitted to Markdown files.
- **No state library yet.** Use React built-ins and URL params; ask the user before adding one.
- **No new dependency** (runtime or dev) without asking the user.

## Commands

- `npm run dev` / `npm run start` — dev server / production server (both load `.env.local`, so its `PORT` is honored)
- `npm run build` — production build (also runs ESLint)
- `npm run typecheck` — `tsc --noEmit`; `npm run lint` — ESLint ([eslint.config.mjs](eslint.config.mjs))
- `npm test` — Vitest unit tests (`tests/unit/`); `npm run test:watch` — watch mode
- `npm run test:e2e` — Playwright (`tests/e2e/`) against its own production build in `.next-e2e/` on port 3200 with
  `BLOG_DATA_DIR=.data-e2e` (safe next to `npm run dev`; fails if 3200 is busy). `E2E_SKIP_BUILD=1 npm run test:e2e`
  reuses the last e2e build: only after changing nothing but `tests/`.
- `npm run gate:fast` — typecheck, lint and unit tests (no build). `npm run gate` — `gate:fast` plus the build.
- Before a PR: `npm run gate:fast` passes, plus `npm run test:e2e` (which builds) for any UI or route change; with no
  UI or route change, run `npm run gate` instead so the build is checked. CI
  ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs `gate` and `e2e` on every PR; merge only when both are green.

## Architecture

Layered so new work (AI, a real database) slots into existing boundaries:

- `app/` — **routing only.** Pages are thin Server Components: `await` `lib/data/`, render `components/`. In Next 15,
  `params` and `searchParams` are Promises. Route groups: `(blog)`, `(site)`.
- `components/` — UI. `ui/` (shadcn, owned source), `layout/` (site chrome), `motion/` (animation wrappers),
  `<entity>/` (e.g. `posts/`), and domain-free shared components at the root.
- `lib/data/` — server-only data access (`posts.ts` reads `content/posts/*.md`; `store.ts` is a JSON-file store in
  `.data/`). `lib/actions/` — thin `"use server"` actions. Other `lib/*.ts` are pure helpers.
- `types/` — shared domain types. `tests/` — `unit/` (Vitest) and `e2e/` (Playwright).

### Where does a new file go?

The first "yes" decides.

1. **A URL or a Next.js special file** (`page`, `layout`, `loading`, `error`, `not-found`, `route`)? → `app/`, in the
   folder matching the URL: site-wide at the root, blog in `(blog)/`, a new section in a new group `(<section>)/`.
   Special files stay thin: fetch via `lib/`, return a component.
2. **A shadcn primitive?** → `components/ui/` via `npx shadcn@latest add <name>`; never hand-written.
3. **Site chrome on many pages** (header, footer, nav)? → `components/layout/`.
4. **UI tied to one entity** (post, tag, comment)? → `components/<entity-plural>/`.
5. **Domain-free UI used in 2+ places?** → `components/` root.
6. **Reads/writes data or calls an external service?** → `lib/data/<entity>.ts` (LLM work: `lib/ai/`). A mutation the
   client triggers gets a thin Server Action in `lib/actions/<entity>.ts`.
7. **A pure helper, no React, no I/O?** → `lib/<topic>.ts`. `lib/utils.ts` holds only `cn()`.
8. **A type used by 2+ files?** → `types/<entity>.ts`; single-use props types stay inline.
9. **A test?** → `tests/unit/<topic>.test.ts` or `tests/e2e/<feature>.spec.ts`; never colocated.

Conventions (file names, `@/` imports and palette classes are also enforced by lint and `tests/unit/conventions.test.ts`):
- kebab-case file names; components are PascalCase **named exports**; only Next special files `export default`.
- Imports use the `@/` alias. No `index.ts` barrels, no folder for a single file (except rule 4).
- Non-route folders inside `app/` are private (`_name/`), but prefer `components/` or `lib/`.
- Out of scope: micro-frontends or splitting into services.

### Where does a doc go?

Every doc has one kind, registered with a line budget in `tests/unit/docs.test.ts`; an unregistered `.md` in `docs/`
or `.claude/` fails the gate, so a new doc is a deliberate choice, not a side effect.
- **Living** (`CLAUDE.md`, `.claude/rules/`, agents, the lead skill, `docs/product.md`): how things are *now*.
  Rewrite the paragraph that changed; never append a dated or per-sprint section.
- **Index** (`docs/roadmap.md`): one line per item, pointing elsewhere.
- **Log** (`docs/decisions.md`, `docs/roadmap-archive.md`): append-only, newest first.
- **Record** (`docs/specs/`, `docs/sprints/`): one feature or sprint; frozen once merged, read only on demand.
- A feature's design or data notes belong in its spec or sprint report. A rule that outlives the feature goes into a
  living doc; its reason goes into `decisions.md`.
