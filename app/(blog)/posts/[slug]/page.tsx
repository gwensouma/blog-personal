import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PostArticle } from "@/components/posts/post-article";
import { getAdjacentPosts, getPost, getPostSeries, getPosts, getRelatedPosts } from "@/lib/data/posts";
import { site } from "@/lib/site";
import { blogPostingJsonLd } from "@/lib/structured-data";

// Only slugs from generateStaticParams exist; anything else is a real 404.
export const dynamicParams = false;

type PostPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// getPost is wrapped in React cache(), so this and the page share one fetch.
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };

  const url = `/posts/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    authors: [{ name: site.author.name, url: site.author.url }],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      modifiedTime: post.updatedAt ?? post.date,
      authors: [site.author.name],
      tags: post.tags,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

// Server Component: fetches the post and its neighbours on the server, in parallel.
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [post, adjacent, related, series] = await Promise.all([
    getPost(slug),
    getAdjacentPosts(slug),
    getRelatedPosts(slug),
    getPostSeries(slug),
  ]);

  if (!post) notFound();

  return (
    <>
      <JsonLd data={blogPostingJsonLd(post)} />
      <PostArticle post={post} adjacent={adjacent} related={related} series={series} />
    </>
  );
}
