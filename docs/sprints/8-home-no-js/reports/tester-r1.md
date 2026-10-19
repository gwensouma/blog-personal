# Report: tester · round 1 · status: done

Task: `tasks/tester-r1.md`

## Summary
- Turned the home `test.fixme` in `tests/e2e/no-js.spec.ts` into "content: home / shows every section without JS" (still in the `@no-js` describe). Removed the Known-bug comment, the `request` fixture, the seeding call and the Most read assertion; added the one-line caveat comment.
- Added `tests/e2e/home.spec.ts` (JS on): h1 shown; h2 order Featured, Latest posts, Browse by topic, "Get the next post by email". No "Most read" assertion.
- The featured post is not duplicated in Latest posts, and Latest has exactly 4 items. The command palette's "Loading posts…" did not appear in the no-JS HTML.

## Files
- `tests/e2e/no-js.spec.ts`
- `tests/e2e/home.spec.ts` (new)

## Gate
- `npm test` → exit 0, 7 files, 112 tests passed.
- `npm run test:e2e` → first run exit 1 (my own locator, finding 1); after the fix exit 0, 20 passed (both projects).
- `grep -n "fixme\|\.skip" tests/e2e/no-js.spec.ts` → no matches (AC5).
- AC6 build line: the e2e log doesn't print the route table. From the developer's gate build: `┌ ○ /    2.47 kB    157 kB    5m    1y` (static, Revalidate 5m). I did not run a separate `npm run build`.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | no-js.spec.ts "home / shows every section without JS": Featured h2, link inside `section[aria-labelledby=featured-heading]` | pass |
| AC2 | same test: Latest posts h2, exactly 4 shown h3 title links, none the featured post, "View all posts" shown with href `/posts` | pass |
| AC3 | same test: Browse by topic h2, "All tags" shown with href `/tags` | pass |
| AC4 | same test: "Browse the archive" shown with href `/posts`; "Loading featured post…" and "Loading posts…" count 0 | pass |
| AC5 | fixme removed; grep empty | pass |
| AC6 | `tests/e2e/home.spec.ts` (section order, JS on) plus the build line above | pass |

## Findings
| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion | `components/posts/latest-posts.tsx:32` (pattern is in `components/ui/button.tsx`) | Pre-existing, not from this sprint. `Button` with `nativeButton={false}` and `render={<Link/>}` outputs `<a role="button" tabindex="0" href="/posts">`, so assistive tech announces a button, not a link, and `getByRole("link", { name: "View all posts" })` finds nothing. The same pattern is used in `post-article.tsx:59`, `search-results.tsx`, `author-about.tsx` and `post-share.tsx`. My test locates it with `locator("a", { hasText })` and says why in a comment. | Drop the `role="button"` when Button renders a link. Then the test can use `getByRole("link")`. | no |

## Open questions
none
