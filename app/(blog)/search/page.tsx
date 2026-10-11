import type { Metadata } from "next";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { PostSearchForm } from "@/components/posts/post-search-form";
import { SearchFilters } from "@/components/posts/search-filters";
import { SearchResults } from "@/components/posts/search-results";
import { searchPostsWithFacets } from "@/lib/data/posts";
import { normalizeQuery } from "@/lib/highlight";

type SearchParam = string | string[] | undefined;
type SearchPageProps = { searchParams: Promise<{ q?: SearchParam; tag?: SearchParam }> };

const first = (value: SearchParam) => (Array.isArray(value) ? value[0] : value) ?? "";
// Same normalization as the data layer, so the input, the <title> and the results agree.
const readQuery = (value: SearchParam) => normalizeQuery(first(value));

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = readQuery((await searchParams).q);
  return {
    title: query ? `Search: ${query}` : "Search",
    // Result pages are thin, query-specific duplicates of real content.
    robots: { index: false, follow: true },
  };
}

// Server-rendered search: the form is a plain GET and results render inline, so the
// whole page works without JavaScript (no <Suspense> around essential content).
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const outcome = await searchPostsWithFacets(readQuery(params.q), first(params.tag).trim() || undefined);

  return (
    <ReadingColumn className="flex flex-col gap-10">
      <PageHeader title="Search" className="pb-0">
        <PostSearchForm defaultValue={outcome.query} tag={outcome.tag?.slug} />
        {outcome.query || outcome.tag ? (
          <SearchFilters query={outcome.query} activeTag={outcome.tag} facets={outcome.facets} />
        ) : null}
      </PageHeader>
      <SearchResults outcome={outcome} />
    </ReadingColumn>
  );
}
