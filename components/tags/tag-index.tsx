import Link from "next/link";
import { TagsIcon } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { Tag } from "@/types/post";

// Full tag listing for /tags: one row per tag with its post count.
export function TagIndex({ tags }: { tags: Tag[] }) {
  if (tags.length === 0) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TagsIcon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle as="h2" className="text-base">No tags yet</EmptyTitle>
          <EmptyDescription>Tags appear here once posts are published with them.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="grid border-t border-border sm:grid-cols-2 sm:gap-x-10">
      {tags.map((tag) => (
        <li key={tag.slug} className="border-b border-border">
          <Link
            href={`/tags/${tag.slug}`}
            className="group flex items-baseline justify-between gap-4 rounded-sm py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="font-heading text-xl font-semibold transition-colors group-hover:text-primary motion-reduce:transition-none">
              {tag.name}
            </span>
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {tag.count} {tag.count === 1 ? "post" : "posts"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
