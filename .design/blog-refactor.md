# Blog UI refactor: design decisions

Genre: editorial (hallmark). It builds on Main.dc.html / Detail.dc.html and keeps the deep-blue palette from CLAUDE.md.

## Tokens
- Light: unchanged (`--primary` #1d4ed8 on white, `--muted` #f4f6f9, `--border` #e2e6ec).
- Dark (new): navy ink, hue 262. Background oklch(0.17 0.018 262), foreground oklch(0.94 0.008 262),
  muted/secondary oklch(0.23–0.24 0.02 262), border oklch(0.30 0.02 262), primary lifted to
  oklch(0.74 0.13 260) with dark primary-foreground so links and buttons keep >= 4.5:1.
- Code blocks: `bg-muted` + `border-border`. Shiki token colors come from `--shiki-light` / `--shiki-dark`.

## Layout
- The header and footer span `max-w-5xl`. Every page body sits in a centered `max-w-180` (720px) `ReadingColumn`.
- Post pages at `xl`: a 3-column grid `1fr | 45rem | 1fr`. The article stays centered and the TOC is sticky in the right gutter.
  Below `xl`, the TOC is a `<details>` above the body.
- Hairline rules separate sections. There is one rule per boundary: the header's rule is the only one at the top of a page,
  and lists carry their own `border-t`.

## Type
- Fraunces (`font-heading`) for the wordmark (small, uppercase, `tracking-widest`, primary), h1–h3, blockquotes and
  footer headings. Source Sans 3 for everything else. Headings stay roman (no italics).
- Post body: `text-lg/8`. h2 is 2xl→3xl and h3 is xl. The `#` heading anchor appears on hover.

## Patterns
- List rows: only the title is a link, stretched over the row with `after:absolute after:inset-0`. Tags sit above it with
  `relative z-10`.
- Prose styles live on one component (`components/posts/post-body.tsx`) as arbitrary variants, not as a global `.prose`
  class (CLAUDE.md: no new hand-written CSS classes).
- The like button is an outline pill (rounded-full) with a primary heart, per Detail.dc.html.

## Post covers (Phase 1: image foundation)
Every post has a cover. If frontmatter sets `cover`, the real image is used. Otherwise every post shows the same
**default cover** until real images exist. `components/posts/post-cover.tsx` renders either one (Server Component,
no client JS). The earlier generative motifs (`lib/cover.ts`: tree/islands/stream/graph) were removed: they read as
technical diagrams rather than covers.

### The default cover
A calm, branded placeholder that should look intentional, not like a broken image:
- **Field:** `bg-linear-160 from-brand to-brand-deep`, a tonal gradient that stays within the primary hue, plus a soft
  radial light at the top left (`brand-foreground` at 16%) so the field doesn't read flat.
- **Grain:** an inline SVG `feTurbulence` (fractal noise, desaturated) at 30% opacity, `mix-blend-overlay`. The filter id
  is derived from the slug.
- **Mark:** centered. The wordmark is `site.name` in Fraunces, semibold, uppercase, `tracking-widest` (the same treatment
  as the header). Below it sit a short hairline and the post's first tag in Source Sans, sentence case.
- **Scale:** the cover is an `@container`, and type and gaps use `cqi` units with `clamp()`, so the same markup works from a
  thumbnail to the 720px hero. This replaces the old dual mobile/desktop SVG trick.
- **Tokens** (in `app/globals.css`; they are named `brand`, not `cover`, because `bg-cover` would collide with Tailwind's
  background-size utility):

  | Token | Light | Dark |
  |---|---|---|
  | `--brand` | `#1d4ed8` (= primary) | `oklch(0.38 0.13 262)` |
  | `--brand-deep` | `oklch(0.36 0.17 266)` | `oklch(0.26 0.08 264)` |
  | `--brand-foreground` | `oklch(0.985 0 0)` | `oklch(0.96 0.01 262)` |

  In dark mode the field is a deep blue rather than the lifted dark-mode primary, so a 720px block doesn't glare.
- **A11y:** the default cover is decorative (`aria-hidden`, no figure). A real image is a `<figure>` with alt text and an
  optional caption/credit.
- **Entrance:** the cover contents (real or default) settle from `scale(1.08)` inside the fixed frame over 1s with
  `ease-out-expo`. This is CSS (`motion-safe:animate-in zoom-in-[1.08]`), so it runs on first paint.

### Sizes
`<PostCover post aspect size priority className>` (API unchanged, so Phase 2 can reuse it):
- `aspect`: `2/1 | 16/9 | 3/2 | 1/1`. The frame is fixed, and real images are cropped with `object-cover`, so there
  is no layout shift.
- `size`: `thumb | card | hero`. It sets `sizes` for real images. The default cover scales with its container.

### Usage in Phase 1
- **Post detail:** the cover sits below the header rule, at the full reading-column width (720px), with `priority`.
  A real image uses `2/1`. The default cover uses a shorter `3/1` band (720x240), because an identical placeholder
  shouldn't push the body down. The skeleton reserves the `aspect-[3/1] rounded-lg` frame.
- **OG image:** a 420px full-height panel on the right edge with a hairline left rule. A default cover is the same
  composition drawn by Satori in `components/og-card.tsx` (`OgDefaultCover`): a linear and radial gradient, wordmark,
  hairline and tag. It uses literal light-theme values (`OG_COLORS.brand/brandDeep/brandForeground`), because Satori can't
  read CSS variables, and it has no grain, because Satori can't render SVG filters. A real image is resized with sharp to a
  JPEG data URI.
- **Markdown:** `![alt](src "title")` alone in a paragraph becomes `<figure><img loading="lazy"
  decoding="async"><figcaption>title</figcaption></figure>`. Prose styles live in `post-body.tsx`.

### Real images
Frontmatter: `cover: { src, alt, caption?, credit?, width?, height? }` (documented in `lib/data/posts.ts`).
- **Local files:** they go in `public/images/posts/`. Their size and a 16px blur placeholder are read with sharp in
  `lib/data/images.ts`, memoised per src. A missing or invalid file logs an error and falls back to the default cover.
  `src` must start with `/`.
- **Remote URLs:** they need `width`/`height` and a `next.config` `images.remotePatterns` entry. They get no blur.

## Motion (Phase 3)
The user asked for bold, noticeable motion. It adds energy on top of the editorial look, which stays the same. The rules:
animate only `transform`/`opacity` (plus `background-size` for underline sweeps and `pathLength` for the drawn check).
Never hide first paint. Content stays readable without JS. Everything respects `prefers-reduced-motion`.

### Presets (one source of truth)
- **CSS tokens** (`app/globals.css`, `@theme`): `ease-out-expo` `cubic-bezier(0.16,1,0.3,1)`, `ease-in-expo`
  `(0.7,0,0.84,0)`, `ease-in-out-expo` `(0.65,0,0.35,1)`, and `ease-spring`, a sampled `linear()` spring (damping ratio
  0.65, about 7% overshoot, so it stays under the 10% cap). The hero glows use `animate-drift` (22s, alternate,
  infinite) and `animate-drift-slow` (27s, -9s, alternate-reverse).
- **JS presets** (`lib/motion.ts`): the same three eases; durations `micro .12 / short .22 / long .42 / reveal .7` s;
  springs `reveal` (140/22), `snappy` (420/36), `pop` (520/18) and `progress` (260/40); reveal choreography `offset 28px`,
  `stagger 80ms`, `margin "100000px 0px -12% 0px"`, `foldRatio 1`. It also holds the CSS class constants
  `enterStaggerClassName` / `enterStaggerStyle(i)` (first-load row entrance) and `linkSweepClassName` (author links).

### Architecture (RSC)
- `components/motion/` holds the generic primitives. Client wrappers take Server Component `children` and only pass them
  through: `motion-provider` (LazyMotion + `MotionConfig reducedMotion="user"`, mounted once in `app/layout.tsx`),
  `reveal`, `stagger` (`StaggerList` / `StaggerItem`), `scroll-progress`, `page-transition`, and the `use-reveal` hook.
  CSS-only primitives stay Server Components: `text-reveal`, `enter` and `drift-backdrop`. The home intro is
  `components/home-hero.tsx` (server), so `app/(blog)/page.tsx` stays thin.
- Bundle: `LazyMotion strict` + `m.*` only. The `domAnimation` feature set is imported asynchronously
  (`components/motion/motion-features.ts`), so it loads after hydration. `domMax` isn't needed: the TOC marker uses
  measured transforms, not layout animations.
- Entity and chrome leaves: `components/posts/toc-spy.tsx`, `components/layout/auto-hide-header.tsx`, and the existing
  `like-button`, `copy-link-button` and `theme-toggle`.

### First paint, no JS, LCP
- Above-the-fold entrances are **CSS keyframes** (tw-animate-css `animate-in` plus the tokens above). They run before
  hydration, and no-JS users see the final state.
- Scroll reveals (`useReveal`) are server-rendered **visible**. At hydration, a `useLayoutEffect` hides only blocks whose
  top is below the viewport (so before paint, and off screen), then reveals them when they cross 88% of the viewport.
  Anything the user can already see is never hidden. The bottom-unbounded `margin` means content scrolled past (scroll
  restoration, anchor jumps) counts as revealed, so nothing can get stuck invisible.
- Because of this, lists that start on screen get a **CSS** staggered entrance instead. The inner row and the featured
  block fade and rise 16px over 400ms (`ease-out-expo`), each delayed `min(i, 4) * 50ms` (`enterStagger` in `lib/motion.ts`, written to the `--enter-delay` var), so the
  sequence takes at most about 600ms. It runs before hydration. Rows below the fold also get the `motion` scroll reveal.
- **Print:** `Reveal` / `StaggerItem` carry `print:opacity-100! print:transform-none!`, and the prose scroll reveals are
  off in print, so nothing prints blank.

### What uses CSS vs `motion`
| Effect | Where | Tech |
|---|---|---|
| Hero title, word by word: each word rises out of an overflow mask with a 6deg tilt, 900ms `ease-spring`, 70ms stagger | home | CSS (`TextReveal`, server) |
| Hero dek and intro: fade and rise, 700ms `ease-out-expo`, at +420 / +560ms | home | CSS (`Enter`, server) |
| Hero backdrop: hairline grid faded with a `closest-side` radial mask, plus two blurred glows drifting (22s / 27s). Glows are `primary/8` and `primary/6` in light, `primary/12` and `primary/9` in dark. Measured against sampled pixels across 8 drift phases, the muted dek/intro stays at least 4.65:1 (desktop) / 4.56:1 (375px) in light and 5.14 / 5.12 in dark. The limit is the grid hairlines, not the glows | home | CSS (`DriftBackdrop`, server) |
| Page enter: fade plus 16px rise, 500ms `ease-out-expo`. Restarts on every pathname change (the root template only remounts across route groups). `fill-mode: none`, so no transform is left behind (keeps `position: fixed` working) | all pages | CSS, restarted by a client effect |
| Section and heading reveals (featured, "Latest posts", related heading, adjacent nav) | home, post | `motion` `Reveal` (spring `reveal`) |
| Staggered list rows (home latest, `/posts` archive, `/tags/[tag]`, `/search`, related posts) | lists | `motion` `StaggerList` / `StaggerItem` (80ms stagger) |
| Row hover/focus: row shifts 8px right, a 2px primary bar sweeps down the left edge (`scale-y`), an arrow slides in from the left, the title turns primary | all post rows, featured, related | CSS (`PostRowAccent`, server) |
| Adjacent nav: card lifts 4px, its arrow nudges outwards | post | CSS |
| Reading progress: a 4px primary bar fixed at the top, `scaleX` from `useScroll` on `#post-article`, smoothed with a spring | post | `motion` |
| TOC scroll-spy: `aria-current="location"` on the section being read, link shifts 4px, a primary marker (1px bar scaled to the link height) springs along the rail | post (xl aside) | `motion` (`TocSpy`); the list itself stays server HTML |
| Body h2/h3 fade in and figures fade up as they enter the viewport. Headings are opacity-only: a translate would shift the box that anchor/TOC jumps measure, so jumps would land off by the offset (they now land at exactly 96px) | post | CSS scroll-driven (`animation-timeline: view()`, `@supports`-gated) |
| Cover settle | post | CSS |
| Like: the heart pops from 0.4 on the `pop` spring, 8 particles burst 26px and fade (700ms) | post | `motion`; no particles with reduced motion |
| Copy link: the check is drawn with `pathLength` (350ms) | post | `motion` |
| Theme toggle: sun and moon are stacked; the outgoing icon rotates 90deg and scales to 0 while the incoming one spins in (500ms `ease-spring`) | header | CSS, keyed off `.dark` (no hydration mismatch) |
| Buttons: press dips to 96% and springs back (`ease-spring`). `transition-all` was replaced with explicit properties, and box-shadow is excluded so focus rings appear instantly | all | CSS (`components/ui/button.tsx`) |
| Links: underline sweep, a 2px bar grows from the left over a faint hairline (`background-size`, wraps across lines). Nav links use a `scale-x` bar that stays drawn for the active section | prose, author links, nav | CSS |
| Header: sticky, translucent (`bg-background/70` + `backdrop-blur-md`). Hides on scroll down (220ms `ease-in`) and returns on scroll up (315ms `ease-out`). It is always shown within 96px of the top. Keyboard focus inside it (`:focus-visible`) reveals and pins it. Pointer/touch focus doesn't pin it, and the pin clears on pointerdown and on navigation, so it keeps auto-hiding after a nav click or after the mobile sheet returns focus to "Open menu" | all | `motion` (`AutoHideHeader`) |

Consequences of the sticky header: the TOC aside is `sticky top-24` and headings use `scroll-mt-24`, so anchors land below
the header when it slides back in.

### Reduced motion
`MotionConfig reducedMotion="user"` drops transform animations in every `motion` component (opacity fades remain). Every
CSS entrance or hover transform is behind `motion-safe:` or has `motion-reduce:transition-none`. The drift backdrop,
word reveal, page enter, cover settle and scroll-driven prose reveals do not run at all. Functional motion (the progress
bar) still runs.

### Skipped: list-to-detail title morph
React's `<ViewTransition>` is in the installed `react@19.3`, but the App Router runs on Next's vendored React
(`19.2.0-canary`), which doesn't export it. Only `experimental.viewTransition` switches the whole app to the experimental
React channel (`unstable_ViewTransition`). That is too much risk for a learning blog, so the title morph is left out.
Revisit when a stable Next ships ViewTransition support.

## Image-led layouts (Phase 2)
No post has a real image yet, so every cover on the site is a default cover. The risk is monotony: eight identical
blue blocks. The answer has two parts: give the default cover a deterministic identity per post, and only show covers
where they earn their place.

### Default cover variations (`components/posts/post-cover.tsx`)
Each post has an **issue number** (`PostSummary.issue`, assigned in `lib/data/posts.ts`). It is the publication order
(oldest = 1). Frontmatter `issue: <n>` pins a number. Auto-numbering skips pinned numbers, so a back-dated post with a
pinned issue doesn't renumber the others. Duplicate pins log a warning.

The look has three axes:
- **Composition:**
  - `number`: a large Fraunces "No. 06" bleeding off the bottom-right edge, with the wordmark top-left and the tag
    bottom-left.
  - `tag`: the first tag set large in Fraunces, bottom-left, with the wordmark and "No. 06" small along the top.
  - `mark`: the Phase 1 centered wordmark, hairline and tag.
- **Tone:**
  - `deep`: `brand` to `brand-deep`.
  - `ink`: `brand-deep` to `brand-ink`, with a `brand` glow.
  - `soft`: a `brand-soft` field with `brand-soft-foreground` type.
- **Glow position**: one of four corners, from a slug hash.

How the look is picked:
- **Standalone covers** (featured, post page, prev/next) rotate on the issue number n: composition `n mod 3`, tone
  `(n + floor(n / 3)) mod 3`.
- **Covers in a list** (list rows, related posts, hero deck) get `variant` = their position i in the rendered list:
  composition alternates `number`/`tag` (`i mod 2`) and tone cycles (`i mod 3`). Neighbours differ in both *as
  rendered*, even after filtering. For example, home drops the featured post from "Latest", which made two `mark`
  rows adjacent under the issue-based rotation. The content (issue number or tag) stays post-specific.
- **Every thumbnail keeps a post-specific main mark.** Below 12rem (`@max-[12rem]`), the small labels drop out, `mark`
  swaps to the `tag` layout (or `number` if the post has no tag), and the number stops bleeding off the edge. Without
  that, a bled "06" is cut in half at 112–160px.

"No." is spelled out because the `№` glyph isn't in Fraunces' latin subset. Everything stays in the primary hue
(hue 258–266). There are no new hues and no diagram motifs. Each instance gets its grain filter id from `useId()`,
because the same post can render twice on one page (deck and list).

New tokens:

| Token | Light | Dark |
|---|---|---|
| `--brand-ink` | `oklch(0.25 0.11 266)` | `oklch(0.13 0.035 264)` |
| `--brand-soft` | `oklch(0.93 0.035 262)` | `oklch(0.55 0.1 260)` |
| `--brand-soft-foreground` | `oklch(0.36 0.17 266)` | `oklch(0.15 0.04 264)` |

The dark tones are spread wide (ink about L 0.13, deep about 0.32, soft 0.55) because closer values merged at
thumbnail size. Dark `soft` is a mid blue with dark type; it stays below the lifted dark primary (0.74), so a large
soft cover doesn't glare. The ink glow drops to `brand/40` in dark.

A 1px inset `brand-foreground/10` hairline keeps the dark `ink` tone distinct from the dark page.

The cover is a **size** container (`container-type: size`), so type scales with `cqi`/`cqh`. Below 12rem wide
(`@max-[12rem]`), the small labels drop out and only the main mark stays, so thumbnails read cleanly.

### Where covers appear
| Place | Cover | Why |
|---|---|---|
| Home hero (md+) | A deck of the latest three covers, 3/4 portrait cards fanned at -8°/1°/8°. Newest in front. It links to `/posts` ("Browse the archive") and fans wider on hover/focus (700ms `ease-spring`). CSS entrance at +520/620/720ms, after the title words. Hidden below md, so the title keeps the full width on phones. | The visual anchor. It sits beside the text, never behind it, so the Phase 3 muted-text contrast measurements (≥ 4.56:1) still hold: the backdrop and text positions are unchanged. |
| Featured (home) | Full column width, 3/2 on phones and 2/1 from sm. The title, excerpt and tags sit below it, so text is never laid over the cover. Scroll parallax (±5% inside an 8% overhang, `components/motion/parallax.tsx`), a 1.06 zoom and a round arrow chip on hover/focus. | The one place a large cover earns its space. |
| List rows (home latest, `/posts`, `/tags/[tag]`, `/search`) | A 160px 4/3 thumbnail on the right **from sm up**, hidden on phones. It zooms on row hover. | With the variations, the thumbnail gives each row the same identity it has on the featured block and the post page, so it is recognition, not filler. On phones it would steal width from the title, so it is left out. |
| Related posts | A 112px 4/3 thumbnail from sm up. | Same as list rows, but smaller. |
| Prev/next cards | A 3/1 band on top of each card. It zooms on hover. | The cards already had a frame; the band makes them read as "the next issue". |
| Post detail | Unchanged: a 3/1 band, or 2/1 for a real image. | |

The stretched-link pattern is unchanged. Covers in rows and cards are `decorative` (a real image gets `alt=""`) and
`pointer-events-none`, so clicks reach the title link's `::after`. The row hover accent (left bar and arrow) is kept;
the arrow moves left of the thumbnail at sm+.

### Motion
- The hover zoom is a `scale` transition (700ms, `ease-out-expo`), separate from the CSS settle entrance (which animates
  `transform`), so the two compose.
- Parallax uses `useScroll`/`useTransform` on a static outer target, so the moving layer never measures itself. With
  reduced motion it outputs `0%`. `--cover-overhang` keeps the labels inside the visible part of the frame.
- The deck fan and the chip are `motion-safe:` CSS. With reduced motion, the cards rest at their static angles.

### About avatar
A monogram ("AN", from `site.author.name`, Fraunces on the `brand`/`brand-deep` gradient), 80px on phones and 96px from
sm. `site.author.avatar` defaults to `/images/avatar.jpg`. `getAuthorAvatar()` (`lib/data/authors.ts`) returns its
size and blur placeholder only if the file exists, so dropping in the photo switches it on with no code change. The
photo is a `next/image` laid over the monogram, which serves as the fallback.

The shadcn `avatar` was tried and dropped. It is a Base UI client component, and just importing it added 18 kB of
First Load JS to `/about` (130 vs 112 kB) for a static circle. The avatar stays a Server Component.

### Costs and caveats
- **`next/image`:** its client runtime adds about 5 kB of First Load JS to every route that renders a `PostCover`
  (all of them, because the real-image branch is imported statically) and to `/about` (the avatar). Measured on
  `/about`: 112 → 117 kB.
- **Parallax:** `useScroll` currently costs nothing extra, because `AutoHideHeader` already loads it on every page.
  If the header ever drops `useScroll`, the featured parallax would pull in the scroll chunk (about 19 kB) on its own.
  At that point, reconsider it or swap it for a CSS scroll-driven animation.
- **JS off:** Suspense boundaries stay on their skeletons, because streamed content is swapped in by a script.
  This is pre-existing App Router behaviour and not new in this phase. It affects the home featured block, the latest
  list and the hero deck. Static content and every page's main body still render.

### Skeletons
- `FeaturedPostSkeleton` reserves the same `aspect-[3/2] sm:aspect-[2/1]` cover frame plus the text lines. Its
  excerpt is two lines, like the real one.
- `LatestPostsSkeleton` renders `LATEST_COUNT` (4) rows, the same as the real list.
- `PostListSkeleton` reserves the sm+ 10rem 4/3 thumbnail column.
- The hero deck streams behind its own Suspense with a skeleton in the same box and poses.
- The article skeleton is unchanged (the detail cover frame didn't change).

## OG images
Finishes the two OG items left after Phase 2. Supersedes the "OG image" bullet in "Usage in Phase 1".
- **Fonts:** Satori only reads static TTF/OTF (no woff2, no variable fonts), so the OG cards ship their own static
  instances in `assets/fonts/`: Fraunces 400 and 600 at `opsz 72` (display optical size, right for 52–240px), and
  Source Sans 3 400. They were downloaded once from Google Fonts' static TTF instances and are committed with their
  SIL OFL 1.1 notices (`OFL-Fraunces.txt`, `OFL-SourceSans3.txt`). `lib/data/og-fonts.ts` (`getOgFonts()`) reads them
  with `fs` once per process, so the build needs no network. Fraunces 600 sets the wordmark (uppercase, 0.1em
  tracking, as in the header), the title and the big issue number. Fraunces 400 sets the large tag and "No.". Source
  Sans 3 sets the excerpt, the meta line and the small cover labels. Both the site card (`app/opengraph-image.tsx`) and
  the post card use them.
- **Cover variations:** the composition/tone/glow pick moved to the pure helper `lib/cover-variant.ts`
  (`pickCoverVariant(post, listPosition?)`, `coverGlowPositions`). `PostCover` and the OG card both call it. The OG
  card calls it without a list position, so it gets the same issue-based look as the standalone cover on the post page.
- **Satori adaptation** (420x614 portrait panel, light theme only): the tone fields are the same `linear-gradient`s
  (160deg/200deg) plus an elliptical `radial-gradient` glow at the post's hashed corner. The colors are sRGB conversions
  of the OKLCH tokens in `OG_COLORS`, because Satori has no `oklch()` and can't read CSS variables (the one place
  literal colors are allowed). No grain, because Satori can't render SVG filters. `number`: "No. 03" at 240px bleeds off
  the bottom right; in the portrait panel the tag moves under the wordmark (top left) so it never collides with the
  number. `tag`: the tag is set as large as fits its longest word (at most 76px). `mark`: unchanged.
- **Real `cover:` images:** unchanged. The image is resized with sharp to a JPEG data URI and fills the panel.
- **Caveats:** `assets/fonts/` is not in output file tracing. That is fine while every OG image is prerendered at build;
  if one ever renders on demand (or the app ships as `output: "standalone"`), add the folder to
  `outputFileTracingIncludes`. "No." and the large tag use Fraunces 400, not the site's `font-medium` (500), because
  only 400/600 instances are committed (the site loads only 400/600 too, so the browser also falls back to 400).
  Title (3 lines) and excerpt (2 lines) are clamped with Satori's `lineClamp` so the meta rule always stays on the card.

## Features (Phase 4)
Persisted likes and views, a newsletter form, code-block copy buttons, back-to-top, and a ⌘K / Ctrl+K command
palette. The editorial look is unchanged: Fraunces headings, hairline rules, primary blue, no new tokens.

### Likes and views (post page)
- **Data:** `lib/data/engagement.ts` (JSON store via `lib/data/store.ts`). `getPostStats` is now wrapped in React
  `cache()`, so the views line and the like button share one read per request.
- **Components:** `components/posts/post-engagement.tsx` holds two small async Server Components, each behind its own
  `<Suspense>` with a `Skeleton` in the same box. `PostViews` renders "123 views" as the last item of the header meta
  line (`PostMeta` takes a `children` slot and its wrapper is now a `div`, so a skeleton can sit inside it). `PostLike`
  passes `{likes, views, liked}` to the client `LikeButton`.
- **Optimistic like:** `LikeButton` keeps the confirmed stats in state, layers `useOptimistic` on top, and calls
  `setLikeAction` inside `startTransition`. Success replaces the stats with the server's answer. On a throw, the
  optimistic value falls back to the last confirmed stats when the transition ends (rollback), and a polite
  live region says "Couldn't save your like. Try again." The burst is unchanged. New: the count rolls up or down
  (`spring.snappy`, ±70% inside an overflow mask). Reduced motion: no burst, no roll.
- **No double counting:** the visitor's likes live in an httpOnly cookie and `setLike` is idempotent. A stale tab that
  still shows "liked" can only unlike once.
- **Views:** `PostViews` calls `after(() => recordView(slug))`, so it runs after the response and is tied to the
  component that shows the number (and that forces dynamic rendering). A Server Action that sets a cookie makes Next
  re-render the current page in the action response. That re-render would count a view on every like, so
  `PostViews` only records a view for a plain page load: no `Next-Action` header (JS action), no `Content-Type`
  (a no-JS form POST, e.g. the newsletter on a post page), and no `Next-Router-Prefetch`. Server Components can't
  read the HTTP method, so headers are the signal. Measured: 3 page loads plus 4 like
  toggles gave `views: 3`.
- **Rendering trade-off (RSC lesson):** reading a cookie anywhere in the tree makes the route dynamic. Next 15
  stable has no Partial Prerendering, so `/posts/[slug]` is now rendered per request. The build table still prints
  ●, because of `generateStaticParams`, but the slugs are no longer in `prerender-manifest.json`.
  `generateStaticParams` + `dynamicParams = false` still 404 unknown slugs. The cost: Markdown + Shiki run per
  request, plus the simulated 300ms latency.
  - **No-JS:** the route-level `loading.tsx` (and `post-article-skeleton.tsx`) were removed, so the article is in
    the first HTML. Only the views count and the like button stream behind their own boundaries.
  - **Ways to keep the article static** (not done): (1) PPR (`experimental.ppr`, canary-only in 15), so the article
    is the static shell and the two boundaries are the dynamic holes; (2) keep the page SSG and let a client leaf call
    a read-only Server Action on mount that returns the rendered `<LikeButton>` and records the view. That works on
    stable, but it's client-triggered fetching.

### Newsletter
- `components/newsletter/newsletter-form.tsx` (client leaf) + `newsletter-section.tsx` (server: heading, copy,
  hairline rule above). It sits after the post footer, before prev/next, and at the bottom of the home page.
- `useActionState(subscribeAction, { status: "idle" })`, and the action goes straight to `<form action>`, so it posts
  and renders the result with JS off (verified on `/`: invalid, success, duplicate).
- shadcn `FieldGroup` / `Field` / `FieldLabel` / `FieldDescription`, `Input`, `Button` + `Spinner` (pending: disabled,
  "Subscribing"). The error state uses `data-invalid` on the Field and `aria-invalid` + `aria-describedby` on the
  input. The typed value is kept after an error.
- **Errors:** an always-present `role="alert"` region below the input. It's emptied while the action is pending
  and refilled with the result, so an Enter-submit (focus never leaves the input, so no focus event fires) and a
  repeated identical error are both announced. Focus also returns to the input. Only an address error
  (`field: "email"`) sets `data-invalid` on the Field and `aria-invalid` + `aria-describedby` on the input. A
  form-level error (e.g. "Sign-ups are paused") shows only in the alert.
- **Success:** the form is swapped for a confirmation, a plain `div tabIndex={-1} aria-labelledby={message}` that
  gets focus (no ring): a primary/10 disc pops in (`spring.pop`), the check draws itself (`DrawnCheck`, 120ms delay),
  and the row rises 12px. Focus and animation only happen after a submit in this session; a no-JS response shows a
  static tick.
- **Footer version: skipped.** It would put a second identical form on the two pages that already have the section,
  and ship the form's JS to every route.

### Code blocks
- **The post body is React elements, not an HTML string.** `renderMarkdown` (`lib/markdown.ts`) runs the unified
  pipeline once and returns `{ hast, html }`. `Post` has `content` (the hast tree) and keeps `html` for string
  consumers (a future full-content feed; nothing reads it today). `PostBody` turns the tree into React elements on
  the server with `hast-util-to-jsx-runtime` (new dependency, server-only) instead of `dangerouslySetInnerHTML`.
  React owns the DOM, so a server re-render (e.g. after a like, whose cookie makes Next re-render the page)
  reconciles it instead of replacing it. Before, it wiped the copy buttons that had been portaled into the HTML.
- `rehypeCodeBlocks` (runs before Shiki) wraps each fenced block in `div[data-code-block][data-language]`.
  `PostBody` maps that `div` to the `CodeBlock` Server Component (`components/posts/code-block.tsx`). It renders a
  40px toolbar row with a hairline below: the language label on the left (mono, muted; omitted for `text`) and the
  `CodeCopyButton` client leaf on the right. Shiki's `<pre>` stays server output. The frame (border, `bg-muted`,
  rounded) is on the wrapper; styles are still the arbitrary variants in `post-body.tsx`. It's a functional
  header, not fake window chrome.
- `CodeCopyButton` renders only after hydration (`useSyncExternalStore` flag, `false` on the server, so markup
  matches): with JS off the toolbar shows just the language label. It reads its own block's `<pre>` at click time, so the code isn't sent twice. Feedback lasts 2s:
  `DrawnCheck` + "Copied", or a destructive warning icon + "Copy failed". Each button has its own sr-only
  `role="status"`; it's cleared and refilled on the next frame, so a repeated copy is announced again and no
  button's timer clears another's message. Buttons are named "Copy tsx code". The pre focus ring is inset because
  the wrapper clips.
- `DrawnCheck` moved to `components/motion/drawn-check.tsx` (used by copy link, code copy and newsletter).

### Back to top
`components/layout/back-to-top.tsx`, site-wide, in the root layout. Past 0.9 viewport it shows only while scrolling
up (8px threshold, like the header) or at the end of the page; scrolling down hides it, so it never sits on body text
while reading. It stays while it has keyboard focus. A round 40px (48px from sm) outline `Button` (`bg-background/85` + blur), bottom-right at `max(1rem | 2rem, safe-area-inset)`, `z-30`
(under the header's z-40 and the top progress bar). A primary ring around it fills with page progress
(`pathLength` from `useScroll`, which the header already loads, so no new chunk). In: `spring.pop` from y 24 /
scale 0.8. Out: 220ms `ease-in`. While hidden it's `inert`. Click: smooth scroll to the top (instant with reduced
motion), then focus moves to `#main`. Reduced motion: fade only.

### Command palette
- `components/layout/command-menu.tsx` (client): the header trigger is a real `<Link href="/search">` (no-JS fallback
  and modifier-click still work). A plain click or Ctrl/⌘+K opens the palette. From `lg` it shows "Search" plus
  `Kbd` keys; "⌘" on Apple, via `useSyncExternalStore` with a "Ctrl" server snapshot, so there's no hydration
  mismatch.
- `components/layout/command-palette.tsx` (client, loaded with `next/dynamic` on first open; preloaded on
  pointerenter/focus): shadcn `Dialog` (Base UI) + `Command` (cmdk). The groups are Posts (title + tags), Tags, Pages,
  and "See all results for "…"" → `/search?q=`. It filters on word substrings, not cmdk's fuzzy scorer. Enter
  navigates. Escape closes and `finalFocus` returns focus to the element focused before opening (usually the trigger;
  the trigger itself if focus was on `<body>`). Entrance: 200ms `ease-out-expo`, slide 16px + zoom 0.97.
- **Data:** `getPostIndex()` in `lib/data/posts.ts` → `PostIndexItem[]` (slug, title, tags; type in `types/post.ts`).
  `SiteHeader` passes it as an **unawaited promise**. The header renders at once, the index streams behind it, and
  the palette reads it with `use()`.
- **shadcn fixes:** the generated `CommandDialog` rendered its sr-only title outside the popup (it sat next to the
  trigger while closed). The title now lives inside `DialogContent` (and the palette composes `Dialog` itself for
  `finalFocus`). The `cn` imports were pointed at `@/lib/utils`. `button`/`input`/`input-group`/`textarea` were
  restored after the CLI overwrote them.

### Bundle (First Load JS, kB)
| Route | Before | After | Why |
|---|---|---|---|
| `/` | 150 | 157 | newsletter form (Field, Input, Spinner) |
| `/posts` | 150 | 150 | |
| `/posts/[slug]` | 156 | 163 | newsletter form, code copy, optimistic like |
| `/search` | 157 | 157 | |
| `/about` | 117 | 117 | |

The palette (Base UI Dialog + cmdk) is a separate 64 kB chunk (22.5 kB gzip), loaded only when opened.

### Open
- **Post series:** built later, see "Post series" below.

### Post page has no route-level loading.tsx
Reading the like cookie renders `/posts/[slug]` per request. With a route-level `loading.tsx`, the whole article then
streamed inside a hidden Suspense segment, so no-JS readers and non-JS crawlers saw only a skeleton. It was removed
(with `PostArticleSkeleton`): the article is now in the first HTML, and only the views count and like button stream
behind their own small `<Suspense>`. Trade-off: client navigation to a post waits for `getPost` instead of showing a
skeleton. PPR would let the article stay static, but it is canary-only in Next 15.

### Data store and abuse limits (Phase 4)
- `lib/data/store.ts` keeps one file per key (`.data/postStats.json`, `.data/subscribers.json`) with an in-memory copy
  as the source of truth after the first read. Writes are serialized per key, written to a temp file and renamed, with a
  short retry on Windows `EPERM`/`EBUSY`. A corrupt file logs an error and starts empty instead of breaking pages.
- Likes are anonymous and cookie-based: clearing cookies or scripting the action can push a count up, and a hand-edited
  `liked_posts` cookie can push it down (floored at 0). Accepted for a personal blog. If counts ever matter, sign the
  cookie (HMAC with a server secret) or move likes behind accounts.
- The newsletter returns the same message for new and existing addresses (no membership probing) and caps the list at
  5,000 entries; there is no per-IP rate limit. A real email provider replaces both.

## Callouts and footnotes
Server only: no client JS, no new dependency. Both come out of the unified pipeline in `lib/markdown.ts` and are
styled with arbitrary variants in `components/posts/post-body.tsx`.

### Callouts (GitHub alerts)
- **Syntax:** a blockquote whose first line is `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` or `[!CAUTION]`
  (marker alone on its line, as on GitHub). Any other blockquote stays a pull quote (Fraunces, primary rule).
- **Markup:** `rehypeCallouts` (runs right after remark-rehype) rewrites it to
  `div[data-callout=<kind>][role=note][aria-labelledby=user-content-callout-N]` > `p[data-callout-title] > strong` ("Note") +
  `div[data-callout-body]`. `role="note"` (not `alert`: it's static content and must not be announced) and the
  visible label names the region. The label text is in the tree, so the HTML string (feeds, if ever) degrades to
  a bold "Note" line followed by the content.
- **Why not shadcn `Alert`:** the markup has to come out of the Markdown tree (so it survives as an HTML string),
  and `Alert` defaults to `role="alert"`. Only the label row is a component: `post-body.tsx` maps
  `p[data-callout-title]` to `CalloutTitle` (`components/posts/callout-title.tsx`, Server Component), which
  prepends the lucide icon (`aria-hidden`): Info, Lightbulb, MessageSquareWarning, TriangleAlert, OctagonAlert
  (Important and Caution must not look alike at 16px). A leading `<br>`/whitespace after the marker is dropped.
- **Look:** editorial, not a card. A 2px left rule, a 6% tint of the kind's tone, `rounded-r-md`, `px-5 py-4`;
  label in Fraunces 16px semibold in the tone; body Source Sans 16/28 (one step below the 18px body text).
  `mt-10` above and below so callouts read as asides in the column, except next to `h2`/`h3` (they keep their own
  `mt-14`/`mt-10` after and `mt-4` before a callout) and the footnotes section (keeps `mt-16`). Done by `:not()`
  exclusion so it doesn't depend on CSS order.
- **Tokens:** `--callout-note|tip|important|warning|caution` in `:root` and `.dark`, exposed as
  `--color-callout-*`. Light tones sit at OKLCH L 0.50-0.52 (>= 4.5:1 as text on white and on the tint); dark tones
  at L 0.72-0.80. Note is `var(--primary)` (no separate dark value). Each callout sets `--callout` from its kind; the rule, label and
  tint all read it, so a new kind is one token plus one variant.

### Footnotes (GFM)
- Parsed by `remark-gfm`; remark-rehype options: `footnoteLabelProperties: {}` makes the "Footnotes" `h2` visible
  (default is `sr-only`); a deliberate small endnote label beats a hidden one for sighted readers who scroll there.
  `footnoteBackContent: "↩︎"` forces the text glyph so iOS doesn't draw an emoji arrow.
- **Ids:** notes and refs keep the `user-content-fn-*` / `user-content-fnref-*` prefix, so they can't collide with
  heading slugs. The label keeps remark-rehype's fixed `footnote-label` id (only a heading literally titled
  "Footnote label" would clash). rehype-autolink-headings skips it (`test`), so it gets no `#` anchor, and the TOC
  (`extractToc`, read from Markdown source headings) never includes it.
- **Refs:** superscript numerals (preflight keeps `line-height: 0`), primary, semibold, tabular; excluded from the
  sweeping-underline link style (underline on hover instead). Visible `ring-3 ring-ring/50` focus.
- **Section:** `mt-16`, hairline `border-t`, `pt-8`, 16/28 muted text; label 18px Fraunces in foreground.
  Each note is `rounded-md px-2 py-1`; the back link (`aria-label="Back to reference N"`) gets a focus ring and a
  primary/10 hover fill.
- **`:target`:** the returned-to reference gets a `primary/20` fill and a 2px primary ring (a small numeral needs
  more than a tint); the jumped-to note gets a `primary/10` fill, the note text
  turns foreground and its marker primary. Pure CSS, instant (no transition), so nothing to reduce. `scroll-mt-24`
  clears the sticky header. No `scroll-behavior` change.

### Where to see them
`content/posts/server-actions-for-mutations.md` (NOTE, WARNING, TIP, two footnotes) and
`content/posts/caching-in-the-app-router.md` (IMPORTANT, CAUTION, one footnote).

## Post series
Frontmatter `series` + `seriesOrder` (data: `getPostSeries` in `lib/data/posts.ts`). First series: "RSC Fundamentals"
(3 parts). All UI is in `components/posts/post-series.tsx`, Server Components only, no client JS added.

- **Series box** (`PostSeriesBox`): after the cover, before the inline TOC and the body, at every width. It is
  orientation ("where am I in this?"), so it belongs before reading starts, and in the reading column rather than the
  xl aside, which is sticky and already holds the TOC. Hairline-bordered `rounded-lg` box matching the inline TOC; muted
  "Part 2 of 3 in a series" line above the series name in Fraunces (`h2`). The ordered list sits on a 1px left rail;
  the current part has a 2px primary bar on the rail (echoing the TOC marker), a primary number and semibold text,
  and is a `<span aria-current="page">`, not a link. Earlier parts are muted links, later parts full-strength links
  (what's still ahead reads strongest); position, not colour alone, separates them.
  `<nav aria-label="<name>: all parts">` (the visible `h2` stays). No `<details>`: three short rows are compact enough on mobile. Revisit if a series passes ~5 parts.
- **Series nav** (`PostSeriesNav`): after the body, before the like/share footer, wrapped in the existing `Reveal`.
  Text links only on a hairline ("Previous in series" / "Next in series" + title in Fraunces, arrows nudge on hover
  like the adjacent cards), plus a muted "RSC Fundamentals, part 2 of 3" line ("RSC Fundamentals, final part (3 of 3)"
  on the last). The arrow follows "Next" in DOM order (no `flex-row-reverse`), so below `sm` the label lines up with
  the left-aligned title. Deliberately not a card: the end-of-post card is "Up next" (below), which takes over the
  forward link. `<nav aria-label="<name>: previous and next part">`.
- **No duplicate links at the end:** series parts never appear in the chronological adjacent cards or in Related
  posts (`getPostEnding` in `lib/data/posts.ts` dedupes; see "Up next (sprint 4)").
- **List marker** (`PostSeriesMarker`): "RSC Fundamentals, part 2" as the last item of the meta line on post rows
  (`post-list-item`) and the featured block. Same quiet meta style, so no new visual element. Not on related posts.
  `PostMeta` wraps its separator and trailing item in one inline-flex item, so on narrow screens the dot wraps with
  "RSC Fundamentals, part 3" instead of hanging at the line end. Shown only when `hasSeriesMarker` (the series has 2+
  parts, from `series.total`, which `loadAllPosts` stamps on each ref).
- A one-part series renders nothing (nothing to navigate). No `/series/<slug>` page yet; `series.slug` is unused by UI.

## Up next (sprint 4)
The end of a post is one reading path. Data: `getPostEnding` (`lib/data/posts.ts`) returns `upNext`, `adjacent` and
`related`, deduped so a post appears at most once. UI: `components/posts/up-next.tsx`, a Server Component, no new client JS.

- **Order after the article footer (like/share):** Up next, newsletter, prev/next cards, related posts. The one
  recommended read comes first, while the reader is still in the flow; the newsletter is the other "I finished"
  action; the adjacent cards and the related list are the browsing tail.
- **Card:** the strongest block after the article. `section` labelled by an `h2` "Up next" styled as the primary
  eyebrow (same as "Featured" on the home page), then a hairline `rounded-xl` card: a flush cover (2/1 band on phones,
  a full-height left column from `sm`, `grid-cols-[2fr_3fr]`), the reason label (muted, small), the title in Fraunces
  2xl→3xl (an `h3`), the excerpt, and the reading time with a round arrow chip. Only the title is a link, stretched
  over the card with `::after` (list-row pattern), with `rel="next"` / `"prev"` where the order is real.
- **Reason labels:** series → "Next in <series> · Part n of N"; related → "Related reading", or "Start the <series>
  series" when the pick is part 1 of a real series; newer → "Newer post"; older → "Older post".
- **Motion (bold, CSS + the existing `Reveal`):** the section reveals on scroll with the `reveal` spring (and is
  server-rendered visible, so no-JS and above-the-fold readers always see it). Hover/keyboard focus: the card lifts
  4px and its border turns primary, a 4px primary bar sweeps across the top edge (`scale-x`, 500ms `ease-out-expo`),
  the cover zooms to 1.06 (700ms), the title turns primary and the arrow chip slides 6px right. All transforms are
  `motion-safe:` or `motion-reduce:transition-none`.
- **Focus:** the card has `overflow-hidden` (flush cover corners), which would clip a ring on the link's `::after`, so
  the card draws the ring itself with `has-focus-visible:ring-3 ring-ring/50` plus the primary border.
- **Series parts, dedup decision:** the series nav's "Next in series" link and an up-next with reason "series" point
  to the same post. The Up next card wins: it explains the step ("Next in RSC Fundamentals · Part 3 of 3") and is the
  one forward CTA. `PostSeriesNav` gets `hideNext` and keeps only "Previous in series" plus the "part n of N" /
  "final part" line. On part 1 there is no previous part, so the series nav isn't rendered at all (the series box at
  the top and the Up next label already say where the reader is). The last part is unchanged (no next part, so
  up-next falls through to related/newer/older).
