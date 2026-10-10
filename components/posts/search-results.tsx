import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { PostList } from "@/components/posts/post-list";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { searchPosts } from "@/lib/data/posts";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

// Async Server Component: streamed behind <Suspense key={query}> on /search, so
// the heading and form render immediately and each new query shows a skeleton.
export async function SearchResultsLoader({ query }: { query: string }) {
  const results = await searchPosts(query);
  return <SearchResults query={query} results={results} />;
}

// Results for /search: empty-query prompt, no-results state, or the matching posts.
export function SearchResults({ query, results }: { query: string; results: PostSummary[] }) {
  if (!query) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Always announced; hidden visually when the Empty state below already says it. */}
      <p role="status" className={cn("text-sm text-muted-foreground", results.length === 0 && "sr-only")}>
        {results.length === 0
          ? `No results for “${query}”`
          : `${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
      </p>
      <PostList
        posts={results}
        emptyTitle={`Nothing matches “${query}”`}
        emptyDescription="Try a shorter or more general term, or browse the archive instead."
        emptyAction={
          <Button variant="outline" nativeButton={false} render={<Link href="/posts" />}>
            Browse the archive
          </Button>
        }
      />
    </div>
  );
}
