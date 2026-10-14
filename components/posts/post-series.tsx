import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostSeries, PostSeriesRef } from "@/types/post";

// Server Components only: the series box, the end-of-post series nav and the
// small list marker are plain HTML with CSS hover/focus states, no client JS.

const partLinkClassName =
  "rounded-sm outline-none transition-colors duration-200 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

/**
 * Series contents, shown near the top of a post: "Part 2 of 3", the series name
 * and every part in order. The current part is plain text with aria-current;
 * earlier parts are muted, later ones stay at full strength (what's still ahead).
 */
export function PostSeriesBox({ series, className }: { series: PostSeries; className?: string }) {
  return (
    <nav aria-label={`${series.name}: all parts`} className={cn("flex flex-col gap-4 rounded-lg border border-border p-5 sm:p-6", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Part {series.position} of {series.parts.length} in a series
        </p>
        <h2 className="font-heading text-xl leading-snug font-semibold text-balance">
          {series.name}
        </h2>
      </div>
      <ol className="flex flex-col gap-1 border-l border-border">
        {series.parts.map((part, index) => {
          const number = index + 1;
          const isCurrent = number === series.position;
          const isEarlier = number < series.position;
          return (
            <li key={part.slug} className="relative flex gap-3 py-1.5 pl-4 text-base leading-snug">
              {/* A 2px primary bar on the rail marks the current part, like the TOC marker. */}
              {isCurrent ? <span aria-hidden="true" className="absolute inset-y-0 -left-px w-0.5 rounded-full bg-primary" /> : null}
              <span
                aria-hidden="true"
                className={cn("w-4 shrink-0 text-sm tabular-nums leading-6", isCurrent ? "font-semibold text-primary" : "text-muted-foreground")}
              >
                {number}
              </span>
              {isCurrent ? (
                <span aria-current="page" className="min-w-0 font-semibold text-foreground [overflow-wrap:anywhere]">
                  {part.title}
                </span>
              ) : (
                <Link
                  href={`/posts/${part.slug}`}
                  className={cn(partLinkClassName, "min-w-0 [overflow-wrap:anywhere]", isEarlier ? "text-muted-foreground" : "text-foreground")}
                >
                  {part.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The way back within the series, at the end of the post body: a "Previous in series" text link on a
 * hairline, plus the "part n of N" / "final part" line. The forward step is the Up next card further down
 * (it always points at the next part when there is one), so this nav only goes back. Render it from part 2
 * on: part 1 has no previous part. "final part" comes from the series itself, not from what is shown.
 */
export function PostSeriesNav({ series, className }: { series: PostSeries; className?: string }) {
  const previous = series.parts[series.position - 2];
  const isLast = !series.parts[series.position];

  return (
    <nav aria-label={`${series.name}: previous part`} className={cn("flex flex-col gap-5 border-t border-border pt-8", className)}>
      <p className="text-sm text-muted-foreground">
        {isLast
          ? `${series.name}, final part (${series.position} of ${series.parts.length})`
          : `${series.name}, part ${series.position} of ${series.parts.length}`}
      </p>
      {previous ? (
        <Link
          href={`/posts/${previous.slug}`}
          className="group flex flex-col gap-1 self-start rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeftIcon
              aria-hidden="true"
              className="size-3.5 transition-transform duration-300 ease-out-expo motion-safe:group-hover:-translate-x-1 motion-safe:group-focus-visible:-translate-x-1 motion-reduce:transition-none"
            />
            Previous in series
          </span>
          <span className="font-heading text-lg leading-snug font-semibold text-balance [overflow-wrap:anywhere] transition-colors group-hover:text-primary motion-reduce:transition-none">
            {previous.title}
          </span>
        </Link>
      ) : null}
    </nav>
  );
}

/** True when the post belongs to a series with 2+ parts (a one-part series shows no UI). */
export function hasSeriesMarker(series: PostSeriesRef | undefined): series is PostSeriesRef {
  return (series?.total ?? 0) > 1;
}

/** Quiet "Series name, part n" item for a post's meta line in lists. Guard with hasSeriesMarker. */
export function PostSeriesMarker({ series }: { series: PostSeriesRef }) {
  return (
    <span>
      {series.name}, part {series.order}
    </span>
  );
}
