import type { Root } from "hast";

/** A real cover image set in frontmatter. Posts without one get the default
 * branded cover (components/posts/post-cover.tsx) instead. */
export type PostCover = {
  /** Path under public/ (e.g. "/images/posts/x.jpg") or an absolute https URL. */
  src: string;
  alt: string;
  /** Intrinsic size; read from the file for local images, required for remote ones. */
  width?: number;
  height?: number;
  caption?: string;
  /** Attribution line, e.g. "Photo: Jane Doe / Unsplash". */
  credit?: string;
  /** Tiny base64 preview generated on the server (local images only). */
  blurDataURL?: string;
};

/** Lightweight shape used by lists, cards, feeds and prev/next links. */
export type PostSummary = {
  slug: string;
  /** Issue number: publication order (oldest post = 1), or the frontmatter `issue` override.
   * The default cover prints it ("No. 04") and rotates its look on it. */
  issue: number;
  title: string;
  /** ISO calendar date, e.g. "2026-08-10". */
  date: string;
  /** ISO calendar date of the last meaningful edit, if any. */
  updatedAt?: string;
  excerpt: string;
  tags: string[];
  /** Estimated minutes to read, derived from the word count. */
  readingTime: number;
  featured: boolean;
  cover?: PostCover;
  /** Set when frontmatter has `series:`; `order` comes from `seriesOrder:` (1-based). */
  series?: PostSeriesRef;
};

/** A post's membership in a series, as stored on the post itself. */
export type PostSeriesRef = {
  name: string;
  /** URL-safe slug of the series name. */
  slug: string;
  order: number;
  /** Number of parts in the series, set once every post is loaded. */
  total?: number;
};

/** A whole series as seen from one of its posts. */
export type PostSeries = {
  name: string;
  slug: string;
  /** Every part, in reading order (seriesOrder ascending). */
  parts: PostSummary[];
  /** 1-based position of the current post in `parts`. */
  position: number;
};

export type TocItem = {
  id: string;
  text: string;
  /** 2 for h2, 3 for h3. */
  depth: 2 | 3;
};

export type Post = PostSummary & {
  /** Rendered, trusted content as a hast tree from lib/markdown.ts; the post page renders it to React elements on the server. */
  content: Root;
  toc: TocItem[];
};

export type Tag = {
  slug: string;
  name: string;
  count: number;
};

export type AdjacentPosts = {
  /** The older post (published before this one). */
  previous: PostSummary | null;
  /** The newer post (published after this one). */
  next: PostSummary | null;
};

/** Why a post was picked as the "Up next" recommendation (the first matching rule wins). */
export type UpNextReason = "series" | "related" | "newer" | "older";

export type UpNext = { post: PostSummary; reason: UpNextReason };

/**
 * Everything the end of a post links to, decided once on the server by decidePostEnding
 * (lib/post-ending.ts, via getPostEnding in lib/data/posts.ts). A post appears at most once
 * across `upNext`, `adjacent` and `related` (priority in that order), and the other parts of a real series
 * (2+ parts) never appear in `adjacent` or `related`, because the series nav already links them.
 */
export type PostEnding = {
  /** The single recommended next read, or null when there is nothing to recommend. A "related" pick that belongs
   * to another real series is that series' part 1. */
  upNext: UpNext | null;
  /** Chronological neighbours; a slot is null when its post is a part of this post's own real series or
   * already the up-next pick. */
  adjacent: AdjacentPosts;
  /** Posts sharing the most tags, without the up-next pick or the adjacent posts. */
  related: PostSummary[];
};

export type Paginated<T> = {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
};

/** Minimal post entry for the client-side command palette (kept small: it ships in the RSC payload). */
export type PostIndexItem = Pick<PostSummary, "slug" | "title" | "tags">;

/** One page of the archive, with what the year headings need beyond the page itself. */
export type ArchivePage = Paginated<PostSummary> & {
  /** Posts per year across the whole archive (not just this page), keyed by "2026". */
  yearCounts: Record<string, number>;
  /** The year of this page's first post when that year already started on the previous page, else null. */
  continuedYear: string | null;
};

/** One /search hit: the post plus a body snippet when the match is only in the post text. */
export type SearchHit = {
  post: PostSummary;
  /** Plain text around the first body match; absent when the title, excerpt or a tag already matches. */
  snippet?: string;
};

/** Everything /search renders: the hits after the tag filter, and tag chips counted before it. */
export type SearchOutcome = {
  query: string;
  /** Tag slug of the active filter, or null. Unknown slugs are dropped, not errors. */
  tag: Tag | null;
  hits: SearchHit[];
  /** Tags among the query's matches (before the tag filter), most frequent first. */
  facets: Tag[];
};
