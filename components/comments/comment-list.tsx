import { PostDate } from "@/components/posts/post-date";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/comment";

type CommentEntryProps = {
  name: string;
  body: string;
  /** The date (a <time>), or the "Posting…" marker for an optimistic comment. */
  meta: React.ReactNode;
  className?: string;
};

/**
 * One comment: the name as a small Fraunces byline, the date beside it, the body below. User text is
 * rendered as React text only (no HTML, no Markdown, no links); `whitespace-pre-line` keeps its line
 * breaks and `overflow-wrap:anywhere` breaks an unbroken 2000-character run instead of overflowing.
 * Shared by the server list and the optimistic preview in CommentForm, so both look the same.
 */
export function CommentEntry({ name, body, meta, className }: CommentEntryProps) {
  return (
    <article className={cn("flex min-w-0 flex-col gap-2 py-6", className)}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="min-w-0 font-heading text-lg leading-snug font-semibold text-foreground [overflow-wrap:anywhere]">
          {name}
        </h3>
        <span className="text-sm tracking-wide text-muted-foreground">{meta}</span>
      </header>
      <p className="text-base leading-relaxed whitespace-pre-line text-foreground [overflow-wrap:anywhere]">{body}</p>
    </article>
  );
}

// Server Component: the visible comments, oldest first, rendered inline (essential content, no Suspense).
// "No comments yet." hides while an optimistic comment is showing (the section is `group/comments`).
export function CommentList({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) {
    return (
      <p className="py-6 text-base text-muted-foreground group-has-[[data-comment-pending]]/comments:hidden">No comments yet.</p>
    );
  }

  return (
    <ol className="flex flex-col divide-y divide-border border-b border-border">
      {comments.map((comment) => (
        <li key={comment.id}>
          <CommentEntry name={comment.name} body={comment.body} meta={<PostDate date={comment.createdAt} />} />
        </li>
      ))}
    </ol>
  );
}
