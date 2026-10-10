"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { useInView } from "motion/react";
import { reveal } from "@/lib/motion";

export type RevealState = "shown" | "hidden";

// Decides whether a block animates in on scroll, without ever hiding first paint:
// - The server renders every block visible (no JS, or JS that fails, still reads fine).
// - At hydration, a block below the fold is switched to "hidden" before the browser
//   paints it (useLayoutEffect), then revealed when it scrolls into view.
// - A block already on screen at hydration stays static; CSS handles first-paint entrances.
export function useReveal(ref: RefObject<Element | null>): RevealState {
  const [armed, setArmed] = useState(false);
  const inView = useInView(ref, { once: true, margin: reveal.margin });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element && element.getBoundingClientRect().top > window.innerHeight * reveal.foldRatio) setArmed(true);
  }, [ref]);

  return armed && !inView ? "hidden" : "shown";
}
