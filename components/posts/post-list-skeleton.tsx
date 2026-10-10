import { Skeleton } from "@/components/ui/skeleton";

// Placeholder rows that mirror PostListItem (including its sm+ cover thumbnail)
// while a list streams in.
export function PostListSkeleton({ count = 3, label = "Loading posts…" }: { count?: number; label?: string }) {
  return (
    <div>
      <span className="sr-only" role="status">
        {label}
      </span>
      <ul aria-hidden="true" className="flex flex-col border-t border-border">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="border-b border-border py-8 sm:grid sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-x-8">
            <div className="flex flex-col gap-2.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-5 w-full max-w-[58ch]" />
              <div className="mt-1 flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="mt-1 hidden aspect-[4/3] self-start rounded-lg sm:block" />
          </li>
        ))}
      </ul>
    </div>
  );
}
