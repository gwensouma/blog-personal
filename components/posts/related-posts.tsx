import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { StaggerItem, StaggerList } from "@/components/motion/stagger";
import { PostCover } from "@/components/posts/post-cover";
import { PostMeta } from "@/components/posts/post-meta";
import {
  PostRowAccent,
  postRowClassName,
  postRowCoverClassName,
  postRowLinkClassName,
} from "@/components/posts/post-row-accent";
import { cn } from "@/lib/utils";
import type { PostSummary } from "@/types/post";

// Compact list of posts that share tags with the current one, each with a small
// decorative cover from sm up. The heading and rows reveal on scroll (client
// wrappers); the content is rendered here, on the server.
export function RelatedPosts({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-4">
      <Reveal>
        <h2 id="related-heading" className="font-heading text-2xl font-semibold">
          Related posts
        </h2>
      </Reveal>
      <StaggerList className="flex flex-col border-t border-border">
        {posts.map((post, index) => (
          <StaggerItem key={post.slug} className="border-b border-border">
            <div className={cn(postRowClassName, "py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center sm:gap-x-6")}>
              <PostRowAccent inset="top-5 bottom-5" arrowClassName="top-5.5 size-4 sm:right-34" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="pr-8 font-heading text-lg leading-snug font-semibold text-balance [overflow-wrap:anywhere]">
                  <Link href={`/posts/${post.slug}`} className={postRowLinkClassName}>
                    {post.title}
                  </Link>
                </h3>
                <PostMeta post={post} />
              </div>
              <PostCover
                post={post}
                variant={index}
                aspect="4/3"
                size="thumb"
                decorative
                contentClassName={postRowCoverClassName}
                className="pointer-events-none hidden sm:block"
              />
            </div>
          </StaggerItem>
        ))}
      </StaggerList>
    </section>
  );
}
