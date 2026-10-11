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

- `q`: first value if repeated, trimmed, capped at `MAX_QUERY_LENGTH` (100, `lib/highlight.ts`) in the page
  (metadata title too), in the data function, and via `maxLength` on the input.
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
- If the active tag has no matches for the query, it is still listed (count 0) so the state stays visible.

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
- No results: shared empty state; with an active tag the action is "Clear the topic filter" (same query, no
  tag), otherwise "Browse the archive".
