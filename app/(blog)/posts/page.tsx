import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { PostArchive } from "@/components/posts/post-archive";
import { PostList } from "@/components/posts/post-list";
import { PostPagination } from "@/components/posts/post-pagination";
import { getArchivePage } from "@/lib/data/posts";

type ArchiveProps = { searchParams: Promise<{ page?: string | string[] }> };

/** Parses ?page=; returns null for anything that isn't a positive integer. */
function parsePage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 1;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
}

export async function generateMetadata({ searchParams }: ArchiveProps): Promise<Metadata> {
  const page = parsePage((await searchParams).page) ?? 1;
  return {
    title: page > 1 ? `Archive, page ${page}` : "Archive",
    description: "Every post in the journal, newest first.",
    alternates: { canonical: page > 1 ? `/posts?page=${page}` : "/posts" },
  };
}

export default async function ArchivePage({ searchParams }: ArchiveProps) {
  const page = parsePage((await searchParams).page);
  if (page === null) notFound();

  const result = await getArchivePage(page);
  // Page 1 may legitimately be empty (no posts yet); any later empty page is a 404.
  if (page > result.totalPages) notFound();

  return (
    <ReadingColumn className="flex flex-col gap-12">
      <PageHeader
        title="Archive"
        description={`${result.totalItems} ${result.totalItems === 1 ? "post" : "posts"}, newest first.${
          result.totalPages > 1 ? ` Page ${page} of ${result.totalPages}.` : ""
        }`}
        className="pb-0"
      />
      {result.items.length > 0 ? (
        <PostArchive posts={result.items} yearCounts={result.yearCounts} continuedYear={result.continuedYear} />
      ) : (
        <PostList posts={[]} />
      )}
      <PostPagination page={page} totalPages={result.totalPages} />
    </ReadingColumn>
  );
}
