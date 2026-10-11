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
