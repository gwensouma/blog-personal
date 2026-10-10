import { StaggerList } from "@/components/motion/stagger";
import { PostListItem } from "@/components/posts/post-list-item";
import { yearOf } from "@/lib/format";
import type { PostSummary } from "@/types/post";

function groupByYear(posts: PostSummary[]): [string, PostSummary[]][] {
  const groups = new Map<string, PostSummary[]>();
  for (const post of posts) {
    const year = yearOf(post.date);
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  // Posts arrive newest first, so insertion order is already descending.
  return [...groups.entries()];
}

// Archive body: posts grouped under a year heading.
export function PostArchive({ posts }: { posts: PostSummary[] }) {
  return (
    <div className="flex flex-col gap-12">
      {groupByYear(posts).map(([year, yearPosts]) => (
        <section key={year} aria-labelledby={`year-${year}`} className="flex flex-col gap-4">
          <h2 id={`year-${year}`} className="font-heading text-2xl font-semibold tabular-nums text-muted-foreground">
            {year}
          </h2>
          <StaggerList className="flex flex-col border-t border-border">
            {yearPosts.map((post, index) => (
              <PostListItem key={post.slug} post={post} headingLevel="h3" index={index} />
            ))}
          </StaggerList>
        </section>
      ))}
    </div>
  );
}
