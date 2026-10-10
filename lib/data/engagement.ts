import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { readStore, updateStore } from "@/lib/data/store";
import type { PostStats } from "@/types/engagement";

// Likes and views per post, keyed by slug. Which posts *this* visitor liked is
// remembered in a cookie, so there are no accounts and no client-side storage.
const STATS_KEY = "postStats";
const LIKED_COOKIE = "liked_posts";

type StatsTable = Record<string, { likes: number; views: number }>;

const empty = { likes: 0, views: 0 };

async function readLikedSlugs(): Promise<string[]> {
  const raw = (await cookies()).get(LIKED_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Counts for one post plus whether the current visitor liked it. Reads cookies, so the caller renders dynamically.
 * Wrapped in React cache(): the views line and the like button share one read per request.
 */
export const getPostStats = cache(async (slug: string): Promise<PostStats> => {
  const [table, liked] = await Promise.all([readStore<StatsTable>(STATS_KEY, {}), readLikedSlugs()]);
  const stats = table[slug] ?? empty;
  return { ...stats, liked: liked.includes(slug) };
});

/** Counts one view. Call it from `after()` so it never delays the response. */
export async function recordView(slug: string): Promise<void> {
  await updateStore<StatsTable>(STATS_KEY, {}, (table) => {
    const stats = table[slug] ?? empty;
    return { ...table, [slug]: { ...stats, views: stats.views + 1 } };
  });
}

/**
 * Sets the current visitor's like for a post and returns the fresh stats.
 * Idempotent: liking an already-liked post doesn't count twice.
 * Must run inside a Server Action, because it writes a cookie.
 */
export async function setLike(slug: string, liked: boolean): Promise<PostStats> {
  const likedSlugs = await readLikedSlugs();
  const wasLiked = likedSlugs.includes(slug);
  const delta = liked === wasLiked ? 0 : liked ? 1 : -1;

  const table = await updateStore<StatsTable>(STATS_KEY, {}, (current) => {
    const stats = current[slug] ?? empty;
    return { ...current, [slug]: { ...stats, likes: Math.max(0, stats.likes + delta) } };
  });

  const nextSlugs = liked ? [...new Set([...likedSlugs, slug])] : likedSlugs.filter((value) => value !== slug);
  (await cookies()).set(LIKED_COOKIE, JSON.stringify(nextSlugs), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ...(table[slug] ?? empty), liked };
}
