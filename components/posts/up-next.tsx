import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PostCover } from "@/components/posts/post-cover";
import { hasSeriesMarker } from "@/components/posts/post-series";
import { formatReadingTime } from "@/lib/format";
import type { UpNext as UpNextPick } from "@/types/post";

/** Why the post is suggested, in a few words (one line per reason in .design/blog-refactor.md, "Up next"). */
function reasonLabel({ post, reason }: UpNextPick): string {
  const series = post.series;
  switch (reason) {
    case "series":
      if (!series) return "Next in the series";
      return series.total ? `Next in ${series.name} · Part ${series.order} of ${series.total}` : `Next in ${series.name} · Part ${series.order}`;
    case "related":
      return hasSeriesMarker(series) && series.order === 1 ? `Start the ${series.name} series` : "Related reading";
    case "newer":
      return "Newer post";
    case "older":
      return "Older post";
  }
}

// rel only where the order is real: the next series part or the newer post is "next", the older one "prev".
const relFor: Record<UpNextPick["reason"], "next" | "prev" | undefined> = {
  series: "next",
  newer: "next",
  older: "prev",
  related: undefined,
};

/**
 * The single recommended next read, right after the article. Server Component: the Reveal wrapper
 * only animates it when it starts below the fold and is server-rendered visible, so it shows without JS.
 * Only the title is a link; its ::after stretches over the card (cover included). The card draws the
 * focus ring itself (`has-focus-visible`) because `overflow-hidden` would clip a ring on the ::after.
 */
export function UpNext({ upNext }: { upNext: UpNextPick | null }) {
  if (!upNext) return null;
  const { post, reason } = upNext;

  return (
    <Reveal as="section" aria-labelledby="up-next-heading" className="flex flex-col gap-4">
      <h2 id="up-next-heading" className="font-heading text-sm font-semibold text-primary">
        Up next
      </h2>
      <article className="group/card relative overflow-hidden rounded-xl border border-border bg-background transition-[border-color,translate] duration-300 ease-out-expo hover:border-primary has-focus-visible:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50 motion-safe:hover:-translate-y-1 motion-safe:has-focus-visible:-translate-y-1 motion-reduce:transition-none sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* A primary bar sweeps across the top edge on hover/focus: "this way". */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-1 origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out-expo group-hover/card:scale-x-100 group-has-focus-visible/card:scale-x-100 motion-reduce:transition-none"
        />
        <PostCover
          post={post}
          aspect="2/1"
          size="card"
          decorative
          contentClassName="transition-[scale] duration-700 ease-out-expo motion-safe:group-hover/card:scale-[1.06] motion-safe:group-has-focus-visible/card:scale-[1.06] motion-reduce:transition-none"
          className="pointer-events-none rounded-none sm:aspect-auto sm:h-full sm:min-h-60"
        />
        <div className="flex min-w-0 flex-col gap-3 p-6 sm:p-8">
          <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{reasonLabel(upNext)}</p>
          <h3 className="font-heading text-2xl leading-tight font-semibold text-balance [overflow-wrap:anywhere] sm:text-3xl">
            <Link
              href={`/posts/${post.slug}`}
              rel={relFor[reason]}
              className="text-foreground outline-none transition-colors duration-200 after:absolute after:inset-0 group-hover/card:text-primary focus-visible:text-primary motion-reduce:transition-none"
            >
              {post.title}
            </Link>
          </h3>
          <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <p className="mt-auto flex items-center justify-between gap-4 pt-2 text-sm text-muted-foreground">
            <span>{formatReadingTime(post.readingTime)}</span>
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full border border-border text-primary transition-[translate,border-color] duration-300 ease-out-expo group-hover/card:border-primary group-has-focus-visible/card:border-primary motion-safe:group-hover/card:translate-x-1.5 motion-safe:group-has-focus-visible/card:translate-x-1.5 motion-reduce:transition-none"
            >
              <ArrowRightIcon className="size-4" />
            </span>
          </p>
        </div>
      </article>
    </Reveal>
  );
}
