"use client";

import { useState } from "react";
import * as m from "motion/react-m";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { ArrowUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duration, ease, spring } from "@/lib/motion";

/** Ignore jitter: a direction change only counts after this many px (same as the header). */
const THRESHOLD = 8;

// Client leaf: a round floating button, bottom-right, that takes the reader back to the
// top. It shows past about one viewport, but only while scrolling up or at the end of
// the page; scrolling down hides it, like the header, so it doesn't cover the text. A ring around it fills
// with page progress, so it doubles as a "how far am I" cue on long pages.
// - Placement: clears the iOS home indicator and notch via the safe-area insets, sits
//   below the header (z-40) and far from the top progress bar.
// - Motion: springs up from below with a slight scale; leaves faster, accelerating
//   away. Reduced motion: MotionConfig drops the transforms, so it only fades, and the
//   scroll back to the top jumps instead of gliding.
// - Hidden state is `inert`: out of the tab order and the accessibility tree.
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  // Keyboard users who tabbed to it keep it (it must not turn inert under focus).
  const [focused, setFocused] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  const reduceMotion = useReducedMotion();

  useMotionValueEvent(scrollY, "change", (current) => {
    const delta = current - (scrollY.getPrevious() ?? 0);
    const atEnd = current + window.innerHeight >= document.documentElement.scrollHeight - 4;
    if (current < window.innerHeight * 0.9) setVisible(false);
    // Out of the way while reading (scrolling down) so it never sits on body text;
    // back as soon as the reader heads up, or once they reach the end of the page.
    else if (atEnd || delta < -THRESHOLD) setVisible(true);
    else if (delta > THRESHOLD) setVisible(false);
  });

  const shown = visible || focused;

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    // The button disappears near the top; hand keyboard focus to the start of the
    // content instead of leaving it on a hidden control.
    setFocused(false);
    document.getElementById("main")?.focus({ preventScroll: true });
  }

  return (
    <m.div
      inert={!shown}
      initial={false}
      animate={shown ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.8 }}
      transition={shown ? spring.pop : { duration: duration.short, ease: ease.in }}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 sm:right-[max(2rem,env(safe-area-inset-right))] sm:bottom-[max(2rem,env(safe-area-inset-bottom))] print:hidden"
    >
      <Button
        variant="outline"
        size="icon-lg"
        onClick={scrollToTop}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label="Back to top"
        className="group/top relative size-10 rounded-full sm:size-12 bg-background/85 shadow-sm backdrop-blur-md hover:text-primary"
      >
        {/* Progress ring: pathLength follows page scroll. Decorative. */}
        <svg aria-hidden="true" viewBox="0 0 48 48" className="pointer-events-none absolute -inset-px size-[calc(100%+2px)] -rotate-90">
          <m.circle cx="24" cy="24" r="23.25" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" style={{ pathLength: scrollYProgress }} />
        </svg>
        <ArrowUpIcon
          aria-hidden="true"
          className="size-4 transition-transform sm:size-5 duration-300 ease-out-expo group-hover/top:-translate-y-0.5 motion-reduce:transition-none"
        />
      </Button>
    </m.div>
  );
}
