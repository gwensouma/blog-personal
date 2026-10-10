import { TocSpy } from "@/components/posts/toc-spy";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/types/post";

function TocList({ toc, className }: { toc: TocItem[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-2 text-sm", className)}>
      {toc.map((item) => (
        <li key={item.id} className={cn(item.depth === 3 && "pl-4")}>
          {/* aria-current="location" is set by TocSpy (aside variant) on the section being read. */}
          <a
            href={`#${item.id}`}
            className="block rounded-sm leading-snug text-muted-foreground outline-none transition-[color,translate] duration-200 ease-out-expo hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=location]:translate-x-1 aria-[current=location]:font-medium aria-[current=location]:text-foreground motion-reduce:transition-none"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

type PostTocProps = {
  toc: TocItem[];
  /** "aside": sticky sidebar on wide screens. "inline": collapsible block above the body. */
  variant: "aside" | "inline";
  className?: string;
};

// Server-rendered table of contents; <details> gives the collapsible mobile
// version for free, without client JS. On wide screens the list is wrapped in
// TocSpy, a small client leaf that highlights the section being read.
export function PostToc({ toc, variant, className }: PostTocProps) {
  if (toc.length === 0) return null;

  if (variant === "inline") {
    return (
      <details className={cn("rounded-lg border border-border", className)}>
        <summary className="cursor-pointer rounded-lg px-4 py-3 font-heading text-base font-semibold outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50">
          On this page
        </summary>
        <nav aria-label="Table of contents" className="px-4 pb-4">
          <TocList toc={toc} />
        </nav>
      </details>
    );
  }

  return (
    // top-24 clears the site header when it slides back in on scroll up.
    <nav aria-labelledby="toc-heading" className={cn("sticky top-24 flex flex-col gap-3", className)}>
      <h2 id="toc-heading" className="font-heading text-sm font-semibold">
        On this page
      </h2>
      <TocSpy ids={toc.map((item) => item.id)}>
        <TocList toc={toc} className="border-l border-border pl-4" />
      </TocSpy>
    </nav>
  );
}
