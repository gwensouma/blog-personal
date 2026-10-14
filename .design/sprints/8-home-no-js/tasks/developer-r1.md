# Task: developer · round 1

<!-- .design/sprints/8-home-no-js/tasks/developer-r1.md. Self-contained: the developer reads this and the brief only. -->

Brief: `.design/sprints/8-home-no-js/brief.md` · Branch: `fix/home-no-js` (already checked out by the lead)
Report to: `.design/sprints/8-home-no-js/reports/developer-r1.md` (format: `.claude/templates/report.md`)

## Do
1. `app/(blog)/page.tsx`:
   - Render `<FeaturedPost />`, `<LatestPosts />` and `<TopicsSection />` directly in the `ReadingColumn`, without
     `<Suspense>`, keeping the current order: `JsonLd`, `HomeHero`, `FeaturedPost`, `LatestPosts`, `PopularPosts`,
     `TopicsSection`, `NewsletterSection`.
   - Remove `import { Suspense } from "react"` and the `FeaturedPostSkeleton` / `LatestPostsSkeleton` named imports
     (keep `FeaturedPost` and `LatestPosts`). Don't touch the skeleton exports in `components/`; the builder deletes
     them after you.
   - Replace the component header comment (lines 18–19) and the `PopularPosts`-only comment (lines 35–37) with one
     short comment above `Home` covering the whole page: every data section is an async Server Component the page
     awaits on the server, with no `<Suspense>` on purpose, because on this prerendered (ISR) page a boundary can't
     stream and its content would sit in a hidden template revealed by an inline script, invisible without JS.
     `PopularPosts` renders nothing until a post has views. Keep the `revalidate` comment and `revalidate = 300`.
   - Do not add a `loading.tsx` anywhere under `app/(blog)/`.
2. `.design/product.md`, section "Home `/`": replace the two-line bullet that starts "No JS: every section above is
   visible. **Known gap:** …" with the single bullet "No JS: every section above is visible." Change nothing else.
3. `.design/popular-posts.md`, caveat 1: replace the sub-bullet "**Known follow-up (not fixed in this PR):** …" with
   "**Follow-up done (sprint 8, `fix/home-no-js`):** Featured, Latest posts, Topics and the hero cover deck now render
   inline too, so the whole home page is visible without JS." Change nothing else.
4. Run `npm run build` once and note in the report that the route table still shows `/` as static (`○`) with
   Revalidate `5m` (AC6).

## Files you may change
- `app/(blog)/page.tsx`
- `.design/product.md` (Home section only)
- `.design/popular-posts.md` (caveat 1 follow-up line only)

## Acceptance criteria this task serves
AC1, AC2, AC3, AC6, AC7 (from the brief).

## Constraints
- No change to the rendering mode: keep `revalidate = 300`, no `dynamic` export.
- No change in `lib/` or `components/`: the async sections render inline as they are, and their data calls already
  share the `cache()`d `loadAllPosts`.
- No new dependency. English comments only.

## Done when
- `npm run gate` exits 0.
- The report lists, per AC, the cases the tester should cover (AC1–AC3 sections visible without JS; AC6 order with JS
  and the build table line for `/`), and confirms no `Suspense` remains in `app/(blog)/page.tsx`.
