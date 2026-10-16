import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

// Shiki preloads only the languages the posts use (lib/markdown.ts); any other fence language is
// loaded on first use, so it still gets highlighted rather than falling back to plain text.
// The hast tree as JSON is enough to see Shiki's class and its per-token CSS variables.
const render = async (markdown: string) => JSON.stringify(await renderMarkdown(markdown));

describe("renderMarkdown code highlighting", () => {
  it("highlights a preloaded language", async () => {
    const tree = await render("```tsx\nconst a = <b />;\n```");
    expect(tree).toContain('"shiki');
    expect(tree).toContain("--shiki-light:");
  });

  it("highlights a language that isn't preloaded", async () => {
    const tree = await render('```json\n{ "a": 1 }\n```');
    expect(tree).toContain('"shiki');
    expect(tree).toContain("--shiki-light:");
  });

  it("leaves a fence without a language unhighlighted", async () => {
    const tree = await render("```\nplain\n```");
    expect(tree).toContain("plain");
  });
});
