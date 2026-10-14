import { describe, expect, it } from "vitest";
import { getPostEnding, getPosts } from "@/lib/data/posts";
import { RELATED_LIMIT, decidePostEnding, rankRelated, realSeriesSlug } from "@/lib/post-ending";
import type { PostEnding, PostSummary } from "@/types/post";

// content/posts is the fixture for the "content:" tests; the rest use small hand-made lists (newest first,
// series.total set by hand because the pure function does not stamp it).

const EMPTY: PostEnding = { upNext: null, adjacent: { previous: null, next: null }, related: [] };

type Fixture = { tags?: string[]; series?: { slug: string; order: number; total?: number } };
let counter = 0;
function post(slug: string, { tags = [], series }: Fixture = {}): PostSummary {
  counter += 1;
  return {
    slug,
    issue: counter,
    title: slug,
    date: "2026-01-01",
    excerpt: "",
    tags,
    readingTime: 1,
    featured: false,
    series: series ? { name: series.slug, ...series } : undefined,
  };
}
const slugs = (posts: PostSummary[]) => posts.map((p) => p.slug);

// ---------------------------------------------------------------- content (AC7)

type Row = {
  upNext: [string, "series" | "related" | "newer" | "older"];
  next: string | null;
  previous: string | null;
  related: string[];
};
const TABLE: Record<string, Row> = {
  "rsc-shrinks-your-bundle": {
    upNext: ["streaming-with-suspense", "related"],
    next: null,
    previous: null,
    related: ["caching-in-the-app-router", "designing-the-rsc-boundary"],
  },
  "client-components-render-twice": {
    upNext: ["rsc-shrinks-your-bundle", "series"],
    next: null,
    previous: null,
    related: ["designing-the-rsc-boundary"],
  },
  "server-components-run-on-the-server": {
    upNext: ["client-components-render-twice", "series"],
    next: null,
    previous: "streaming-with-suspense",
    related: ["designing-the-rsc-boundary"],
  },
  "streaming-with-suspense": {
    upNext: ["server-components-run-on-the-server", "related"],
    next: null,
    previous: "server-actions-for-mutations",
    related: ["rsc-shrinks-your-bundle", "caching-in-the-app-router"],
  },
  "server-actions-for-mutations": {
    upNext: ["streaming-with-suspense", "newer"],
    next: null,
    previous: "caching-in-the-app-router",
    related: [],
  },
  "caching-in-the-app-router": {
    upNext: ["server-components-run-on-the-server", "related"],
    next: "server-actions-for-mutations",
    previous: "designing-the-rsc-boundary",
    related: ["rsc-shrinks-your-bundle", "streaming-with-suspense"],
  },
  "designing-the-rsc-boundary": {
    upNext: ["server-components-run-on-the-server", "related"],
    next: "caching-in-the-app-router",
    previous: "why-i-started-this-journal",
    related: ["rsc-shrinks-your-bundle", "client-components-render-twice"],
  },
  "why-i-started-this-journal": {
    upNext: ["designing-the-rsc-boundary", "newer"],
    next: null,
    previous: null,
    related: [],
  },
};

describe("getPostEnding (real content)", () => {
  it("content: the per-post table covers every post", async () => {
    expect(slugs(await getPosts()).sort()).toEqual(Object.keys(TABLE).sort());
  });

  it.each(Object.entries(TABLE))("content: %s matches the spec table", async (slug, row) => {
    const ending = await getPostEnding(slug);
    expect([ending.upNext?.post.slug, ending.upNext?.reason]).toEqual(row.upNext);
    expect(ending.adjacent.next?.slug ?? null).toBe(row.next);
    expect(ending.adjacent.previous?.slug ?? null).toBe(row.previous);
    expect(slugs(ending.related)).toEqual(row.related);
  });

  it("content: invariants hold for every post (no repeats, never itself, no own series, related <= 3)", async () => {
    const posts = await getPosts();
    for (const current of posts) {
      const ending = await getPostEnding(current.slug);
      const shown = [
        ending.upNext?.post.slug,
        ending.adjacent.next?.slug,
        ending.adjacent.previous?.slug,
        ...slugs(ending.related),
      ].filter((s): s is string => !!s);
      expect(new Set(shown).size, `${current.slug}: duplicate in ${shown.join(", ")}`).toBe(shown.length);
      expect(shown, current.slug).not.toContain(current.slug);
      expect(ending.related.length, current.slug).toBeLessThanOrEqual(3);

      const own = realSeriesSlug(current);
      if (own) {
        const blocks = [ending.adjacent.next, ending.adjacent.previous, ...ending.related];
        for (const other of blocks) expect(other?.series?.slug, `${current.slug} -> ${other?.slug}`).not.toBe(own);
      }
    }
  });

  it("content: an unknown slug gives the empty ending", async () => {
    expect(await getPostEnding("does-not-exist")).toEqual(EMPTY);
  });

  it("content: getPostEnding equals decidePostEnding over getPosts", async () => {
    const posts = await getPosts();
    for (const { slug } of posts) expect(await getPostEnding(slug)).toEqual(decidePostEnding(posts, slug));
  });
});

// ---------------------------------------------------------------- AC6

describe("decidePostEnding: no candidate", () => {
  it("a single-post list gives the empty ending", () => {
    expect(decidePostEnding([post("only", { tags: ["a"] })], "only")).toEqual(EMPTY);
  });

  it("an unknown slug gives the empty ending (fixture list and empty list)", () => {
    const list = [post("a", { tags: ["x"] }), post("b", { tags: ["x"] })];
    expect(decidePostEnding(list, "nope")).toEqual(EMPTY);
    expect(decidePostEnding([], "nope")).toEqual(EMPTY);
  });

  it("slugs are matched exactly (case and whitespace matter)", () => {
    const list = [post("a"), post("b")];
    expect(decidePostEnding(list, "A")).toEqual(EMPTY);
    expect(decidePostEnding(list, " a")).toEqual(EMPTY);
    expect(decidePostEnding(list, "")).toEqual(EMPTY);
  });

  it("a lone post inside its own series has no candidate either", () => {
    const list = [post("p1", { series: { slug: "s", order: 1, total: 2 } }), post("p2", { series: { slug: "s", order: 2, total: 2 } })];
    expect(decidePostEnding(list, "p2")).toEqual(EMPTY);
  });
});

// ---------------------------------------------------------------- rules

describe("decidePostEnding: rules", () => {
  const s = (order: number) => ({ slug: "s", order, total: 3 });

  it("the series next part wins over a related post", () => {
    // newest first: related post, part 2, part 1 (+ part 3)
    const list = [post("rel", { tags: ["t"] }), post("p3", { series: s(3) }), post("p2", { series: s(2), tags: ["t"] }), post("p1", { series: s(1), tags: ["t"] })];
    const ending = decidePostEnding(list, "p1");
    expect(ending.upNext?.post.slug).toBe("p2");
    expect(ending.upNext?.reason).toBe("series");
    expect(slugs(ending.related)).toEqual(["rel"]);
  });

  it("the last part falls to a related post", () => {
    const list = [post("p3", { series: s(3), tags: ["t"] }), post("p2", { series: s(2), tags: ["t"] }), post("p1", { series: s(1), tags: ["t"] }), post("rel", { tags: ["t"] })];
    const ending = decidePostEnding(list, "p3");
    expect(ending.upNext).toMatchObject({ reason: "related" });
    expect(ending.upNext?.post.slug).toBe("rel");
    expect(slugs(ending.related)).toEqual([]);
  });

  it("parts of the post's own series never show in adjacent or related", () => {
    const list = [post("p3", { series: s(3), tags: ["t"] }), post("p2", { series: s(2), tags: ["t"] }), post("p1", { series: s(1), tags: ["t"] })];
    const ending = decidePostEnding(list, "p2");
    expect(ending.upNext?.post.slug).toBe("p3");
    expect(ending.adjacent).toEqual({ previous: null, next: null });
    expect(ending.related).toEqual([]);
  });

  it("a related pick in another real series becomes that series' part 1 (and the later part stays under related)", () => {
    const other = (order: number) => ({ slug: "o", order, total: 2 });
    // o2 shares the tag, o1 doesn't; c is the current post
    const list = [post("fill-new"), post("o2", { series: other(2), tags: ["t"] }), post("fill-mid"), post("c", { tags: ["t"] }), post("o1", { series: other(1) })];
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext?.post.slug).toBe("o1");
    expect(ending.upNext?.reason).toBe("related");
    expect(slugs(ending.related)).toEqual(["o2"]);
    // o1 is also the older neighbour: deduped to null
    expect(ending.adjacent.previous).toBeNull();
    expect(ending.adjacent.next?.slug).toBe("fill-mid");
  });

  it("a related pick that is already part 1 of its series stays as is", () => {
    const other = (order: number) => ({ slug: "o", order, total: 2 });
    const list = [post("c", { tags: ["t"] }), post("o2", { series: other(2) }), post("o1", { series: other(1), tags: ["t"] })];
    expect(decidePostEnding(list, "c").upNext?.post.slug).toBe("o1");
  });

  it("a one-part 'series' (total 1) is treated as no series", () => {
    const solo = { slug: "solo", order: 1, total: 1 };
    const list = [post("newer"), post("c", { series: solo }), post("older")];
    expect(realSeriesSlug(list[1])).toBeNull();
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext).toMatchObject({ reason: "newer" });
    expect(ending.upNext?.post.slug).toBe("newer");
    expect(ending.adjacent.previous?.slug).toBe("older");
  });

  it("a related post in a one-part series is not redirected", () => {
    const list = [post("c", { tags: ["t"] }), post("r", { tags: ["t"], series: { slug: "solo", order: 2, total: 1 } })];
    expect(decidePostEnding(list, "c").upNext?.post.slug).toBe("r");
  });

  it("a series post without total is treated as outside any series", () => {
    const list = [post("a", { series: { slug: "s", order: 1 } }), post("b", { series: { slug: "s", order: 2 } })];
    expect(decidePostEnding(list, "b").upNext).toMatchObject({ reason: "newer" });
    expect(realSeriesSlug(list[0])).toBeNull();
  });

  it("guard: never recommends the current post when totals disagree", () => {
    const list = [post("r", { tags: ["t"], series: { slug: "x", order: 2, total: 2 } }), post("c", { tags: ["t"], series: { slug: "x", order: 1, total: 1 } })];
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext?.post.slug).not.toBe("c");
  });

  it("no related post: the newer neighbour", () => {
    const ending = decidePostEnding([post("n", { tags: ["a"] }), post("c", { tags: ["b"] }), post("o", { tags: ["c"] })], "c");
    expect(ending.upNext).toMatchObject({ reason: "newer" });
    expect(ending.upNext?.post.slug).toBe("n");
    expect(ending.adjacent.next).toBeNull();
    expect(ending.adjacent.previous?.slug).toBe("o");
    expect(ending.related).toEqual([]);
  });

  it("no related and no newer: the older neighbour, and the adjacent slots empty", () => {
    const ending = decidePostEnding([post("c"), post("o")], "c");
    expect(ending.upNext).toMatchObject({ reason: "older" });
    expect(ending.upNext?.post.slug).toBe("o");
    expect(ending.adjacent).toEqual({ previous: null, next: null });
  });

  it("a newer neighbour in the own series is skipped, so the older one is picked", () => {
    const own = (order: number) => ({ slug: "s", order, total: 2 });
    // Newest first: p1 (own part) sits right above p2 (the last part), the non-series post below it.
    const list = [post("p1", { series: own(1) }), post("p2", { series: own(2) }), post("old")];
    const ending = decidePostEnding(list, "p2");
    expect(ending.upNext?.post.slug).toBe("old");
    expect(ending.upNext?.reason).toBe("older");
    expect(ending.adjacent).toEqual({ previous: null, next: null });
    expect(ending.related).toEqual([]);
  });

  it("the last part with only own-series neighbours has no up next; the first part still gets its next part", () => {
    const own = (order: number) => ({ slug: "s", order, total: 2 });
    const list = [post("p2", { series: own(2) }), post("p1", { series: own(1) }), post("old")];
    const ending = decidePostEnding(list, "p2");
    // p2 is the last part: no next part; its older neighbour p1 is an own part, skipped -> nothing
    expect(ending.upNext).toBeNull();
    const ending1 = decidePostEnding(list, "p1");
    expect(ending1.upNext?.post.slug).toBe("p2");
    expect(ending1.adjacent.previous?.slug).toBe("old");
  });

  it("an adjacent post equal to the pick becomes null, the other slot stays", () => {
    const list = [post("n"), post("c"), post("o")];
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext?.post.slug).toBe("n");
    expect(ending.adjacent.next).toBeNull();
    expect(ending.adjacent.previous?.slug).toBe("o");
  });

  it("related backfills past removed picks (still 3 results)", () => {
    // ranked (ties keep input order): r2, r3, r1, r4, r5, r6. Pick = r2, adjacent previous = r3.
    const list = ["r2", "c", "r3", "r1", "r4", "r5", "r6"].map((slug) => post(slug, { tags: ["t"] }));
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext?.post.slug).toBe("r2");
    expect(ending.adjacent.next).toBeNull();
    expect(ending.adjacent.previous?.slug).toBe("r3");
    expect(slugs(ending.related)).toEqual(["r1", "r4", "r5"]);
    expect(ending.related.length).toBe(RELATED_LIMIT);
  });

  it("related is capped at 3 even with many candidates", () => {
    const list = [post("c", { tags: ["t"] }), ...Array.from({ length: 10 }, (_, i) => post(`r${i}`, { tags: ["t"] }))];
    expect(decidePostEnding(list, "c").related).toHaveLength(3);
  });

  it("ranking: more shared tags first, ties keep newest-first order", () => {
    const list = [post("tie-new", { tags: ["a"] }), post("c", { tags: ["a", "b"] }), post("two", { tags: ["a", "b"] }), post("tie-old", { tags: ["b"] })];
    expect(slugs(rankRelated(list, list[1]))).toEqual(["two", "tie-new", "tie-old"]);
    const ending = decidePostEnding(list, "c");
    expect(ending.upNext?.post.slug).toBe("two");
  });

  it("tags match by slug ('App Router' = 'app-router') and posts with no tags are never related", () => {
    const list = [post("c", { tags: ["App Router"] }), post("r", { tags: ["app-router"] }), post("bare")];
    expect(slugs(rankRelated(list, list[0]))).toEqual(["r"]);
    expect(rankRelated(list, list[2])).toEqual([]);
  });

  it("duplicate slugs in the list do not crash", () => {
    const list = [post("a", { tags: ["t"] }), post("a", { tags: ["t"] }), post("b", { tags: ["t"] })];
    expect(() => decidePostEnding(list, "a")).not.toThrow();
  });
});
