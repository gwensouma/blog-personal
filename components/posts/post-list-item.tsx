import Link from "next/link";
import { StaggerItem } from "@/components/motion/stagger";
import { HighlightedText } from "@/components/posts/highlighted-text";
import { PostCover } from "@/components/posts/post-cover";
import { PostMeta } from "@/components/posts/post-meta";
import {
  PostRowAccent,
  postRowClassName,
  postRowCoverClassName,
  postRowLinkClassName,
} from "@/components/posts/post-row-accent";
import { hasSeriesMarker, PostSeriesMarker } from "@/components/posts/post-series";
import { PostTags } from "@/components/posts/post-tags";
import { enterStaggerClassName, enterStaggerStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

type PostListItemProps = {
  post: PostSummary;
  /** Match the surrounding outline: h2 under a page h1, h3 under a section h2. */
  headingLevel?: "h2" | "h3";
  /** Position in the list: staggers the CSS first-load entrance. */
  index?: number;
  /** Search query to mark in the title and excerpt (used by /search). */
  highlight?: string;
  /** Body text around a match, shown under the excerpt with the query marked (used by /search). */
  snippet?: string;
};

// Only the title is a link; its ::after stretches over the whole row (cover
// included) so the row stays clickable without screen readers announcing the
// entire card. The cover thumbnail is decorative and only shows from `sm` up;
// on phones the title gets the full width.
// The <li> is a StaggerItem (client) so the row can reveal on scroll; everything
// inside it is still rendered here, on the server. The hover shift lives on the
// inner div because motion owns the <li>'s transform.
// On first load the inner div also plays a CSS staggered entrance (before hydration),
// so rows already on screen get the same energy as rows revealed on scroll.
export function PostListItem({ post, headingLevel: Heading = "h2", index = 0, highlight, snippet }: PostListItemProps) {
  return (
    <StaggerItem className="border-b border-border">
      <div
        className={cn(postRowClassName, enterStaggerClassName, "py-8 sm:grid sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-x-8")}
        style={enterStaggerStyle(index)}
      >
        <PostRowAccent arrowClassName="top-9 sm:right-48" />
        <div className="flex min-w-0 flex-col gap-2.5">
          <PostMeta post={post}>{hasSeriesMarker(post.series) ? <PostSeriesMarker series={post.series} /> : null}</PostMeta>
          <Heading className="pr-8 font-heading text-2xl leading-snug font-semibold text-balance [overflow-wrap:anywhere]">
            <Link href={`/posts/${post.slug}`} className={postRowLinkClassName}>
              <HighlightedText text={post.title} query={highlight} />
            </Link>
          </Heading>
          <p className="max-w-[58ch] text-base leading-relaxed text-muted-foreground">
            <HighlightedText text={post.excerpt} query={highlight} />
          </p>
          {snippet ? (
            <p className="max-w-[58ch] border-l-2 border-border pl-3 text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
              <span className="sr-only">Matched in the post: </span>
              <HighlightedText text={snippet} query={highlight} className="text-foreground" />
            </p>
          ) : null}
          <PostTags tags={post.tags} className="mt-1" />
        </div>
        <PostCover
          post={post}
          variant={index}
          aspect="4/3"
          size="thumb"
          decorative
          contentClassName={postRowCoverClassName}
          className="pointer-events-none mt-1 hidden self-start sm:block"
        />
      </div>
    </StaggerItem>
  );
}
