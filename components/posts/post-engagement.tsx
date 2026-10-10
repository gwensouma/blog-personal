import { headers } from "next/headers";
import { after } from "next/server";
import { LikeButton } from "@/components/posts/like-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPostStats, recordView } from "@/lib/data/engagement";

// Async Server Components for the per-visitor, per-request parts of a post: the
// view count in the header meta and the like button in the footer. Each sits in its
// own <Suspense> (see PostArticle), so the article streams first and these fill in.
//
// RSC trade-off: getPostStats reads a cookie (which posts this visitor liked), and a
// cookie read opts the whole route into dynamic rendering. Next 15 stable has no
// Partial Prerendering, so /posts/[slug] is now rendered per request instead of being
// prerendered at build time. generateStaticParams + dynamicParams = false still turn
// unknown slugs into 404s. See .design/blog-refactor.md, "Features (Phase 4)".

/** "123 views". Also records this page load as a view, after the response is sent. */
export async function PostViews({ slug }: { slug: string }) {
  const [{ views }, requestHeaders] = await Promise.all([getPostStats(slug), headers()]);

  // Only a real page load counts. Server Components can't see the HTTP method, so
  // other requests are recognised by their headers:
  // - Server Actions with JS (the like button sets a cookie, so Next re-renders the page
  //   in the action response) carry `Next-Action`;
  // - a no-JS form POST (the newsletter form) carries a body, so it has a `Content-Type`
  //   (multipart/form-data or application/x-www-form-urlencoded); GET page loads don't;
  // - router prefetches carry `Next-Router-Prefetch`.
  const isPageLoad =
    !requestHeaders.has("next-action") && !requestHeaders.has("content-type") && !requestHeaders.has("next-router-prefetch");
  if (isPageLoad) {
    after(() => recordView(slug));
  }

  return (
    <span className="tabular-nums">
      {views.toLocaleString("en-US")} {views === 1 ? "view" : "views"}
    </span>
  );
}

export function PostViewsSkeleton() {
  return <Skeleton aria-hidden="true" className="inline-block h-4 w-16 align-middle" />;
}

/** Reads the counts and the visitor's like, then hands them to the client LikeButton. */
export async function PostLike({ slug }: { slug: string }) {
  const stats = await getPostStats(slug);
  return <LikeButton slug={slug} initialStats={stats} />;
}

export function PostLikeSkeleton() {
  return <Skeleton aria-hidden="true" className="h-10 w-28 rounded-full" />;
}
