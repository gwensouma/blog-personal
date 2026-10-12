# Archive by year (Sprint 5, slim)

Scope: `/posts` (`app/(blog)/posts/page.tsx` + `components/posts/post-archive.tsx`). Data comes from `getArchivePage(page)` in `lib/data/posts.ts` (`ArchivePage` in `types/post.ts`).

## Year heading

- Layout: one `h2` per year, a baseline-aligned flex row. The year stays as before (`font-heading text-2xl font-semibold text-muted-foreground tabular-nums`); the extras are quiet `font-sans text-sm font-normal` in the same muted colour.
- Count: pushed to the right edge with `ml-auto` so it reads like a ledger column above the hairline rule; wraps under the year on very narrow screens (`flex-wrap`). When the whole year is on this page it is the plain total ("2 posts", singular "1 post"). When the year is split across pages (posts on this page < the year's archive-wide total) it reads "<on page> of <total> posts", so page 1 shows "5 of 6 posts" (a hint that the year goes on) and page 2 shows "1 of 6 posts". Computed in the component from `yearPosts.length` vs `yearCounts[year]`; no data change.
- Continued: when a page starts mid-year (`continuedYear`), the word "continued" sits right after the year, and the count sits at the right edge ("2026  continued ... 1 of 6 posts"). The layout gap separates them, so there is no visible punctuation or brackets.
- Accessible name: hidden commas make the heading read "2026, 5 of 6 posts", "2026, continued, 1 of 6 posts" or "2025, 2 posts" (checked in the Chrome accessibility tree via CDP). Each comma sits at the END of the preceding flex item and is hidden with `text-[length:0px]`, not `sr-only`: `sr-only` is `position: absolute`, which makes the comma a block, so Chrome inserts a space before it ("2026 , continued"). Ids stay `year-<year>`, unique because a year appears at most once per page; each `section` is `aria-labelledby` its heading.
- Tokens only (`text-muted-foreground`, `border-border`); no new colours. Motion unchanged: the post rows still use `StaggerList` and the CSS first-load entrance; headings are static.

## Deliberately left out

- No year jump index. **Add a year index once there are 4+ years** (a compact row of year links under the page header, jumping to `#year-<year>` across pages).
