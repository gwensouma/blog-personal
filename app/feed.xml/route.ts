import { getPosts } from "@/lib/data/posts";
import { buildRssFeed } from "@/lib/rss";

// Built once at build time; posts only change on deploy.
export const dynamic = "force-static";

export async function GET() {
  const posts = await getPosts();
  return new Response(buildRssFeed(posts), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
