import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { PostCover } from "@/components/posts/post-cover";
import { cn } from "@/lib/utils";
import type { AdjacentPosts, PostSummary } from "@/types/post";

// The card's cover zooms slowly while the card is hovered or keyboard-focused.
const coverZoom =
  "transition-[scale] duration-700 ease-out-expo motion-safe:group-hover:scale-[1.06] motion-safe:group-focus-visible:scale-[1.06] motion-reduce:transition-none";

// A card with a small decorative cover band on top; the title is the link text.
function AdjacentLink({ post, direction }: { post: PostSummary; direction: "previous" | "next" }) {
  const isNext = direction === "next";
  return (
    <Link
      href={`/posts/${post.slug}`}
      rel={isNext ? "next" : "prev"}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-lg border border-border outline-none transition-[border-color,translate] duration-300 ease-out-expo hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:hover:-translate-y-1 motion-reduce:transition-none",
        isNext && "sm:text-right",
      )}
    >
      <PostCover post={post} aspect="3/1" size="card" decorative contentClassName={coverZoom} className="rounded-none" />
      <span className={cn("flex flex-col gap-2 p-5", isNext && "sm:items-end")}>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {isNext ? null : (
            <ArrowLeftIcon aria-hidden="true" className="size-3.5 transition-transform duration-300 ease-out-expo motion-safe:group-hover:-translate-x-1 motion-safe:group-focus-visible:-translate-x-1" />
          )}
          {isNext ? "Next post" : "Previous post"}
          {isNext ? (
            <ArrowRightIcon aria-hidden="true" className="size-3.5 transition-transform duration-300 ease-out-expo motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1" />
          ) : null}
        </span>
        <span className="font-heading text-lg leading-snug font-semibold text-balance transition-colors group-hover:text-primary motion-reduce:transition-none">
          {post.title}
        </span>
      </span>
    </Link>
  );
}

// Previous = older post, next = newer post.
export function PostAdjacentNav({ adjacent }: { adjacent: AdjacentPosts }) {
  if (!adjacent.previous && !adjacent.next) return null;

  return (
    <nav aria-label="Previous and next posts">
      <ul className="grid gap-4 sm:grid-cols-2">
        {adjacent.previous ? (
          <li>
            <AdjacentLink post={adjacent.previous} direction="previous" />
          </li>
        ) : null}
        {adjacent.next ? (
          <li className="sm:col-start-2">
            <AdjacentLink post={adjacent.next} direction="next" />
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
