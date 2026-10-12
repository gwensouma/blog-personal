# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goals

This project is a personal blog, built as a learning vehicle for React Server Components. Keep these in mind when making decisions:

- **TypeScript is the baseline.** All files are `.ts`/`.tsx`. No JS source files should be reintroduced.
- **RSC is the point of the project.** Prefer Server Components by default; push `"use client"` down to the smallest leaf component, same pattern as [components/posts/like-button.tsx](components/posts/like-button.tsx). Favor server-side data fetching over client-side fetching/effects.
- **AI features are planned** (e.g. AI-assisted writing, summarization, or similar blog-related AI tooling) — expect this to land later in `lib/ai/` (see Architecture below). Keep the data layer easy to extend rather than over-fitting to the current Markdown-file source.
- **State management is unopinionated** — no library is chosen yet. Default to React built-ins (`useState`, `useReducer`, URL/search params) for as long as they're sufficient; only reach for an external state library when asked or when a clear cross-component/global need shows up, and ask which one the user prefers rather than assuming.
- **Styling is Tailwind v4 + shadcn/ui.** Use Tailwind utilities with the semantic theme tokens in [app/globals.css](app/globals.css) (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`, `font-heading`, `font-sans`) — no raw hex or palette classes like `text-blue-700`. Prefer shadcn components (`components/ui/`, added via `npx shadcn@latest add <name>`) over hand-rolled equivalents. Don't add hand-written CSS classes to `globals.css`; it holds tokens, the base layer and the Shiki/dark-mode glue only (Markdown prose styles live as arbitrary variants in [components/posts/post-body.tsx](components/posts/post-body.tsx)).
- **English only, everywhere.** All code comments and all UI-facing text/copy must be written in English. Do not introduce Vietnamese (or any other language) in new comments or UI strings; when editing existing Vietnamese comments, translate them to English.

## Commands

- `npm run dev` — start the Next.js dev server (loads `.env.local` via Node's `--env-file-if-exists`, so `PORT` there is honored)
- `npm run build` — production build
- `npm run start` — run the production build (same `.env.local` loading)
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint flat config ([eslint.config.mjs](eslint.config.mjs), `next/core-web-vitals` + `next/typescript`)
- No test suite is configured. Before a PR: `typecheck`, `lint` and `build` must all pass (`next build` also runs ESLint, so a lint error fails the build too).

## Architecture

This is a minimal Next.js 15 App Router blog (React 19, Tailwind v4, shadcn/ui `base-nova` style on Base UI primitives) whose starting purpose is illustrating React Server Components (RSC) vs. Client Components. Existing code comments explaining this distinction were originally written in Vietnamese; per the English-only rule above, translate them to English as you touch these files rather than adding new non-English comments. The folder layout below is deliberately layered so future growth (AI features, a real data source) slots into existing boundaries instead of requiring a rewrite.

```
app/                         ROUTING ONLY — every folder is a URL segment
  layout.tsx, globals.css      site-wide shell (html/body, fonts, theme pre-paint script, motion provider, header, <main>, footer)
  template.tsx                 thin: returns the page-transition wrapper from components/motion/
  not-found.tsx, global-error.tsx
  icon.svg, opengraph-image.tsx, sitemap.ts, robots.ts, feed.xml/route.ts   site-wide metadata files
  (blog)/                      route group: groups blog routes, adds nothing to the URL
    page.tsx, error.tsx        "/" (streams featured/latest posts with in-page <Suspense>)
    posts/page.tsx             "/posts" archive, ?page= pagination
    posts/[slug]/              "/posts/:slug" (+ opengraph-image.tsx; dynamicParams = false; dynamic: likes/views read a cookie)
    tags/, tags/[tag]/         "/tags", "/tags/:tag"
    search/page.tsx            "/search?q="
  (site)/about/page.tsx        "/about"
content/posts/*.md             post source: Markdown + frontmatter (title, date, excerpt, tags, featured, …)
components/
  ui/                          shadcn-generated primitives (owned source, editable)
  layout/                      site chrome: header (auto-hide), footer, nav, mobile nav, theme toggle
  motion/                      generic animation primitives (reveal, stagger, text-reveal, enter, scroll-progress, …)
  posts/  tags/  authors/      entity-specific UI
  reading-column.tsx, page-header.tsx, json-ld.tsx, og-card.tsx   shared, domain-free
lib/
  data/<entity>.ts             server-only data access (getPosts, getPost, getAllTags, searchPosts, …)
  data/store.ts                JSON-file key/value store (.data/store.json) standing in for a DB; likes, views, subscribers
  actions/<entity>.ts          "use server" Server Actions: validate input, then call lib/data/ (thin, public endpoints)
  ai/                          (planned) LLM code behind a narrow interface
  markdown.ts                  server-only Markdown → hast (rendered to React by post-body) + HTML string (remark/rehype + Shiki), TOC, reading time
  site.ts                      site config: name, url, author, nav, social links
  motion.ts                    shared spring/ease presets for `motion` (CSS ease tokens live in globals.css @theme)
  format.ts, tags.ts, rss.ts, structured-data.ts, theme.ts   pure helpers
  utils.ts                     cn() — re-exports the `cn` package, used by shadcn
types/<entity>.ts              shared domain types; global.d.ts for ambient declarations
```

- `app/` — **routing only**. In Next 15, dynamic route `params` is a `Promise` and must be awaited. Pages are Server Components that `await` calls into `lib/data/` and render one or a few `components/`. Don't put business logic, data fetching implementation, or large JSX here.
- `components/` — reusable UI, one clear purpose each. Client Components (`"use client"`) are only small leaves: `like-button`, `copy-link-button`, `nav-link`, `mobile-nav`, `theme-toggle`, `auto-hide-header`, `toc-spy`, `back-to-top`, `command-menu`/`command-palette` (lazy-loaded on first open), `code-copy-button`, `newsletter-form`, and the JS-driven wrappers in `components/motion/` (plus the required `error.tsx`/`global-error.tsx`). When adding interactivity, keep it scoped to a small leaf Client Component like these rather than converting a page to a Client Component.
- **Animation** uses `motion` (`motion/react`) via `LazyMotion` + `m`, never the full `motion` component. Motion wrappers in `components/motion/` take Server Component content as `children` — wrap, don't convert. Prefer CSS (Tailwind, `tw-animate-css`, scroll-driven animations) for above-the-fold entrances so they run before hydration; use `motion` for scroll reveals, springs and gestures. Content must never stay invisible without JS, every effect must respect `prefers-reduced-motion`, and only `transform`/`opacity` should animate. Presets live in [lib/motion.ts](lib/motion.ts); decisions are in [.design/blog-refactor.md](.design/blog-refactor.md). Icons come from `lucide-react`. `components/ui/` holds shadcn-generated components — treat them as owned source code you may edit.
- `lib/data/` — data access layer ([lib/data/posts.ts](lib/data/posts.ts)). Currently reads Markdown files from `content/posts/`, with a simulated `setTimeout` delay standing in for a DB/API call; `getPost` is wrapped in React `cache()` so `generateMetadata` and the page share one fetch. Absolute URLs (RSS, sitemap, OG, JSON-LD) come from `NEXT_PUBLIC_SITE_URL` — set it in production (see `.env.example`). Server-only logic belongs here; keep its exported interface small so a real database/CMS can replace the internals without touching `app/` or `components/`.
- `lib/ai/` — **not created yet**. This is the designated home for LLM client code, RAG pipeline, or agent orchestration once AI features are built. When that lands, expose a narrow interface (e.g. `summarizePost(post): Promise<string>`) so `app/`/`components/` never call an LLM SDK directly — keeps AI logic isolated and swappable.
- `types/` — shared TypeScript types ([types/post.ts](types/post.ts): `Post`, `PostSummary`, `Tag`, `TocItem`, …).

### Where does a new file go?

Answer these in order; the first "yes" decides.

1. **Is it a URL, or a Next.js special file for a URL** (`page`, `layout`, `loading`, `error`, `not-found`, `route`, `generateMetadata`)? → `app/`, in the folder matching the URL. Site-wide (applies to every URL) → `app/` root. Blog-only → `app/(blog)/…`. A new unrelated section (e.g. an About/portfolio area with its own layout) → a new route group `app/(<section>)/`. Special files stay thin: fetch via `lib/`, then return a component from `components/` (e.g. `loading.tsx` returns `<PostListSkeleton />`).
2. **Is it a shadcn primitive?** → `components/ui/` via `npx shadcn@latest add <name>`; never hand-write files there.
3. **Is it site chrome shown on many pages** (header, footer, nav, theme toggle)? → `components/layout/`.
4. **Is it UI tied to one domain entity** (post, later tag/author/comment)? → `components/<entity-plural>/`, e.g. `components/posts/`. Create a new folder per new entity.
5. **Is it UI with no domain meaning, reused across features** (e.g. a generic `PageHeading`)? → `components/` root — only once it's actually used in 2+ places.
6. **Does it read/write data or talk to an external service?** → `lib/data/<entity>.ts` (or `lib/ai/` for LLM work). Server-only. A mutation the client triggers gets a thin Server Action in `lib/actions/<entity>.ts` that validates input and calls `lib/data/`.
7. **Is it a pure helper with no React and no I/O?** → `lib/<topic>.ts` (e.g. `lib/format.ts`). Don't grow `lib/utils.ts` beyond `cn()`.
8. **Is it a type used by 2+ files?** → `types/<entity>.ts`. Props types used by one component stay inline in that component.

Conventions:
- File names are kebab-case (`post-list-item.tsx`); components are PascalCase **named exports**. Only Next.js special files in `app/` use `export default`.
- Imports always use the `@/` alias, never long relative paths.
- Don't create `index.ts` barrel files, and don't create a folder for a single file unless rule 4 says so.
- Folders in `app/` that are not routes must be private (`_name/`) — but prefer putting the code in `components/` or `lib/` instead.
- Intentionally out of scope for now: micro-frontends / multi-service splitting — this is a single Next.js app, and splitting it would be premature. Revisit only if the blog needs independently deployed sub-apps.

There is no `.cursorrules` or Copilot instructions in this repo.

## Design reference

[.design/Main.dc.html](.design/Main.dc.html) and [.design/Detail.dc.html](.design/Detail.dc.html) hold the visual mockups (Claude Design canvas artboards) the current UI is based on: an editorial layout with Fraunces (serif, headings) + Source Sans 3 (body) — see [app/globals.css](app/globals.css) for the implemented palette (deep blue `--primary` `#1d4ed8` on white/black, chosen over the mockups' warm-paper default). Fonts are loaded with `next/font` in [app/layout.tsx](app/layout.tsx) as `--font-heading` (Fraunces) and `--font-sans` (Source Sans 3). Keep new UI consistent with this look unless the user asks to change direction.

## Agent workflow

Start a working session with **`/lead`** ([.claude/skills/lead/SKILL.md](.claude/skills/lead/SKILL.md)). The main session is then the **lead**: it plans from [.design/roadmap.md](.design/roadmap.md) (the single source of truth for what is decided, queued and done), delegates UI work to subagents in [.claude/agents/](.claude/agents/), and merges.

1. **Lead (main session)** — clarifies the request, decides scope, and writes a precise brief for the builder (goal, files in scope, constraints). Non-UI work (data layer, `lib/ai/`, types, config) and trivial one-line fixes it does directly.
2. **[builder](.claude/agents/builder.md)** — designs and implements UI. Skills: `hallmark` (primary design guide, editorial genre), `frontend-design` (secondary), `frontend-ui-engineering`, `shadcn`. Writes design decisions that change direction to `.design/`, runs the gates.
3. **[reviewer](.claude/agents/reviewer.md)** — read-only. Skills: `frontend-ui-engineering`, `shadcn`. Checks RSC boundaries, token/shadcn usage, a11y, responsiveness, design consistency; reports must-fix vs. suggestion.
4. **Loop** — the lead sends must-fix findings back to the builder (continue the same builder agent so it keeps context) and re-reviews until there are none.

**Git:** one branch per feature off `main` (`feat/<name>`, `fix/<name>`, `chore/<name>`). The lead creates the branch, commits, pushes to `origin`, opens a PR with `gh pr create`, and merges it (`gh pr merge --merge`) once the review loop is clean and typecheck, lint and build pass. Feature work always lands on `main` through a PR. The user delegated merging to the lead and can take it back at any time.
