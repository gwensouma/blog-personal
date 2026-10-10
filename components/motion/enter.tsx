import { cn } from "@/lib/utils";

type EnterProps = {
  children: React.ReactNode;
  /** Delay in ms, to sequence after other first-paint entrances. */
  delay?: number;
  className?: string;
};

// First-paint entrance (fade + rise) for above-the-fold content. A Server
// Component: pure CSS keyframes from tw-animate-css, so it runs before hydration,
// never blocks LCP on JS, and leaves content visible when JS is off.
// Scroll-triggered motion uses the client <Reveal> / <StaggerList> instead.
export function Enter({ children, delay = 0, className }: EnterProps) {
  return (
    <div
      className={cn(
        "motion-safe:animate-in motion-safe:fill-mode-backwards motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-5 motion-safe:duration-700 motion-safe:ease-out-expo",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
