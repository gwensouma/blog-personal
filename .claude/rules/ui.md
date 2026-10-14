---
paths:
  - "components/**"
  - "app/**/*.tsx"
  - "app/globals.css"
---

# UI rules

## Styling
- Tailwind v4 utilities with the semantic tokens in `app/globals.css` (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `text-primary`, `border-border`, `font-heading`, `font-sans`). No raw hex and no palette
  classes like `text-blue-700` (lint rejects them in class strings). `components/og-card.tsx` is the one exception:
  `ImageResponse` can't read CSS variables, so it mirrors the tokens as hex.
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

## Motion
- `motion/react` via `LazyMotion` + `m`, never the full `motion` component. Presets live in `lib/motion.ts`.
- Wrappers in `components/motion/` take Server Component content as `children`: wrap, don't convert.
- Above-the-fold entrances use CSS (Tailwind, `tw-animate-css`, scroll-driven animations) so they run before hydration;
  `motion` is for scroll reveals, springs and gestures.
- Content never stays invisible without JS, every effect respects `prefers-reduced-motion`, and only
  `transform`/`opacity` animate. Decisions: `.design/blog-refactor.md`.

## Design reference
- Mockups: `.design/Main.dc.html` and `.design/Detail.dc.html`. An editorial layout: Fraunces headings
  (`--font-heading`) and Source Sans 3 body (`--font-sans`), both loaded with `next/font` in `app/layout.tsx`.
- Palette: deep blue `--primary` (`#1d4ed8`) on white/black (see `app/globals.css`), chosen over the mockups'
  warm paper. Motion is deliberately bold on top of the editorial look.
- Keep new UI consistent with this unless the user changes direction; write a direction change to `.design/`.
