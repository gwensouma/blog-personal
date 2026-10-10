import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Tag } from "@/types/post";

// Compact strip of tag badges with post counts.
export function TagCloud({ tags, className }: { tags: Tag[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Badge variant="outline" render={<Link href={`/tags/${tag.slug}`} />}>
            {tag.name}
            <span className="text-muted-foreground tabular-nums">
              <span className="sr-only">, </span>
              {tag.count}
              <span className="sr-only"> {tag.count === 1 ? "post" : "posts"}</span>
            </span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
