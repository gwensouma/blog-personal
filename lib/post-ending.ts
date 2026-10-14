import { tagSlug } from "@/lib/tags";
import type { AdjacentPosts, PostEnding, PostSummary, UpNext } from "@/types/post";

// Pure end-of-post logic: no React, no I/O. lib/data/posts.ts loads the post list and delegates here,
// so the rules can be unit-tested with a fixture list.

export const RELATED_LIMIT = 3;

// The slug of the post's series when it is a real one (2+ parts), else null. A one-part "series" has nothing
// to navigate to, so it neither links parts nor hides them from the other end-of-post blocks.
export function realSeriesSlug(post: PostSummary): string | null {
  return post.series && (post.series.total ?? 0) > 1 ? post.series.slug : null;
}

// Every part of a series, in reading order (seriesOrder, then date as a tie-break).
export function seriesPartsOf(posts: PostSummary[], seriesSlug: string): PostSummary[] {
  return posts
    .filter((post) => post.series?.slug === seriesSlug)
    .sort((a, b) => a.series!.order - b.series!.order || a.date.localeCompare(b.date));
}

// Posts sharing at least one tag with `current`, most shared tags first (ties keep the input order, newest
// first), excluding `current` itself and the other parts of its real series. Not capped: callers slice.
export function rankRelated(posts: PostSummary[], current: PostSummary): PostSummary[] {
  const currentTags = new Set(current.tags.map(tagSlug));
  const seriesSlug = realSeriesSlug(current);
  return posts
    .filter((post) => post.slug !== current.slug && (!seriesSlug || post.series?.slug !== seriesSlug))
    .map((post) => ({ post, shared: post.tags.filter((tag) => currentTags.has(tagSlug(tag))).length }))
    .filter(({ shared }) => shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .map(({ post }) => post);
}

/**
 * Everything the end of the post `slug` links to, decided in one pass over `posts`.
 *
 * Precondition: `posts` is newest first and every `series.total` is already stamped (as `loadAllPosts` in
 * lib/data/posts.ts delivers it). A post without `series.total` counts as outside any real series.
 *
 * `upNext`, first matching rule wins:
 *   1. a real series (2+ parts) and not the last part → the next part ("series");
 *   2. else the top related post ("related"; related never holds parts of the post's own series). When that post
 *      is a part of another real series, the pick is that series' part 1 instead (still "related");
 *   3. else the newer chronological neighbour ("newer"), else the older one ("older"), skipping parts of the
 *      post's own series;
 *   4. else null.
 *
 * Then a post appears at most once, priority upNext > adjacent > related: an adjacent slot is null when its
 * post is a part of the current series or the up-next pick, and related drops the up-next pick and both
 * adjacent posts before taking the top RELATED_LIMIT (so the list stays full when there are enough candidates).
 *
 * An unknown slug returns the empty ending `{ upNext: null, adjacent: { previous: null, next: null }, related: [] }`.
 */
export function decidePostEnding(posts: PostSummary[], slug: string): PostEnding {
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
  // Guard only: with consistent totals rankRelated already drops the current post's own series, so its part 1
  // can't be the current post. It still stops a self-recommendation if a hand-made list has mismatched totals.
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
