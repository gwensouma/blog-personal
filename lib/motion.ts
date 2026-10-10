import type { CSSProperties } from "react";

// Shared motion presets for `motion/react` components and CSS-driven effects.
// Pure data (no React runtime; only a type import).
// CSS-only effects use the matching tokens in app/globals.css
// (ease-out-expo, ease-in-expo, ease-in-out-expo, ease-spring, animate-drift).
// Rationale and the CSS-vs-JS split live in .design/blog-refactor.md ("Motion").

/** Cubic-bezier easings, same values as the CSS `--ease-*-expo` tokens. */
export const ease = {
  /** Elements entering: decelerate into place. */
  out: [0.16, 1, 0.3, 1],
  /** Elements leaving: accelerate away. */
  in: [0.7, 0, 0.84, 0],
  /** State toggles. */
  inOut: [0.65, 0, 0.35, 1],
} as const;

/** Durations in seconds. Exits use ~75% of the matching enter. */
export const duration = {
  micro: 0.12,
  short: 0.22,
  long: 0.42,
  reveal: 0.7,
} as const;

/** Spring presets. Overshoot stays under ~10% (no bouncy UI). */
export const spring = {
  /** Scroll reveals: soft, settles without visible bounce. */
  reveal: { type: "spring", stiffness: 140, damping: 22, mass: 0.9 },
  /** Indicators that track something (TOC marker, header). */
  snappy: { type: "spring", stiffness: 420, damping: 36 },
  /** Reactions (like heart): fast with a small overshoot. */
  pop: { type: "spring", stiffness: 520, damping: 18 },
  /** Progress bar smoothing. */
  progress: { stiffness: 260, damping: 40, restDelta: 0.001 },
} as const;

/** Scroll reveal choreography. */
export const reveal = {
  /** Vertical offset (px) a revealed block travels. */
  offset: 28,
  /** Delay between siblings in a staggered list (s). */
  stagger: 0.08,
  /** Grows the viewport upwards without limit, so content the user has already
   * scrolled past (e.g. after scroll restoration) still counts as revealed;
   * -12% at the bottom starts the reveal once a block is properly on screen. */
  margin: "100000px 0px -12% 0px",
  /** Blocks whose top is below this fraction of the viewport at hydration get revealed on scroll.
   * 1 = only blocks entirely below the fold; anything the user can already see stays static
   * (its first paint is never hidden). */
  foldRatio: 1,
} as const;

/** First-load entrance for list rows (CSS keyframes, runs before hydration). Row `i`
 * waits `min(i, maxIndex) * step` ms; total stays ~600ms. */
export const enterStagger = { step: 50, maxIndex: 4 } as const;

/** Inline style that sets a row's entrance delay (`--enter-delay`) for `enterStaggerClassName`. */
export function enterStaggerStyle(index: number): CSSProperties {
  return { "--enter-delay": `${Math.min(index, enterStagger.maxIndex) * enterStagger.step}ms` } as CSSProperties;
}

/** Fade + rise for above-the-fold rows, delayed by `--enter-delay` (see enterStaggerStyle).
 * Reduced motion: no animation. Print: the animation is off. */
export const enterStaggerClassName =
  "motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-400 motion-safe:ease-out-expo motion-safe:[animation-delay:var(--enter-delay,0ms)] print:animate-none";

/** Underline sweep for inline text links: a faint primary hairline at rest, and a 2px
 * primary bar that grows from the left on hover (two background layers, so it wraps
 * across lines; only background-size transitions). Used by author links. */
export const linkSweepClassName =
  "rounded-sm bg-[linear-gradient(var(--color-primary),var(--color-primary)),linear-gradient(color-mix(in_oklch,var(--color-primary)_40%,transparent),color-mix(in_oklch,var(--color-primary)_40%,transparent))] bg-[length:0%_2px,100%_1px] bg-[position:0_100%,0_100%] bg-no-repeat pb-0.5 font-medium text-foreground outline-none transition-[background-size] duration-300 ease-out-expo hover:bg-[length:100%_2px,100%_1px] focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";
