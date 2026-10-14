import Link from "next/link";
import { PostCover } from "@/components/posts/post-cover";
import { getPosts } from "@/lib/data/posts";
import { cn } from "@/lib/utils";

// Three portrait cards, back to front. Each slot sets its resting pose, its fanned
// pose (while the deck is hovered or focused) and its entrance delay.
const slots = [
  {
    pose: "top-3 left-0 -rotate-8 motion-safe:group-hover/deck:-translate-x-4 motion-safe:group-hover/deck:-rotate-14 motion-safe:group-focus-visible/deck:-translate-x-4 motion-safe:group-focus-visible/deck:-rotate-14",
    delay: "[animation-delay:520ms]",
  },
  {
    pose: "top-0 left-9 rotate-1 motion-safe:group-hover/deck:-translate-y-2 motion-safe:group-focus-visible/deck:-translate-y-2",
    delay: "[animation-delay:620ms]",
  },
  {
    pose: "top-5 left-18 rotate-8 motion-safe:group-hover/deck:translate-x-4 motion-safe:group-hover/deck:rotate-14 motion-safe:group-focus-visible/deck:translate-x-4 motion-safe:group-focus-visible/deck:rotate-14",
    delay: "[animation-delay:720ms]",
  },
];

const deckBox = "relative h-56 w-52";
const cardBox = "absolute w-32";

// Async Server Component: the home hero's visual anchor. The latest three posts'
// covers stacked like a small deck of issues, newest in front; it links to the
// archive and fans out on hover/focus. Entrance and fan are CSS only (no client JS).
// Rendered inline in the hero, so it is in the prerendered HTML and visible without JS.
export async function LatestCoverDeck() {
  const posts = (await getPosts()).slice(0, 3).reverse();
  if (posts.length === 0) return null;

  return (
    <Link
      href="/posts"
      className={cn("group/deck block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50", deckBox)}
    >
      <span className="sr-only">Browse the archive</span>
      {posts.map((post, index) => {
        const slot = slots[index + (slots.length - posts.length)];
        return (
          <PostCover
            key={post.slug}
            post={post}
            variant={index}
            aspect="3/4"
            size="thumb"
            decorative
            className={cn(
              cardBox,
              "ring-4 ring-background transition-[translate,rotate] duration-700 ease-spring motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-8 motion-reduce:transition-none",
              slot.pose,
              slot.delay,
            )}
          />
        );
      })}
    </Link>
  );
}
