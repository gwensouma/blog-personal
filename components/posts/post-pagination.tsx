import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Page 1 lives at the bare path so it has a single canonical URL.
function pageHref(basePath: string, page: number) {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

type PostPaginationProps = {
  page: number;
  totalPages: number;
  basePath?: string;
};

export function PostPagination({ page, totalPages, basePath = "/posts" }: PostPaginationProps) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <Pagination aria-label="Archive pages" className="justify-start">
      <PaginationContent className="flex-wrap">
        {page > 1 ? (
          <PaginationItem>
            <PaginationPrevious href={pageHref(basePath, page - 1)} text="Newer" aria-label="Newer posts" />
          </PaginationItem>
        ) : null}
        {pages.map((number) => (
          <PaginationItem key={number}>
            <PaginationLink href={pageHref(basePath, number)} isActive={number === page} aria-label={`Page ${number}`}>
              {number}
            </PaginationLink>
          </PaginationItem>
        ))}
        {page < totalPages ? (
          <PaginationItem>
            <PaginationNext href={pageHref(basePath, page + 1)} text="Older" aria-label="Older posts" />
          </PaginationItem>
        ) : null}
      </PaginationContent>
    </Pagination>
  );
}
