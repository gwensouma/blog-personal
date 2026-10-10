import type { MetadataRoute } from "next";
import { getAllTags, getPosts } from "@/lib/data/posts";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, tags] = await Promise.all([getPosts(), getAllTags()]);
  const latest = posts[0]?.updatedAt ?? posts[0]?.date;

  const pages: MetadataRoute.Sitemap = ["/", "/posts", "/tags", "/about"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: path === "/about" ? undefined : latest,
  }));

  return [
    ...pages,
    ...posts.map((post) => ({ url: absoluteUrl(`/posts/${post.slug}`), lastModified: post.updatedAt ?? post.date })),
    ...tags.map((tag) => ({ url: absoluteUrl(`/tags/${tag.slug}`) })),
  ];
}
