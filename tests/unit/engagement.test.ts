import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/headers only works inside a Next request; give engagement.ts an in-memory cookie jar.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
  }),
}));

const dataDir = mkdtempSync(path.join(os.tmpdir(), "rsc-blog-engagement-"));
process.env.BLOG_DATA_DIR = dataDir;

const { getPopularPosts, getPostStats, recordView, setLike } = await import("@/lib/data/engagement");
const { setLikeAction } = await import("@/lib/actions/engagement");
const { resetStoreForTests } = await import("@/lib/data/store");

// Each test gets an empty store: a fresh temp dir under dataDir.
let testCount = 0;
beforeEach(() => {
  resetStoreForTests();
  process.env.BLOG_DATA_DIR = path.join(dataDir, `t${++testCount}`);
  jar.clear();
});
afterEach(() => resetStoreForTests());
afterAll(() => {
  process.env.BLOG_DATA_DIR = dataDir;
  rmSync(dataDir, { recursive: true, force: true });
});

// Real slugs from content/posts (the fixture).
const STREAMING = "streaming-with-suspense";
const CACHING = "caching-in-the-app-router";
const ACTIONS = "server-actions-for-mutations";
const BUNDLE = "rsc-shrinks-your-bundle";

async function views(slug: string, times: number) {
  for (let i = 0; i < times; i++) await recordView(slug);
}

describe("recordView", () => {
  it("increments the view count by one per call", async () => {
    expect((await getPostStats(STREAMING)).views).toBe(0);
    await recordView(STREAMING);
    expect((await getPostStats(STREAMING)).views).toBe(1);
    await recordView(STREAMING);
    expect((await getPostStats(STREAMING)).views).toBe(2);
  });

  it("concurrent views are all counted", async () => {
    await Promise.all(Array.from({ length: 15 }, () => recordView(STREAMING)));
    expect((await getPostStats(STREAMING)).views).toBe(15);
  });

  it("doesn't touch likes", async () => {
    await recordView(STREAMING);
    expect(await getPostStats(STREAMING)).toEqual({ likes: 0, views: 1, liked: false });
  });
});

describe("getPopularPosts", () => {
  it("returns [] for a fresh store", async () => {
    expect(await getPopularPosts()).toEqual([]);
  });

  it("excludes posts with zero views and sorts by views, most first", async () => {
    await views(CACHING, 1);
    await views(STREAMING, 3);

    const popular = await getPopularPosts(10);
    expect(popular.map(({ post, views }) => [post.slug, views])).toEqual([
      [STREAMING, 3],
      [CACHING, 1],
    ]);
  });

  it("respects the limit", async () => {
    await views(STREAMING, 4);
    await views(CACHING, 3);
    await views(ACTIONS, 2);
    await views(BUNDLE, 1);

    expect((await getPopularPosts(2)).map(({ post }) => post.slug)).toEqual([STREAMING, CACHING]);
    expect(await getPopularPosts(3)).toHaveLength(3);
    expect(await getPopularPosts()).toHaveLength(3); // default limit
  });

  it("content: breaks ties newest first", async () => {
    // rsc-shrinks-your-bundle (2026-08-20) is newer than caching-in-the-app-router (2026-05-02).
    await views(CACHING, 2);
    await views(BUNDLE, 2);
    expect((await getPopularPosts()).map(({ post }) => post.slug)).toEqual([BUNDLE, CACHING]);
  });

  it("ignores views recorded for slugs that aren't published posts", async () => {
    await views("not-a-real-post", 50);
    expect(await getPopularPosts()).toEqual([]);
  });
});

describe("setLike / setLikeAction", () => {
  it("liking twice counts once, unliking goes back to zero and never below", async () => {
    expect(await setLike(STREAMING, true)).toMatchObject({ likes: 1, liked: true });
    expect(await setLike(STREAMING, true)).toMatchObject({ likes: 1, liked: true });
    expect(await setLike(STREAMING, false)).toMatchObject({ likes: 0, liked: false });
    expect(await setLike(STREAMING, false)).toMatchObject({ likes: 0, liked: false });
    expect((await getPostStats(STREAMING)).liked).toBe(false);
  });

  it("a garbage liked_posts cookie is treated as no likes", async () => {
    jar.set("liked_posts", "{not json");
    expect((await getPostStats(STREAMING)).liked).toBe(false);
    jar.set("liked_posts", JSON.stringify({ [STREAMING]: true }));
    expect((await getPostStats(STREAMING)).liked).toBe(false);
  });

  it("the action rejects unknown slugs and bad types without writing", { timeout: 30_000 }, async () => {
    // Called directly, like a crafted POST to the action endpoint would.
    const action = setLikeAction as unknown as (slug: unknown, liked: unknown) => Promise<unknown>;
    await expect(action("does-not-exist", true)).rejects.toThrow("Unknown post.");
    await expect(action("../store", true)).rejects.toThrow("Unknown post.");
    await expect(action(STREAMING, "true")).rejects.toThrow("Unknown post.");
    await expect(action(STREAMING, 1)).rejects.toThrow("Unknown post.");
    await expect(action({ toString: () => STREAMING }, true)).rejects.toThrow("Unknown post.");
    await expect(action(null, true)).rejects.toThrow("Unknown post.");
    expect(await getPostStats(STREAMING)).toMatchObject({ likes: 0 });
    expect(jar.has("liked_posts")).toBe(false);
  });

  // The action validates with getPost(), which renders the post (cold Shiki highlighter: several seconds).
  it("the action likes a real post", { timeout: 30_000 }, async () => {
    expect(await setLikeAction(STREAMING, true)).toMatchObject({ likes: 1, liked: true });
  });
});
