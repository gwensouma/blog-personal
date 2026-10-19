---
paths:
  - "components/**"
  - "app/**/*.tsx"
  - "app/globals.css"
---

# UI rules

The design reference: these rules plus the code they point to. Keep new UI consistent with them unless the user
changes direction; a direction change is a decision (`.design/decisions.md`) and an edit to this file.

## Look
- Editorial genre: Fraunces headings (`font-heading`: wordmark, h1–h3, blockquotes, footer headings; roman, no
  italics) and Source Sans 3 for everything else, both via `next/font` in `app/layout.tsx`. Post body `text-lg/8`.
- Palette: deep petrol `--primary` (`#076b6f`) on white, deep ink (hue 215) in dark, with the primary lifted so text
  pairs keep >= 4.5:1 (D-015). The values live only in `app/globals.css`.
- Layout: header and footer span `max-w-5xl`; every page body sits in the 720px `ReadingColumn`. Post pages at `xl`
  are a `1fr | 45rem | 1fr` grid with a sticky TOC in the right gutter; below `xl` the TOC is a `<details>`.
- One hairline rule per section boundary (the header's is the only one at the top; lists carry their own `border-t`).
- List rows: only the title is a link, stretched over the row (`after:absolute after:inset-0`); tags above it are
  `relative z-10`.
- Covers: `components/posts/post-cover.tsx` renders a real image (`cover` frontmatter, files in
  `public/images/posts/`) or a default cover whose variant comes from `lib/cover-variant.ts`. The default cover is
  decorative (`aria-hidden`); a real image is a `<figure>` with alt text. Frames have a fixed aspect, so no layout shift.

## Styling
- Tailwind v4 utilities with the semantic tokens in `app/globals.css` (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `text-primary`, `border-border`, `bg-brand`, `font-heading`, `font-sans`). No raw hex and no
  palette classes like `text-blue-700` (lint rejects them in class strings). `components/og-card.tsx` is the one
  exception: `ImageResponse` can't read CSS variables, so it mirrors the tokens as hex.
- Prefer shadcn components (`components/ui/`, added with `npx shadcn@latest add <name>`) over hand-rolled ones. They
  are owned source you may edit.
- Don't add hand-written CSS classes to `globals.css`: it holds tokens, the base layer and the Shiki/dark-mode glue.
  Markdown prose styles live as arbitrary variants in `components/posts/post-body.tsx`.
- Icons come from `lucide-react`.

## Client Components
Only small leaves are `"use client"`: `like-button`, `copy-link-button`, `nav-link`, `mobile-nav`, `theme-toggle`,
`auto-hide-header`, `toc-spy`, `back-to-top`, `command-menu`/`command-palette` (lazy-loaded on first open),
`code-copy-button`, `newsletter-form`, the JS-driven wrappers in `components/motion/`, and the required
`error.tsx`/`global-error.tsx`. New interactivity is another small leaf like these, never a page turned client.

## Rendering without JS
- Essential content renders inline, in the first HTML. A `<Suspense>` fallback (and a `loading.tsx`, which is one)
  stays visible forever without JS, so it only wraps non-essential or JS-dependent content, and never essential
  content on an ISR page (D-011). `/posts/[slug]` has no `loading.tsx` (D-016).

## Motion
- Bold motion on the editorial look (D-003). Only `transform`/`opacity` animate (plus `background-size` for link sweeps
  and `pathLength` for drawn icons). Content never stays invisible without JS or in print.
- Presets have one source each: CSS easings and keyframes in `app/globals.css` (`@theme`), JS eases, durations and
  springs in `lib/motion.ts`. Use them; don't inline new curves.
- `motion/react` via `LazyMotion` + `m`, never the full `motion` component; the feature set loads after hydration.
  Wrappers in `components/motion/` take Server Component content as `children`: wrap, don't convert.
- Above-the-fold entrances are CSS (Tailwind, `tw-animate-css`), so they run before hydration and no-JS users see the
  final state. `motion` is for scroll reveals, springs and gestures; scroll reveals render visible and hide only
  blocks below the viewport at hydration.
- `prefers-reduced-motion`: `MotionConfig reducedMotion="user"` drops transforms in `motion`; every CSS entrance or
  hover transform sits behind `motion-safe:` or has `motion-reduce:transition-none`. Functional motion (the reading
  progress bar) still runs.
