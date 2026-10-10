import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { ReadingColumn } from "@/components/reading-column";
import { PageHeader } from "@/components/page-header";
import { PostList } from "@/components/posts/post-list";
import { Button } from "@/components/ui/button";
import { getAllTags, getPosts, getTag } from "@/lib/data/posts";

// Only tags from generateStaticParams exist; anything else is a real 404.
export const dynamicParams = false;

type TagPageProps = { params: Promise<{ tag: string }> };

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const tag = await getTag((await params).tag);
  if (!tag) return { title: "Tag not found" };
  return {
    title: `Posts tagged ${tag.name}`,
    description: `${tag.count} ${tag.count === 1 ? "post" : "posts"} about ${tag.name}.`,
    alternates: { canonical: `/tags/${tag.slug}` },
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { tag: slug } = await params;
  const [tag, posts] = await Promise.all([getTag(slug), getPosts({ tag: slug })]);
  if (!tag) notFound();

  return (
    <ReadingColumn>
      <Button variant="link" nativeButton={false} render={<Link href="/tags" />} className="mb-8 px-0">
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        All tags
      </Button>
      <PageHeader
        title={tag.name}
        description={`${tag.count} ${tag.count === 1 ? "post" : "posts"} tagged ${tag.name}, newest first.`}
      />
      <PostList posts={posts} emptyTitle={`No posts tagged ${tag.name} yet`} />
    </ReadingColumn>
  );
}
