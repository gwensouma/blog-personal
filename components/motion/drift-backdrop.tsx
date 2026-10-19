import { cn } from "@/lib/utils";

// Static grain tile: SVG fractal noise rendered once as an image. A live <filter>
// node would be re-rasterised on every frame because the blurred glows animate
// underneath it; a background image is painted once and only composited.
const grain = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

// Decorative backdrop for a hero. Server Component, CSS/SVG only, no client JS.
// Layers, back to front:
// - A hairline 3.5rem grid (border tinted 15% toward primary, so it reads a touch
//   clearer) and a very light static grain, sharing one mask: solid at the top,
//   fading to transparent by 70% of the height, and softly out at the sides.
//   The fade must be done by ~70%: a looser mask (e.g. to 80%) keeps grid and
//   grain under the muted dek and intro and drops them below the measured 4.5:1.
// - Two slowly drifting primary glows (`animate-drift*` in app/globals.css), kept
//   faint (8% / 6% light, 12% / 9% dark) because muted text sits over them.
// Place it inside a `relative isolate` parent; it sits behind with -z-10.
export function DriftBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute -z-10 select-none", className)}>
      <div className="absolute inset-0 mask-x-from-70% mask-x-to-100% mask-b-from-10% mask-b-to-70% motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-1000">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-size-[3.5rem_3.5rem] [--grid-line:color-mix(in_oklab,var(--color-border),var(--color-primary)_15%)]" />
        <div
          className="absolute inset-0 bg-size-[160px_160px] opacity-[0.06] mix-blend-multiply dark:opacity-[0.05] dark:mix-blend-overlay"
          style={{ backgroundImage: grain }}
        />
      </div>
      <div className="absolute top-[8%] left-[18%] size-72 rounded-full bg-primary/8 blur-3xl motion-safe:animate-drift sm:size-96 dark:bg-primary/12" />
      <div className="absolute top-[38%] left-[48%] size-56 rounded-full bg-primary/6 blur-3xl motion-safe:animate-drift-slow sm:size-80 dark:bg-primary/9" />
    </div>
  );
}

// A static primary glow behind the hero's cover deck: gives the deck depth without
// moving. Place it as the first child of the deck's `relative` wrapper; it fades in
// just before the deck's covers land and never reaches the text column.
export function DeckGlow() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-2 right-0 left-12 -z-10 rounded-full bg-primary/14 blur-3xl select-none motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in-0 motion-safe:duration-1000 dark:bg-primary/20"
      style={{ animationDelay: "520ms" }}
    />
  );
}
