import { PostArticleSkeleton } from "@/components/posts/post-article-skeleton";

// The post route renders per request (it reads the like cookie), so without this boundary a click
// waits for the whole page. With it, navigation is instant and <Link> can prefetch this shell.
export default function Loading() {
  return <PostArticleSkeleton />;
}
