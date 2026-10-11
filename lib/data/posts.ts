import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { getImageMeta, isRemoteImage } from "@/lib/data/images";
import { estimateReadingTime, extractToc, renderMarkdown } from "@/lib/markdown";
import { site } from "@/lib/site";
import { tagSlug } from "@/lib/tags";
import type { AdjacentPosts, Paginated, Post, PostCover, PostIndexItem, PostSeries, PostSeriesRef, PostSummary, Tag } from "@/types/post";

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

export async function getAdjacentPosts(slug: string): Promise<AdjacentPosts> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const index = posts.findIndex((post) => post.slug === slug);
  if (index === -1) return { previous: null, next: null };
  // List is newest first: the next (newer) post sits before, the previous (older) one after.
  return { next: posts[index - 1] ?? null, previous: posts[index + 1] ?? null };
}

/** Posts sharing the most tags with the given one, excluding itself and the other parts of its series. */
export async function getRelatedPosts(slug: string, limit = 3): Promise<PostSummary[]> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const current = posts.find((post) => post.slug === slug);
  if (!current) return [];
  const currentTags = new Set(current.tags.map(tagSlug));
  // Other parts of a real series are already linked by the series box, so leave room for different posts.
  const seriesSlug = current.series && (current.series.total ?? 0) > 1 ? current.series.slug : null;

  return posts
    .filter((post) => post.slug !== slug && (!seriesSlug || post.series?.slug !== seriesSlug))
    .map((post) => ({ post, shared: post.tags.filter((tag) => currentTags.has(tagSlug(tag))).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map(({ post }) => post);
}

/** The series the given post belongs to, with every part in reading order, or null. */
export async function getPostSeries(slug: string): Promise<PostSeries | null> {
  const posts = (await loadAllPosts()).map((post) => post.summary);
  const current = posts.find((post) => post.slug === slug)?.series;
  if (!current) return null;

  const parts = posts
    .filter((post) => post.series?.slug === current.slug)
    .sort((a, b) => a.series!.order - b.series!.order || a.date.localeCompare(b.date));
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

/** Case-insensitive search over title, excerpt, tags and body. */
export async function searchPosts(query: string): Promise<PostSummary[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  await delay();
  return (await loadAllPosts())
    .filter(({ summary, body }) =>
      [summary.title, summary.excerpt, summary.tags.join(" "), body].some((text) => text.toLowerCase().includes(q)),
    )
    .map((post) => post.summary);
}
