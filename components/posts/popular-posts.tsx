import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { PostRowAccent, postRowClassName, postRowLinkClassName } from "@/components/posts/post-row-accent";
import { getPopularPosts } from "@/lib/data/engagement";
import { getFeaturedPost } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

const POPULAR_COUNT = 3;

function formatViews(views: number): string {
  return `${views.toLocaleString("en-US")} ${views === 1 ? "view" : "views"}`;
}

// Async Server Component for the home page: the posts with the most views, as a
// compact ranked list. Skips the featured post (shown right above, like LatestPosts
// does) and renders nothing until another post has a view, so a fresh store never
// shows an empty heading or box.
// The rank numeral is decorative (the <ol> already carries the order); the title
// link stretches over the whole row. The heading and rows reveal on scroll (client
// wrappers, below the fold only); everything inside is rendered here, on the server.
export async function PopularPosts() {
  // One extra, so the list still has POPULAR_COUNT rows when the featured post is among the top.
  const [ranked, featured] = await Promise.all([getPopularPosts(POPULAR_COUNT + 1), getFeaturedPost()]);
  const popular = ranked.filter(({ post }) => post.slug !== featured?.slug).slice(0, POPULAR_COUNT);
  if (popular.length === 0) return null;

  return (
    <section aria-labelledby="popular-heading" className="flex flex-col gap-6">
      <Reveal>
        <h2 id="popular-heading" className="font-heading text-2xl font-semibold">
          Most read
        </h2>
      </Reveal>
      <StaggerList as="ol" role="list" className="flex flex-col border-t border-border">
        {popular.map(({ post, views }, index) => (
          <StaggerItem key={post.slug} className="border-b border-border">
            <div
              className={cn(
                postRowClassName,
                "grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3 py-5 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-x-4",
              )}
            >
              {/* Arrow top matches the title's first line, which the numeral's baseline pushes down. */}
              <PostRowAccent inset="top-5 bottom-5" arrowClassName="top-8 size-4 sm:top-9.5" />
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
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  );
}
