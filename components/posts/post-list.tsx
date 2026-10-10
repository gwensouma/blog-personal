import { FileTextIcon } from "lucide-react";
import { StaggerList } from "@/components/motion/stagger";
import { PostListItem } from "@/components/posts/post-list-item";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

type PostListProps = {
  posts: PostSummary[];
  headingLevel?: "h2" | "h3";
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyAction?: React.ReactNode;
  className?: string;
};

export function PostList({
  posts,
  headingLevel,
  emptyTitle = "No posts yet",
  emptyDescription = "New writing will show up here as soon as it is published.",
  emptyAction,
  className,
}: PostListProps) {
  if (posts.length === 0) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileTextIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-base">{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    );
  }

  return (
    // Rows below the fold reveal one after another as the list scrolls into view.
    <StaggerList className={cn("flex flex-col border-t border-border", className)}>
      {posts.map((post, index) => (
        <PostListItem key={post.slug} post={post} headingLevel={headingLevel} index={index} />
      ))}
    </StaggerList>
  );
}
