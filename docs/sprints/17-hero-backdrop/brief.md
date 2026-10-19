# Sprint 17: Hero backdrop depth

Branch: `feat/hero-backdrop` · Spec: none (small visual polish approved by the user in chat, 2026-10-19) · Roadmap row: none

## Goal
Make the home hero backdrop less flat: a teal glow behind the cover deck, a grid that is clearer at the top and fades
downward, and a very light grain. No dot or circuit patterns.

## Acceptance criteria
- AC1: From md up, a static primary-tinted glow sits behind the cover deck; it never sits behind the title, dek or intro.
- AC2: The hairline grid is slightly clearer than before at the top of the hero and fades to transparent toward the
  bottom and softly at the sides.
- AC3: A very light static grain covers the backdrop, faded by the same mask; it is a static image, not a live filter.
- AC4: Muted text over the backdrop stays >= 4.5:1 in light and dark at 375 and 1280px, across drift phases.
- AC5: Server Component, CSS/SVG only, no client JS, no new dependency; reduced motion respected; home renders without JS.

## Files in scope, by owner
- developer: `components/motion/drift-backdrop.tsx`, `components/home-hero.tsx`
- tester: `tests/` only if a check is worth adding

## Constraints
The two existing drifting glows keep their opacity (primary 8%/6% light, 12%/9% dark): they sit behind muted text.

## Task order
1. `tasks/developer-r1.md`
