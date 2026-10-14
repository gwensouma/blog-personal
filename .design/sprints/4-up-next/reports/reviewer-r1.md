# Report: reviewer · round 1 · status: done

Task: `tasks/reviewer-r1.md`

## Summary
- Reviewed the working tree against `origin/main`: WIP commit d4dc257 read as new code, plus the uncommitted
  developer/builder/tester changes (`lib/post-ending.ts`, `lib/data/posts.ts`, `types/post.ts`, `up-next.tsx`,
  `post-series.tsx`, `post-article.tsx`, both test files, both docs). Note: none of this sprint's work is committed yet;
  the PR #10 CI run (38528476881) is on the old HEAD and its e2e failure is the expected stale "Next in series" check.
- Server-first holds: `lib/post-ending.ts` imports only `@/lib/tags` (pure, `github-slugger`) and `@/types/post`;
  `getPostEnding` loads and delegates; `realSeriesSlug`/`seriesPartsOf`/`rankRelated`/`RELATED_LIMIT` live only in
  `lib/post-ending.ts` (no duplicate in `posts.ts`); `getRelatedPosts(slug, limit = 3)` keeps signature and behaviour.
  No new `"use client"` file (grep over changed/new files: only docs mention it). No `<Suspense>` around Up next.
  `package.json` unchanged. Rules and dedup match the spec's "What the WIP already does".
- Series nav: no `hideNext`, no "Next in series" anywhere in code, `aria-label` "<name>: previous part", not rendered
  on part 1 (`post-article.tsx:104`), `isLast` derived from `series.parts` (`post-series.tsx:71`). End of
  `PostArticle` is a flat list of siblings in one `ReadingColumn` with the order comment; props `post`, `series`,
  `ending`.
- Motion/a11y: card, cover and chip transforms are `motion-safe:`; every transitioning element has
  `motion-reduce:transition-none`; only semantic tokens; cover is decorative (`aria-hidden` / `alt=""`); one tab stop;
  `rel` is `next` for series/newer, `prev` for older, none for related.
- Docs: `.design/product.md` "Post" matches the spec wording verbatim; `.design/blog-refactor.md` "Post series" and
  "Up next (sprint 4)" describe a nav without a next link. `.design/roadmap.md` differs from `origin/main` only by the
  lead's own commit 2314c8f (not by sprint work).

## Files
None.

## Gate
- `npm run gate` → exit 0 (typecheck, lint, 8 files / 148 unit tests passed, build).
- `npm run test:e2e` → exit 1, twice in a row (42 passed, 1 failed each time). The failure both times is
  `tests/e2e/interactive.spec.ts:73` "Control+K opens the command palette and finds a post by title" (URL stays at
  `/posts` after Enter). All 22 `up-next.spec.ts` tests and the `no-js.spec.ts` changes passed. In isolation
  (`--repeat-each=6`, js project) the two Ctrl+K tests failed 2 of 12 (`:73` and `:96`). See Finding 1.

## Browser check
Playwright MCP (JS on) worked; the `playwright-nojs` MCP is not available in this session, so AC9 was checked with
curl against the server HTML. Production server `next start -p 3100` (PID 2164), stopped by PID afterwards.
- Measured (iframe at exact width, all 5 task routes × 320/768/1280 × light/dark = 30 combos): document scrollWidth
  never exceeds the viewport, card `scrollWidth - clientWidth` = 0, h3 overflow = 0, h3 wraps (2–4 lines at 320),
  end order footer → Up next → newsletter → prev/next → related correct, exactly 1 focusable in the region, the theme
  applied as set.
- Looked at by eye (screenshots in `.playwright-mcp/`): `upnext-320-light-ccrt.png` (client-components-render-twice,
  320, light), `upnext-768-dark-focus.png` (same post, 768, dark, keyboard focus: ring + primary border + top bar
  visible), `end-1280-light-rsc-shrinks.png` (rsc-shrinks-your-bundle, 1280, light, series nav → footer → card →
  newsletter). Layout and wrapping look right.
- Keyboard: Tab from the preceding button lands on the title link with `:focus-visible`, card gets a 3px ring
  (box-shadow) and primary border; the next Tab leaves the region (newsletter email input).
- Console: 0 errors, 0 warnings.
- No JS (curl, 6 posts incl. server-actions-for-mutations): the `section` is server-rendered with
  `style="opacity:1;transform:none"`, no `hidden`/`display:none`; label, title link (href + rel as AC1–AC5), excerpt
  present; series nav named "…: previous part" only on parts 2/3; no "Next in series" text. `/posts/does-not-exist`
  → 404.
- Not checked by eye: the other 27 of the 30 width/theme/route combos (covered only by the measurements above), and
  reduced-motion visually (covered by the tester's AC10 e2e, which passed in my runs).

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1–AC5 | `up-next.spec.ts` per-post cases + `no-js.spec.ts`; curl of server HTML | pass |
| AC6 | unit "decidePostEnding: no candidate"; 404 in `no-js.spec.ts`; `UpNext` null branch read at `up-next.tsx:40` (no component test) | pass (data); component part by reading only |
| AC7 | unit table (8 rows) + invariants + `getPostEnding` = `decidePostEnding` | pass; rendered-side dedup check is tautological (Finding 3) |
| AC8 | `up-next.spec.ts` AC8 for all 8 posts; my DOM-order measurement on 5 routes × 6 combos | pass |
| AC9 | `up-next.spec.ts` AC9 (no-js project); curl | pass |
| AC10 | `up-next.spec.ts` AC10 three tests; manual keyboard check at 768 dark | pass |
| AC11 | measured on 30 combos; eye on 3 | pass (see "not checked by eye") |
| AC12 | gate exit 0; no new `"use client"`/dependency; docs match | gate pass; e2e exit 1 locally on an unrelated flaky test (Finding 1) |

## Findings
No must-fix in the sprint's code.

| # | Severity | File:line | What is wrong | Fix | Came back? |
|---|---|---|---|---|---|
| 1 | suggestion (blocks a clean local e2e) | `tests/e2e/interactive.spec.ts:90-91`, `:96-102` | The Ctrl+K palette tests are flaky: 2 of 2 full local runs failed at `:91`, 2/12 in isolation. Not touched by this branch, and CI uses `retries: 2` with `main` green, so it likely won't block the PR; I did not confirm whether it also flakes on `main` locally. Probably Enter is pressed before cmdk has selected the option / the router is ready. | Lead: route to the tester as a separate fix (wait for `aria-selected="true"` on the option before Enter), or confirm on `main`. | yes (tester r1 #1) |
| 2 | suggestion | `tests/unit/post-ending.test.ts:251-260` | Title says "a newer neighbour in the own series is skipped, so the older one is picked", but no case asserts that (p2 ends `null`, p1 picks its next part). The rule-3 skip-newer-then-older path is untested. | Add a fixture where the current post is the last part, has no related, a newer own-series part and an older non-series post; expect `older`. Or rename the test. | no |
| 3 | suggestion | `tests/e2e/up-next.spec.ts:181-189` | The "no post is linked twice" check builds the list from the test's own `CASES` data, not the page, so it can never fail on a rendering bug. | Collect `href`s from the Up next region, the prev/next nav and the related section in the DOM and assert they are unique and exclude the current slug. | no |
| 4 | suggestion | `tests/e2e/up-next.spec.ts:356-359` | "XSS-safe" test checks static markdown titles for `<script>`; it tests nothing user-controlled. | Drop it, or keep but rename to what it does. | no |
| 5 | suggestion | `tests/e2e/up-next.spec.ts:308-311` | The "hover applied" proof compares the computed border colour to the raw `--border` token string; the two formats may never be equal, so the guard may be vacuous. | Compare against the card's border colour read before hover (as the AC10 focus test does at :269). | no |
| 6 | suggestion | `components/posts/post-article.tsx:29`, `.design/blog-refactor.md` "Up next (sprint 4)" | Both say the ending is decided by `getPostEnding`; the rules now live in `decidePostEnding` (`lib/post-ending.ts`). | Mention `decidePostEnding` in `lib/post-ending.ts` (as `types/post.ts` already does). | no |

## Open questions
- Should the Ctrl+K flake (Finding 1) be fixed before merge, or tracked separately given CI retries? I did not run the
  e2e suite on `main` locally to confirm it predates this branch.
