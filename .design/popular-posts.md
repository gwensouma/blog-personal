# Popular posts ("Most read") — Sprint 6

## Decision

- **Component:** `components/posts/popular-posts.tsx`, an async Server Component. It calls `getPopularPosts(3)` from `lib/data/engagement.ts` and returns `null` when the list is empty, so there's no heading and no empty box.
- **Look:** a compact ranked list that's lighter than the full post row. It has no excerpt, tags or cover. Each row has a large Fraunces numeral (`font-heading`, `text-primary`, `tabular-nums`), the title as an `h3`, and one muted line with the view count (`1,234 views`, `toLocaleString("en-US")`, `tabular-nums`, singular "view" for 1). Rows sit between hairline `border-border` rules, like Related posts. It reuses `postRowClassName`, `postRowLinkClassName` and `PostRowAccent`, so hover and focus match every other post row: the row shifts, an accent bar appears, an arrow slides in, and the title link stretches over the row. `PostMeta` isn't used because date and reading time would compete with the one number this list is about.
- **Numbering is real information.** The list is a ranking, so it's an `<ol role="list">`. The visible numeral is `aria-hidden` because the `<ol>` already tells screen readers the order.
- **Outline:** the section is `aria-labelledby="popular-heading"`. "Most read" is an `h2`, the same level as Latest posts and Browse by topic under the hero `h1`. The post titles are `h3`.
- **Position:** after Latest posts and before Browse by topic. The reader goes from recency to popularity, then to topics.
- **Fallback:** `<Suspense fallback={null}>`. An empty result renders nothing, so a skeleton could flash a section that never arrives. This matches the Topics section.
- **Motion:** the existing `Reveal` wrapper is applied to the heading and to the list. It animates only blocks below the fold at hydration, uses opacity and transform only, respects reduced motion, and leaves content visible without JS. Hover and focus are CSS only, through the shared row classes.

## Rendering mode: ISR

`app/(blog)/page.tsx` exports `revalidate = 300`. `getPopularPosts` reads no cookies, so `/` would otherwise be prerendered once at build time and the list would freeze. With ISR the page stays static and Next regenerates it in the background at most every 5 minutes. The build output shows `○ /` with Revalidate `5m`, and the response has `Cache-Control: s-maxage=300, stale-while-revalidate`.

## Caveats

1. **Suspense mostly doesn't stream here.** On a prerendered/ISR page, the HTML is generated ahead of time (at build, then during background regeneration), so visitors get the finished document. The `<Suspense>` boundary around `PopularPosts` stays for dev, where it does stream, and as a structural boundary. It's not a streaming demo on `/` in production.
2. **An empty `.data/` at build time ships no section.** If the build runs with no recorded views, the prerendered `/` has no "Most read" section. The section appears at the first regeneration after views exist, which needs a request more than 5 minutes after the last generation.
3. **Revalidation is time-based on purpose.** `recordView` runs on every post view, so calling `revalidatePath("/")` from it would regenerate the home page on nearly every visit. There's no on-demand revalidation, and none should be added for view counts.
