# Task: builder · round 1

<!-- .design/sprints/4-up-next/tasks/builder-r1.md. Self-contained: the builder reads this and the brief only. -->

Brief: `.design/sprints/4-up-next/brief.md` · Branch: `feat/up-next` (already checked out by the lead)
Report to: `.design/sprints/4-up-next/reports/builder-r1.md` (format: `.claude/templates/report.md`)
Read first: `reports/developer-r1.md` (the data shape is unchanged: `PostArticle` still receives
`ending: PostEnding` = `{ upNext: UpNext | null, adjacent: AdjacentPosts, related: PostSummary[] }`).

## Do
The WIP UI is on the branch but nobody has reviewed it (`git diff main...HEAD -- components`). Two small changes and
one review.

1. **`PostSeriesNav` without a next link** (`components/posts/post-series.tsx:63-120`). Confirm this reading first:
   a real series part that has a next part always gets up-next reason `"series"` pointing at that part, so `hideNext`
   is always true wherever a next link would show. If that holds:
   - Remove the `hideNext` prop and the next link. `SeriesStep` then only renders "Previous in series". Simplify it
     (drop the `direction` branch and the right-aligned `sm:` classes) or inline it, your call.
   - Keep the "RSC Fundamentals, part 2 of 3" / "…, final part (3 of 3)" line. `isLast` still comes from the series
     itself (`series.parts[series.position]` is undefined), not from what is shown.
   - `aria-label` becomes `` `${series.name}: previous part` ``.
   - Rewrite the doc comment: the Up next card is the forward step, the nav only goes back.
   - The two-column `sm:grid-cols-2` grid now holds one item. Keep the layout sensible at 320/768/1280 (a single
     column is fine).
   If the reading doesn't hold, stop and report it instead of removing the link.
2. **`PostArticle`** (`components/posts/post-article.tsx:41-47, 106-110`): drop `upNextIsNextPart` and `hideNext`.
   The nav renders when `shownSeries && shownSeries.position > 1`, because part 1 has no way back. Update the comment.
   Keep the end as a flat list of sibling sections in the one `ReadingColumn` (Up next → newsletter → prev/next →
   related) with the order comment above it. Don't add a wrapper. Props stay `post`, `series`, `ending`.
3. **Review `components/posts/up-next.tsx` as new code** against `.claude/rules/ui.md`:
   - Tokens only, no palette classes. Only `transform`/`opacity`-type properties animate (`translate`, `scale`), plus
     the border/text colour transitions the spec accepted. Each transform is `motion-safe:`, or the element has
     `motion-reduce:transition-none`.
   - One tab stop: the title link. The cover is `decorative` and `pointer-events-none`, so check that `PostCover`
     renders no link or focusable element in that mode. The `::after` stretch makes the whole card clickable.
     `has-focus-visible:` draws the ring on the card.
   - States: `null` renders nothing. A long title and a long series name in the label wrap (`[overflow-wrap:anywhere]`)
     without horizontal overflow. The `series` reason without `series.total` falls back to "Part n". A real cover vs
     the default cover both fill the left column from `sm`.
   - Without JS it is visible: `Reveal` server-renders visible (`initial={false}`). No `<Suspense>`.
   - Look at it in a browser at 320/768/1280, light and dark, if you can (`npm run build` + `npm run start` on a free
     port, stop only your PID). Fix only real defects, and say what you changed and why.
4. **`.design/blog-refactor.md`**:
   - "Post series", the "Series nav" bullet: text link "Previous in series" only, plus the "part n of N" / "final part"
     line. Not rendered on part 1. `<nav aria-label="<name>: previous part">`. Drop the "Next" arrow and DOM-order
     sentence if it no longer applies.
   - "Up next (sprint 4)", the "Series parts, dedup decision" bullet: `hideNext` is gone. The series nav never has a
     next link, because the Up next card always takes that step. Keep the part-1 and last-part sentences accurate.
   - Change nothing else.

## Files you may change
- `components/posts/post-series.tsx`
- `components/posts/post-article.tsx`
- `components/posts/up-next.tsx` (defects found in the review only)
- `.design/blog-refactor.md` ("Post series" and "Up next (sprint 4)" sections only)

## Acceptance criteria this task serves
AC1, AC2, AC3 (series nav), AC8 (order), AC9 (no JS), AC10 (keyboard, reduced motion), AC11 (widths), AC12 (no new
client file, blog-refactor.md).

## Design constraints
Editorial look, tokens only, motion rules (`.claude/rules/ui.md`), widths 320/768/1280, light and dark, visible
without JS. No new `"use client"` file, no new dependency, no shadcn primitive needed. Don't touch `lib/`, `app/` or
`tests/`.

## Done when
- `npm run gate` exits 0.
- `grep -rn "hideNext\|previous and next part" components` returns nothing.
- The report lists what the tester should check per AC: the new nav name "RSC Fundamentals: previous part", no "Next
  in series" anywhere, no series nav on part 1, end order, the card's single tab stop and focus ring, and how to observe
  reduced motion (which element carries the lift/zoom/slide and which CSS property to read). It also says whether the
  browser check at 320/768/1280 was done.
