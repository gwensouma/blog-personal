import { describe, expect, it } from "vitest";
import { searchPostsWithFacets } from "@/lib/data/posts";
import { MAX_QUERY_LENGTH, normalizeQuery, snippetAround, splitMatches } from "@/lib/highlight";
import { searchHref } from "@/lib/search";
import { tagSlug } from "@/lib/tags";

const slugs = (outcome: Awaited<ReturnType<typeof searchPostsWithFacets>>) => outcome.hits.map((hit) => hit.post.slug).sort();

describe("normalizeQuery", () => {
  it("caps the query at 100 characters", () => {
    expect(MAX_QUERY_LENGTH).toBe(100);
    expect(normalizeQuery("a".repeat(100))).toHaveLength(100);
    expect(normalizeQuery("a".repeat(101))).toHaveLength(100);
    expect(normalizeQuery("a".repeat(10_000))).toHaveLength(100);
  });

  it("trims before capping, and trims again after the cut", () => {
    expect(normalizeQuery(`   ${"b".repeat(100)}   `)).toBe("b".repeat(100));
    // A cut that lands right after a space doesn't leave trailing whitespace.
    expect(normalizeQuery(`${"c".repeat(99)} dddd`)).toBe("c".repeat(99));
  });

  it("strips bidi controls and zero-width space", () => {
    const controls = ["\u200B", "\u200E", "\u200F", "\u202A", "\u202B", "\u202C", "\u202D", "\u202E", "\u2066", "\u2067", "\u2068", "\u2069"];
    for (const control of controls) {
      expect(normalizeQuery(`sus${control}pense`), `U+${control.codePointAt(0)!.toString(16)}`).toBe("suspense");
    }
    expect(normalizeQuery("\u202Eesnepsus\u202C")).toBe("esnepsus");
  });

  it("keeps ZWJ so emoji sequences survive", () => {
    const family = "\u{1F468}\u200D\u{1F469}\u200D\u{1F467}";
    expect(normalizeQuery(family)).toBe(family);
    expect(normalizeQuery("a\u200Db")).toBe("a\u200Db");
  });

  it("stripped controls don't count toward the 100-char cap", () => {
    expect(normalizeQuery("\u200B".repeat(500) + "x".repeat(100))).toBe("x".repeat(100));
  });

  it("whitespace or controls only normalize to the empty string", () => {
    expect(normalizeQuery("")).toBe("");
    expect(normalizeQuery("   \t\n ")).toBe("");
    expect(normalizeQuery("\u200B\u202E \u2066")).toBe("");
  });
});

describe("splitMatches (highlight)", () => {
  it("matches case-insensitively and keeps the original casing in segments", () => {
    expect(splitMatches("Server and SERVER and server", "sErVeR")).toEqual([
      { text: "Server", match: true },
      { text: " and ", match: false },
      { text: "SERVER", match: true },
      { text: " and ", match: false },
      { text: "server", match: true },
    ]);
  });

  it("returns the whole text as one non-match for an empty or whitespace query", () => {
    expect(splitMatches("Hello", "")).toEqual([{ text: "Hello", match: false }]);
    expect(splitMatches("Hello", "   ")).toEqual([{ text: "Hello", match: false }]);
  });

  it("treats regex metacharacters in the query literally", () => {
    expect(splitMatches("a.b axb (c) [d] $e^ f*g", ".")).toEqual([
      { text: "a", match: false },
      { text: ".", match: true },
      { text: "b axb (c) [d] $e^ f*g", match: false },
    ]);
    expect(() => splitMatches("x", "(")).not.toThrow();
    expect(splitMatches("x (y) z", "(y)").filter((s) => s.match).map((s) => s.text)).toEqual(["(y)"]);
  });

  it.each([
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    '"><svg onload=alert(1)>',
  ])("returns %j as plain text segments, never markup", (payload) => {
    const text = `before ${payload} after`;
    const segments = splitMatches(text, payload);
    // Only plain {text, match} objects: nothing else to render, no HTML-producing field.
    for (const segment of segments) {
      expect(Object.keys(segment).sort()).toEqual(["match", "text"]);
      expect(typeof segment.text).toBe("string");
    }
    // The payload comes back verbatim (not escaped, not wrapped): React escapes it at render time.
    expect(segments).toEqual([
      { text: "before ", match: false },
      { text: payload, match: true },
      { text: " after", match: false },
    ]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });

  it("reassembles to the original text for any query", () => {
    const text = "Streaming pages with Suspense: stream, STREAM, streamed.";
    for (const query of ["stream", "e", "xyz", "Suspense:", " "]) {
      expect(splitMatches(text, query).map((s) => s.text).join("")).toBe(text);
    }
  });
});

describe("snippetAround", () => {
  it("returns null when there's no match", () => {
    expect(snippetAround("hello world", "nope")).toBeNull();
    expect(snippetAround("hello world", "")).toBeNull();
  });

  it("adds ellipses only on the cut sides", () => {
    const long = `${"word ".repeat(40)}needle ${"tail ".repeat(40)}`.trim();
    const snippet = snippetAround(long, "NEEDLE", 20)!;
    expect(snippet.startsWith("… ")).toBe(true);
    expect(snippet.endsWith(" …")).toBe(true);
    expect(snippet).toContain("needle");
    expect(snippetAround("short needle text", "needle")).toBe("short needle text");
  });
});

describe("searchHref", () => {
  it("encodes the query and tag and drops empty values", () => {
    expect(searchHref("")).toBe("/search");
    expect(searchHref("", null)).toBe("/search");
    expect(searchHref("a&b=c")).toBe("/search?q=a%26b%3Dc");
    expect(searchHref("x", "performance")).toBe("/search?q=x&tag=performance");
    expect(searchHref("", "performance")).toBe("/search?tag=performance");
  });
});

describe("searchPostsWithFacets", () => {
  it("returns nothing for an empty or whitespace-only query", async () => {
    for (const query of ["", "   ", "\t\n", "\u200B\u202E"]) {
      const outcome = await searchPostsWithFacets(query);
      expect(outcome, JSON.stringify(query)).toEqual({ query: "", tag: null, hits: [], facets: [] });
    }
  });

  it("caps the query at 100 characters before searching", async () => {
    const outcome = await searchPostsWithFacets("suspense".repeat(30));
    expect(outcome.query).toHaveLength(100);
    expect(outcome.hits).toEqual([]);
  });

  it("content: matches case-insensitively", async () => {
    const lower = await searchPostsWithFacets("suspense");
    const upper = await searchPostsWithFacets("SUSPENSE");
    const mixed = await searchPostsWithFacets("sUsPeNsE");
    expect(lower.hits.length).toBeGreaterThan(0);
    expect(slugs(upper)).toEqual(slugs(lower));
    expect(slugs(mixed)).toEqual(slugs(lower));
    expect(upper.query).toBe("SUSPENSE"); // the user's casing is kept for display
  });

  it("strips bidi controls and ZWSP from the query, so a hidden character doesn't break the match", async () => {
    const plain = await searchPostsWithFacets("suspense");
    const sneaky = await searchPostsWithFacets("sus\u200Bpen\u202Ese");
    expect(sneaky.query).toBe("suspense");
    expect(slugs(sneaky)).toEqual(slugs(plain));
  });

  it("an XSS payload is treated as a plain search string", async () => {
    const outcome = await searchPostsWithFacets("<script>alert(1)</script>");
    expect(outcome.query).toBe("<script>alert(1)</script>");
    expect(outcome.hits).toEqual([]);
  });

  it("regex metacharacters don't throw or match everything", async () => {
    for (const query of [".*", "(", "[", "\\", "$^"]) {
      await expect(searchPostsWithFacets(query)).resolves.toBeDefined();
    }
    expect((await searchPostsWithFacets(".*")).hits).toEqual([]);
  });

  it("content: facet counts ignore the active tag filter", async () => {
    const unfiltered = await searchPostsWithFacets("server");
    expect(unfiltered.hits.length).toBeGreaterThan(1);

    // Pick a facet that covers only some of the hits, so the filter really narrows.
    const narrow = unfiltered.facets.find((facet) => facet.count < unfiltered.hits.length)!;
    expect(narrow, "content fixture: 'server' should match posts across several tags").toBeDefined();

    const filtered = await searchPostsWithFacets("server", narrow.slug);
    expect(filtered.tag?.slug).toBe(narrow.slug);
    expect(filtered.hits).toHaveLength(narrow.count);
    expect(filtered.hits.length).toBeLessThan(unfiltered.hits.length);
    expect(filtered.hits.every((hit) => hit.post.tags.some((name) => tagSlug(name) === narrow.slug))).toBe(true);
    // Same chips and same counts with or without the filter.
    expect(filtered.facets).toEqual(unfiltered.facets);
  });

  it("an unknown tag slug is dropped, not an error", async () => {
    const outcome = await searchPostsWithFacets("server", "no-such-tag");
    expect(outcome.tag).toBeNull();
    expect(slugs(outcome)).toEqual(slugs(await searchPostsWithFacets("server")));
  });

  it("content: a known tag with no query lists that tag's posts", async () => {
    // Content fixture: three posts are tagged Performance.
    const outcome = await searchPostsWithFacets("", "performance");
    expect(outcome.tag?.name).toBe("Performance");
    expect(slugs(outcome)).toEqual(["caching-in-the-app-router", "rsc-shrinks-your-bundle", "streaming-with-suspense"]);
  });

  it("a body-only match carries a snippet that contains the query", async () => {
    const outcome = await searchPostsWithFacets("server");
    for (const hit of outcome.hits) {
      if (hit.snippet) expect(hit.snippet.toLowerCase()).toContain("server");
    }
  });
});
