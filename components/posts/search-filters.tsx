import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchHref } from "@/lib/search";
import type { Tag } from "@/types/post";

type SearchFiltersProps = {
  query: string;
  /** The active topic filter, or null for "All". */
  activeTag: Tag | null;
  /** Topics among the query's matches, counted before the topic filter. */
  facets: Tag[];
};

// Topic filter chips for /search. Each chip is a plain link (works without JS) to
// the same query narrowed to one topic. The chip whose URL is the current page
// carries aria-current="page", so "All" is current when no topic is active.
export function SearchFilters({ query, activeTag, facets }: SearchFiltersProps) {
  // Keep the active topic visible even when it has no matches for this query.
  const chips =
    activeTag && !facets.some((tag) => tag.slug === activeTag.slug) ? [...facets, { ...activeTag, count: 0 }] : facets;
  if (chips.length === 0) return null;

  return (
    <nav aria-label="Filter by topic">
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterChip href={searchHref(query)} current={!activeTag}>
            All
          </FilterChip>
        </li>
        {chips.map((tag) => (
          <li key={tag.slug}>
            <FilterChip href={searchHref(query, tag.slug)} current={activeTag?.slug === tag.slug}>
              {tag.name}
              <span className="tabular-nums opacity-75">
                <span className="sr-only">, </span>
                {tag.count}
                <span className="sr-only"> {tag.count === 1 ? "result" : "results"}</span>
              </span>
            </FilterChip>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Styled with buttonVariants on a plain Link (not <Button render>), so chips stay
// real links for assistive tech instead of getting role="button".
function FilterChip({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className={cn(buttonVariants({ variant: current ? "default" : "outline", size: "sm" }), "rounded-full px-3")}
    >
      {children}
    </Link>
  );
}
