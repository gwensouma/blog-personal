# Task: developer · round 1

Brief: `docs/sprints/17-hero-backdrop/brief.md` · Branch: `feat/hero-backdrop` (already checked out by the lead)
Report to: `docs/sprints/17-hero-backdrop/reports/developer-r1.md` (format: `.claude/templates/report.md`)

## Do
1. `components/motion/drift-backdrop.tsx`:
   - Wrap grid and grain in one div masked with `mask-b-from-10% mask-b-to-70% mask-x-from-70% mask-x-to-100%`
     (replaces the old radial mask), keeping the existing motion-safe fade-in.
   - Grid line colour `color-mix(in oklab, var(--color-border), var(--color-primary) 15%)` via a `--grid-line` var;
     same 3.5rem grid.
   - Grain: a static inline SVG `feTurbulence` data URI (fractalNoise, baseFrequency 0.9, numOctaves 2, stitchTiles,
     saturate 0, 160px tile) as `backgroundImage`; `opacity-[0.06] mix-blend-multiply dark:opacity-[0.05]
     dark:mix-blend-overlay`. Not a live `<filter>` node (animated blurred glows sit underneath).
   - Keep the two drifting glows unchanged.
   - Add exported `DeckGlow`: aria-hidden, `pointer-events-none absolute inset-y-2 right-0 left-12 -z-10 rounded-full
     bg-primary/14 blur-3xl select-none dark:bg-primary/20`, motion-safe fade-in with ~520ms delay; static, no drift.
   - Rewrite the top comment: the layers, and why the mask must fade out by ~70% height (looser, e.g. 80%, drops the
     muted text under the old contrast).
2. `components/home-hero.tsx`: deck wrapper becomes `relative hidden pt-2 md:block` containing `<DeckGlow />` then
   `<LatestCoverDeck />`; update the comment.
3. Confirm the built CSS contains the `mask-b-*` / `mask-x-*` rules.

## Files you may change
- `components/motion/drift-backdrop.tsx`, `components/home-hero.tsx`

## Acceptance criteria this task serves
AC1–AC5.

## Constraints
Tokens only, motion rules (`.claude/rules/ui.md`), widths 320/768/1280, no new dependency. Never kill node by name.

## Done when
- `npm run gate:fast` exits 0.
- The report gives AC4 contrast numbers (measured with a Playwright script if possible, else calculated, and says which),
  and lists the cases the tester should cover.
