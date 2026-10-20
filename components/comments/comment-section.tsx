import { CommentForm } from "@/components/comments/comment-form";
import { CommentList } from "@/components/comments/comment-list";
import type { Comment } from "@/types/comment";

type CommentSectionProps = {
  slug: string;
  /** Visible comments, oldest first (getComments). */
  comments: Comment[];
};

// Server Component: heading and list are static HTML in the first response; only the form is a
// client leaf. The form renders any optimistic comment directly under the list, so it reads as
// the list's last item. scroll-mt clears the sticky header when the meta's "#comments" link jumps here.
export function CommentSection({ slug, comments }: CommentSectionProps) {
  return (
    <section id="comments" aria-labelledby="comments-heading" className="group/comments flex scroll-mt-24 flex-col gap-2 border-t border-border pt-10">
      <h2 id="comments-heading" className="font-heading text-2xl leading-snug font-semibold text-balance sm:text-3xl">
        Comments
      </h2>
      <div className="flex flex-col">
        <CommentList comments={comments} />
        <CommentForm slug={slug} />
      </div>
    </section>
  );
}
