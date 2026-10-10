"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import * as m from "motion/react-m";
import { useMotionValueEvent, useScroll } from "motion/react";
import { duration, ease } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Ignore jitter: a direction change only counts after this many px. */
const THRESHOLD = 8;
/** Always visible near the top of the page. */
const TOP_ZONE = 96;

// Client shell for the site header: slides away while scrolling down and comes
// back on scroll up. The header contents are Server Components passed as children.
// Accessibility: keyboard focus inside it (:focus-visible, e.g. Tab from the skip
// link) brings it back at once and pins it while focus stays there. Mouse/touch
// focus (clicking a nav link, focus returning to the menu button after the mobile
// sheet closes) doesn't pin, and the pin clears on pointerdown. On navigation it
// clears too, unless keyboard focus is still inside the header (Tab to a nav link,
// Enter): then it stays pinned so the focused link is never hidden (WCAG 2.4.11).
export function AutoHideHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  const [hidden, setHidden] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = document.activeElement;
    const focusInside = active !== null && ref.current?.contains(active) && active.matches(":focus-visible");
    if (!focusInside) setKeyboardFocus(false);
  }, [pathname]);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    const delta = current - previous;
    if (current < TOP_ZONE) setHidden(false);
    else if (delta > THRESHOLD) setHidden(true);
    else if (delta < -THRESHOLD) setHidden(false);
  });

  const isHidden = hidden && !keyboardFocus;

  return (
    <m.header
      ref={ref}
      initial={false}
      animate={{ y: isHidden ? "-100%" : "0%" }}
      transition={{ duration: isHidden ? duration.short : duration.long * 0.75, ease: isHidden ? ease.in : ease.out }}
      onFocus={(event) => setKeyboardFocus(event.target.matches(":focus-visible"))}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      onPointerDown={() => setKeyboardFocus(false)}
      className={cn("sticky top-0 z-40", className)}
    >
      {children}
    </m.header>
  );
}
