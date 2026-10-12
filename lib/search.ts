// Pure URL helper for /search, shared by the filter chips and the empty state.

/** `/search?q=…&tag=…`, URL-encoded; empty values are left out. */
export function searchHref(query: string, tag?: string | null): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (tag) params.set("tag", tag);
  const search = params.toString();
  return search ? `/search?${search}` : "/search";
}
