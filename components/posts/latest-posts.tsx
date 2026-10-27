import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PostList } from "@/components/posts/post-list";
import { buttonVariants } from "@/components/ui/button";
import { getFeaturedPost, getPosts } from "@/lib/data/posts";

const LATEST_COUNT = 4;

function LatestPostsHeading() {
  return (
    <h2 id="latest-heading" className="font-heading text-2xl font-semibold">
      Latest posts
    </h2>
  );
}

// Async Server Component rendered inline on the home page (in the prerendered
// HTML, visible without JS). Skips the featured post
// so it isn't listed twice.
export async function LatestPosts() {
  const [posts, featured] = await Promise.all([getPosts(), getFeaturedPost()]);
  const latest = posts.filter((post) => post.slug !== featured?.slug).slice(0, LATEST_COUNT);

  return (
    <section aria-labelledby="latest-heading" className="flex flex-col gap-6">
      <Reveal>
        <LatestPostsHeading />
      </Reveal>
      <PostList posts={latest} headingLevel="h3" />
      {posts.length > 0 ? (
        <Link href="/posts" className={buttonVariants({ variant: "link", className: "group/more self-start px-0" })}>
          View all posts
          <ArrowRightIcon
            data-icon="inline-end"
            aria-hidden="true"
            className="transition-transform duration-300 ease-out-expo motion-safe:group-hover/more:translate-x-1 motion-safe:group-focus-visible/more:translate-x-1"
          />
        </Link>
      ) : null}
    </section>
  );
}
