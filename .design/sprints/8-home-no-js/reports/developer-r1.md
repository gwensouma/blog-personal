# Report: developer · round 1 · status: done

Task: `tasks/developer-r1.md`

## Summary
- `app/(blog)/page.tsx`: `FeaturedPost`, `LatestPosts` and `TopicsSection` now render inline (no `<Suspense>`), order
  unchanged (JsonLd, HomeHero, FeaturedPost, LatestPosts, PopularPosts, TopicsSection, NewsletterSection). Removed the
  `Suspense` import and the `FeaturedPostSkeleton` / `LatestPostsSkeleton` imports; skeleton exports in `components/`
  untouched for the builder.
- Replaced the two comments with one page-level comment above `Home`. `revalidate = 300` and its comment kept; no
  `dynamic` export; no `loading.tsx` under `app/(blog)/`.
- Docs: `.design/product.md` Home no-JS bullet and `.design/popular-posts.md` caveat 1 follow-up line updated as specified.
- No interface change in `lib/data/` or `lib/actions/`.

## Files
- `app/(blog)/page.tsx`
- `.design/product.md`
- `.design/popular-posts.md`

## Gate
- `npm run gate` → exit 0 (112 unit tests pass; build ok).
- Build route table (AC6): `┌ ○ /    2.47 kB    157 kB    5m    1y` — `/` is still static (`○`) with Revalidate `5m`.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | For the tester (no-JS project): "Featured" `h2` and link "Server Components run on the server" visible via `expectShown`. Checked in `.next/server/app/index.html`: the featured title is in the HTML outside `<div hidden>`. | pass (build HTML) |
| AC2 | For the tester (no-JS): "Latest posts" `h2`, exactly 4 visible title links under it, featured post not among them, visible "View all posts" → `/posts`. | for the tester |
| AC3 | For the tester (no-JS): "Browse by topic" `h2`, visible "All tags" → `/tags`. | for the tester |
| AC6 | For the tester (`js` project, new `tests/e2e/home.spec.ts`): section `h2` order hero → Featured → Latest posts → (Most read absent in e2e) → Browse by topic → newsletter. Build table line above. | pass (build table) |
| AC7 | `grep Suspense app/(blog)/page.tsx` → only the word inside the explanatory comment ("no <Suspense> on purpose"), no import or JSX. `app/(blog)/` holds no `loading.tsx`. | pass (page.tsx) |

## Findings
none

## Open questions
- The prerendered `index.html` still contains one `<div hidden id="S:0">`: the hero cover deck ("Browse the archive"),
  wrapped in `<Suspense fallback={<CoverDeckSkeleton />}>` in `components/home-hero.tsx:37` (builder scope, AC4/AC7).
  Its header comment (line 15) also still says "streamed behind its own Suspense".
- AC7 reviewer note: the word `<Suspense>` appears in the `page.tsx` comment by design of the task wording; there is
  no boundary in the code.
