# Archive by year (Sprint 5, slim)

Scope: `/posts` (`app/(blog)/posts/page.tsx` + `components/posts/post-archive.tsx`). Data comes from `getArchivePage(page)` in `lib/data/posts.ts` (`ArchivePage` in `types/post.ts`).

## Year heading

- Layout: one `h2` per year, a baseline-aligned flex row. The year stays as before (`font-heading text-2xl font-semibold text-muted-foreground tabular-nums`); the extras are quiet `font-sans text-sm font-normal` in the same muted colour.
- Count: the year's total across the whole archive ("6 posts", singular "1 post"), pushed to the right edge with `ml-auto` so it reads like a ledger column above the hairline rule; wraps under the year on very narrow screens (`flex-wrap`).
- Continued: when a page starts mid-year (`continuedYear`), the word "continued" sits right after the year. No extra punctuation or brackets visually; the count still shows the full-year total so the reader knows how much of the year exists across pages.
- Accessible name: sr-only ", " separators make the heading read "2026, continued, 6 posts" (or "2025, 2 posts"). Ids stay `year-<year>`, unique because a year appears at most once per page; each `section` is `aria-labelledby` its heading.
- Tokens only (`text-muted-foreground`, `border-border`); no new colours. Motion unchanged: the post rows still use `StaggerList` and the CSS first-load entrance; headings are static.

## Deliberately left out

- No year jump index. **Add a year index once there are 4+ years** (a compact row of year links under the page header, jumping to `#year-<year>` across pages).
