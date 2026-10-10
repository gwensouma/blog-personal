import { Suspense } from "react";
import type { Metadata } from "next";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { PostListSkeleton } from "@/components/posts/post-list-skeleton";
import { PostSearchForm } from "@/components/posts/post-search-form";
import { SearchResultsLoader } from "@/components/posts/search-results";

type SearchPageProps = { searchParams: Promise<{ q?: string | string[] }> };

function readQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return {
    title: query ? `Search: ${query}` : "Search",
    // Result pages are thin, query-specific duplicates of real content.
    robots: { index: false, follow: true },
  };
}

// Server-rendered search: the form is a plain GET, and only the results stream in.
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = readQuery((await searchParams).q);

  return (
    <ReadingColumn className="flex flex-col gap-10">
      <PageHeader title="Search" className="pb-0">
        <PostSearchForm defaultValue={query} />
      </PageHeader>
      <Suspense key={query} fallback={<PostListSkeleton label="Searching…" />}>
        <SearchResultsLoader query={query} />
      </Suspense>
    </ReadingColumn>
  );
}
