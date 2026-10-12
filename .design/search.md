# Search (`/search?q=…&tag=…`) — Sprint 7

## Principle: Suspense only around non-essential or JS-dependent content

On this site a `<Suspense>` boundary's streamed content arrives as a `hidden` div that an inline
script swaps in. Without JavaScript only the fallback is ever visible. So:

- **Essential content renders inline** (awaited in the page, part of the initial HTML). Search results
  are essential, so `/search` no longer wraps them in `<Suspense key={query}>`; the
  `SearchResultsLoader` pattern is gone.
- `<Suspense>` stays fine for non-essential extras (view counts, related posts) or content that needs JS
  anyway.
- Don't add `app/(blog)/search/loading.tsx` either: it is an implicit Suspense boundary around the page.
- Trade-off: a new query (client navigation via `next/form`) shows no skeleton; the previous results stay
  until the new page arrives. A pending indicator would need a small client leaf (`useFormStatus`) — left
  out for now.

## Query and tag

- `q`: first value if repeated, then `normalizeQuery` (`lib/highlight.ts`: strips `\p{Cf}` format characters,
  trims, caps at `MAX_QUERY_LENGTH` = 100) in the page, the metadata title and the data function; `maxLength`
  on the input. The input is uncontrolled and keyed by the query, so it re-mounts after client navigation/Back.
- `tag`: first value; unknown slugs resolve to `null` and are ignored. An active tag is preserved across a
  new query by a hidden `<input name="tag">` in `PostSearchForm`.

## Topic chips (`components/posts/search-filters.tsx`)

- `<nav aria-label="Filter by topic">` + `ul` of links, wrapping (`flex-wrap gap-2`) on mobile. Shown under
  the form whenever there is a query or an active tag.
- Chips are shadcn `Button size="sm"` rendered as `Link` (`nativeButton={false}`), `rounded-full`, so they
  read as pills but have a 28px target — larger than `Badge`. Inactive: `outline`; active: `default`
  (solid primary).
- Each chip is `/search?q=<q>&tag=<slug>` built with `URLSearchParams` (`lib/search.ts`). "All" drops the tag.
- The chip whose URL is the current page has `aria-current="page"` (links, so not `aria-pressed`). Counts are
  facet counts before the tag filter, with an sr-only "results" suffix.
- Facets are real counts (every topic in tag-only mode), so the active tag is only missing when the query
  has no matches in it; then it is still listed with a true count of 0 so the state stays visible.
- Chip wall height: only the top 6 topics (facet order, most frequent first) show up front, plus the active
  one if it ranks lower. The rest sit in a native `<details>` ("More topics (N)", ghost pill summary, chevron
  rotates, works without JS). Chose `<details>` over a "/tags" link so the extra chips keep the query.
- Accessible names: chips carry `aria-label="Performance, 3 results"` (starts with the visible text). An
  sr-only comma is positioned absolutely, which adds a stray space ("Performance , 3 results").

## Highlighting (`components/posts/highlighted-text.tsx`)

- `splitMatches` → React text nodes and `<mark>`; never `dangerouslySetInnerHTML`, so queries like
  `<script>` render escaped.
- Mark style: `bg-primary/15 text-current rounded-sm px-0.5`, `box-decoration-break: clone` for wrapped
  lines. `text-current` keeps the title's hover color. Supplementary only (the status line carries the info).
- Marks appear in the title and excerpt. When a hit matched only in the body, the `snippet` shows under the
  excerpt with a hairline left rule (`border-l-2 border-border`), marked matches in `text-foreground`, and an
  sr-only "Matched in the post:" prefix.
- Implemented as optional `highlight`/`snippet` props on `PostListItem`; other callers are unaffected.

## Status and empty states

- `role="status"` line: "3 results for “suspense” in Server Components"; tag only: "2 posts in Server Components".
- No query and no (known) tag: the "Search the journal" prompt.
- No results: shared empty state. "Clear the topic filter" (same query, no tag) only when a tag is active and
  the query matches elsewhere (`facets.length > 0`); otherwise the no-tag copy and "Browse the archive".
