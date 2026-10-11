import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { searchHref } from "@/lib/search";
import type { Tag } from "@/types/post";

/** Topics shown up front; the rest sit in a no-JS <details> so the chip wall stays short on phones. */
const VISIBLE_TOPICS = 6;

type SearchFiltersProps = {
  query: string;
  /** The active topic filter, or null for "All". */
  activeTag: Tag | null;
  /** Topics among the query's matches (every topic without a query), counted before the topic filter. */
  facets: Tag[];
};

// Topic filter chips for /search. Each chip is a plain link (works without JS) to
// the same query narrowed to one topic. The chip whose URL is the current page
// carries aria-current="page", so "All" is current when no topic is active.
export function SearchFilters({ query, activeTag, facets }: SearchFiltersProps) {
  // Facets are real counts, so the active topic is only missing when the query has no
  // matches in it; keep it visible with a true 0 so the filter state stays clear.
  const all =
    activeTag && !facets.some((tag) => tag.slug === activeTag.slug) ? [...facets, { ...activeTag, count: 0 }] : facets;
  if (all.length === 0) return null;

  // Most frequent first (facet order); the active topic is always up front.
  const visible = all.slice(0, VISIBLE_TOPICS);
  if (activeTag && !visible.some((tag) => tag.slug === activeTag.slug)) {
    visible.push(all.find((tag) => tag.slug === activeTag.slug)!);
  }
  const more = all.filter((tag) => !visible.includes(tag));

  const chip = (tag: Tag) => (
    <li key={tag.slug}>
      <FilterChip
        href={searchHref(query, tag.slug)}
        current={activeTag?.slug === tag.slug}
        label={`${tag.name}, ${tag.count} ${tag.count === 1 ? "result" : "results"}`}
      >
        {tag.name}
        <span className="tabular-nums opacity-75">{tag.count}</span>
      </FilterChip>
    </li>
  );

  return (
    <nav aria-label="Filter by topic" className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterChip href={searchHref(query)} current={!activeTag}>
            All
          </FilterChip>
        </li>
        {visible.map(chip)}
      </ul>
      {more.length > 0 ? (
        <details className="group/more flex flex-col gap-2">
          <summary
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-fit cursor-pointer list-none rounded-full px-3 text-muted-foreground [&::-webkit-details-marker]:hidden",
            )}
          >
            More topics
            <span className="tabular-nums">({more.length})</span>
            <ChevronDownIcon
              aria-hidden="true"
              className="transition-transform duration-200 group-open/more:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <ul className="mt-2 flex flex-wrap gap-2">{more.map(chip)}</ul>
        </details>
      ) : null}
    </nav>
  );
}

// Styled with buttonVariants on a plain Link (not <Button render>), so chips stay
// real links for assistive tech instead of getting role="button". `label` gives a
// clean accessible name ("Performance, 3 results") that starts with the visible text.
function FilterChip({
  href,
  current,
  label,
  children,
}: {
  href: string;
  current: boolean;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      aria-label={label}
      className={cn(buttonVariants({ variant: current ? "default" : "outline", size: "sm" }), "rounded-full px-3")}
    >
      {children}
    </Link>
  );
}
