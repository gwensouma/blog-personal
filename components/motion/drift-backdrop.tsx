import { cn } from "@/lib/utils";

// Decorative backdrop for a hero: a faint hairline grid that fades out at the
// edges, plus two slowly drifting primary-tinted glows. Server Component, CSS only
// (the `animate-drift` token in app/globals.css), so it costs no client JS.
// Glows are kept faint (primary at 8% / 6% in light, 12% / 9% in dark) so the
// muted dek and intro over them stay above 4.5:1 at every drift phase (measured).
// Place it inside a `relative isolate` parent; it sits behind with -z-10.
export function DriftBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute -z-10 select-none", className)}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-size-[3.5rem_3.5rem] [mask-image:radial-gradient(closest-side_at_40%_42%,black,transparent)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-1000" />
      <div className="absolute top-[8%] left-[18%] size-72 rounded-full bg-primary/8 blur-3xl motion-safe:animate-drift sm:size-96 dark:bg-primary/12" />
      <div className="absolute top-[38%] left-[48%] size-56 rounded-full bg-primary/6 blur-3xl motion-safe:animate-drift-slow sm:size-80 dark:bg-primary/9" />
    </div>
  );
}
