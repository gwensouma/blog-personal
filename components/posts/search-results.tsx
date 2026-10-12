import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { StaggerList } from "@/components/motion/stagger";
import { PostList } from "@/components/posts/post-list";
import { PostListItem } from "@/components/posts/post-list-item";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { searchHref } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { SearchOutcome } from "@/types/post";

// Results for /search: empty prompt, no-results state, or the matching posts with
// query matches marked. Rendered inline (not behind <Suspense>) so results are in
// the initial HTML and work without JavaScript; see .design/search.md.
export function SearchResults({ outcome }: { outcome: SearchOutcome }) {
  const { query, tag, hits, facets } = outcome;

  if (!query && !tag) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle className="text-base">Search the journal</EmptyTitle>
          <EmptyDescription>Type a word or phrase above. Titles, summaries, tags and full post text are all searched.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const scope = tag ? ` in ${tag.name}` : "";
  const count = (noun: string) => `${hits.length} ${hits.length === 1 ? noun : `${noun}s`}`;
  const status = query
    ? hits.length === 0
      ? `No results for “${query}”${scope}`
      : `${count("result")} for “${query}”${scope}`
    : `${count("post")}${scope}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Always announced; hidden visually when the Empty state below already says it. */}
      <p role="status" className={cn("text-sm text-muted-foreground", hits.length === 0 && "sr-only")}>
        {status}
      </p>
      {hits.length > 0 ? (
        <StaggerList className="flex flex-col border-t border-border">
          {hits.map((hit, index) => (
            <PostListItem key={hit.post.slug} post={hit.post} index={index} highlight={query} snippet={hit.snippet} />
          ))}
        </StaggerList>
      ) : (
        // An empty PostList renders the shared empty state. Offer to clear the topic only when the
        // query matches elsewhere (facets are counted before the topic filter).
        <PostList
          posts={[]}
          emptyTitle={query ? `Nothing matches “${query}”${scope}` : `No posts${scope} yet`}
          emptyDescription={
            tag && facets.length > 0
              ? "The topic filter may be too narrow. Clear it to search every post."
              : "Try a shorter or more general term, or browse the archive instead."
          }
          emptyAction={
            tag && facets.length > 0 ? (
              <Button variant="outline" nativeButton={false} render={<Link href={searchHref(query)} />}>
                Clear the topic filter
              </Button>
            ) : (
              <Button variant="outline" nativeButton={false} render={<Link href="/posts" />}>
                Browse the archive
              </Button>
            )
          }
        />
      )}
    </div>
  );
}
