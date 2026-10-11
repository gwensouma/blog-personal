import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { PostRowAccent, postRowClassName, postRowLinkClassName } from "@/components/posts/post-row-accent";
import { getPopularPosts } from "@/lib/data/engagement";
import { cn } from "@/lib/utils";

const POPULAR_COUNT = 3;

function formatViews(views: number): string {
  return `${views.toLocaleString("en-US")} ${views === 1 ? "view" : "views"}`;
}

// Async Server Component for the home page: the posts with the most views, as a
// compact ranked list. Renders nothing until at least one post has a view, so a
// fresh store never shows an empty heading or box.
// The rank numeral is decorative (the <ol> already carries the order); the title
// link stretches over the whole row. Reveal (client) only animates blocks that
// land below the fold; everything inside is rendered here, on the server.
export async function PopularPosts() {
  const popular = await getPopularPosts(POPULAR_COUNT);
  if (popular.length === 0) return null;

  return (
    <section aria-labelledby="popular-heading" className="flex flex-col gap-4">
      <Reveal>
        <h2 id="popular-heading" className="font-heading text-2xl font-semibold">
          Most read
        </h2>
      </Reveal>
      <Reveal>
        {/* role="list" keeps list semantics in Safari despite list-style: none. */}
        <ol role="list" className="flex flex-col border-t border-border">
          {popular.map(({ post, views }, index) => (
            <li key={post.slug} className="border-b border-border">
              <div className={cn(postRowClassName, "grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-5 sm:grid-cols-[3rem_minmax(0,1fr)]")}>
                <PostRowAccent inset="top-5 bottom-5" arrowClassName="top-5.5 size-4" />
                <span
                  aria-hidden="true"
                  className="font-heading text-3xl leading-none font-semibold text-primary tabular-nums sm:text-4xl"
                >
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h3 className="pr-8 font-heading text-lg leading-snug font-semibold text-balance [overflow-wrap:anywhere]">
                    <Link href={`/posts/${post.slug}`} className={postRowLinkClassName}>
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-sm tracking-wide text-muted-foreground tabular-nums">{formatViews(views)}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}
