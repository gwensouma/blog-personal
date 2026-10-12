import { StaggerList } from "@/components/motion/stagger";
import { PostListItem } from "@/components/posts/post-list-item";
import { yearOf } from "@/lib/format";
import type { PostSummary } from "@/types/post";

type PostArchiveProps = {
  posts: PostSummary[];
  /** Posts per year across the whole archive, so a heading shows the year's full total. */
  yearCounts: Record<string, number>;
  /** Year that began on the previous page; its heading is marked as continued. */
  continuedYear: string | null;
};

function groupByYear(posts: PostSummary[]): [string, PostSummary[]][] {
  const groups = new Map<string, PostSummary[]>();
  for (const post of posts) {
    const year = yearOf(post.date);
    groups.set(year, [...(groups.get(year) ?? []), post]);
  }
  // Posts arrive newest first, so insertion order is already descending.
  return [...groups.entries()];
}

/** "2 posts" when the whole year is on this page, "5 of 6 posts" when it is split across pages. */
function postCount(onPage: number, total: number): string {
  const noun = total === 1 ? "post" : "posts";
  return onPage < total ? `${onPage} of ${total} ${noun}` : `${total} ${noun}`;
}

// Archive body: posts grouped under a year heading. The heading carries the
// post count ("5 of 6 posts" when the year is split across pages) and, on a
// page that picks up mid-year, a "continued" note. Visually the year stays
// large and the extras sit quiet on the same baseline. Screen readers hear
// "2026, continued, 1 of 6 posts": each comma sits at the END of the preceding
// flex item and is hidden with a zero font size, NOT sr-only. sr-only is
// position:absolute, which makes the comma a block, so Chrome puts a space
// before it ("2026 , continued"); a zero-size inline comma keeps it attached.
export function PostArchive({ posts, yearCounts, continuedYear }: PostArchiveProps) {
  return (
    <div className="flex flex-col gap-12">
      {groupByYear(posts).map(([year, yearPosts]) => {
        const continued = year === continuedYear;
        const total = yearCounts[year] ?? yearPosts.length;
        return (
          <section key={year} aria-labelledby={`year-${year}`} className="flex flex-col gap-4">
            <h2
              id={`year-${year}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-heading text-2xl font-semibold tabular-nums text-muted-foreground"
            >
              <span>
                {year}
                <span className="text-[length:0px]">,</span>
              </span>
              {continued ? (
                <span className="font-sans text-sm font-normal">
                  continued
                  <span className="text-[length:0px]">,</span>
                </span>
              ) : null}
              <span className="ml-auto font-sans text-sm font-normal tabular-nums">
                {postCount(yearPosts.length, total)}
              </span>
            </h2>
            <StaggerList className="flex flex-col border-t border-border">
              {yearPosts.map((post, index) => (
                <PostListItem key={post.slug} post={post} headingLevel="h3" index={index} />
              ))}
            </StaggerList>
          </section>
        );
      })}
    </div>
  );
}
