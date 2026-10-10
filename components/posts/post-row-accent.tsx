import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Classes for the row itself: it shifts right while hovered or while focus is inside. */
export const postRowClassName =
  "group/row relative transition-transform duration-300 ease-out-expo motion-safe:hover:translate-x-2 motion-safe:focus-within:translate-x-2";

/** Classes for the row's title link: color follows the row's hover/focus state. */
export const postRowLinkClassName =
  "text-foreground outline-none transition-colors duration-200 after:absolute after:inset-0 after:rounded-sm group-hover/row:text-primary focus-visible:text-primary focus-visible:after:ring-3 focus-visible:after:ring-ring/50 motion-reduce:transition-none";

/** Classes for a cover's contents inside a row: they zoom slowly while the row is hovered or focused. */
export const postRowCoverClassName =
  "transition-[scale] duration-700 ease-out-expo motion-safe:group-hover/row:scale-[1.06] motion-safe:group-focus-within/row:scale-[1.06] motion-reduce:transition-none";

// Hover/focus chrome for a post row (a `postRowClassName` parent): a primary
// accent bar sweeps down the left edge and an arrow slides in at the top right.
// Server Component, CSS only. Both marks are decorative; the title link carries
// the meaning. `inset` matches the row's vertical padding.
export function PostRowAccent({ inset = "top-8 bottom-8", arrowClassName }: { inset?: string; arrowClassName?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute -left-4 w-0.5 origin-top scale-y-0 rounded-full bg-primary transition-transform duration-300 ease-out-expo group-focus-within/row:scale-y-100 group-hover/row:scale-y-100 motion-reduce:transition-none",
          inset,
        )}
      />
      <ArrowRightIcon
        aria-hidden="true"
        className={cn(
          "absolute right-0 size-5 text-primary opacity-0 transition-[opacity,translate] duration-300 ease-out-expo group-focus-within/row:opacity-100 group-hover/row:opacity-100 motion-safe:-translate-x-3 motion-safe:group-focus-within/row:translate-x-0 motion-safe:group-hover/row:translate-x-0 motion-reduce:transition-none",
          arrowClassName,
        )}
      />
    </>
  );
}
