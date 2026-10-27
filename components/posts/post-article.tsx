import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { CommentSection } from "@/components/comments/comment-section";
import { ReadingColumn } from "@/components/reading-column";
import { Reveal } from "@/components/motion/reveal";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { NewsletterSection } from "@/components/newsletter/newsletter-section";
import { PostAdjacentNav } from "@/components/posts/post-adjacent-nav";
import { PostBody } from "@/components/posts/post-body";
import { PostCover } from "@/components/posts/post-cover";
import { PostLike, PostLikeSkeleton, PostViews, PostViewsSkeleton } from "@/components/posts/post-engagement";
import { PostMeta } from "@/components/posts/post-meta";
import { PostSeriesBox, PostSeriesNav } from "@/components/posts/post-series";
import { PostShare } from "@/components/posts/post-share";
import { PostTags } from "@/components/posts/post-tags";
import { PostToc } from "@/components/posts/post-toc";
import { RelatedPosts } from "@/components/posts/related-posts";
import { UpNext } from "@/components/posts/up-next";
import { buttonVariants } from "@/components/ui/button";
import { linkSweepClassName } from "@/lib/motion";
import { absoluteUrl, site } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/comment";
import type { Post, PostEnding, PostSeries } from "@/types/post";

type PostArticleProps = {
  post: Post;
  /** The series this post belongs to, or null. */
  series: PostSeries | null;
  /** The end-of-post links, already deduped by getPostEnding (lib/data/posts.ts). */
  ending: PostEnding;
  /** Visible comments, oldest first (getComments). */
  comments: Comment[];
};

// Server Component: renders a full post. Client leaves: LikeButton, the
// copy-link and code-copy buttons, the comment and newsletter forms, the TOC scroll-spy, the
// reading progress bar and the scroll-reveal wrappers (which only pass
// server-rendered children through).
// The view count and the like button are per-visitor data behind their own
// <Suspense>: the article streams first and they fill in (see post-engagement.tsx).
// Comments are essential content: the count in the meta and the section render inline, no boundary.
export function PostArticle({ post, series, ending, comments }: PostArticleProps) {
  const hasToc = post.toc.length > 0;
  // A one-part "series" has nothing to navigate to yet.
  const shownSeries = series && series.parts.length > 1 ? series : null;
  const { adjacent, upNext } = ending;

  return (
    <div className="flex flex-col gap-16">
      <ScrollProgress targetId="post-article" />
      {/* On xl screens the reading column stays centered and the TOC sits in the right gutter. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,45rem)_minmax(0,1fr)] xl:gap-x-12">
        <article id="post-article" className="mx-auto w-full max-w-180 min-w-0 xl:col-start-2 xl:row-start-1 xl:max-w-none">
          <Link href="/posts" className={buttonVariants({ variant: "link", className: "mb-10 px-0" })}>
            <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
            All posts
          </Link>

          <header className="flex flex-col gap-5 border-b border-border pb-10">
            <PostMeta post={post} showUpdated>
              <Suspense fallback={<PostViewsSkeleton />}>
                <PostViews slug={post.slug} />
              </Suspense>
              <span aria-hidden="true">·</span>
              <a
                href="#comments"
                className="rounded-sm tabular-nums underline-offset-4 outline-none transition-colors duration-200 hover:text-primary hover:underline focus-visible:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
              >
                {`${comments.length.toLocaleString("en-US")} ${comments.length === 1 ? "comment" : "comments"}`}
              </a>
            </PostMeta>
            <h1 className="font-heading text-4xl leading-tight font-semibold text-balance [overflow-wrap:anywhere] sm:text-5xl">
              {post.title}
            </h1>
            <p className="max-w-[52ch] text-xl leading-relaxed text-muted-foreground">{post.excerpt}</p>
            <p className="text-sm text-muted-foreground">
              By{" "}
              <Link
                href={site.author.url}
                rel="author"
                className={linkSweepClassName}
              >
                {site.author.name}
              </Link>
              , {site.author.role.toLowerCase()}
            </p>
            <PostTags tags={post.tags} />
          </header>

          {/* A real cover is content (figure + caption); the default one is decoration. */}
          {post.cover ? (
            <figure className="mt-10 flex flex-col gap-3">
              <PostCover post={post} aspect="2/1" size="hero" priority />
              {post.cover.caption || post.cover.credit ? (
                <figcaption className="text-sm text-muted-foreground">
                  {[post.cover.caption, post.cover.credit].filter(Boolean).join(" · ")}
                </figcaption>
              ) : null}
            </figure>
          ) : (
            // The default cover is a shorter 3/1 band: an identical placeholder shouldn't push the body down.
            <PostCover post={post} aspect="3/1" size="hero" priority className="mt-10" />
          )}

          {/* Orientation before reading: where this post sits in its series. */}
          {shownSeries ? <PostSeriesBox series={shownSeries} className="mt-10" /> : null}

          {hasToc ? <PostToc toc={post.toc} variant="inline" className={cn("xl:hidden", shownSeries ? "mt-4" : "mt-10")} /> : null}

          <PostBody content={post.content} className="mt-10" />

          {/* The Up next card is the forward step at the end (the next part, when there is one), so the
              series nav only goes back, and part 1 has no way back. */}
          {shownSeries && shownSeries.position > 1 ? (
            <Reveal className="mt-16">
              <PostSeriesNav series={shownSeries} />
            </Reveal>
          ) : null}

          <footer className="mt-16 flex flex-col gap-8 border-t border-border pt-8 sm:flex-row sm:items-end sm:justify-between">
            {/* The interactive part is isolated in a small Client Component; its server
                wrapper reads the stats. */}
            <Suspense fallback={<PostLikeSkeleton />}>
              <PostLike slug={post.slug} />
            </Suspense>
            <PostShare url={absoluteUrl(`/posts/${post.slug}`)} title={post.title} />
          </footer>
        </article>

        {hasToc ? (
          <aside className="hidden xl:col-start-3 xl:row-start-1 xl:block xl:max-w-56">
            <PostToc toc={post.toc} variant="aside" />
          </aside>
        ) : null}
      </div>

      <ReadingColumn className="flex flex-col gap-16">
        {/* One reading path: the conversation about this post, then the single recommended next read,
            the newsletter, then more to browse. getPostEnding already deduped these: a post appears at
            most once below. */}
        <CommentSection slug={post.slug} comments={comments} />
        <UpNext upNext={upNext} />
        <NewsletterSection />
        {/* Skip the wrapper when both slots are empty, so it doesn't leave an extra gap. */}
        {adjacent.previous || adjacent.next ? (
          <Reveal>
            <PostAdjacentNav adjacent={adjacent} />
          </Reveal>
        ) : null}
        <RelatedPosts posts={ending.related} />
      </ReadingColumn>
    </div>
  );
}
