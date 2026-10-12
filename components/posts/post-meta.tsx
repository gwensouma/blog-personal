import { PostDate } from "@/components/posts/post-date";
import { formatReadingTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

type PostMetaProps = {
  post: Pick<PostSummary, "date" | "updatedAt" | "readingTime">;
  showUpdated?: boolean;
  className?: string;
  /** Extra trailing item (e.g. the streamed view count on the post page), after a separator. */
  children?: React.ReactNode;
};

// Date, optional "updated" date and reading time, as one quiet line.
export function PostMeta({ post, showUpdated = false, className, children }: PostMetaProps) {
  const updated = showUpdated && post.updatedAt && post.updatedAt !== post.date ? post.updatedAt : null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm tracking-wide text-muted-foreground", className)}>
      <PostDate date={post.date} />
      {updated ? (
        <>
          <span aria-hidden="true">·</span>
          <span>
            Updated <PostDate date={updated} />
          </span>
        </>
      ) : null}
      <span aria-hidden="true">·</span>
      <span>{formatReadingTime(post.readingTime)}</span>
      {/* One flex item, so the separator wraps together with the trailing item instead of hanging at a line end. */}
      {children ? (
        <span className="inline-flex items-center gap-x-2">
          <span aria-hidden="true">·</span>
          {children}
        </span>
      ) : null}
    </div>
  );
}
