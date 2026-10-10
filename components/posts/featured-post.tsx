import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PostCover } from "@/components/posts/post-cover";
import { PostMeta } from "@/components/posts/post-meta";
import { postRowCoverClassName, postRowLinkClassName } from "@/components/posts/post-row-accent";
import { PostTags } from "@/components/posts/post-tags";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeaturedPost } from "@/lib/data/posts";
import { enterStaggerClassName, enterStaggerStyle } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Same frame on the card and its skeleton: taller on phones, a wide band from sm up.
const coverFrame = "aspect-[3/2] sm:aspect-[2/1]";

// Async Server Component: awaited inside <Suspense> on the home page, so the
// intro renders immediately and this block streams in when its data is ready.
// Image-led: a large cover (scroll parallax, zooms on hover) above the title.
// The title link stretches over the whole card, cover included.
// Reveal (client) only animates it if it lands below the fold; the content is server-rendered.
export async function FeaturedPost() {
  const post = await getFeaturedPost();
  if (!post) return null;

  return (
    <Reveal as="section" aria-labelledby="featured-heading" className="flex flex-col gap-4">
      <h2 id="featured-heading" className="font-heading text-sm font-semibold text-primary">
        Featured
      </h2>
      {/* CSS first-load entrance, a beat after the hero title starts. */}
      <article className={cn("group/row relative flex flex-col gap-6", enterStaggerClassName)} style={enterStaggerStyle(2)}>
        <div className="pointer-events-none relative">
          <PostCover
            post={post}
            aspect="2/1"
            size="hero"
            decorative
            parallax
            contentClassName={postRowCoverClassName}
            className={coverFrame}
          />
          <span
            aria-hidden="true"
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-full bg-background text-primary opacity-0 transition-[opacity,scale,rotate] duration-300 ease-out-expo group-focus-within/row:opacity-100 group-hover/row:opacity-100 motion-safe:scale-75 motion-safe:-rotate-45 motion-safe:group-focus-within/row:scale-100 motion-safe:group-focus-within/row:rotate-0 motion-safe:group-hover/row:scale-100 motion-safe:group-hover/row:rotate-0 motion-reduce:transition-none"
          >
            <ArrowUpRightIcon className="size-5" />
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <PostMeta post={post} />
          <h3 className="font-heading text-3xl leading-tight font-semibold text-balance [overflow-wrap:anywhere] sm:text-4xl">
            <Link href={`/posts/${post.slug}`} className={postRowLinkClassName}>
              {post.title}
            </Link>
          </h3>
          <p className="max-w-[52ch] text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <PostTags tags={post.tags} />
        </div>
      </article>
    </Reveal>
  );
}

export function FeaturedPostSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <span className="sr-only" role="status">
        Loading featured post…
      </span>
      <div aria-hidden="true" className="flex flex-col gap-4">
        <Skeleton className="h-4 w-16" />
        <div className="flex flex-col gap-6">
          <Skeleton className={cn("w-full rounded-lg", coverFrame)} />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-4/5 sm:h-10" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-6 w-full max-w-[52ch]" />
              <Skeleton className="h-6 w-3/4 max-w-[39ch]" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
