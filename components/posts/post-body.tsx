import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { Root } from "hast";
import { CodeBlock } from "@/components/posts/code-block";
import { cn } from "@/lib/utils";

// Typography for the Markdown produced by lib/markdown.ts. The Markdown elements
// can't carry utility classes, so element styles are scoped with arbitrary
// variants on this one container (theme tokens only, no global CSS classes).
const proseClasses = [
  "min-w-0 text-lg/8 text-foreground",
  // Vertical rhythm between top-level blocks.
  "[&>*+*]:mt-6 [&>*:first-child]:mt-0",
  // Headings.
  "[&_h2]:mt-14 [&_h2]:scroll-mt-24 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-balance sm:[&_h2]:text-3xl",
  "[&_h3]:mt-10 [&_h3]:scroll-mt-24 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:leading-snug [&_h3]:font-semibold",
  "[&_:is(h2,h3)+*]:mt-4",
  // Heading anchors (appended "#"): hidden until the heading is hovered or targeted.
  "[&_.heading-anchor]:ml-2 [&_.heading-anchor]:font-sans [&_.heading-anchor]:font-normal [&_.heading-anchor]:text-muted-foreground [&_.heading-anchor]:no-underline [&_.heading-anchor]:opacity-0 [&_.heading-anchor]:transition-opacity motion-reduce:[&_.heading-anchor]:transition-none",
  "[&_:is(h2,h3):hover_.heading-anchor]:opacity-100 [&_:is(h2,h3):target_.heading-anchor]:opacity-100 [&_.heading-anchor:hover]:text-primary",
  // Links.
  // Links: a faint hairline at rest, a 2px primary underline sweeps in on hover (two background
  // layers, so it wraps across lines; transition only on background-size).
  "[&_a:not(.heading-anchor)]:rounded-sm [&_a:not(.heading-anchor)]:text-primary [&_a:not(.heading-anchor)]:outline-none [&_a:not(.heading-anchor)]:pb-0.5 [&_a:not(.heading-anchor)]:bg-no-repeat [&_a:not(.heading-anchor)]:[box-decoration-break:clone]",
  "[&_a:not(.heading-anchor)]:bg-[linear-gradient(currentColor,currentColor),linear-gradient(color-mix(in_oklch,currentColor_40%,transparent),color-mix(in_oklch,currentColor_40%,transparent))] [&_a:not(.heading-anchor)]:bg-[length:0%_2px,100%_1px] [&_a:not(.heading-anchor)]:bg-[position:0_100%,0_100%]",
  "[&_a:not(.heading-anchor)]:transition-[background-size] [&_a:not(.heading-anchor)]:duration-300 [&_a:not(.heading-anchor)]:ease-out-expo motion-reduce:[&_a:not(.heading-anchor)]:transition-none",
  "[&_a:not(.heading-anchor):hover]:bg-[length:100%_2px,100%_1px] [&_a:not(.heading-anchor):focus-visible]:ring-3 [&_a:not(.heading-anchor):focus-visible]:ring-ring/50",
  // Lists.
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-2 [&_li]:pl-1 [&_li]:marker:text-muted-foreground",
  "[&_strong]:font-semibold",
  // Inline code.
  "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:[overflow-wrap:anywhere]",
  // Code blocks (Shiki dual theme: colors come from --shiki-light / --shiki-dark).
  // lib/markdown.ts wraps each block in [data-code-block], rendered by CodeBlock: a toolbar row
  // (language label + CodeCopyButton) above the scrolling <pre>. The frame is on the wrapper,
  // so the toolbar stays put while the code scrolls sideways.
  "[&_[data-code-block]]:overflow-hidden [&_[data-code-block]]:rounded-lg [&_[data-code-block]]:border [&_[data-code-block]]:border-border [&_[data-code-block]]:bg-muted",
  "[&_[data-code-toolbar]]:flex [&_[data-code-toolbar]]:h-10 [&_[data-code-toolbar]]:items-center [&_[data-code-toolbar]]:gap-3 [&_[data-code-toolbar]]:border-b [&_[data-code-toolbar]]:border-border [&_[data-code-toolbar]]:px-4",
  "[&_[data-code-lang]]:font-mono [&_[data-code-lang]]:text-xs [&_[data-code-lang]]:tracking-wide [&_[data-code-lang]]:text-muted-foreground",
  "[&_pre]:overflow-x-auto [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm/6 [&_pre]:outline-none",
  // Inset ring: the wrapper clips overflow, so an outer ring would be cut off.
  "[&_pre:focus-visible]:ring-3 [&_pre:focus-visible]:ring-inset [&_pre:focus-visible]:ring-ring/50",
  "[&_.shiki]:text-(--shiki-light) [&_.shiki_span]:text-(--shiki-light) dark:[&_.shiki]:text-(--shiki-dark) dark:[&_.shiki_span]:text-(--shiki-dark)",
  // Blockquotes.
  "[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-5 [&_blockquote]:font-heading [&_blockquote]:text-xl/8 [&_blockquote]:text-foreground",
  // Tables: lib/markdown.ts wraps each <table> in .table-wrapper, which scrolls
  // horizontally so the table itself keeps its native semantics.
  "[&_.table-wrapper]:overflow-x-auto [&_.table-wrapper]:rounded-sm [&_.table-wrapper]:outline-none [&_.table-wrapper:focus-visible]:ring-3 [&_.table-wrapper:focus-visible]:ring-ring/50",
  "[&_table]:w-full [&_table]:text-base [&_table]:tabular-nums",
  "[&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-6 [&_th]:text-left [&_th]:font-semibold [&_th]:whitespace-nowrap",
  "[&_td]:border-b [&_td]:border-border [&_td]:py-2 [&_td]:pr-6 [&_td]:align-top",
  // Rules and media. Standalone images are <figure>s (lib/markdown.ts) with extra room around them.
  "[&_hr]:my-12 [&_hr]:border-border [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&>*+figure]:mt-10 [&>figure+*]:mt-10 [&_figure]:flex [&_figure]:flex-col [&_figure]:gap-3 [&_figure_img]:mx-auto [&_figure_img]:bg-muted",
  "[&_figcaption]:text-sm [&_figcaption]:leading-relaxed [&_figcaption]:text-muted-foreground",
  // Headings fade and figures fade up as they scroll into view: a CSS scroll-driven
  // animation (animation-timeline: view()) reusing tw-animate-css's `enter` keyframes. The
  // body is server HTML, so no JS is involved; browsers without support, and reduced-motion
  // users, simply get static content. Headings are opacity-only: a translate would shift the
  // box that anchor/TOC jumps measure, landing them off by the offset. The timeline is
  // !important because the `animation` shorthand resets animation-timeline and utility
  // order isn't guaranteed. Print always shows the final state.
  "motion-safe:supports-[animation-timeline:view()]:[&_:is(h2,h3,figure)]:[--tw-enter-opacity:0] motion-safe:supports-[animation-timeline:view()]:[&_figure]:[--tw-enter-translate-y:2rem]",
  "motion-safe:supports-[animation-timeline:view()]:[&_:is(h2,h3,figure)]:[animation:enter_linear_both] motion-safe:supports-[animation-timeline:view()]:[&_:is(h2,h3,figure)]:[animation-timeline:view()]! motion-safe:supports-[animation-timeline:view()]:[&_:is(h2,h3,figure)]:[animation-range:entry_0%_entry_90%]!",
  "print:[&_:is(h2,h3,figure)]:[animation:none]!",
].join(" ");

// Element overrides for the Markdown tree. Only the code-block wrapper gets a component;
// everything else renders as the plain element.
function MarkdownDiv(props: React.ComponentProps<"div">) {
  return "data-code-block" in props ? <CodeBlock {...props} /> : <div {...props} />;
}

// Server Component: the post's hast tree (trusted, authored in content/posts and
// rendered on the server by lib/markdown.ts, Shiki included) becomes React elements
// here, on the server. No dangerouslySetInnerHTML: React owns the DOM, so server
// re-renders (e.g. after a like) reconcile it instead of replacing it, and client
// leaves can live inside it. The only client JS is CodeCopyButton in each code block.
export function PostBody({ content, className }: { content: Root; className?: string }) {
  return (
    <div className={cn(proseClasses, className)}>
      {toJsxRuntime(content, { Fragment, jsx, jsxs, components: { div: MarkdownDiv } })}
    </div>
  );
}
