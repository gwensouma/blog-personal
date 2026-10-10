"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Enter animation for every page, returned by app/template.tsx. Client wrapper,
// Server Component children: the page content is rendered on the server and only
// passes through this element.
// - The animation itself is CSS (tw-animate-css), so the first paint animates
//   without waiting for hydration and no-JS users simply see the page.
// - A root template only remounts when the route group changes, so on every other
//   pathname change the effect restarts the same CSS animation on this element
//   instead of remounting (and resetting) the page subtree.
// - fill-mode stays "none": once the animation ends no transform is left on the
//   wrapper, so `position: fixed` descendants (reading progress bar) keep the
//   viewport as their containing block.
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useLayoutEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    // Restart this element's CSS animation: a finished animation with fill-mode
    // "none" is no longer listed by getAnimations(), so clear it, force a style
    // flush, then restore the class-driven value. With reduced motion the
    // motion-safe: classes declare no animation, so this is a no-op.
    const element = ref.current;
    if (!element) return;
    element.style.animation = "none";
    void element.offsetWidth;
    element.style.animation = "";
  }, [pathname]);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-safe:ease-out-expo",
        className,
      )}
    >
      {children}
    </div>
  );
}
