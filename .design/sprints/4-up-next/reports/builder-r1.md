# Report: builder · round 1 · status: done

Task: `tasks/builder-r1.md`

## Summary
- Reading confirmed before removing anything: `getPostSeries` and `decidePostEnding` both build the parts with
  `seriesPartsOf(posts, series.slug)` (same filter and same sort). `PostArticle` shows a series only when
  `parts.length > 1`, which is the same count `withSeriesTotals` stamps as `series.total`, so `realSeriesSlug` is
  non-null and `decidePostEnding`'s `nextPart` is the same post as the nav's `series.parts[position]`. Rule 1 wins
  first, so whenever the nav could show a next link, up-next is `"series"` pointing at it.
- `PostSeriesNav`: dropped `hideNext`, the next link and `SeriesStep` (inlined the single "Previous in series" link).
  It's one left-aligned column at every width (`self-start` keeps the focus ring tight to the text). `isLast` still
  comes from `series.parts[series.position]`. `aria-label` is `` `${series.name}: previous part` ``. I rewrote the
  doc comment: Up next is the forward step and this nav only goes back. Removed the unused `ArrowRightIcon` import.
- `PostArticle`: removed `upNextIsNextPart` and `showSeriesNav`. The nav renders when
  `shownSeries && shownSeries.position > 1`, with a comment next to it. The end stays a flat list of siblings in the
  one `ReadingColumn` with its order comment. Props are unchanged.
- `up-next.tsx` review: I fixed one defect. The top sweep bar (`absolute z-10 h-1`) had no `pointer-events-none`, so
  once it scaled to full width on hover, the top 4px of the card swallowed clicks instead of passing them to the
  stretched title link. I added `pointer-events-none`. Everything else passes: only semantic tokens; the transitions
  are `border-color`/`translate`/`scale`/`transform`/colours; every transform is `motion-safe:` and every
  transitioning element has `motion-reduce:transition-none`; the ring is a box-shadow on the card itself, so
  `overflow-hidden` doesn't clip it, and it isn't transitioned, so it shows instantly; `PostCover` with `decorative`
  renders no link or focusable element (a real image gets `alt=""`, the default cover is `aria-hidden` and its SVG is
  `focusable="false"`); `null` returns nothing; the label and title wrap with `[overflow-wrap:anywhere]`; a
  `series` pick without `total` falls back to "Part n"; `Reveal` renders with `initial={false}`, and there's no
  `<Suspense>`.
- `.design/blog-refactor.md`: rewrote the "Series nav" bullet (previous only, not on part 1, new aria-label; dropped
  the Next arrow and DOM-order sentence) and the "Series parts, dedup decision" bullet (no `hideNext`, never a next
  link, part-1 and last-part sentences). Nothing else changed.

## Files
- `components/posts/post-series.tsx`
- `components/posts/post-article.tsx`
- `components/posts/up-next.tsx` (`pointer-events-none` on the sweep bar)
- `.design/blog-refactor.md` ("Post series" › Series nav, "Up next (sprint 4)" › dedup decision)

## Gate
- `npm run gate` → exit 0.
- `grep -rn "hideNext\|previous and next part" components` → no output.

## Browser check
Done. I ran `next start` on port 3417 and stopped my own PID afterwards. A Playwright script in the scratchpad (not
in the repo) covered 320/768/1280 in light and dark on `client-components-render-twice` and
`why-i-started-this-journal`: `scrollWidth - innerWidth` = 0 and card overflow = 0 everywhere, the section's opacity
is 1, the section has exactly 1 focusable element, and the screenshots look right (stacked cover band at 320,
two-column card from 768, the focus state draws the ring, primary border and top bar). Not checked by eye: a real
cover image, because no post in `content/posts` sets `cover:`. From the code, `Image fill` sits in the same frame
with `sm:aspect-auto sm:h-full sm:min-h-60`, so it fills the column like the default cover does.

## AC → test
| AC | Test or check | Result |
|---|---|---|
| AC1 | For the tester: on `/posts/client-components-render-twice`, `nav` named exactly "RSC Fundamentals: previous part" contains "RSC Fundamentals, part 2 of 3" and a "Previous in series" link to `/posts/server-components-run-on-the-server`. The page has no text "Next in series" anywhere. Up next region: label "Next in RSC Fundamentals · Part 3 of 3", link `rel="next"` to `/posts/rsc-shrinks-your-bundle`. Checked in the server HTML (curl). | pass (manual), e2e gap (tester) |
| AC2 | For the tester: on `/posts/server-components-run-on-the-server`, no nav named "…: previous part" (only "RSC Fundamentals: all parts", the box). Up next links `/posts/client-components-render-twice`. Checked by curl. | pass (manual) |
| AC3 | For the tester: on `/posts/rsc-shrinks-your-bundle`, the nav says "RSC Fundamentals, final part (3 of 3)" plus "Previous in series", with no next link. The card label is "Related reading". Checked by curl. | pass (manual) |
| AC8 | For the tester: in DOM order after the article `footer` (like/share): `section[aria-labelledby=up-next-heading]`, then the newsletter, then prev/next (when present), then related (when present). The series nav sits before the footer, inside the article. | for tester |
| AC9 | For the tester (JS disabled): the Up next section, label, title, excerpt and link are present and visible. `Reveal` server-renders with no inline opacity/transform. The series nav (also in `Reveal`) is visible. | for tester |
| AC10 | Keyboard: inside the Up next section the only tab stop is the `h3 a` (I measured 1 focusable). On focus, the `article` (card) gets `box-shadow` (ring) and `border-color: var(--primary)`, the top bar `span` goes to `scale-x-100`. Reduced motion (`reducedMotion: "reduce"`), read computed styles while the link is focused or hovered: the card `article` has `translate: none` (lift is `motion-safe:-translate-y-1`); the cover content (the `img` or the default cover `div[aria-hidden]` inside the frame) has `scale: none` (zoom is `motion-safe:scale-[1.06]`); the arrow chip `span.size-10` has `translate: none` (slide is `motion-safe:translate-x-1.5`); every one of them, plus the bar, has `transition-property`/`transition-duration` reset (`motion-reduce:transition-none`). The Reveal slide is turned off by `MotionConfig reducedMotion="user"`. The series nav arrow uses the same pattern (`motion-safe:-translate-x-1`). The bar still scales under reduced motion, but it does so instantly (no transition), as the spec accepts. | for tester |
| AC11 | 320/768/1280 in light and dark: no horizontal overflow, titles wrap. Checked (see "Browser check"). | pass (manual) |
| AC12 | No new file and no new `"use client"`; no dependency change. `.design/blog-refactor.md` updated. | pass |

## Open questions
None.
