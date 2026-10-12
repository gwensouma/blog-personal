import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { getImageMeta, isRemoteImage } from "@/lib/data/images";
import { estimateReadingTime, extractToc, renderMarkdown } from "@/lib/markdown";
import { site } from "@/lib/site";
import { tagSlug } from "@/lib/tags";
import { yearOf } from "@/lib/format";
import { markdownToPlainText, normalizeQuery, snippetAround } from "@/lib/highlight";
import type {
  AdjacentPosts,
  ArchivePage,
  Paginated,
  Post,
  PostCover,
  PostEnding,
  PostIndexItem,
  PostSeries,
  PostSeriesRef,
  PostSummary,
  SearchHit,
  SearchOutcome,
  Tag,
  UpNext,
} from "@/types/post";

// Server-only data access. Posts are Markdown files with frontmatter in
// content/posts; swapping this for a database/CMS only changes this file.
const POSTS_DIR = path.join(process.cwd(), "content", "posts");

// Simulated network latency so loading states stay visible while learning RSC.
const LATENCY_MS = 300;
const delay = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

type RawPost = { summary: PostSummary; body: string };

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return undefined;
}

const optionalString = (value: unknown) => (value == null || value === "" ? undefined : String(value));
const optionalNumber = (value: unknown) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : undefined);

// Every post gets the default branded cover unless frontmatter sets a real one:
//
//   cover:
//     src: /images/posts/my-post.jpg   # file in public/images/posts/, or an https URL
//     alt: What the image shows         # required for real images
//     caption: Optional caption          # rendered as <figcaption>
//     credit: Photo by Jane Doe          # optional attribution, after the caption
//     width: 1600                        # local files: read automatically; remote URLs: required,
//     height: 900                        #   and the host must be listed in next.config images.remotePatterns
//
// Local files also get a blur placeholder generated here with sharp. A missing or
// unreadable local file logs an error and falls back to the default cover.
async function parseCover(value: unknown, slug: string): Promise<PostCover | undefined> {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  const src = optionalString(data.src);
  if (!src) return undefined;

  const cover: PostCover = {
    src,
    alt: String(data.alt ?? ""),
    width: optionalNumber(data.width),
    height: optionalNumber(data.height),
    caption: optionalString(data.caption),
    credit: optionalString(data.credit),
  };
  if (!cover.alt) console.warn(`[posts] "${slug}": cover.alt is empty; describe the image for screen readers.`);
  if (isRemoteImage(src)) return cover;

  try {
    const meta = await getImageMeta(src);
    return { ...cover, width: cover.width ?? meta.width, height: cover.height ?? meta.height, blurDataURL: meta.blurDataURL };
  } catch (error) {
    // Loud in the terminal, but one bad cover shouldn't take down every route: fall back to the default cover.
    console.error(`[posts] "${slug}": invalid cover, using the default cover instead.`, error);
    return undefined;
  }
}

// Series membership: `series: RSC Fundamentals` plus `seriesOrder: 2` in frontmatter.
// A series without a valid order is ignored (with a warning) rather than guessed.
function parseSeries(name: unknown, order: unknown, slug: string): PostSeriesRef | undefined {
  const seriesName = optionalString(name);
  if (!seriesName) return undefined;
  const seriesOrder = optionalNumber(order);
  if (!seriesOrder || !Number.isInteger(seriesOrder)) {
    console.warn(`[posts] "${slug}": series "${seriesName}" needs a positive integer seriesOrder; ignoring the series.`);
    return undefined;
  }
  return { name: seriesName, slug: tagSlug(seriesName), order: seriesOrder };
}

// Issue numbers: posts without a frontmatter `issue` are numbered in publication
// order (oldest = 1), skipping numbers already pinned by an override. Pin `issue`
// on a back-dated post so it doesn't renumber the posts published after it.
function assignIssues(newestFirst: RawPost[]): RawPost[] {
  const pinned = new Set<number>();
  for (const { summary } of newestFirst) {
    if (!summary.issue) continue;
    if (pinned.has(summary.issue)) console.warn(`[posts] "${summary.slug}": issue ${summary.issue} is used by another post too.`);
    pinned.add(summary.issue);
  }

  let next = 0;
  const issues = new Map<string, number>();
  for (const { summary } of [...newestFirst].reverse()) {
    if (summary.issue) continue;
    do next++;
    while (pinned.has(next));
    issues.set(summary.slug, next);
  }

  return newestFirst.map((post) =>
    post.summary.issue ? post : { ...post, summary: { ...post.summary, issue: issues.get(post.summary.slug) ?? 0 } },
  );
}

// Reads and parses every post once per request (React cache dedupes calls).
const loadAllPosts = cache(async (): Promise<RawPost[]> => {
  const files = (await readdir(POSTS_DIR)).filter((file) => file.endsWith(".md"));

  const posts = await Promise.all(
    files.map(async (file): Promise<RawPost | null> => {
      const source = await readFile(path.join(POSTS_DIR, file), "utf8");
      const { data, content } = matter(source);
      if (data.draft) return null;
      const slug = file.replace(/\.md$/, "");

      return {
        body: content,
        summary: {
          slug,
          issue: optionalNumber(data.issue) ?? 0, // 0 = auto, assigned below once every post is loaded
          title: String(data.title),
          date: toIsoDate(data.date) ?? "1970-01-01",
          updatedAt: toIsoDate(data.updatedAt),
          excerpt: String(data.excerpt ?? ""),
          tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
          readingTime: estimateReadingTime(content),
          featured: Boolean(data.featured),
          cover: await parseCover(data.cover, slug),
          series: parseSeries(data.series, data.seriesOrder, slug),
        },
      };
    }),
  );

  // Newest first.
  const sorted = posts
    .filter((post): post is RawPost => post !== null)
    .sort((a, b) => b.summary.date.localeCompare(a.summary.date) || a.summary.slug.localeCompare(b.summary.slug));
  return withSeriesTotals(assignIssues(sorted));
});

// Stamps each series ref with its part count, so lists can tell a real series from a one-part one, and
// with the name spelled as in the lowest-numbered part, so every part shows the same series title.
function withSeriesTotals(posts: RawPost[]): RawPost[] {
  const totals = new Map<string, number>();
  const first = new Map<string, PostSeriesRef>();
  for (const { summary } of posts) {
    const { series } = summary;
    if (!series) continue;
    totals.set(series.slug, (totals.get(series.slug) ?? 0) + 1);
    const current = first.get(series.slug);
    if (!current || series.order < current.order) first.set(series.slug, series);
  }
  return posts.map((post) => {
    const series = post.summary.series;
    if (!series) return post;
    const name = first.get(series.slug)?.name ?? series.name;
    return { ...post, summary: { ...post.summary, series: { ...series, name, total: totals.get(series.slug) } } };
  });
}

/** All published posts, newest first. Optionally filtered by tag slug. */
export async function getPosts(options: { tag?: string } = {}): Promise<PostSummary[]> {
  await delay();
  const summaries = (await loadAllPosts()).map((post) => post.summary);
  if (!options.tag) return summaries;
  return summaries.filter((post) => post.tags.some((tag) => tagSlug(tag) === options.tag));
}

/** Slug, title and tags of every post, newest first: the command palette's client-side index. */
export async function getPostIndex(): Promise<PostIndexItem[]> {
  const posts = await getPosts();
  return posts.map(({ slug, title, tags }) => ({ slug, title, tags }));
}

/** One page of posts (1-based). Out-of-range pages return an empty `items`. */
export async function getPaginatedPosts(page: number, perPage: number = site.postsPerPage): Promise<Paginated<PostSummary>> {
  const all = await getPosts();
  const totalPages = Math.max(1, Math.ceil(all.length / perPage));
  const start = (page - 1) * perPage;
  return { items: all.slice(start, start + perPage), page, totalPages, totalItems: all.length };
}

/** One archive page (1-based) plus per-year totals and whether its first year continues from the previous page. */
export async function getArchivePage(page: number, perPage: number = site.postsPerPage): Promise<ArchivePage> {
  // Both calls read the same per-request cached post list.
  const [pageResult, all] = await Promise.all([getPaginatedPosts(page, perPage), getPosts()]);
  const { items } = pageResult;
  const start = (page - 1) * perPage;

  // A real database would answer this with one GROUP BY instead of a scan.
  const yearCounts: Record<string, number> = {};
  for (const post of all) {
    const year = yearOf(post.date);
    yearCounts[year] = (yearCounts[year] ?? 0) + 1;
  }

  // Newest first: the previous page's last post is the one right before this page's first.
  const before = start > 0 ? all[start - 1] : undefined;
  const firstYear = items[0] ? yearOf(items[0].date) : null;
  const continuedYear = before && firstYear && yearOf(before.date) === firstYear ? firstYear : null;

  return { ...pageResult, yearCounts, continuedYear };
}

export async function getFeaturedPost(): Promise<PostSummary | null> {
  const posts = await getPosts();
  return posts.find((post) => post.featured) ?? posts[0] ?? null;
}

/** Full post with rendered HTML and table of contents. Cached per request so
 * generateMetadata and the page share one fetch. */
export const getPost = cache(async (slug: string): Promise<Post | null> => {
  await delay();
  const raw = (await loadAllPosts()).find((post) => post.summary.slug === slug);
  if (!raw) return null;

  return { ...raw.summary, content: await renderMarkdown(raw.body), toc: extractToc(raw.body) };
});

const RELATED_LIMIT = 3;

// The slug of the post's series when it is a real one (2+ parts), else null. A one-part "series" has nothing
// to navigate to, so it neither links parts nor hides them from the other end-of-post blocks.
function realSeriesSlug(post: PostSummary): string | null {
  return post.series && (post.series.total ?? 0) > 1 ? post.series.slug : null;
}

// Every part of a series, in reading order (seriesOrder, then date as a tie-break).
function seriesPartsOf(posts: PostSummary[], seriesSlug: string): PostSummary[] {
  return posts
    .filter((post) => post.series?.slug === seriesSlug)
    .sort((a, b) => a.series!.order - b.series!.order || a.date.localeCompare(b.date));
}

// Posts sharing at least one tag with `current`, most shared tags first (ties keep newest-first order),
// excluding `current` itself and the other parts of its real series. Not capped: callers slice.
function rankRelated(posts: PostSummary[], current: PostSummary): PostSummary[] {
  const currentTags = new Set(current.tags.map(tagSlug));
  const seriesSlug = realSeriesSlug(current);
  return posts
    .filter((post) => post.slug !== current.slug && (!seriesSlug || post.series?.slug !== seriesSlug))
    .map((post) => ({ post, shared: post.tags.filter((tag) => currentTags.has(tagSlug(tag))).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .map(({ post }) => post);
}

/** Posts sharing the most tags with the given one, excluding itself and the other parts of its series. */
export async function getRelatedPosts(slug: string, limit = RELATED_LIMIT): Promise<PostSummary[]> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const current = posts.find((post) => post.slug === slug);
  return current ? rankRelated(posts, current).slice(0, limit) : [];
}

/**
 * Everything the end of a post links to, in one pass over the post list.
 *
 * `upNext`, first matching rule wins:
 *   1. a real series (2+ parts) and not the last part → the next part ("series");
 *   2. else the top related post ("related"; related never holds parts of the post's own series). When that post
 *      is a part of another real series, the pick is that series' part 1 instead (still "related");
 *   3. else the newer chronological neighbour ("newer"), else the older one ("older"), skipping series parts;
 *   4. else null.
 *
 * Then a post appears at most once, priority upNext > adjacent > related: an adjacent slot is null when its
 * post is a part of the current series or the up-next pick, and related drops the up-next pick and both
 * adjacent posts before taking the top RELATED_LIMIT (so the list stays full when there are enough candidates).
 * An unknown slug returns an empty ending.
 */
export async function getPostEnding(slug: string): Promise<PostEnding> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return { upNext: null, adjacent: { previous: null, next: null }, related: [] };
  const current = posts[index];

  const seriesSlug = realSeriesSlug(current);
  const parts = seriesSlug ? seriesPartsOf(posts, seriesSlug) : [];
  const isSeriesPart = (post: PostSummary | undefined) => !!post && parts.some((part) => part.slug === post.slug);

  // List is newest first: the newer post sits before, the older one after. Series parts are left to the series nav.
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const chronological: AdjacentPosts = {
    next: newer && !isSeriesPart(newer) ? newer : null,
    previous: older && !isSeriesPart(older) ? older : null,
  };
  const ranked = rankRelated(posts, current);

  const nextPart = parts[parts.findIndex((part) => part.slug === slug) + 1];
  // A related pick inside another real series starts the reader at that series' part 1, not mid-way.
  const topRelatedSeries = ranked[0] && realSeriesSlug(ranked[0]);
  const topRelatedStart = topRelatedSeries ? seriesPartsOf(posts, topRelatedSeries)[0] : undefined;
  const relatedPick = topRelatedStart && topRelatedStart.slug !== slug ? topRelatedStart : ranked[0];
  const upNext: UpNext | null = nextPart
    ? { post: nextPart, reason: "series" }
    : relatedPick
      ? { post: relatedPick, reason: "related" }
      : chronological.next
        ? { post: chronological.next, reason: "newer" }
        : chronological.previous
          ? { post: chronological.previous, reason: "older" }
          : null;

  const notUpNext = (post: PostSummary | null) => (post && post.slug !== upNext?.post.slug ? post : null);
  const adjacent: AdjacentPosts = { next: notUpNext(chronological.next), previous: notUpNext(chronological.previous) };

  const taken = new Set([upNext?.post.slug, adjacent.next?.slug, adjacent.previous?.slug]);
  const related = ranked.filter((post) => !taken.has(post.slug)).slice(0, RELATED_LIMIT);

  return { upNext, adjacent, related };
}

/** The series the given post belongs to, with every part in reading order, or null. */
export async function getPostSeries(slug: string): Promise<PostSeries | null> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const current = posts.find((post) => post.slug === slug)?.series;
  if (!current) return null;

  const parts = seriesPartsOf(posts, current.slug);
  const orders = parts.map((post) => post.series!.order);
  if (new Set(orders).size !== orders.length) {
    warnOnce(`series:${current.slug}`, `[posts] series "${current.name}" has duplicate seriesOrder values: ${orders.join(", ")}.`);
  }

  // `current.name` is already normalized to part 1's spelling by withSeriesTotals.
  return { name: current.name, slug: current.slug, parts, position: parts.findIndex((post) => post.slug === slug) + 1 };
}

// Content warnings fire on every request for dynamic routes; log each one once per process.
const warned = new Set<string>();
function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

/** Every tag with its post count, most used first. */
export async function getAllTags(): Promise<Tag[]> {
  const counts = new Map<string, Tag>();
  for (const { summary } of await loadAllPosts()) {
    for (const name of summary.tags) {
      const slug = tagSlug(name);
      const existing = counts.get(slug);
      counts.set(slug, { slug, name, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getTag(slug: string): Promise<Tag | null> {
  return (await getAllTags()).find((tag) => tag.slug === slug) ?? null;
}

/**
 * /search with an optional tag filter. The query is trimmed and capped at MAX_QUERY_LENGTH. Facets count the
 * tags of every query match (before the tag filter), so the chips show where else the query appears. With no
 * query, a known tag alone lists that tag's posts.
 */
export async function searchPostsWithFacets(rawQuery: string, rawTag?: string): Promise<SearchOutcome> {
  const query = normalizeQuery(rawQuery);
  const q = query.toLowerCase();
  await delay();
  const all = await loadAllPosts();
  const tag = rawTag ? ((await getAllTags()).find((t) => t.slug === rawTag) ?? null) : null;
  if (!q && !tag) return { query, tag, hits: [], facets: [] };

  // Match only text a reader can see in the result (title, excerpt, one tag, the body as plain text),
  // so every hit can show why it matched.
  const has = (text: string) => text.toLowerCase().includes(q);
  const candidates = all.map((post) => ({ ...post, plain: markdownToPlainText(post.body) }));
  const matches = q
    ? candidates.filter(({ summary, plain }) => has(summary.title) || has(summary.excerpt) || summary.tags.some(has) || has(plain))
    : candidates;

  const counts = new Map<string, Tag>();
  for (const { summary } of matches) {
    for (const name of summary.tags) {
      const slug = tagSlug(name);
      counts.set(slug, { slug, name, count: (counts.get(slug)?.count ?? 0) + 1 });
    }
  }
  const facets = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const hits: SearchHit[] = matches
    .filter(({ summary }) => !tag || summary.tags.some((name) => tagSlug(name) === tag.slug))
    .map(({ summary, plain }) => {
      const inSummary = has(summary.title) || has(summary.excerpt) || summary.tags.some(has);
      const snippet = q && !inSummary ? (snippetAround(plain, query) ?? undefined) : undefined;
      return { post: summary, snippet };
    });

  return { query, tag, hits, facets };
}
