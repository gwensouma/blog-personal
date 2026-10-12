import { describe, expect, it } from "vitest";
import { getArchivePage, getPostSeries, getPosts, getRelatedPosts } from "@/lib/data/posts";
import { tagSlug } from "@/lib/tags";

// content/posts is the fixture. Tests that depend on what's in it say so in their name,
// so a new or edited post explains the failure.

const SERIES_PARTS = ["server-components-run-on-the-server", "client-components-render-twice", "rsc-shrinks-your-bundle"];

describe("getPostSeries", () => {
  it.each(SERIES_PARTS.map((slug, index) => [slug, index + 1] as const))(
    "content: %s is part %i of the 3-part RSC Fundamentals series",
    async (slug, position) => {
      const series = await getPostSeries(slug);
      expect(series).not.toBeNull();
      expect(series!.name).toBe("RSC Fundamentals");
      expect(series!.slug).toBe("rsc-fundamentals");
      expect(series!.parts.map((part) => part.slug)).toEqual(SERIES_PARTS);
      expect(series!.parts.map((part) => part.series?.order)).toEqual([1, 2, 3]);
      expect(series!.parts.every((part) => part.series?.total === 3)).toBe(true);
      expect(series!.position).toBe(position);
    },
  );

  it("content: a post outside any series returns null", async () => {
    expect(await getPostSeries("streaming-with-suspense")).toBeNull();
  });

  it("an unknown slug returns null", async () => {
    expect(await getPostSeries("does-not-exist")).toBeNull();
  });
});

describe("getRelatedPosts", () => {
  it.each(SERIES_PARTS)("content: %s doesn't list other parts of its own series", async (slug) => {
    const related = await getRelatedPosts(slug, 10);
    const others = SERIES_PARTS.filter((part) => part !== slug);
    for (const post of related) {
      expect(others).not.toContain(post.slug);
      expect(post.series?.slug).not.toBe("rsc-fundamentals");
    }
    expect(related.map((post) => post.slug)).not.toContain(slug);
  });

  it("content: a series part still gets related posts outside the series", async () => {
    // client-components-render-twice shares "Client Components" with designing-the-rsc-boundary.
    const related = await getRelatedPosts("client-components-render-twice");
    expect(related.map((post) => post.slug)).toContain("designing-the-rsc-boundary");
  });

  it("content: orders by shared tag count (most first), every result shares a tag, and the limit keeps the top", async () => {
    const posts = await getPosts();
    for (const current of posts) {
      const currentTags = new Set(current.tags.map(tagSlug));
      const shared = (slug: string) =>
        posts.find((post) => post.slug === slug)!.tags.filter((tag) => currentTags.has(tagSlug(tag))).length;

      const related = await getRelatedPosts(current.slug, 10);
      const counts = related.map((post) => shared(post.slug));
      expect(counts.every((count) => count > 0), current.slug).toBe(true);
      expect(counts, current.slug).toEqual([...counts].sort((a, b) => b - a));

      const top = await getRelatedPosts(current.slug, 1);
      expect(top, current.slug).toEqual(related.slice(0, 1));
    }
  });

  it("an unknown slug has no related posts", async () => {
    expect(await getRelatedPosts("does-not-exist")).toEqual([]);
  });
});

describe("getArchivePage", () => {
  it("content: yearCounts are archive-wide totals on every page (2026: 6, 2025: 2)", async () => {
    const page1 = await getArchivePage(1);
    const page2 = await getArchivePage(2);
    expect(page1.yearCounts).toEqual({ "2026": 6, "2025": 2 });
    expect(page2.yearCounts).toEqual({ "2026": 6, "2025": 2 });
    expect(page1.totalItems).toBe(8);
    expect(page1.totalPages).toBe(2);
  });

  it("content: page 1 holds the 5 newest posts and has no continued year", async () => {
    const page1 = await getArchivePage(1);
    expect(page1.page).toBe(1);
    expect(page1.items).toHaveLength(5);
    expect(page1.continuedYear).toBeNull();
    const all = await getPosts();
    expect(page1.items.map((p) => p.slug)).toEqual(all.slice(0, 5).map((p) => p.slug));
  });

  it("content: page 2 picks up mid-2026, so 2026 is the continued year", async () => {
    const page2 = await getArchivePage(2);
    expect(page2.items.map((p) => p.slug)).toEqual([
      "caching-in-the-app-router",
      "designing-the-rsc-boundary",
      "why-i-started-this-journal",
    ]);
    expect(page2.continuedYear).toBe("2026");
  });

  it("content: a page whose first year starts fresh has no continued year", async () => {
    // content: at 3 per page, page 3 starts with 2025-12-09 right after a 2026 post (not continued);
    // at 4 per page, page 2 starts with a 2026 post right after another 2026 post (continued).
    expect((await getArchivePage(3, 3)).continuedYear).toBeNull();
    expect((await getArchivePage(2, 4)).continuedYear).toBe("2026");
  });

  it("out-of-range pages return empty items with the real totals (the route turns them into a 404)", async () => {
    for (const page of [3, 99]) {
      const result = await getArchivePage(page);
      expect(result.items).toEqual([]);
      expect(result.page).toBe(page);
      expect(result.totalPages).toBe(2);
      expect(result.totalItems).toBe(8);
      expect(result.continuedYear).toBeNull();
      expect(result.yearCounts).toEqual({ "2026": 6, "2025": 2 });
    }
  });
});
