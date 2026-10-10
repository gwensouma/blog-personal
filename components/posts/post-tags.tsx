import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { tagSlug } from "@/lib/tags";
import { cn } from "@/lib/utils";

// Tag links as outline badges. `relative z-10` keeps them clickable above a
// stretched title link in list items.
export function PostTags({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <ul aria-label="Tags" className={cn("relative z-10 flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li key={tag}>
          <Badge variant="outline" render={<Link href={`/tags/${tagSlug(tag)}`} />}>
            {tag}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
