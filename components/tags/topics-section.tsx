import Link from "next/link";
import { TagCloud } from "@/components/tags/tag-cloud";
import { getAllTags } from "@/lib/data/posts";

// Async Server Component for the home page: the "browse by topic" strip.
export async function TopicsSection() {
  const tags = await getAllTags();
  if (tags.length === 0) return null;

  return (
    <section aria-labelledby="topics-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="topics-heading" className="font-heading text-2xl font-semibold">
          Browse by topic
        </h2>
        <Link
          href="/tags"
          className="rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          All tags
        </Link>
      </div>
      <TagCloud tags={tags} />
    </section>
  );
}
