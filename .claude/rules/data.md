---
paths:
  - "lib/**"
  - "types/**"
  - "app/**/route.ts"
  - "content/**"
---

# Data and server rules

- `lib/data/` is server-only (`import "server-only"`) and owns all I/O. Keep its exported interface small so a real
  database or CMS can replace the internals without touching `app/` or `components/`.
- `lib/data/posts.ts` reads `content/posts/*.md` (Markdown + frontmatter: title, date, excerpt, tags, featured,
  series, seriesOrder, …) behind an optional simulated delay (`BLOG_LATENCY_MS`, off by default) standing in for a DB
  call. `getPost` is wrapped in React `cache()` so `generateMetadata` and the page share one fetch; rendered Markdown
  is also memoised per slug for the process, since the post route renders per request.
- `lib/data/store.ts` is a JSON-file key/value store standing in for a DB (likes, views, subscribers). Its directory
  is `BLOG_DATA_DIR` (default `.data/`).
- `lib/actions/<entity>.ts` holds `"use server"` actions: validate input, then call `lib/data/`. Treat every action
  and route handler as a public endpoint: validate types, lengths and existence, authorize privileged calls on the
  server, cap anything a stranger can grow, and render user text as React text (no `dangerouslySetInnerHTML`).
- Accepted abuse limits: likes are anonymous and cookie-based (a scripted client can inflate them; sign the cookie
  or add accounts if counts ever matter); the newsletter answers new and known addresses alike (no membership
  probing) and caps the list at 5,000. Any new store key a stranger can grow gets a hard cap like these.
- Absolute URLs (RSS, sitemap, OG, JSON-LD) come from `NEXT_PUBLIC_SITE_URL` (see `.env.example`).
- `lib/markdown.ts` turns Markdown into hast (rendered to React by `post-body`) plus an HTML string (remark/rehype +
  Shiki), and computes the TOC and reading time.
- `lib/ai/` doesn't exist yet. When AI lands, expose a narrow interface (e.g. `summarizePost(post): Promise<string>`)
  so `app/` and `components/` never call an LLM SDK directly.
