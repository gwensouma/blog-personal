import "server-only";
import GithubSlugger from "github-slugger";
import rehypeShiki from "@shikijs/rehype";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Root } from "hast";
import type { TocItem } from "@/types/post";

// Minimal hast shape, enough for the plugins below.
type HastNode = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: HastNode[] };

/** Wraps every <table> in a focusable, horizontally scrollable region so wide
 * tables scroll on small screens without changing the table's display. */
function rehypeWrapTables() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "table") {
          return {
            type: "element",
            tagName: "div",
            properties: { className: ["table-wrapper"], role: "region", ariaLabel: "Table", tabIndex: 0 },
            children: [child],
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

const isBlank = (node: HastNode) => node.type === "text" && !node.value?.trim();

/** Inline images get lazy loading. An image alone in its paragraph,
 * `![alt](src "title")`, becomes a <figure> whose <figcaption> is the title. */
function rehypeFigures() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "img") {
          child.properties = { ...child.properties, loading: "lazy", decoding: "async" };
          return child;
        }
        walk(child);
        if (child.tagName !== "p") return child;

        const content = child.children?.filter((c) => !isBlank(c)) ?? [];
        const [img] = content;
        if (content.length !== 1 || img.tagName !== "img") return child;

        const { title, ...imgProps } = img.properties ?? {};
        const caption = typeof title === "string" && title.trim() ? title.trim() : null;
        return {
          type: "element",
          tagName: "figure",
          properties: {},
          children: [
            { ...img, properties: imgProps },
            ...(caption ? [{ type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: caption }] }] : []),
          ],
        };
      });
    };
    walk(tree);
  };
}

/** GitHub-style alerts. A blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`,
 * `[!WARNING]` or `[!CAUTION]` becomes `div[data-callout][role=note]` with a title paragraph
 * (`p[data-callout-title] > strong`) and a `div[data-callout-body]` holding the rest.
 * post-body.tsx maps the title to CalloutTitle (adds the icon); the plain HTML string still
 * reads well (a bold "Note" line, then the content) where the React mapping doesn't apply. */
const CALLOUT_KINDS = { NOTE: "Note", TIP: "Tip", IMPORTANT: "Important", WARNING: "Warning", CAUTION: "Caution" } as const;
const CALLOUT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\r?\n|$)/i;

function rehypeCallouts() {
  return (tree: HastNode) => {
    let count = 0;
    const toCallout = (node: HastNode): HastNode | null => {
      const firstIndex = node.children?.findIndex((c) => !isBlank(c)) ?? -1;
      const first = node.children?.[firstIndex];
      const firstText = first?.tagName === "p" ? first.children?.[0] : undefined;
      if (firstText?.type !== "text") return null;
      const match = CALLOUT_MARKER.exec(firstText.value ?? "");
      if (!match || !first) return null;

      const kind = match[1].toUpperCase() as keyof typeof CALLOUT_KINDS;
      const label = CALLOUT_KINDS[kind];
      // Strip the marker, then any leading whitespace or hard break (`> [!NOTE]` followed by two
      // spaces leaves a <br>); drop the paragraph if the marker was all it held.
      firstText.value = (firstText.value ?? "").slice(match[0].length);
      const inline = first.children ?? [];
      while (inline[0] && (inline[0].tagName === "br" || (inline[0].type === "text" && !inline[0].value?.trim()))) inline.shift();
      if (inline[0]?.type === "text") inline[0].value = inline[0].value?.trimStart();
      first.children = inline;
      const rest = (node.children ?? []).slice(firstIndex + 1);
      const body = [...(first.children?.some((c) => !isBlank(c)) ? [first] : []), ...rest].filter((c) => !isBlank(c));

      // Same prefix as footnote ids, so it can't collide with heading slugs.
      const id = `user-content-callout-${++count}`;
      return {
        type: "element",
        tagName: "div",
        properties: { dataCallout: kind.toLowerCase(), role: "note", ariaLabelledBy: id },
        children: [
          {
            type: "element",
            tagName: "p",
            properties: { id, dataCalloutTitle: kind.toLowerCase() },
            children: [{ type: "element", tagName: "strong", properties: {}, children: [{ type: "text", value: label }] }],
          },
          { type: "element", tagName: "div", properties: { dataCalloutBody: "" }, children: body },
        ],
      };
    };
    const walk = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        walk(child);
        return child.tagName === "blockquote" ? (toCallout(child) ?? child) : child;
      });
    };
    walk(tree);
  };
}

/** Wraps each fenced code block (`pre > code`) in `<div data-code-block data-language="tsx">`.
 * components/posts/post-body.tsx maps that wrapper to the CodeBlock Server Component,
 * which adds the toolbar (language label + copy button). Runs before Shiki, which still
 * finds the `pre > code` inside and replaces it with highlighted HTML. */
function rehypeCodeBlocks() {
  return (tree: HastNode) => {
    const walk = (node: HastNode) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        const code = child.tagName === "pre" ? child.children?.find((c) => c.tagName === "code") : undefined;
        if (!code) {
          walk(child);
          return child;
        }
        const classes = code.properties?.className;
        const languageClass = Array.isArray(classes) ? classes.find((c) => typeof c === "string" && c.startsWith("language-")) : undefined;
        const language = typeof languageClass === "string" ? languageClass.slice("language-".length) : "";
        const showLanguage = language && !["text", "txt", "plaintext"].includes(language);
        return {
          type: "element",
          tagName: "div",
          properties: { dataCodeBlock: "", ...(showLanguage ? { dataLanguage: language } : {}) },
          children: [child],
        };
      });
    };
    walk(tree);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // GFM footnotes: the "Footnotes" heading is visible (a small ruled endnote section, styled in
  // post-body.tsx) instead of the default sr-only. Ids keep the `user-content-` prefix so they
  // can't collide with heading slugs; U+FE0E keeps the back arrow from rendering as an emoji.
  .use(remarkRehype, { footnoteLabelProperties: {}, footnoteBackContent: "↩︎" })
  .use(rehypeCallouts)
  .use(rehypeWrapTables)
  .use(rehypeFigures)
  .use(rehypeCodeBlocks)
  .use(rehypeSlug)
  .use(rehypeAutolinkHeadings, {
    behavior: "append",
    // The footnotes heading is an endnote label, not a section to link to.
    test: (node: { properties?: Record<string, unknown> }) => node.properties?.id !== "footnote-label",
    properties: { className: ["heading-anchor"], ariaHidden: "true", tabIndex: -1 },
    content: { type: "text", value: "#" },
  })
  // Dual themes: colors are emitted as CSS variables, switched by the .dark class in globals.css.
  // Without `langs` Shiki preloads every bundled grammar (about 11s on the first post render of a cold
  // server). Preload the ones the posts use; `lazy` loads any other fence language on first use.
  .use(rehypeShiki, {
    themes: { light: "github-light", dark: "github-dark-default" },
    defaultColor: false,
    langs: ["ts", "tsx", "bash"],
    lazy: true,
  })
  .use(rehypeStringify);

/** Renders trusted Markdown (authored in content/posts) on the server to an HTML syntax
 * tree (hast); post-body.tsx turns it into React elements. Need a string later (e.g. a
 * full-content feed)? `processor.stringify(tree)` produces it from the same tree. */
export async function renderMarkdown(markdown: string): Promise<Root> {
  return (await processor.run(processor.parse(markdown))) as Root;
}

/** Extracts h2/h3 headings with the same ids rehype-slug generates. */
export function extractToc(markdown: string): TocItem[] {
  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const text = match[2].replace(/[`*_]/g, "");
    toc.push({ id: slugger.slug(text), text, depth: match[1].length as 2 | 3 });
  }

  return toc;
}

const WORDS_PER_MINUTE = 220;

export function estimateReadingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
