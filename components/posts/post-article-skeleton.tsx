import { Skeleton } from "@/components/ui/skeleton";

// Placeholder for PostArticle while the post renders on the server (app/(blog)/posts/[slug]/loading.tsx).
// It mirrors the article's column and header rhythm so the swap to real content barely shifts the layout,
// and it is what a dynamic route's <Link> prefetches, so a click shows it straight away.
const BODY_LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-10/12", "w-2/3"];

export function PostArticleSkeleton() {
  return (
    <div role="status" aria-busy="true" className="mx-auto w-full max-w-180">
      <span className="sr-only">Loading post…</span>
      <div aria-hidden="true">
        <Skeleton className="mb-10 h-5 w-24" />

        <div className="flex flex-col gap-5 border-b border-border pb-10">
          <Skeleton className="h-4 w-48" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full sm:h-12" />
            <Skeleton className="h-10 w-3/5 sm:h-12" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-full max-w-[52ch]" />
            <Skeleton className="h-6 w-2/3 max-w-[40ch]" />
          </div>
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>

        <Skeleton className="mt-10 aspect-[3/1] w-full rounded-xl" />

        <div className="mt-10 flex flex-col gap-3">
          {BODY_LINES.map((width, index) => (
            <Skeleton key={index} className={`h-5 ${width}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
