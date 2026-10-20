import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { readStore, updateStore } from "@/lib/data/store";
import type { Comment } from "@/types/comment";

const COMMENTS_KEY = "comments";
type CommentStore = Record<string, Comment[]>;

// Abuse limits (D-024). The form is a public endpoint with no account behind it.
// - Cap: 500 stored comments per post, hidden ones included, so hiding doesn't free room for a flood.
// - Per address (only with TRUST_PROXY=1 and an X-Forwarded-For header): 5 per 10 minutes. The key is the
//   right-most entry (see lib/client-address.ts): an appending proxy puts the client's own claim on the
//   left, so only the entry that proxy added can be trusted. The window lives in memory, keyed by a
//   SHA-256 hash of the address: it is lost on restart (acceptable: at worst one extra burst), and no IP
//   is ever written to disk.
// - Otherwise (no TRUST_PROXY, or a missing header): one site-wide flood guard, 30 per 10 minutes,
//   counted from the stored createdAt values across all posts, so it survives restarts.
// - A same-post, same-name-and-body resubmit within 10 minutes (a double click, a no-JS reload) is a
//   success without a second copy, and does not count against the rate limit.
// No IP or other personal data is stored.
const MAX_COMMENTS_PER_POST = 500;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_ADDRESS = 5;
const MAX_SITE_WIDE = 30;

// On globalThis for the same reason as the store's cache: Next bundles this module more than once.
const globalLimits = globalThis as typeof globalThis & { __rscJournalCommentHits?: Map<string, number[]> };
globalLimits.__rscJournalCommentHits ??= new Map();
const hitsByAddress = globalLimits.__rscJournalCommentHits;

export type AddCommentInput = {
  slug: string;
  /** Already cleaned and validated (lib/comment-input.ts). */
  name: string;
  body: string;
  /** From clientKeyFrom(); null falls back to the site-wide guard. */
  clientKey: string | null;
  /** Injectable clock for tests; defaults to the current time. */
  now?: Date;
};

export type AddCommentResult = { status: "ok" | "duplicate" | "full" | "rate-limited" };

function hashAddress(address: string): string {
  return createHash("sha256").update(address).digest("hex");
}

function ownList(store: CommentStore, slug: string): Comment[] {
  return Object.hasOwn(store, slug) ? store[slug] : [];
}

/** Drops hits older than the window, for every address, so the map can't grow without bound. */
function pruneHits(nowMs: number): void {
  for (const [key, hits] of hitsByAddress) {
    const recent = hits.filter((time) => nowMs - time < WINDOW_MS);
    if (recent.length === 0) hitsByAddress.delete(key);
    else hitsByAddress.set(key, recent);
  }
}

/** Visible comments on a post, oldest first. */
export async function getComments(slug: string): Promise<Comment[]> {
  const store = await readStore<CommentStore>(COMMENTS_KEY, {});
  return ownList(store, slug)
    .filter((comment) => !comment.hidden)
    .toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * Stores a comment unless it is a recent duplicate, the post is full, or the client is over its rate
 * limit. Every check runs inside one serialized store update, so concurrent posts can't slip past them.
 */
export async function addComment({ slug, name, body, clientKey, now = new Date() }: AddCommentInput): Promise<AddCommentResult> {
  const nowMs = now.getTime();
  const isRecent = (comment: Comment) => nowMs - Date.parse(comment.createdAt) < WINDOW_MS;
  const addressKey = clientKey === null ? null : hashAddress(clientKey);
  let result: AddCommentResult = { status: "ok" };
  let recordedHit = false;

  try {
    await updateStore<CommentStore>(COMMENTS_KEY, {}, (store) => {
      const list = ownList(store, slug);

      if (list.some((comment) => comment.name === name && comment.body === body && isRecent(comment))) {
        result = { status: "duplicate" };
        return store;
      }
      if (list.length >= MAX_COMMENTS_PER_POST) {
        result = { status: "full" };
        return store;
      }
      if (addressKey === null) {
        const recentSiteWide = Object.values(store).reduce((count, comments) => count + comments.filter(isRecent).length, 0);
        if (recentSiteWide >= MAX_SITE_WIDE) {
          result = { status: "rate-limited" };
          return store;
        }
      } else {
        pruneHits(nowMs);
        const hits = hitsByAddress.get(addressKey) ?? [];
        if (hits.length >= MAX_PER_ADDRESS) {
          result = { status: "rate-limited" };
          return store;
        }
        // Recorded here, inside the serialized update, so two concurrent posts from one address both count.
        hitsByAddress.set(addressKey, [...hits, nowMs]);
        recordedHit = true;
      }

      const comment: Comment = { id: randomUUID(), slug, name, body, createdAt: now.toISOString(), hidden: false };
      return { ...store, [slug]: [...list, comment] };
    });
  } catch (error) {
    // The write failed, so nothing was stored: take the hit back.
    if (recordedHit && addressKey !== null) {
      const hits = hitsByAddress.get(addressKey) ?? [];
      const index = hits.lastIndexOf(nowMs);
      if (index !== -1) hitsByAddress.set(addressKey, hits.toSpliced(index, 1));
    }
    throw error;
  }

  return result;
}

// TEST-ONLY: clears the in-memory per-address window (it lives on globalThis, so it survives
// module re-imports). Pair it with resetStoreForTests() for a clean slate.
export function resetCommentLimitsForTests(): void {
  if (!process.env.VITEST) throw new Error("resetCommentLimitsForTests is test-only");
  hitsByAddress.clear();
}
