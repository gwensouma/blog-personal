# Report: reviewer · round 1 · status: done

Task: `tasks/reviewer-r1.md`

## Summary
- Reviewed the working-tree diff on `fix/home-no-js` against `main`. Nothing is committed yet and there is no PR. The
  commit must include the deletion of `components/posts/post-list-skeleton.tsx` (not staged) and the untracked
  `tests/e2e/home.spec.ts`.
- AC7 checked by reading the code. `app/(blog)/page.tsx` and `components/home-hero.tsx` have no `Suspense` import or
  JSX. The only match is the word in the page comment that explains the choice. There is no `loading.*` under
  `app/(blog)/`. `revalidate = 300` is kept (`page.tsx:15`) and there is no `dynamic` export.
- Dead code: no reference to `FeaturedPostSkeleton`, `LatestPostsSkeleton`, `CoverDeckSkeleton`, `PostListSkeleton`
  or `post-list-skeleton` remains in code or tests. The only mentions left are in design history
  (`.design/blog-refactor.md`) and blog content (`content/posts/streaming-with-suspense.md`). No unused imports.
  `cn`, `coverFrame`, `deckBox`, `cardBox`, `slots`, `LATEST_COUNT` and `LatestPostsHeading` are all still used.
- Comments: none of the touched files still says "streamed" or "inside/behind <Suspense>". The page comment explains
  why an ISR route has no boundary. All comments are in English.
- Scope: nothing changed in `/posts/[slug]`, the command palette or `lib/`, and the home sections have no class,
  motion or visual change. Only skeleton exports were removed. Docs: `.design/product.md` Home has no "Known gap",
  and `.design/popular-posts.md` marks the follow-up as done in sprint 8.

## Files
none

## Gate
- `npm run gate` → exit 0. The build lists `┌ ○ /  2.47 kB  157 kB  5m  1y`, so `/` is still static with Revalidate 5m.
- `npm run test:e2e` → exit 0, 20 passed. This includes `[no-js] content: home / shows every section without JS` and
  `[js] home / renders the sections in order`. Note: the run rebuilt `.next/` with `.data-e2e`.

## Browser check
- I used the Playwright MCP against `next start -p 3100` (PID 620, stopped afterwards). JS on: `/` at 1280, 768 and
  320 in light mode, and at 1280 in dark mode.
  - Section order: h1, Featured, Latest posts, Most read (local `.data` has views), Browse by topic, newsletter.
  - No horizontal scroll at any width. 0 `div[hidden][id^="S:"]` and 0 skeletons in the DOM.
  - The cover deck is 208×224 at 768 and 1280, and 0×0 at 320 (`md:block`, as designed).
  - The deck link shows a `:focus-visible` ring when reached with Shift+Tab.
  - No console errors or warnings.
  - After scrolling, no content is left at opacity 0. The blank bands in the 320 full-page screenshot come from the
    existing scroll-triggered `Reveal` and are not new.
  - Screenshots: `.playwright-mcp/r1-home-{1280,768,320}-light.png`, `r1-home-1280-dark.png`,
    `r1-home-1280-dark-deck-focus.png`.
- JS off: the MCP browser can't turn JS off, so I checked the server HTML with curl and relied on the `no-js` e2e
  project at 1280×720.
  - `/`: 0 hidden `S:` divs. "Featured", "Latest posts", "Browse by topic", "Browse the archive", "All tags" and
    "View all posts" are all present. No "Loading" text.
  - `/posts`, `/tags` and `/search?q=server` (results present): 0 hidden `S:` divs.
  - `/posts/[slug]`: 2 hidden `S:` divs, holding the like button and views. That is expected and out of scope. The
    article body is outside them.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | `tests/e2e/no-js.spec.ts:136`: `expectShown` on the Featured h2 and on the featured link inside `section[aria-labelledby=featured-heading]` | pass |
| AC2 | same test: Latest h2, `toHaveCount(4)` h3 links each `expectShown`, the featured post is absent, "View all posts" is shown with `href=/posts` | pass |
| AC3 | same test: Browse by topic h2, "All tags" shown with `href=/tags` | pass |
| AC4 | same test: "Browse the archive" shown with `href=/posts` (Desktop Chrome is 1280 wide, so ≥ md); both "Loading…" strings have count 0 | pass |
| AC5 | No `fixme`/`.skip` in `no-js.spec.ts`. The home test passes in `no-js`. | pass |
| AC6 | `tests/e2e/home.spec.ts` (h2 order with JS), build table above, browser check | pass |
| AC7 | Code read (see Summary) | pass |

## Findings
No must-fix.

| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion | `components/posts/latest-posts.tsx:18-20` | The rewritten comment wraps mid-sentence ("…visible without JS). Skips the featured post" / "// so it isn't listed twice."). It reads as a leftover. | Reflow it to two even lines. | no |
| 2 | suggestion | `components/posts/latest-posts.tsx:10`, `components/posts/cover-deck.tsx:24-25`, `components/posts/featured-post.tsx:13-14` | `LatestPostsHeading`, `deckBox`/`cardBox` and `coverFrame` were pulled out only to share markup with the deleted skeletons, and each is now used once. They aren't dead, but the indirection no longer earns its place. | Optional: inline them where they are used. No behavior change. | no |
| 3 | suggestion | `.design/blog-refactor.md:260-263` | The design note still describes `FeaturedPostSkeleton`, `LatestPostsSkeleton` and `PostListSkeleton` as if they exist. | Add a one-line note: "removed in sprint 8 (home renders inline, see `.design/popular-posts.md` caveat 1)". | no |
| 4 | suggestion (pre-existing, outside this sprint) | `components/ui/button.tsx` usage with `render={<Link/>}`, e.g. `components/posts/latest-posts.tsx:32` | This repeats tester finding 1. The rendered `<a>` gets `role="button"`, so it is announced as a button. | Track it as a separate fix. Not for this PR. | no |

## Open questions
none
